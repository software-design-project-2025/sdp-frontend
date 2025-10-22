import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subscription, interval, map, takeWhile } from 'rxjs';
import { Session } from '../models/session.model'; // Adjust path if needed

export interface TimerState {
  isActive: boolean;
  sessionId: number | null;
  startTime: Date | null;
  endTime: Date | 'infinity' | null;
  elapsedSeconds: number;
  elapsedTimeString: string;
}

@Injectable({
  providedIn: 'root'
})
export class TimerService {
  private timerSubscription: Subscription | null = null;
  private initialState: TimerState = {
    isActive: false,
    sessionId: null,
    startTime: null,
    endTime: null,
    elapsedSeconds: 0,
    elapsedTimeString: '00:00:00'
  };
  private timerState = new BehaviorSubject<TimerState>(this.initialState);
  timerState$: Observable<TimerState> = this.timerState.asObservable();

  // Key for storage
  private readonly STORAGE_KEY = 'activeSessionTimer';

  constructor() {
    this.initTimerFromStorage(); // Check storage on startup
  }

  startTimer(session: Session): void {
    if (!session.sessionId || !(session.start_time instanceof Date)) { /* ... error handling ... */ return; }
    this.stopTimer(); // Stop and clear previous state/storage

    const now = new Date();
    const startTime = session.start_time;
    const endTime = (session.end_time instanceof Date) ? session.end_time : session.end_time === 'infinity' ? 'infinity' : null;

    // --- SAVE TO STORAGE ---
    try {
      const storedEndTime = (endTime instanceof Date) ? endTime.toISOString() : (endTime === 'infinity' ? 'infinity' : null);
      const timerData = {
        sessionId: session.sessionId,
        startTimeISO: startTime.toISOString(),
        endTimeISO: storedEndTime
      };
      sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(timerData)); // Use sessionStorage
      console.log("Timer state saved to sessionStorage.");
    } catch (e) {
      console.error("Failed to save timer state to sessionStorage:", e);
    }
    // --- END SAVE ---

    // ... (rest of startTimer logic: calculate initial elapsed, next state, start interval) ...
    let initialElapsed = Math.max(0, Math.floor((now.getTime() - startTime.getTime()) / 1000));
    const newState: TimerState = {
      isActive: true,
      sessionId: session.sessionId,
      startTime: startTime,
      endTime: endTime, // Keep original 'infinity' or Date
      elapsedSeconds: initialElapsed,
      elapsedTimeString: this.formatSeconds(initialElapsed)
    };
    this.timerState.next(newState);
    this._startInterval(startTime, endTime); // Use private helper for interval
  }

  stopTimer(): void {
    this.timerSubscription?.unsubscribe();
    this.timerSubscription = null;
    sessionStorage.removeItem(this.STORAGE_KEY); // Clear storage
    this.timerState.next(this.initialState);
    console.log("Timer stopped and sessionStorage cleared.");
  }

  private initTimerFromStorage(): void {
    try {
      const storedData = sessionStorage.getItem(this.STORAGE_KEY);
      if (!storedData) return; // No timer was active

      const timerData = JSON.parse(storedData);
      if (!timerData.sessionId || !timerData.startTimeISO) {
        console.warn("Invalid timer data found in sessionStorage.");
        sessionStorage.removeItem(this.STORAGE_KEY);
        return;
      }

      const startTime = new Date(timerData.startTimeISO);
      let endTime: Date | 'infinity' | null = null;
      if (timerData.endTimeISO === 'infinity') {
        endTime = 'infinity';
      } else if (timerData.endTimeISO) {
        endTime = new Date(timerData.endTimeISO);
      }

      // Validate parsed dates
      if (isNaN(startTime.getTime()) || (endTime instanceof Date && isNaN(endTime.getTime()))) {
        console.warn("Invalid date format in stored timer data.");
        sessionStorage.removeItem(this.STORAGE_KEY);
        return;
      }

      const now = new Date();

      // Check if session should still be active
      if (endTime instanceof Date && now >= endTime) {
        console.log("Stored timer session has ended.");
        sessionStorage.removeItem(this.STORAGE_KEY); // Session ended, clear storage
        return; // Don't restart
      }
      if (now < startTime) {
        console.log("Stored timer session hasn't started yet.");
        // Should ideally not happen if startTimer logic is correct, but good safety check
        sessionStorage.removeItem(this.STORAGE_KEY);
        return;
      }


      console.log("Resuming timer from sessionStorage.");
      // Reconstruct state and start interval
      const initialElapsed = Math.max(0, Math.floor((now.getTime() - startTime.getTime()) / 1000));
      const resumedState: TimerState = {
        isActive: true,
        sessionId: timerData.sessionId,
        startTime: startTime,
        endTime: endTime, // Store the Date object or 'infinity'
        elapsedSeconds: initialElapsed,
        elapsedTimeString: this.formatSeconds(initialElapsed)
      };
      this.timerState.next(resumedState);
      this._startInterval(startTime, endTime); // Restart interval logic

    } catch (e) {
      console.error("Error initializing timer from sessionStorage:", e);
      sessionStorage.removeItem(this.STORAGE_KEY); // Clear potentially corrupt data
    }
  }

  // Helper to contain the interval logic, used by startTimer and initTimerFromStorage
  private _startInterval(startTime: Date, endTime: Date | 'infinity' | null): void {
    this.timerSubscription?.unsubscribe(); // Ensure previous is stopped

    this.timerSubscription = interval(1000).pipe(
      map(() => {
        const currentNow = new Date();
        let elapsed = Math.max(0, Math.floor((currentNow.getTime() - startTime.getTime()) / 1000));
        let sessionEnded = false;
        let currentEndTime = (endTime instanceof Date) ? endTime : null; // Get Date object if exists

        if (currentEndTime && currentNow >= currentEndTime) {
          sessionEnded = true;
          elapsed = Math.max(0, Math.floor((currentEndTime.getTime() - startTime.getTime()) / 1000));
        }
        return { elapsed, sessionEnded };
      }),
      takeWhile(({ sessionEnded }) => !sessionEnded, true)
    ).subscribe({
      next: ({ elapsed }) => {
        if (!isNaN(elapsed)) { // Prevent NaN updates
          this.timerState.next({
            ...this.timerState.value,
            elapsedSeconds: elapsed,
            elapsedTimeString: this.formatSeconds(elapsed)
          });
        }
      },
      complete: () => {
        console.log("Session timer interval completed.");
        if(endTime instanceof Date) { // Only auto-stop if end time was defined
          this.showSessionEnded();
        }
      }
    });
  }
  // Called when a session with a defined end time finishes
  private showSessionEnded(): void {
    const currentState = this.timerState.value;
    // Keep elapsed time, mark as inactive, potentially clear session ID
    this.timerState.next({
      ...currentState,
      isActive: false, // Mark as inactive
      // sessionId: null, // Optionally clear session ID
      elapsedTimeString: `Ended (${this.formatSeconds(currentState.elapsedSeconds)})` // Show final time
    });
  }


  private formatSeconds(totalSeconds: number): string {
    if (isNaN(totalSeconds) || totalSeconds < 0) return "00:00:00";
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${this.pad(hours)}:${this.pad(minutes)}:${this.pad(seconds)}`;
  }

  private pad(num: number): string {
    return num.toString().padStart(2, '0');
  }
}
