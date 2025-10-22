import { Component, OnDestroy, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { TimerService, TimerState } from '../services/timer.service'; // Adjust path
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
// **** NEW: Import DragDropModule ****
import { DragDropModule } from '@angular/cdk/drag-drop';

@Component({
  selector: 'app-session-timer',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    DragDropModule // **** ADD DragDropModule ****
  ],
  templateUrl: './session-timer.html', // Use templateUrl
  styleUrls: ['./session-timer.scss'], // Use styleUrls
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SessionTimer implements OnDestroy {
  timerState: TimerState | null = null;
  private timerSubscription: Subscription;

  constructor(
    private timerService: TimerService,
    private cdr: ChangeDetectorRef
  ) {
    this.timerSubscription = this.timerService.timerState$.subscribe(state => {
      this.timerState = state;
      this.cdr.detectChanges();
    });
  }

  stop(): void {
    this.timerService.stopTimer();
  }

  ngOnDestroy(): void {
    this.timerSubscription?.unsubscribe();
  }
}
