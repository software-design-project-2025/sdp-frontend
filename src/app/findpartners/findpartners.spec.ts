import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Findpartners } from './findpartners';

describe('Findpartners', () => {
  let component: Findpartners;
  let fixture: ComponentFixture<Findpartners>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Findpartners]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Findpartners);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
