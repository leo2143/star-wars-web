const DEFAULT_URL = '/dashboard';

/**
 * Accepts only in-app absolute paths (open-redirect protection).
 * Returns null for anything else, including the login page itself.
 */
export function safeReturnUrl(candidate: string | null | undefined): string | null {
  if (!candidate || !candidate.startsWith('/')) return null;
  if (candidate.startsWith('//') || candidate.includes('\\')) return null;
  if (hasControlCharacter(candidate)) return null;
  if (
    candidate === '/login' ||
    candidate.startsWith('/login?') ||
    candidate.startsWith('/login/')
  ) {
    return null;
  }
  return candidate;
}

export function returnUrlOrDefault(candidate: string | null | undefined): string {
  return safeReturnUrl(candidate) ?? DEFAULT_URL;
}

function hasControlCharacter(value: string): boolean {
  return [...value].some((char) => char.charCodeAt(0) < 32);
}
