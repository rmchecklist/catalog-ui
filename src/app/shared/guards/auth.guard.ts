import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const session = auth.session();
  if (!session) {
    router.navigate(['/login']);
    return false;
  }
  return true;
};
