import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { API_BASE_URL } from '../http/api-url';
import { AuthService } from './session/auth.service';
import { authInterceptor } from './auth.interceptor';

const UNAUTHORIZED = { status: 401, statusText: 'Unauthorized' };

function tokens(access: string, refresh: string) {
  return {
    accessToken: access,
    tokenType: 'Bearer',
    expiresIn: 900,
    refreshToken: refresh,
    refreshExpiresIn: 604_800,
  };
}

describe('authInterceptor', () => {
  let http: HttpClient;
  let controller: HttpTestingController;
  let auth: AuthService;
  let router: Router;
  let api: string;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });
    http = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
    api = TestBed.inject(API_BASE_URL);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  afterEach(() => controller.verify());

  function signIn(): void {
    auth.login({ username: 'demo', password: 'x' }).subscribe();
    controller.expectOne(`${api}/api/v1/auth/login`).flush(tokens('jwt-token', 'refresh-1'));
  }

  it('adds the Bearer header to backend requests when there is a session', () => {
    signIn();
    http.get(`${api}/api/v1/people`).subscribe();
    const req = controller.expectOne(`${api}/api/v1/people`);
    expect(req.request.headers.get('Authorization')).toBe('Bearer jwt-token');
    req.flush({});
  });

  it('does not add the header without a session', () => {
    http.get(`${api}/api/v1/people`).subscribe();
    const req = controller.expectOne(`${api}/api/v1/people`);
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('never sends the token to another origin', () => {
    signIn();
    http.get('https://swapi.dev/api/people').subscribe();
    http.get(`${api}.evil.example/api/people`).subscribe();
    for (const req of controller.match(() => true)) {
      expect(req.request.headers.has('Authorization')).toBe(false);
      req.flush({});
    }
  });

  it.each(['login', 'refresh', 'logout', 'register'])(
    'does not attach a token to the %s request',
    (endpoint) => {
      signIn();
      http.post(`${api}/api/v1/auth/${endpoint}`, {}).subscribe();
      const req = controller.expectOne(`${api}/api/v1/auth/${endpoint}`);
      expect(req.request.headers.has('Authorization')).toBe(false);
      req.flush({});
    },
  );

  it.each(['login', 'refresh', 'logout', 'register'])(
    'does not try to refresh when %s itself answers 401',
    (endpoint) => {
      signIn();
      http.post(`${api}/api/v1/auth/${endpoint}`, {}).subscribe({ error: () => undefined });
      controller.expectOne(`${api}/api/v1/auth/${endpoint}`).flush({}, UNAUTHORIZED);

      controller.expectNone(`${api}/api/v1/auth/refresh`);
      expect(auth.isAuthenticated()).toBe(true);
      expect(router.navigate).not.toHaveBeenCalled();
    },
  );

  it('refreshes on a 401 and retries the original request once with the new token', () => {
    signIn();
    let body: unknown;
    http.get(`${api}/api/v1/people`).subscribe((value) => (body = value));
    controller.expectOne(`${api}/api/v1/people`).flush({}, UNAUTHORIZED);

    const refresh = controller.expectOne(`${api}/api/v1/auth/refresh`);
    expect(refresh.request.body).toEqual({ refreshToken: 'refresh-1' });
    refresh.flush(tokens('jwt-2', 'refresh-2'));

    const retry = controller.expectOne(`${api}/api/v1/people`);
    expect(retry.request.headers.get('Authorization')).toBe('Bearer jwt-2');
    retry.flush({ ok: true });

    expect(body).toEqual({ ok: true });
    expect(auth.isAuthenticated()).toBe(true);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('shares one refresh among concurrent 401s and retries each request', () => {
    signIn();
    http.get(`${api}/api/v1/people`).subscribe();
    http.get(`${api}/api/v1/films`).subscribe();
    controller.expectOne(`${api}/api/v1/people`).flush({}, UNAUTHORIZED);
    controller.expectOne(`${api}/api/v1/films`).flush({}, UNAUTHORIZED);

    controller.expectOne(`${api}/api/v1/auth/refresh`).flush(tokens('jwt-2', 'refresh-2'));

    for (const url of ['people', 'films']) {
      const retry = controller.expectOne(`${api}/api/v1/${url}`);
      expect(retry.request.headers.get('Authorization')).toBe('Bearer jwt-2');
      retry.flush({});
    }
  });

  it('ends the session when the retried request is rejected again (no loop)', () => {
    signIn();
    vi.spyOn(router, 'url', 'get').mockReturnValue('/people?page=2');
    let status = 0;
    http
      .get(`${api}/api/v1/people`)
      .subscribe({ error: (e: { status: number }) => (status = e.status) });
    controller.expectOne(`${api}/api/v1/people`).flush({}, UNAUTHORIZED);
    controller.expectOne(`${api}/api/v1/auth/refresh`).flush(tokens('jwt-2', 'refresh-2'));
    controller.expectOne(`${api}/api/v1/people`).flush({}, UNAUTHORIZED);

    controller.expectNone(`${api}/api/v1/auth/refresh`);
    expect(status).toBe(401);
    expect(auth.isAuthenticated()).toBe(false);
    expect(router.navigate).toHaveBeenCalledTimes(1);
    expect(router.navigate).toHaveBeenCalledWith(['/login'], {
      queryParams: { reason: 'expired', returnUrl: '/people?page=2' },
    });
  });

  it('ends the session and rethrows the original 401 when the refresh fails', () => {
    signIn();
    vi.spyOn(router, 'url', 'get').mockReturnValue('/films');
    let status = 0;
    http
      .get(`${api}/api/v1/films`)
      .subscribe({ error: (e: { status: number }) => (status = e.status) });
    controller.expectOne(`${api}/api/v1/films`).flush({}, UNAUTHORIZED);
    controller.expectOne(`${api}/api/v1/auth/refresh`).flush({}, UNAUTHORIZED);

    expect(status).toBe(401);
    expect(auth.isAuthenticated()).toBe(false);
    expect(router.navigate).toHaveBeenCalledTimes(1);
    expect(router.navigate).toHaveBeenCalledWith(['/login'], {
      queryParams: { reason: 'expired', returnUrl: '/films' },
    });
  });

  it('keeps the session when the retried request fails with another status', () => {
    signIn();
    let status = 0;
    http
      .get(`${api}/api/v1/people`)
      .subscribe({ error: (e: { status: number }) => (status = e.status) });
    controller.expectOne(`${api}/api/v1/people`).flush({}, UNAUTHORIZED);
    controller.expectOne(`${api}/api/v1/auth/refresh`).flush(tokens('jwt-2', 'refresh-2'));
    controller.expectOne(`${api}/api/v1/people`).flush({}, { status: 500, statusText: 'err' });

    expect(status).toBe(500);
    expect(auth.isAuthenticated()).toBe(true);
  });

  it('does not attempt a refresh for an anonymous 401', () => {
    let status = 0;
    http
      .get(`${api}/api/v1/people`)
      .subscribe({ error: (e: { status: number }) => (status = e.status) });
    controller.expectOne(`${api}/api/v1/people`).flush({}, UNAUTHORIZED);

    controller.expectNone(`${api}/api/v1/auth/refresh`);
    expect(status).toBe(401);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('does not treat a failed login (401) as an expired session', () => {
    auth.login({ username: 'demo', password: 'bad' }).subscribe({ error: () => undefined });
    controller.expectOne(`${api}/api/v1/auth/login`).flush({}, UNAUTHORIZED);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it.each([403, 404, 500, 502])('propagates %i without touching the session', (code) => {
    signIn();
    let status = 0;
    http
      .get(`${api}/api/v1/films`)
      .subscribe({ error: (e: { status: number }) => (status = e.status) });
    controller.expectOne(`${api}/api/v1/films`).flush({}, { status: code, statusText: 'err' });

    expect(status).toBe(code);
    expect(auth.isAuthenticated()).toBe(true);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('ignores 401 responses from other origins', () => {
    signIn();
    http.get('https://other.example/data').subscribe({ error: () => undefined });
    controller.expectOne('https://other.example/data').flush({}, UNAUTHORIZED);
    expect(auth.isAuthenticated()).toBe(true);
  });
});
