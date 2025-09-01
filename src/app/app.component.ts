// src/app/app.component.ts
// import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { Router, NavigationEnd, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';
import {Navbar} from './navbar/navbar';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, Navbar],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'sdp-frontend';

  showNavbar = true; // Default to false, router will set it to true on pages other than login

  constructor(private router: Router) {
    // Listen for route changes to determine if the navbar should be shown
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      // Check if the current URL is the login page
      this.showNavbar = !(event.url === '/login' || event.urlAfterRedirects === '/login');
    });
  }
}
