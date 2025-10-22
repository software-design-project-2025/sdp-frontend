import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SessionTimer } from './session-timer';

describe('SessionTimer', () => {
  let component: SessionTimer;
  let fixture: ComponentFixture<SessionTimer>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SessionTimer]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SessionTimer);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
