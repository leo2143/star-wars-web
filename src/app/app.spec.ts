import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { AppComponent } from './app.component';
import { routes } from './app.routes';
import { authInterceptor } from './auth/auth.interceptor';
import { AuthService } from './auth/session/auth.service';
import { API_BASE_URL } from './http/api-url';

describe('App routing', () => {
  let harness: RouterTestingHarness;
  let router: Router;
  let auth: AuthService;
  let http: HttpTestingController;
  let api: string;

  beforeEach(async () => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    router = TestBed.inject(Router);
    auth = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
    api = TestBed.inject(API_BASE_URL);
    harness = await RouterTestingHarness.create();
  });

  function signIn(): void {
    auth.login({ username: 'demo', password: 'x' }).subscribe();
    http.expectOne(`${api}/api/v1/auth/login`).flush({
      accessToken: 't',
      tokenType: 'Bearer',
      expiresIn: 900,
      refreshToken: 'r',
      refreshExpiresIn: 604800,
    });
  }

  /** Answers the listing request a page issues when it is rendered. */
  function flushListing(): void {
    for (const req of http.match((r) => r.url.startsWith(`${api}/api/v1/`))) {
      req.flush({
        count: 0,
        currentPage: 1,
        totalPages: 0,
        nextPage: null,
        previousPage: null,
        results: [],
      });
    }
  }

  it('creates the root component', () => {
    expect(TestBed.createComponent(AppComponent).componentInstance).toBeTruthy();
  });

  it('sends anonymous users to the login page and remembers where they were going', async () => {
    await harness.navigateByUrl('/people?page=2&name=luke');
    expect(router.url).toBe('/login?returnUrl=%2Fpeople%3Fpage%3D2%26name%3Dluke');
  });

  it('lets anonymous users open the login page', async () => {
    await harness.navigateByUrl('/login');
    expect(router.url).toBe('/login');
  });

  it('lets anonymous users open the registration page, lazily', async () => {
    await harness.navigateByUrl('/register');
    expect(router.url).toBe('/register');
    const route = routes.find((r) => r.path === 'register')!;
    expect(route.loadComponent).toBeTypeOf('function');
    expect(route.canActivate?.length).toBeGreaterThan(0);
  });

  it('keeps signed-in users away from the registration page', async () => {
    signIn();
    await harness.navigateByUrl('/register');
    expect(router.url).toBe('/dashboard');
  });

  it('opens protected pages once signed in, keeping the query string', async () => {
    signIn();
    await harness.navigateByUrl('/people?page=2');
    flushListing();
    expect(router.url).toBe('/people?page=2');
  });

  it('redirects signed-in users away from the login page', async () => {
    signIn();
    await harness.navigateByUrl('/login');
    flushListing();
    expect(router.url).toBe('/dashboard');
  });

  it('sends the empty path to the dashboard', async () => {
    signIn();
    await harness.navigateByUrl('/');
    expect(router.url).toBe('/dashboard');
  });

  it('redirects unknown URLs to the dashboard when signed in', async () => {
    signIn();
    await harness.navigateByUrl('/does/not/exist');
    expect(router.url).toBe('/dashboard');
  });

  it('redirects unknown URLs to the login page when signed out', async () => {
    await harness.navigateByUrl('/does/not/exist');
    expect(router.url).toBe('/login?returnUrl=%2Fdashboard');
  });

  it('logging out returns to the login page and blocks protected pages again', async () => {
    signIn();
    await harness.navigateByUrl('/films');
    flushListing();

    auth.logout();
    await harness.fixture.whenStable();
    expect(router.url).toBe('/login');

    await harness.navigateByUrl('/films');
    expect(router.url).toContain('/login');
  });

  it('a 401 the refresh cannot fix ends the session and redirects to the login page with the reason', async () => {
    signIn();
    await harness.navigateByUrl('/starships?page=3');
    http
      .expectOne((r) => r.url === `${api}/api/v1/starships`)
      .flush({}, { status: 401, statusText: 'Unauthorized' });
    http
      .expectOne(`${api}/api/v1/auth/refresh`)
      .flush({}, { status: 401, statusText: 'Unauthorized' });
    await harness.fixture.whenStable();

    expect(auth.isAuthenticated()).toBe(false);
    expect(router.url).toBe('/login?reason=expired&returnUrl=%2Fstarships%3Fpage%3D3');
  });

  describe('detail routes', () => {
    const detailPaths = ['people/:id', 'films/:id', 'starships/:id', 'vehicles/:id'];

    it('are lazy children of the protected shell', () => {
      const shell = routes.find((r) => r.path === '')!;
      expect(shell.canActivate?.length).toBeGreaterThan(0);
      for (const path of detailPaths) {
        const route = shell.children!.find((r) => r.path === path);
        expect(route, path).toBeDefined();
        expect(route!.loadComponent, path).toBeTypeOf('function');
        expect(route!.component, path).toBeUndefined();
        expect(route!.title, path).toBeTruthy();
      }
    });

    it.each(['/people/1', '/films/1', '/starships/9', '/vehicles/4'])(
      'send anonymous users to the login page from %s',
      async (url) => {
        await harness.navigateByUrl(url);
        expect(router.url).toBe(`/login?returnUrl=${encodeURIComponent(url)}`);
        http.expectNone((r) => r.url.startsWith(`${api}/api/v1/`));
      },
    );

    it.each([
      ['/people/1', 'people'],
      ['/films/2', 'films'],
      ['/starships/9', 'starships'],
      ['/vehicles/4', 'vehicles'],
    ])('open %s once signed in and ask the backend for it', async (url, resource) => {
      signIn();
      await harness.navigateByUrl(url);
      const req = http.expectOne(`${api}/api/v1${url}`);
      expect(req.request.method).toBe('GET');
      expect(url.startsWith(`/${resource}/`)).toBe(true);
      req.flush({ id: '1', name: 'x', title: 'x', films: [], characters: [] });
      expect(router.url).toBe(url);
    });

    it('a 401 on a detail that the refresh cannot fix ends the session and remembers the URL', async () => {
      signIn();
      await harness.navigateByUrl('/people/1');
      http
        .expectOne(`${api}/api/v1/people/1`)
        .flush({}, { status: 401, statusText: 'Unauthorized' });
      http
        .expectOne(`${api}/api/v1/auth/refresh`)
        .flush({}, { status: 401, statusText: 'Unauthorized' });
      await harness.fixture.whenStable();
      expect(router.url).toBe('/login?reason=expired&returnUrl=%2Fpeople%2F1');
    });

    it('goes list -> detail -> back to the same page and filters', async () => {
      signIn();
      await harness.navigateByUrl('/people?page=2&name=luke');
      http
        .expectOne((r) => r.url === `${api}/api/v1/people`)
        .flush({
          count: 11,
          currentPage: 2,
          totalPages: 2,
          nextPage: null,
          previousPage: 1,
          results: [
            {
              id: '1',
              name: 'Luke Skywalker',
              gender: 'male',
              birthYear: '19BBY',
              height: '172',
              mass: '77',
            },
          ],
        });
      await harness.fixture.whenStable();

      const root = harness.fixture.nativeElement as HTMLElement;
      const row = root.querySelector('tbody th a') as HTMLAnchorElement;
      row.click();
      await harness.fixture.whenStable();
      expect(router.url).toBe('/people/1?back=page%3D2%26name%3Dluke');

      http.expectOne(`${api}/api/v1/people/1`).flush({
        id: '1',
        name: 'Luke Skywalker',
        height: '172',
        mass: '77',
        hairColor: 'blond',
        skinColor: 'fair',
        eyeColor: 'blue',
        birthYear: '19BBY',
        gender: 'male',
        films: [],
        starships: [],
        vehicles: [],
      });
      await harness.fixture.whenStable();

      const back = Array.from(root.querySelectorAll('a')).find((a) =>
        a.textContent?.includes('Back to people'),
      ) as HTMLAnchorElement;
      back.click();
      await harness.fixture.whenStable();
      expect(router.url).toBe('/people?page=2&name=luke');
      http
        .expectOne((r) => r.url === `${api}/api/v1/people`)
        .flush({
          count: 0,
          currentPage: 2,
          totalPages: 0,
          nextPage: null,
          previousPage: null,
          results: [],
        });
    });
  });
});
