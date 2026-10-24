import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { ApiError } from '../../http/api-error';
import { API_BASE_URL } from '../../http/api-url';
import { AuthService } from './auth.service';
import { TokenStorageService } from './token-storage.service';

function tokens(access: string, refresh: string, refreshExpiresIn = 604_800) {
  return {
    accessToken: access,
    tokenType: 'Bearer',
    expiresIn: 900,
    refreshToken: refresh,
    refreshExpiresIn,
  };
}

describe('AuthService', () => {
  let http: HttpTestingController;
  let router: Router;
  let api: string;

  function setup(): AuthService {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    api = TestBed.inject(API_BASE_URL);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    return TestBed.inject(AuthService);
  }

  function signIn(auth: AuthService, refreshExpiresIn = 604_800): void {
    auth.login({ username: 'demo', password: 'x' }).subscribe();
    http.expectOne(`${api}/api/v1/auth/login`).flush(tokens('t', 'r', refreshExpiresIn));
  }

  beforeEach(() => {
    sessionStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2030-01-01T00:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts unauthenticated', () => {
    const auth = setup();
    expect(auth.isAuthenticated()).toBe(false);
    expect(auth.token()).toBeNull();
  });

  it('logs in, stores both tokens and exposes the user', () => {
    const auth = setup();
    let completed = false;
    auth.login({ username: 'demo', password: 'secret' }).subscribe(() => (completed = true));

    const req = http.expectOne(`${api}/api/v1/auth/login`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ username: 'demo', password: 'secret' });
    req.flush(tokens('jwt-token', 'refresh-token'));

    expect(completed).toBe(true);
    expect(auth.isAuthenticated()).toBe(true);
    expect(auth.username()).toBe('demo');
    expect(auth.token()).toBe('jwt-token');
    expect(TestBed.inject(TokenStorageService).read()).toEqual({
      accessToken: 'jwt-token',
      refreshToken: 'refresh-token',
      expiresAt: Date.now() + 604_800_000,
      username: 'demo',
    });
    expect(JSON.stringify(sessionStorage)).not.toContain('secret');
  });

  it('maps rejected credentials to an unauthorized error and stays signed out', () => {
    const auth = setup();
    let error: ApiError | undefined;
    auth
      .login({ username: 'demo', password: 'bad' })
      .subscribe({ error: (e: ApiError) => (error = e) });

    http
      .expectOne(`${api}/api/v1/auth/login`)
      .flush({ title: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });

    expect(error?.kind).toBe('unauthorized');
    expect(auth.isAuthenticated()).toBe(false);
    expect(TestBed.inject(TokenStorageService).read()).toBeNull();
  });

  it('maps a rate-limited login to a rate-limited error with the wait time', () => {
    const auth = setup();
    let error: ApiError | undefined;
    auth
      .login({ username: 'demo', password: 'x' })
      .subscribe({ error: (e: ApiError) => (error = e) });

    http
      .expectOne(`${api}/api/v1/auth/login`)
      .flush({}, { status: 429, statusText: 'Too Many', headers: { 'Retry-After': '30' } });

    expect(error?.kind).toBe('rate-limited');
    expect(error?.retryAfterSeconds).toBe(30);
  });

  it('maps connectivity failures to a network error', () => {
    const auth = setup();
    let error: ApiError | undefined;
    auth
      .login({ username: 'demo', password: 'x' })
      .subscribe({ error: (e: ApiError) => (error = e) });

    http.expectOne(`${api}/api/v1/auth/login`).error(new ProgressEvent('error'));

    expect(error?.kind).toBe('network');
    expect(auth.isAuthenticated()).toBe(false);
  });

  it('restores a still valid session after a reload', () => {
    sessionStorage.setItem(
      'star-wars.session',
      JSON.stringify({
        accessToken: 'old',
        refreshToken: 'r',
        expiresAt: Date.now() + 60_000,
        username: 'demo',
      }),
    );
    const auth = setup();
    expect(auth.isAuthenticated()).toBe(true);
    expect(auth.token()).toBe('old');
  });

  it('discards a stored session whose refresh token already expired', () => {
    sessionStorage.setItem(
      'star-wars.session',
      JSON.stringify({
        accessToken: 'old',
        refreshToken: 'r',
        expiresAt: Date.now() - 1,
        username: 'demo',
      }),
    );
    const auth = setup();
    expect(auth.isAuthenticated()).toBe(false);
    expect(TestBed.inject(TokenStorageService).read()).toBeNull();
  });

  it('signs the user out when the refresh token expires, not before', () => {
    const auth = setup();
    signIn(auth, 3600);

    // The access token (15 minutes) is long gone, but the session is still refreshable.
    vi.advanceTimersByTime(3_599_000);
    expect(auth.isAuthenticated()).toBe(true);
    expect(auth.token()).toBe('t');

    vi.advanceTimersByTime(1_500);
    expect(auth.isAuthenticated()).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(
      ['/login'],
      expect.objectContaining({ queryParams: expect.objectContaining({ reason: 'expired' }) }),
    );
  });

  describe('refresh', () => {
    it('sends the refresh token, stores the rotated pair and emits the new access token', () => {
      const auth = setup();
      signIn(auth);
      let token: string | undefined;

      auth.refresh().subscribe((value) => (token = value));
      const req = http.expectOne(`${api}/api/v1/auth/refresh`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ refreshToken: 'r' });
      req.flush(tokens('t2', 'r2', 600_000));

      expect(token).toBe('t2');
      expect(auth.token()).toBe('t2');
      expect(auth.username()).toBe('demo');
      expect(TestBed.inject(TokenStorageService).read()).toEqual({
        accessToken: 't2',
        refreshToken: 'r2',
        expiresAt: Date.now() + 600_000_000,
        username: 'demo',
      });
    });

    it('shares one request among concurrent callers (single-flight)', () => {
      const auth = setup();
      signIn(auth);
      const received: string[] = [];

      auth.refresh().subscribe((t) => received.push(t));
      auth.refresh().subscribe((t) => received.push(t));
      auth.refresh().subscribe((t) => received.push(t));
      http.expectOne(`${api}/api/v1/auth/refresh`).flush(tokens('t2', 'r2'));

      expect(received).toEqual(['t2', 't2', 't2']);
    });

    it('allows a new refresh once the previous one finished', () => {
      const auth = setup();
      signIn(auth);

      auth.refresh().subscribe();
      http.expectOne(`${api}/api/v1/auth/refresh`).flush(tokens('t2', 'r2'));
      auth.refresh().subscribe();
      const req = http.expectOne(`${api}/api/v1/auth/refresh`);

      expect(req.request.body).toEqual({ refreshToken: 'r2' });
      req.flush(tokens('t3', 'r3'));
      expect(auth.token()).toBe('t3');
    });

    it('clears the session, redirects and fails every caller when the refresh is rejected', () => {
      const auth = setup();
      signIn(auth);
      const errors: ApiError[] = [];

      auth.refresh().subscribe({ error: (e: ApiError) => errors.push(e) });
      auth.refresh().subscribe({ error: (e: ApiError) => errors.push(e) });
      http
        .expectOne(`${api}/api/v1/auth/refresh`)
        .flush({}, { status: 401, statusText: 'Unauthorized' });

      expect(errors.map((e) => e.kind)).toEqual(['unauthorized', 'unauthorized']);
      expect(auth.isAuthenticated()).toBe(false);
      expect(TestBed.inject(TokenStorageService).read()).toBeNull();
      expect(router.navigate).toHaveBeenCalledTimes(1);
    });

    it('fails without a request when there is no session', () => {
      const auth = setup();
      let error: ApiError | undefined;

      auth.refresh().subscribe({ error: (e: ApiError) => (error = e) });

      expect(error?.kind).toBe('unauthorized');
      http.expectNone(`${api}/api/v1/auth/refresh`);
    });
  });

  describe('logout', () => {
    it('posts the refresh token, clears the session and goes to the login page', () => {
      const auth = setup();
      signIn(auth);

      auth.logout();

      const req = http.expectOne(`${api}/api/v1/auth/logout`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ refreshToken: 'r' });
      // The UI does not wait for the answer.
      expect(auth.isAuthenticated()).toBe(false);
      expect(auth.token()).toBeNull();
      expect(TestBed.inject(TokenStorageService).read()).toBeNull();
      expect(router.navigate).toHaveBeenCalledWith(['/login']);
      req.flush(null, { status: 204, statusText: 'No Content' });
    });

    it('still signs out when the request fails', () => {
      const auth = setup();
      signIn(auth);

      auth.logout();
      http.expectOne(`${api}/api/v1/auth/logout`).error(new ProgressEvent('error'));

      expect(auth.isAuthenticated()).toBe(false);
      expect(router.navigate).toHaveBeenCalledWith(['/login']);
    });

    it('does not call the backend without a session', () => {
      const auth = setup();
      auth.logout();
      http.expectNone(`${api}/api/v1/auth/logout`);
      expect(router.navigate).toHaveBeenCalledWith(['/login']);
    });
  });

  it('expire() clears the session and redirects with reason and a safe returnUrl', () => {
    const auth = setup();
    signIn(auth);

    auth.expire('/people?page=2');

    expect(auth.isAuthenticated()).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/login'], {
      queryParams: { reason: 'expired', returnUrl: '/people?page=2' },
    });
  });

  it('expire() is a no-op without a session (prevents redirect loops)', () => {
    const auth = setup();
    auth.expire('/people');
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('expire() drops an unsafe returnUrl', () => {
    const auth = setup();
    signIn(auth);

    auth.expire('//evil.example');

    expect(router.navigate).toHaveBeenCalledWith(['/login'], {
      queryParams: { reason: 'expired' },
    });
  });
});
