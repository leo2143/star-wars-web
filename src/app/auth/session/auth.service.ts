import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, finalize, map, shareReplay, throwError } from 'rxjs';
import { toApiError } from '../../http/api-error';
import { API_BASE_URL, API_PREFIX } from '../../http/api-url';
import { LoginRequest, LoginResponse, Session } from './auth.interface';
import { safeReturnUrl } from '../guard/return-url';
import { TokenStorageService } from './token-storage.service';

/** Largest delay accepted by setTimeout (about 24.8 days). */
const MAX_TIMER_MS = 2_147_483_647;

/**
 * Owns the authentication state of the browser session.
 *
 * It only reflects what the backend decided: the real authorization happens on the server,
 * which validates the JWT on every request. The session lasts as long as the refresh token.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly storage = inject(TokenStorageService);
  private readonly apiBaseUrl = inject(API_BASE_URL);

  private readonly session = signal<Session | null>(this.restore());
  private expiryTimer: ReturnType<typeof setTimeout> | undefined;
  private refreshInFlight: Observable<string> | null = null;

  readonly isAuthenticated = computed(() => this.session() !== null);
  readonly username = computed(() => this.session()?.username ?? null);

  constructor() {
    const current = this.session();
    if (current) this.scheduleExpiry(current);
  }

  /** Completes on success and errors with an {@link ApiError} otherwise. */
  login(credentials: LoginRequest): Observable<void> {
    return this.http
      .post<LoginResponse>(`${this.apiBaseUrl}${API_PREFIX}/auth/login`, credentials)
      .pipe(
        map((response) => this.startSession(response, credentials.username)),
        map(() => undefined),
        catchError((error: unknown) => throwError(() => toApiError(error))),
      );
  }

  /** Completes on success (201) and errors with an {@link ApiError} otherwise. */
  register(credentials: LoginRequest): Observable<void> {
    return this.http.post(`${this.apiBaseUrl}${API_PREFIX}/auth/register`, credentials).pipe(
      map(() => undefined),
      catchError((error: unknown) => throwError(() => toApiError(error))),
    );
  }

  /**
   * Trades the refresh token for a new pair and emits the new access token.
   *
   * Single-flight: concurrent callers share one request. The backend rotates the refresh token
   * and treats a second use of the same one as theft, which revokes the whole session, so two
   * parallel refreshes would log the user out.
   *
   * If the refresh is rejected the session is over: it is cleared and the user is sent to login.
   */
  refresh(): Observable<string> {
    const current = this.session();
    if (!current) {
      return throwError(() => toApiError(new HttpErrorResponse({ status: 401 })));
    }

    this.refreshInFlight ??= this.http
      .post<LoginResponse>(`${this.apiBaseUrl}${API_PREFIX}/auth/refresh`, {
        refreshToken: current.refreshToken,
      })
      .pipe(
        map((response) => this.startSession(response, current.username).accessToken),
        catchError((error: unknown) => {
          this.expire(this.router.url);
          return throwError(() => toApiError(error));
        }),
        finalize(() => (this.refreshInFlight = null)),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
    return this.refreshInFlight;
  }

  /**
   * Returns the access token while the session lives. It may already be expired: the backend
   * rejects it with 401 and the interceptor refreshes, which is more reliable than comparing
   * against the browser clock.
   */
  token(): string | null {
    const current = this.session();
    if (!current) return null;
    if (current.expiresAt <= Date.now()) {
      this.clear();
      return null;
    }
    return current.accessToken;
  }

  hasValidSession(): boolean {
    return this.token() !== null;
  }

  /** User initiated sign out. The server is told in the background; the UI never waits. */
  logout(): void {
    const current = this.session();
    if (current) {
      this.http
        .post(`${this.apiBaseUrl}${API_PREFIX}/auth/logout`, { refreshToken: current.refreshToken })
        .subscribe({ error: () => undefined });
    }
    this.clear();
    void this.router.navigate(['/login']);
  }

  /**
   * The session ended without the user asking for it (expired or rejected token).
   * Does nothing when there is no session, so concurrent 401s cannot cause redirect loops.
   */
  expire(returnUrl?: string): void {
    if (!this.session()) return;
    this.clear();
    const safeUrl = safeReturnUrl(returnUrl);
    void this.router.navigate(['/login'], {
      queryParams: safeUrl ? { reason: 'expired', returnUrl: safeUrl } : { reason: 'expired' },
    });
  }

  private startSession(response: LoginResponse, username: string): Session {
    const session: Session = {
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
      expiresAt: Date.now() + response.refreshExpiresIn * 1000,
      username,
    };
    this.session.set(session);
    this.storage.write(session);
    this.scheduleExpiry(session);
    return session;
  }

  private clear(): void {
    clearTimeout(this.expiryTimer);
    this.expiryTimer = undefined;
    this.session.set(null);
    this.storage.clear();
  }

  private restore(): Session | null {
    const stored = this.storage.read();
    if (stored && stored.expiresAt > Date.now()) return stored;
    if (stored) this.storage.clear();
    return null;
  }

  private scheduleExpiry(session: Session): void {
    clearTimeout(this.expiryTimer);
    const delay = Math.min(Math.max(session.expiresAt - Date.now(), 0), MAX_TIMER_MS);
    this.expiryTimer = setTimeout(() => this.expire(this.router.url), delay);
  }
}
