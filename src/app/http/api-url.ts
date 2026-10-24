import { InjectionToken } from '@angular/core';
import { environment } from '../../environments/environment';

/** Origin of the Star Wars backend, without a trailing slash. */
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL', {
  providedIn: 'root',
  factory: () => environment.apiBaseUrl.replace(/\/+$/, ''),
});

/** Path prefix of the versioned REST API (`/api/v1`), shared by every request to the backend. */
export const API_PREFIX = '/api/v1';

/** True only when `url` targets the backend itself (never a look-alike host). */
export function isApiUrl(url: string, apiBaseUrl: string): boolean {
  return url === apiBaseUrl || url.startsWith(`${apiBaseUrl}/`);
}
