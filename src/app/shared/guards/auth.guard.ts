import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return auth.waitForSession().then((ok: boolean) => {
    if (ok) {
      return true;
    }
    router.navigate(['/login']);
    return false;
  });
};
