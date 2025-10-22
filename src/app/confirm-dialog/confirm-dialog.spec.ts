import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { By } from '@angular/platform-browser';

import { ConfirmDialog, ConfirmDialogData } from './confirm-dialog'; // Removed .ts extension

describe('ConfirmDialog', () => {
  let component: ConfirmDialog;
  let fixture: ComponentFixture<ConfirmDialog>;
  let mockDialogRef: jasmine.SpyObj<MatDialogRef<ConfirmDialog>>;
  let nativeElement: HTMLElement;
  const mockDialogData: ConfirmDialogData = {
    title: 'Test Title',
    message: 'Are you sure about this test?',
  };

  beforeEach(async () => {
    // Create a spy object for MatDialogRef
    mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      imports: [
        ConfirmDialog, // Import the standalone component
        MatDialogModule,
        MatButtonModule,
        NoopAnimationsModule, // Disable animations
      ],
      providers: [
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: MAT_DIALOG_DATA, useValue: mockDialogData },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ConfirmDialog);
    component = fixture.componentInstance;
    nativeElement = fixture.nativeElement;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display the title and message from injected data', () => {
    const title = nativeElement.querySelector('h2[mat-dialog-title]');
    const message = nativeElement.querySelector('mat-dialog-content p');

    expect(title).toBeTruthy();
    expect(title?.textContent).toBe('Test Title');
    expect(message).toBeTruthy();
    expect(message?.textContent).toBe('Are you sure about this test?');
  });

  it('should not display the title if it is not provided in data', () => {
    // Re-create the component with different data
    TestBed.overrideProvider(MAT_DIALOG_DATA, { useValue: { message: 'No title test' } });
    fixture = TestBed.createComponent(ConfirmDialog);
    component = fixture.componentInstance;
    nativeElement = fixture.nativeElement;
    fixture.detectChanges();

    const title = nativeElement.querySelector('h2[mat-dialog-title]');
    expect(title).toBeFalsy();
  });

  it('should call dialogRef.close(true) when onConfirm is called', () => {
    component.onConfirm();
    expect(mockDialogRef.close).toHaveBeenCalledWith(true);
  });

  it('should call dialogRef.close(false) when onDismiss is called', () => {
    component.onDismiss();
    expect(mockDialogRef.close).toHaveBeenCalledWith(false);
  });

  it('should bind the "Yes" button to onConfirm()', () => {
    spyOn(component, 'onConfirm');

    // Find the button with the 'warn' color
    const confirmButton = fixture.debugElement.query(By.css('button[color="warn"]')).nativeElement;
    confirmButton.click();

    expect(component.onConfirm).toHaveBeenCalled();
  });

  it('should bind the "No" button to onDismiss()', () => {
    spyOn(component, 'onDismiss');

    // Find the first button that is not the 'warn' button
    const dismissButton = fixture.debugElement.query(By.css('button:not([color="warn"])')).nativeElement;
    dismissButton.click();

    expect(component.onDismiss).toHaveBeenCalled();
  });
});
