import { ApplicationConfig, provideZoneChangeDetection, importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { ReactiveFormsModule } from '@angular/forms';
import { provideClientHydration } from '@angular/platform-browser';
// **** NEW: Import provideAnimations ****
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

// **** NEW: Import required Angular Material Modules ****
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon'; // Good to include if using mat-icon later

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    // provideZoneChangeDetection({ eventCoalescing: true }), // Standard Zone detection
    provideRouter(routes),
    provideHttpClient(),
    provideClientHydration(),
    // **** NEW: Provide Browser Animations ****
    provideAnimationsAsync(),
    // **** NEW: Import Material Modules ****
    importProvidersFrom(
      ReactiveFormsModule, // Keep existing imports
      MatSnackBarModule,
      MatDialogModule,
      MatButtonModule,
      MatProgressSpinnerModule,
      MatFormFieldModule,
      MatInputModule,
      MatIconModule // Include IconModule
    )
  ]
};
