import { HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { toApiError } from './api-error';

function httpError(status: number, body: unknown = null, headers?: HttpHeaders): HttpErrorResponse {
  return new HttpErrorResponse({ status, error: body, headers });
}

describe('toApiError', () => {
  it.each([
    [0, 'network'],
    [400, 'validation'],
    [401, 'unauthorized'],
    [403, 'forbidden'],
    [404, 'not-found'],
    [502, 'upstream'],
    [503, 'upstream'],
    [504, 'upstream'],
    [429, 'rate-limited'],
    [500, 'server'],
  ])('maps status %i to %s', (status, kind) => {
    expect(toApiError(httpError(status)).kind).toBe(kind);
  });

  it('keeps the field errors of a validation problem', () => {
    const error = toApiError(
      httpError(400, {
        errors: [{ field: 'id', message: 'id must be a positive integer' }, 'junk'],
      }),
    );
    expect(error.fieldErrors).toEqual([{ field: 'id', message: 'id must be a positive integer' }]);
  });

  it('reads Retry-After for upstream errors only', () => {
    const headers = new HttpHeaders({ 'Retry-After': '30' });
    expect(toApiError(httpError(503, null, headers)).retryAfterSeconds).toBe(30);
    expect(toApiError(httpError(500, null, headers)).retryAfterSeconds).toBeNull();
  });

  it('reads Retry-After for rate-limited errors and tolerates its absence', () => {
    const headers = new HttpHeaders({ 'Retry-After': '12' });
    expect(toApiError(httpError(429, null, headers)).retryAfterSeconds).toBe(12);
    expect(toApiError(httpError(429)).retryAfterSeconds).toBeNull();
  });

  it('does not leak backend details into the message', () => {
    const error = toApiError(httpError(500, { detail: 'NullPointerException at com.x.Y' }));
    expect(error.message).not.toContain('NullPointer');
  });

  it('treats unknown throwables as a server error', () => {
    expect(toApiError(new Error('boom')).kind).toBe('server');
  });
});
