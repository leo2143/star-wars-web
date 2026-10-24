import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { safeReturnUrl } from './return-url';
import { AuthService } from '../session/auth.service';

/**
 * Navigation convenience only: keeps anonymous users out of the protected screens.
 * The backend remains the one enforcing authorization on every API call.
 */
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  if (auth.hasValidSession()) return true;

  const router = inject(Router);
  const returnUrl = safeReturnUrl(state.url);
  return router.createUrlTree(['/login'], returnUrl ? { queryParams: { returnUrl } } : {});
};

/** Keeps signed-in users away from the login page. */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.hasValidSession() ? inject(Router).createUrlTree(['/dashboard']) : true;
};
