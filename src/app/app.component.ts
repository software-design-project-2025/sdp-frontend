// src/app/app.component.ts
// import { HttpClient } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { ThemeService } from './theme.service';
import { Router, NavigationEnd, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';
import {Navbar} from './navbar/navbar';
//import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, Navbar],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'sdp-frontend';
  private themeService = inject(ThemeService);

  showNavbar = true; // Default to false, router will set it to true on pages other than login

  constructor(private router: Router) {
    this.themeService.initTheme();
    // Listen for route changes to determine if the navbar should be shown
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      // Check if the current URL is the login page
      this.showNavbar = !(event.url === '/login' || event.urlAfterRedirects === '/login' ||
                          event.url === '/login-success' || event.urlAfterRedirects === '/login-success' ||
                          event.url === '/signup' || event.urlAfterRedirects === '/signup' ||
                          event.url === '/landingpage' || event.urlAfterRedirects === '/landingpage');
    });
  }
}
