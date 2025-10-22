import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ChangeDetectorRef } from '@angular/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { BehaviorSubject, Subscription } from 'rxjs';
import { By } from '@angular/platform-browser';

import { SessionTimer } from './session-timer'; // Removed .ts extension
import { TimerService, TimerState } from '../services/timer.service'; // Adjust path
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { DragDropModule } from '@angular/cdk/drag-drop';

// --- MOCK TIMER SERVICE ---
const initialTimerState: TimerState = {
  isActive: false,
  elapsedTimeString: '00:00:00',
  sessionId: null,
  startTime: null,
  endTime: null,
  elapsedSeconds: 0
};

class MockTimerService {
  timerState$ = new BehaviorSubject<TimerState>(initialTimerState);
  stopTimer = jasmine.createSpy('stopTimer');

  // Helper method to simulate emitting a new state
  emit(state: TimerState) {
    this.timerState$.next(state);
  }
}

describe('SessionTimer', () => {
  let component: SessionTimer;
  let fixture: ComponentFixture<SessionTimer>;
  let mockTimerService: MockTimerService;
  let nativeElement: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        SessionTimer, // The standalone component
        NoopAnimationsModule,
        MatIconModule,
        MatButtonModule,
        DragDropModule
      ],
      providers: [
        { provide: TimerService, useClass: MockTimerService },
        // Provide a mock ChangeDetectorRef just in case
        { provide: ChangeDetectorRef, useValue: { detectChanges: () => {} } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SessionTimer);
    component = fixture.componentInstance;
    nativeElement = fixture.nativeElement;

    // Get the injected instance of the mock service
    mockTimerService = TestBed.inject(TimerService) as any;

    // Manually trigger initial data binding
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should not display the timer widget when timer is inactive', () => {
    // Service starts with isActive: false
    expect(component.timerState?.isActive).toBe(false);

    const widget = nativeElement.querySelector('.session-timer-widget');
    expect(widget).toBeFalsy();
  });

  it('should display the timer widget when timer becomes active', () => {
    // Simulate timer starting
    mockTimerService.emit({
      isActive: true,
      elapsedTimeString: '00:00:01',
      sessionId: 1,
      startTime: new Date(), // <-- FIX
      endTime: null,
      elapsedSeconds: 1
    });
    fixture.detectChanges();

    const widget = nativeElement.querySelector('.session-timer-widget');
    expect(widget).toBeTruthy();
  });

  it('should display the correct elapsed time string', () => {
    const testTime = '00:15:30';
    mockTimerService.emit({
      isActive: true,
      elapsedTimeString: testTime,
      sessionId: 1,
      startTime: new Date(), // <-- FIX
      endTime: null,
      elapsedSeconds: 930
    });
    fixture.detectChanges();

    const display = nativeElement.querySelector('.timer-display');
    expect(display).toBeTruthy();
    expect(display?.textContent).toContain(testTime);
  });

  it('should update the displayed time as the state changes', () => {
    // Start at 1s
    mockTimerService.emit({
      isActive: true,
      elapsedTimeString: '00:00:01',
      sessionId: 1,
      startTime: new Date(), // <-- FIX
      endTime: null,
      elapsedSeconds: 1
    });
    fixture.detectChanges();
    const display = nativeElement.querySelector('.timer-display');
    expect(display?.textContent).toContain('00:00:01');

    // Emit 2s
    mockTimerService.emit({
      isActive: true,
      elapsedTimeString: '00:00:02',
      sessionId: 1,
      startTime: new Date(), // <-- FIX
      endTime: null,
      elapsedSeconds: 2
    });
    fixture.detectChanges();
    expect(display?.textContent).toContain('00:00:02');
  });

  it('should call timerService.stopTimer() when the stop button is clicked', () => {
    // Make the button visible
    mockTimerService.emit({
      isActive: true,
      elapsedTimeString: '00:00:05',
      sessionId: 1,
      startTime: new Date(), // <-- FIX
      endTime: null,
      elapsedSeconds: 5
    });
    fixture.detectChanges();

    const stopButton = nativeElement.querySelector('button[aria-label="Stop session timer"]') as HTMLButtonElement;
    expect(stopButton).toBeTruthy();

    stopButton.click();

    expect(mockTimerService.stopTimer).toHaveBeenCalled();
  });

  it('should hide the widget when the timer is stopped', () => {
    // Make it visible
    mockTimerService.emit({
      isActive: true,
      elapsedTimeString: '00:00:05',
      sessionId: 1,
      startTime: new Date(), // <-- FIX
      endTime: null,
      elapsedSeconds: 5
    });
    fixture.detectChanges();
    expect(nativeElement.querySelector('.session-timer-widget')).toBeTruthy();

    // Now, emit an inactive state (simulating what stopTimer would do)
    mockTimerService.emit({
      isActive: false,
      elapsedTimeString: '00:00:05',
      sessionId: 1,
      startTime: new Date(), // <-- FIX
      endTime: new Date(Date.now() + 5000), // <-- FIX
      elapsedSeconds: 5
    });
    fixture.detectChanges();

    expect(nativeElement.querySelector('.session-timer-widget')).toBeFalsy();
  });

  it('should unsubscribe from the timer subscription on destroy', () => {
    // Spy on the component's subscription
    const subscription = component['timerSubscription'];
    spyOn(subscription, 'unsubscribe');

    // Trigger the destroy lifecycle hook
    component.ngOnDestroy();

    expect(subscription.unsubscribe).toHaveBeenCalled();
  });
});
