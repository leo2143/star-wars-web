import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { AuthService } from '../../session/auth.service';
import { ApiError } from '../../../http/api-error';
import RegisterComponent from './register.component';

const PASSWORD = 'a-long-enough-pass';

function apiError(kind: ApiError['kind'], extra: Partial<ApiError> = {}): ApiError {
  return {
    kind,
    status: 0,
    message: `${kind} message`,
    fieldErrors: [],
    retryAfterSeconds: null,
    ...extra,
  };
}

describe('RegisterComponent', () => {
  let fixture: ComponentFixture<RegisterComponent>;
  let register: ReturnType<typeof vi.fn>;
  let navigate: ReturnType<typeof vi.spyOn>;

  const root = () => fixture.nativeElement as HTMLElement;
  const field = (id: string) => root().querySelector(`#${id}`) as HTMLInputElement;
  const text = (selector: string) => root().querySelector(selector)?.textContent;

  async function setup(): Promise<void> {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthService, useValue: { register } }],
    });
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture = TestBed.createComponent(RegisterComponent);
    await fixture.whenStable();
  }

  function type(id: string, value: string): void {
    field(id).value = value;
    field(id).dispatchEvent(new Event('input'));
  }

  async function submit(username: string, password: string): Promise<void> {
    type('username', username);
    type('password', password);
    root().querySelector('form')?.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
  }

  beforeEach(() => {
    register = vi.fn(() => of(undefined));
  });

  it('requires both fields, with accessible messages, and does not call the backend', async () => {
    await setup();
    await submit('', '');

    expect(register).not.toHaveBeenCalled();
    expect(field('username').getAttribute('aria-invalid')).toBe('true');
    expect(field('username').getAttribute('aria-describedby')).toBe('username-error');
    expect(text('#username-error')).toContain('required');
    expect(field('password').getAttribute('aria-describedby')).toBe('password-error');
    expect(text('#password-error')).toContain('required');
  });

  it.each([
    ['ab', 'at least 3'],
    ['a'.repeat(51), 'at most 50'],
    ['no spaces here', 'letters, numbers'],
    ['ñandú', 'letters, numbers'],
  ])('rejects the username "%s"', async (username, message) => {
    await setup();
    await submit(username, PASSWORD);

    expect(register).not.toHaveBeenCalled();
    expect(text('#username-error')).toContain(message);
  });

  it('rejects a password shorter than 15 characters', async () => {
    await setup();
    await submit('luke', 'x'.repeat(14));
    expect(register).not.toHaveBeenCalled();
    expect(text('#password-error')).toContain('at least 15');
  });

  it('rejects a password longer than 64 characters', async () => {
    await setup();
    await submit('luke', 'x'.repeat(65));
    expect(text('#password-error')).toContain('at most 64');
  });

  it('rejects a password over 72 UTF-8 bytes even when it has fewer than 64 characters', async () => {
    await setup();
    await submit('luke', 'é'.repeat(40));
    expect(register).not.toHaveBeenCalled();
    expect(text('#password-error')).toContain('72 bytes');
  });

  it('rejects a password equal to the username, ignoring case', async () => {
    await setup();
    await submit('Same.User.Name.1234', 'same.user.name.1234');
    expect(register).not.toHaveBeenCalled();
    expect(text('#password-error')).toContain('different from the username');
  });

  it('registers and goes to the login page with the username', async () => {
    await setup();
    await submit('luke', PASSWORD);

    expect(register).toHaveBeenCalledWith({ username: 'luke', password: PASSWORD });
    expect(navigate).toHaveBeenCalledWith(['/login'], {
      queryParams: { registered: 1, username: 'luke' },
    });
  });

  it('shows a spinner and disables the button while the request is pending', async () => {
    register = vi.fn(() => new Subject<void>());
    await setup();
    await submit('luke', PASSWORD);

    const button = root().querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(button.getAttribute('aria-busy')).toBe('true');
    expect(root().querySelector('.animate-spin')).not.toBeNull();
  });

  it('shows a 409 on the username field', async () => {
    register = vi.fn(() => throwError(() => apiError('server', { status: 409 })));
    await setup();
    await submit('taken', PASSWORD);

    expect(text('#username-error')).toContain('Username is not available');
    expect(field('username').getAttribute('aria-invalid')).toBe('true');
    expect(navigate).not.toHaveBeenCalled();
    expect((root().querySelector('button[type="submit"]') as HTMLButtonElement).disabled).toBe(
      false,
    );
  });

  it('clears the server message when the field is edited', async () => {
    register = vi.fn(() => throwError(() => apiError('server', { status: 409 })));
    await setup();
    await submit('taken', PASSWORD);

    type('username', 'taken2');
    await fixture.whenStable();

    expect(root().querySelector('#username-error')).toBeNull();
  });

  it('maps the field errors of a 400 to their fields', async () => {
    register = vi.fn(() =>
      throwError(() =>
        apiError('validation', {
          status: 400,
          fieldErrors: [
            { field: 'username', message: 'username is invalid' },
            { field: 'password', message: 'password is too weak' },
          ],
        }),
      ),
    );
    await setup();
    await submit('luke', PASSWORD);

    expect(text('#username-error')).toContain('username is invalid');
    expect(text('#password-error')).toContain('password is too weak');
    expect(root().querySelector('[role="alert"]')).toBeNull();
  });

  it('shows a general alert for a 400 without usable field errors', async () => {
    register = vi.fn(() => throwError(() => apiError('validation', { status: 400 })));
    await setup();
    await submit('luke', PASSWORD);

    expect(text('[role="alert"]')).toContain('validation message');
  });

  it('tells how long to wait on a 429', async () => {
    register = vi.fn(() =>
      throwError(() => apiError('rate-limited', { status: 429, retryAfterSeconds: 30 })),
    );
    await setup();
    await submit('luke', PASSWORD);

    expect(text('[role="alert"]')).toContain('Too many attempts. Try again in 30 seconds.');
  });

  it('copes with a 429 without Retry-After', async () => {
    register = vi.fn(() => throwError(() => apiError('rate-limited', { status: 429 })));
    await setup();
    await submit('luke', PASSWORD);

    expect(text('[role="alert"]')).toContain('Too many attempts.');
    expect(text('[role="alert"]')).not.toContain('NaN');
  });

  it.each([
    ['network', 'network message'],
    ['server', 'server message'],
  ] as const)('shows a clear alert for a %s failure', async (kind, message) => {
    register = vi.fn(() => throwError(() => apiError(kind)));
    await setup();
    await submit('luke', PASSWORD);

    expect(text('[role="alert"]')).toContain(message);
  });

  it('toggles password visibility', async () => {
    await setup();
    const toggle = root().querySelector('button[aria-controls="password"]') as HTMLButtonElement;
    expect(field('password').type).toBe('password');

    toggle.click();
    await fixture.whenStable();

    expect(field('password').type).toBe('text');
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
  });

  it('links back to the sign in page', async () => {
    await setup();
    expect(root().querySelector('a[href="/login"]')).not.toBeNull();
  });
});
