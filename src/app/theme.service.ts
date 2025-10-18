// src/app/theme.service.ts
import { DOCUMENT } from '@angular/common';
import { Injectable, Renderer2, RendererFactory2, signal, effect, inject } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private renderer: Renderer2;
  private rendererFactory = inject(RendererFactory2);
  private document = inject(DOCUMENT);

  // Use a signal to hold the current theme state
  isDark = signal<boolean>(false);

  constructor() {
    this.renderer = this.rendererFactory.createRenderer(null, null);

    // An effect that runs whenever the isDark signal changes
    effect(() => {
      // Save the new theme preference to localStorage
      localStorage.setItem('isDarkMode', JSON.stringify(this.isDark()));

      // Apply or remove the .dark-theme class from the body
      if (this.isDark()) {
        this.renderer.addClass(this.document.body, 'dark-theme');
      } else {
        this.renderer.removeClass(this.document.body, 'dark-theme');
      }
    });
  }

  /**
   * Initializes the theme based on user preference or system settings.
   * This should be called once when the app loads.
   */
  initTheme() {
    const storedPreference = localStorage.getItem('isDarkMode');
    if (storedPreference) {
      this.isDark.set(JSON.parse(storedPreference));
    } else {
      // If no preference is stored, check the system's preferred color scheme
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      this.isDark.set(prefersDark);
    }
  }

  /**
   * Toggles the theme between light and dark.
   */
  toggleTheme() {
    this.isDark.update(current => !current);
  }
}
