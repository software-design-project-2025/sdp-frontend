import { TestBed } from '@angular/core/testing';

import { SessionsService } from './sessions.service';

xdescribe('SessionsService', () => {
  let service: SessionsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SessionsService);
  });

  xit('should be created', () => {
    expect(service).toBeTruthy();
  });
});
