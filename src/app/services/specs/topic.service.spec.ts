import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TopicApiService } from '../topic.service';
import { environment } from '../../../environments/environment.prod';

describe('TopicApiService', () => {
  let service: TopicApiService;
  let httpMock: HttpTestingController;
  const apiBaseUrl = environment.apiBaseUrl;
  const testUserId = 'user-123';

  // --- MOCK DATA ---
  const mockTopics = [
    { topicid: 1, title: 'Angular Signals', status: 'Completed' },
    { topicid: 2, title: 'RxJS Operators', status: 'In Progress' }
  ];
  const mockTopicStats = { totalHours: 42, topicsCompleted: 5 };
  const mockWeeklyStats = [{ weekLabel: 'This Week', hoursStudied: 10 }];

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [TopicApiService]
    });
    service = TestBed.inject(TopicApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    // Ensure that there are no outstanding requests after each test
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getAllTopics', () => {
    it('should make a GET request to the correct topics endpoint', () => {
      service.getAllTopics(testUserId).subscribe(topics => {
        expect(topics).toEqual(mockTopics);
      });

      const req = httpMock.expectOne(`${apiBaseUrl}/api/topic/${testUserId}`);
      expect(req.request.method).toBe('GET');
      expect(req.request.headers.has('Authorization')).toBe(true);

      req.flush(mockTopics);
    });
  });

  describe('getTopicStats', () => {
    it('should make a GET request to the correct topic stats endpoint', () => {
      service.getTopicStats(testUserId).subscribe(stats => {
        expect(stats).toEqual(mockTopicStats);
      });

      const req = httpMock.expectOne(`${apiBaseUrl}/api/topic/stats/${testUserId}`);
      expect(req.request.method).toBe('GET');
      req.flush(mockTopicStats);
    });
  });

  describe('getWeeklyStats', () => {
    it('should make a GET request to the correct weekly stats endpoint', () => {
      service.getWeeklyStats(testUserId).subscribe(stats => {
        expect(stats).toEqual(mockWeeklyStats);
      });

      const req = httpMock.expectOne(`${apiBaseUrl}/api/topic/weekly-hours/${testUserId}`);
      expect(req.request.method).toBe('GET');
      req.flush(mockWeeklyStats);
    });

    it('should handle a server error', () => {
      const errorMessage = 'Not Found';
      service.getWeeklyStats(testUserId).subscribe({
        next: () => fail('should have failed with a 404 error'),
        error: (error) => {
          expect(error.status).toBe(404);
          expect(error.statusText).toBe(errorMessage);
        }
      });

      const req = httpMock.expectOne(`${apiBaseUrl}/api/topic/weekly-hours/${testUserId}`);
      req.flush(errorMessage, { status: 404, statusText: errorMessage });
    });
  });
});
