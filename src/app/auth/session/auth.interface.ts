export interface LoginRequest {
  username: string;
  password: string;
}

/** Body returned by `POST /api/v1/auth/login` and `POST /api/v1/auth/refresh`. Lifetimes are in seconds. */
export interface LoginResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  refreshToken: string;
  refreshExpiresIn: number;
}

/** What is kept for the browser session. The password is never stored. */
export interface Session {
  accessToken: string;
  refreshToken: string;
  /**
   * Epoch milliseconds when the refresh token, and therefore the session, ends. The access
   * token expiry is not tracked: the backend answering 401 is what triggers a refresh.
   */
  expiresAt: number;
  username: string;
}
