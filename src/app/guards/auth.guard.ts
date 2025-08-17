// guards/auth.guard.ts
import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(): Promise<boolean> {
    return new Promise((resolve) => {
      this.authService.getCurrentUser().then((response) => {
        if (response.data.user) {
          resolve(true);
        } else {
          this.router.navigate(['/login']);
          resolve(false);
        }
      }).catch(() => {
        this.router.navigate(['/login']);
        resolve(false);
      });
    });
  }
}