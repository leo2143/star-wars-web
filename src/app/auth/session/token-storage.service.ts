import { Injectable } from '@angular/core';
import { Session } from './auth.interface';

const STORAGE_KEY = 'star-wars.session';

function isSession(value: unknown): value is Session {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate['accessToken'] === 'string' &&
    typeof candidate['refreshToken'] === 'string' &&
    typeof candidate['expiresAt'] === 'number' &&
    typeof candidate['username'] === 'string'
  );
}

/**
 * Keeps the session in `sessionStorage`: it survives a page reload but not closing the tab.
 * Every access is guarded because storage can be blocked (private mode, browser settings).
 */
@Injectable({ providedIn: 'root' })
export class TokenStorageService {
  read(): Session | null {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed: unknown = JSON.parse(raw);
      return isSession(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  write(session: Session): void {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } catch {
      // Storage unavailable: the session still works in memory until the page is reloaded.
    }
  }

  clear(): void {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // Nothing to clear if storage is unavailable.
    }
  }
}
