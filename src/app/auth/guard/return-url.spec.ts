import { returnUrlOrDefault, safeReturnUrl } from './return-url';

describe('safeReturnUrl', () => {
  it('accepts internal absolute paths with query strings', () => {
    expect(safeReturnUrl('/people?page=2&name=luke')).toBe('/people?page=2&name=luke');
  });

  it.each([
    'https://evil.example/phish',
    '//evil.example',
    '/\\evil.example',
    '/people\n',
    'people',
    '',
    null,
    undefined,
    '/login',
    '/login?reason=expired',
  ])('rejects %s', (candidate) => {
    expect(safeReturnUrl(candidate)).toBeNull();
  });

  it('falls back to the dashboard', () => {
    expect(returnUrlOrDefault('https://evil.example')).toBe('/dashboard');
  });
});
