import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SessionRoom } from './session-room';

describe('SessionRoom', () => {
  let component: SessionRoom;
  let fixture: ComponentFixture<SessionRoom>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SessionRoom]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SessionRoom);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
