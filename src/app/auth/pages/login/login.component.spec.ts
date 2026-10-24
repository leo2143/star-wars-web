import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { AuthService } from '../../session/auth.service';
import { ApiError } from '../../../http/api-error';
import LoginComponent from './login.component';

function apiError(kind: ApiError['kind'], retryAfterSeconds: number | null = null): ApiError {
  return { kind, status: 0, message: `${kind} message`, fieldErrors: [], retryAfterSeconds };
}

describe('LoginComponent', () => {
  let fixture: ComponentFixture<LoginComponent>;
  let login: ReturnType<typeof vi.fn>;
  let navigateByUrl: ReturnType<typeof vi.spyOn>;

  const root = () => fixture.nativeElement as HTMLElement;
  const field = (id: string) => root().querySelector(`#${id}`) as HTMLInputElement;

  async function setup(query: Record<string, string> = {}): Promise<void> {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { login } },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap(query) } },
        },
      ],
    });
    navigateByUrl = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    fixture = TestBed.createComponent(LoginComponent);
    await fixture.whenStable();
  }

  async function fill(username: string, password: string): Promise<void> {
    field('username').value = username;
    field('username').dispatchEvent(new Event('input'));
    field('password').value = password;
    field('password').dispatchEvent(new Event('input'));
    root().querySelector('form')?.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
  }

  beforeEach(() => {
    login = vi.fn(() => of(undefined));
  });

  it('validates required fields with accessible messages and does not call the backend', async () => {
    await setup();
    await fill('', '');

    expect(login).not.toHaveBeenCalled();
    expect(field('username').getAttribute('aria-invalid')).toBe('true');
    expect(field('username').getAttribute('aria-describedby')).toBe('username-error');
    expect(root().querySelector('#username-error')?.textContent).toContain('required');
    expect(root().querySelector('#password-error')?.textContent).toContain('required');
  });

  it('signs in and navigates to the dashboard by default', async () => {
    await setup();
    await fill('demo', 'secret');

    expect(login).toHaveBeenCalledWith({ username: 'demo', password: 'secret' });
    expect(navigateByUrl).toHaveBeenCalledWith('/dashboard');
  });

  it('returns to the requested internal page', async () => {
    await setup({ returnUrl: '/films?page=2' });
    await fill('demo', 'secret');
    expect(navigateByUrl).toHaveBeenCalledWith('/films?page=2');
  });

  it('ignores an external returnUrl', async () => {
    await setup({ returnUrl: 'https://evil.example' });
    await fill('demo', 'secret');
    expect(navigateByUrl).toHaveBeenCalledWith('/dashboard');
  });

  it('shows a spinner and disables the button while the request is pending', async () => {
    const pending = new Subject<void>();
    login = vi.fn(() => pending);
    await setup();
    await fill('demo', 'secret');

    const button = root().querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(root().querySelector('.animate-spin')).not.toBeNull();
    expect(button.getAttribute('aria-busy')).toBe('true');
  });

  it.each([
    ['unauthorized', 'Invalid username or password'],
    ['network', 'network message'],
    ['server', 'server message'],
  ] as const)('shows a clear alert for a %s failure', async (kind, text) => {
    login = vi.fn(() => throwError(() => apiError(kind)));
    await setup();
    await fill('demo', 'bad');

    expect(root().querySelector('[role="alert"]')?.textContent).toContain(text);
    expect(navigateByUrl).not.toHaveBeenCalled();
    expect((root().querySelector('button[type="submit"]') as HTMLButtonElement).disabled).toBe(
      false,
    );
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

  it('explains that the session expired', async () => {
    await setup({ reason: 'expired' });
    expect(root().querySelector('[role="status"]')?.textContent).toContain('session has expired');
  });

  it('tells how long to wait when rate-limited', async () => {
    login = vi.fn(() => throwError(() => apiError('rate-limited', 45)));
    await setup();
    await fill('demo', 'secret');

    expect(root().querySelector('[role="alert"]')?.textContent).toContain(
      'Too many attempts. Try again in 45 seconds.',
    );
  });

  it('copes with a rate limit without Retry-After', async () => {
    login = vi.fn(() => throwError(() => apiError('rate-limited')));
    await setup();
    await fill('demo', 'secret');

    const alert = root().querySelector('[role="alert"]')?.textContent;
    expect(alert).toContain('Too many attempts.');
    expect(alert).not.toContain('null');
  });

  it('confirms a new account and pre-fills the username', async () => {
    await setup({ registered: '1', username: 'luke.sky' });
    expect(root().querySelector('[role="status"]')?.textContent).toContain('Account created');
    expect(field('username').value).toBe('luke.sky');
  });

  it('does not pre-fill or confirm without the registered flag', async () => {
    await setup({ username: 'luke' });
    expect(root().querySelector('[role="status"]')).toBeNull();
    expect(field('username').value).toBe('');
  });

  it.each(['<script>alert(1)</script>', 'has space', 'a'.repeat(51)])(
    'does not pre-fill a username that fails the registration rules (%s)',
    async (username) => {
      await setup({ registered: '1', username });
      expect(root().querySelector('[role="status"]')?.textContent).toContain('Account created');
      expect(field('username').value).toBe('');
    },
  );

  it('links to the registration page', async () => {
    await setup();
    expect(root().querySelector('a[href="/register"]')).not.toBeNull();
  });
});
