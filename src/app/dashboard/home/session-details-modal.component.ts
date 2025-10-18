// session-details-modal.component.ts
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-session-details-modal',
    standalone: true,
    imports: [CommonModule],
    template: `
        <div class="modal-overlay" (click)="closeModal()">
        <div class="modal-content" (click)="$event.stopPropagation()">
            <button class="close-btn" (click)="closeModal()">×</button>
            
            <header class="modal-header">
            <h2>{{ session?.title }}</h2>
            <p>Organized by: <strong>{{ session?.creatorName || 'Loading...' }}</strong></p>
            </header>

            <div class="modal-body">
            <div class="info-grid">
                <div class="info-item">
                <span class="info-label">Status</span>
                <span class="status-chip" [class.completed]="session?.isPast">{{ session?.isPast ? 'Completed' : 'Upcoming' }}</span>
                </div>
                
                <div class="info-item">
                <span class="info-label">Date</span>
                <span>{{ session?.start | date:'fullDate' }}</span>
                </div>
                
                <div class="info-item">
                <span class="info-label">Time</span>
                <span>{{ session?.start | date:'shortTime' }} - {{ session?.end | date:'shortTime' }}</span>
                </div>
                
                <div class="info-item">
                <span class="info-label">Location</span>
                <span>{{ session?.location || 'No location specified' }}</span>
                </div>
            </div>
            
            <div class="description-section" *ngIf="session?.description">
                <h3>Description</h3>
                <p>{{ session?.description }}</p>
            </div>
            </div>
        </div>
        </div>
    `,
    styleUrls: ['./session-details-modal.component.scss']
})
export class SessionDetailsModalComponent {
    @Input() session: any;
    @Output() close = new EventEmitter<void>();

    closeModal(): void {
        this.close.emit();
    }
}