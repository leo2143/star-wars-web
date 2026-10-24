import { TestBed } from '@angular/core/testing';
import { Session } from './auth.interface';
import { TokenStorageService } from './token-storage.service';

const session: Session = {
  accessToken: 'jwt',
  refreshToken: 'refresh',
  expiresAt: 123,
  username: 'demo',
};

describe('TokenStorageService', () => {
  let storage: TokenStorageService;

  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    storage = TestBed.inject(TokenStorageService);
  });

  it('round-trips a session through sessionStorage', () => {
    storage.write(session);
    expect(storage.read()).toEqual(session);
  });

  it('never touches localStorage', () => {
    storage.write(session);
    expect(localStorage.length).toBe(0);
  });

  it('clears the session', () => {
    storage.write(session);
    storage.clear();
    expect(storage.read()).toBeNull();
  });

  it('ignores corrupted or malformed content', () => {
    sessionStorage.setItem('star-wars.session', '{not json');
    expect(storage.read()).toBeNull();
    sessionStorage.setItem('star-wars.session', JSON.stringify({ accessToken: 1 }));
    expect(storage.read()).toBeNull();
  });

  it('treats a session stored without a refresh token as absent', () => {
    sessionStorage.setItem(
      'star-wars.session',
      JSON.stringify({ accessToken: 'jwt', expiresAt: 123, username: 'demo' }),
    );
    expect(storage.read()).toBeNull();
  });

  it('does not throw when storage is unavailable', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(() => storage.write(session)).not.toThrow();
    spy.mockRestore();
  });
});
