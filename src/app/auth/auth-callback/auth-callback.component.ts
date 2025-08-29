// src/app/auth/auth-callback/auth-callback.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-auth-callback',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex items-center justify-center min-h-screen">
      <div class="text-center">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p>Completing authentication...</p>
      </div>
    </div>
  `
})
export class AuthCallbackComponent implements OnInit {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  async ngOnInit() {
    try {
      const response = await this.authService.handleAuthCallback();
      
      if (response.error) {
        console.error('Auth callback error:', response.error);
        this.router.navigate(['/login'], { 
          queryParams: { error: 'Authentication failed' } 
        });
        return;
      }

      if (response.data.session) {
      } else {
        this.router.navigate(['/login'], { 
          queryParams: { error: 'No session found' } 
        });
      }
    } catch (error) {
      console.error('Auth callback error:', error);
      this.router.navigate(['/login'], { 
        queryParams: { error: 'Authentication failed' } 
      });
    }
  }
}