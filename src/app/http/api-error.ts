import { HttpErrorResponse } from '@angular/common/http';

export type ApiErrorKind =
  | 'network'
  | 'unauthorized'
  | 'forbidden'
  | 'validation'
  | 'not-found'
  | 'rate-limited'
  | 'upstream'
  | 'server';

export interface FieldError {
  field: string;
  message: string;
}

/** Presentation-safe view of a failed backend call (never exposes internal details). */
export interface ApiError {
  kind: ApiErrorKind;
  status: number;
  message: string;
  fieldErrors: FieldError[];
  retryAfterSeconds: number | null;
}

const MESSAGES: Record<ApiErrorKind, string> = {
  network: 'Cannot reach the server. Check your connection and try again.',
  unauthorized: 'Your session is not valid. Please sign in again.',
  forbidden: 'You do not have permission to access this resource.',
  validation: 'Some of the values you entered are not valid.',
  'not-found': 'The requested resource was not found.',
  'rate-limited': 'Too many requests. Try again in a moment.',
  upstream: 'The Star Wars data provider is not responding right now. Try again in a moment.',
  server: 'Something went wrong on the server. Try again later.',
};

const UPSTREAM_STATUSES = new Set([502, 503, 504]);

function kindFor(status: number): ApiErrorKind {
  if (status === 0) return 'network';
  if (status === 400) return 'validation';
  if (status === 401) return 'unauthorized';
  if (status === 403) return 'forbidden';
  if (status === 404) return 'not-found';
  if (status === 429) return 'rate-limited';
  if (UPSTREAM_STATUSES.has(status)) return 'upstream';
  return 'server';
}

function isFieldError(value: unknown): value is FieldError {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as FieldError).field === 'string' &&
    typeof (value as FieldError).message === 'string'
  );
}

function fieldErrorsOf(body: unknown): FieldError[] {
  if (typeof body !== 'object' || body === null) return [];
  const errors = (body as { errors?: unknown }).errors;
  return Array.isArray(errors) ? errors.filter(isFieldError) : [];
}

function retryAfterOf(error: HttpErrorResponse): number | null {
  const seconds = Number(error.headers?.get('Retry-After'));
  return Number.isFinite(seconds) && seconds > 0 ? seconds : null;
}

/** Converts anything thrown by HttpClient into an {@link ApiError}. */
export function toApiError(error: unknown): ApiError {
  if (!(error instanceof HttpErrorResponse)) {
    return {
      kind: 'server',
      status: -1,
      message: MESSAGES.server,
      fieldErrors: [],
      retryAfterSeconds: null,
    };
  }
  const kind = kindFor(error.status);
  return {
    kind,
    status: error.status,
    message: MESSAGES[kind],
    fieldErrors: fieldErrorsOf(error.error),
    retryAfterSeconds: kind === 'upstream' || kind === 'rate-limited' ? retryAfterOf(error) : null,
  };
}

/** Message for a rate-limited login or registration, with the wait when the backend gives it. */
export function tooManyAttemptsMessage(error: ApiError): string {
  const seconds = error.retryAfterSeconds;
  if (seconds === null) return 'Too many attempts. Try again in a moment.';
  return `Too many attempts. Try again in ${seconds} ${seconds === 1 ? 'second' : 'seconds'}.`;
}
