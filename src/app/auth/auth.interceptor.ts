import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { API_BASE_URL, API_PREFIX, isApiUrl } from '../http/api-url';
import { AuthService } from './session/auth.service';

/** Public endpoints: they carry no Bearer and a 401 from them says nothing about the session. */
const AUTH_PATHS = ['/auth/login', '/auth/refresh', '/auth/logout', '/auth/register'];

const isUnauthorized = (error: unknown): boolean =>
  error instanceof HttpErrorResponse && error.status === 401;

/**
 * Adds `Authorization: Bearer` to requests aimed at our backend only and recovers from a
 * rejected token: on 401 it refreshes the session (shared by all concurrent requests) and retries
 * the request once. If that is not enough the session is over. Other status codes are left
 * untouched for the callers.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const apiBaseUrl = inject(API_BASE_URL);
  if (!isApiUrl(req.url, apiBaseUrl)) return next(req);
  if (AUTH_PATHS.some((path) => req.url === `${apiBaseUrl}${API_PREFIX}${path}`)) return next(req);

  const auth = inject(AuthService);
  const router = inject(Router);
  const withToken = (token: string | null) =>
    token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(withToken(auth.token())).pipe(
    catchError((error: unknown) => {
      if (!isUnauthorized(error)) return throwError(() => error);

      return auth.refresh().pipe(
        // A failed refresh already ended the session; callers still get the original 401.
        catchError(() => throwError(() => error)),
        switchMap((token) =>
          next(withToken(token)).pipe(
            catchError((retryError: unknown) => {
              if (isUnauthorized(retryError)) auth.expire(router.url);
              return throwError(() => retryError);
            }),
          ),
        ),
      );
    }),
  );
};
