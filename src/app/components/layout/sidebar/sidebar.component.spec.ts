import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { AuthService } from '../../../auth/session/auth.service';
import { SidebarComponent } from './sidebar.component';

@Component({ template: '' })
class BlankComponent {}

describe('SidebarComponent', () => {
  const logout = vi.fn();

  beforeEach(() => {
    logout.mockClear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'dashboard', component: BlankComponent },
          { path: 'people', component: BlankComponent },
          { path: 'films', component: BlankComponent },
          { path: 'starships', component: BlankComponent },
          { path: 'vehicles', component: BlankComponent },
        ]),
        { provide: AuthService, useValue: { username: () => 'demo', logout } },
      ],
    });
  });

  async function render(url: string) {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url);
    const fixture = TestBed.createComponent(SidebarComponent);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('links the dashboard and the four entities', async () => {
    const root = await render('/dashboard');
    const hrefs = Array.from(root.querySelectorAll('nav a')).map((a) => a.getAttribute('href'));
    expect(hrefs).toEqual(['/dashboard', '/people', '/films', '/starships', '/vehicles']);
  });

  it.each([
    ['/films', 'Films'],
    ['/people?page=3&name=luke', 'People'],
    ['/dashboard', 'Dashboard'],
  ])('marks only the section of %s as the current page', async (url, label) => {
    const root = await render(url);
    const current = Array.from(root.querySelectorAll('nav a[aria-current="page"]'));
    expect(current).toHaveLength(1);
    expect(current[0].textContent).toContain(label);
  });

  it('shows the session user and signs out', async () => {
    const root = await render('/dashboard');
    expect(root.querySelector('[data-testid="session-user"]')?.textContent).toContain('demo');

    (
      Array.from(root.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Sign out'),
      ) as HTMLButtonElement
    ).click();
    expect(logout).toHaveBeenCalledTimes(1);
  });

  it('hides the drawer from keyboard and screen readers on small screens until opened', async () => {
    const fixture = TestBed.createComponent(SidebarComponent);
    await fixture.whenStable();
    const aside = (fixture.nativeElement as HTMLElement).querySelector('aside') as HTMLElement;
    expect(aside.classList.contains('max-lg:invisible')).toBe(true);

    fixture.componentRef.setInput('open', true);
    await fixture.whenStable();
    expect(aside.classList.contains('max-lg:invisible')).toBe(false);
  });
});
