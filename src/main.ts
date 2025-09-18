// src/main.ts
import 'zone.js'; 
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';  // Correct import path
import { provideRouter } from '@angular/router';
import { routes } from './app/app.routes';
import { provideHttpClient } from '@angular/common/http';

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes),
    provideHttpClient()
  ]
}).catch(err => console.error(err));