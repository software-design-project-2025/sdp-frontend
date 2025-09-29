import { Component } from '@angular/core';
import { CommonModule } from '@angular/common'; // Make sure CommonModule is imported

@Component({
  selector: 'app-landing-page',
  standalone: true, // Assuming this is a standalone component
  imports: [CommonModule], // Import CommonModule for *ngFor, [ngClass], etc.
  templateUrl: './landingpage.html',
  styleUrls: ['./landingpage.scss']
})
export class LandingPage {

  // This property will control which content section is visible
  activeTab: string = 'Home';

  // Updated navLinks array, no 'path' needed
  navLinks = ['Home', 'About', 'Features', 'Community'];

  // Placeholder logos for the footer section
  universityPartners = [
    { name: 'Wits' },
    { name: 'UP' },
    { name: 'UCT' },
    { name: 'NWU' },
    { name: 'UJ' },
  ];

  constructor() { }

  /**
   * Sets the active tab when a navigation link is clicked.
   * @param tab The name of the tab to make active.
   */
  selectTab(tab: string): void {
    this.activeTab = tab;
  }
}
