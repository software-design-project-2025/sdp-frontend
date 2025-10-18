import { Component, ChangeDetectionStrategy, inject } from '@angular/core'; // Add inject
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../services';
import { ThemeService } from '../theme.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, NgOptimizedImage, RouterModule],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Navbar {
  isMenuOpen = false;

  themeService = inject(ThemeService);

  navLinks = [
    { name: 'Dashboard', path: '/home' },
    { name: 'Find Partners', path: '/findpartners' },
    { name: 'Chat', path: '/chat' },
    { name: 'Study Sessions', path: '/sessions' },
    { name: 'Progress', path: '/progress' },
    { name: 'Profile', path: '/profile' },
  ];

  // Inject both AuthService and Router
  private authService = inject(AuthService);
  private router = inject(Router);

  toggleMenu(): void {
    this.isMenuOpen = !this.isMenuOpen;
  }

  /**
   * Signs the user out using the AuthService and navigates to the login page.
   * `replaceUrl: true` prevents the user from going back to the previous page.
   */
  async logout(): Promise<void> {
    // We assume the service's signOut method handles the core logout logic.
    // The component will handle the navigation to ensure `replaceUrl` is used.
    const error = await this.authService.signOut();
    if (!error) {
      // Navigate to login and replace the current history entry
      await this.router.navigate(['/login'], {replaceUrl: true});
    } else {
      console.error('Error signing out:', error);
      // Optionally handle logout errors in the UI
    }
  }
}

