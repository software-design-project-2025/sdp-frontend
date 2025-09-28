import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FindPartners } from './findpartners';

describe('FindPartners', () => {
  let component: FindPartners;
  let fixture: ComponentFixture<FindPartners>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FindPartners]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FindPartners);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
