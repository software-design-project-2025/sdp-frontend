import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { UserApiService } from '../user.service';
import { environment } from '../../../environments/environment.prod';

describe('UserApiService', () => {
  let service: UserApiService;
  let httpMock: HttpTestingController;
  const apiBaseUrl = environment.apiBaseUrl;
  const testUserId = 'user-123';

  // --- MOCK DATA ---
  const mockUser = { userid: testUserId, name: 'Jane Doe', bio: 'Test bio' };
  const mockUserCourses = { courses: ['CS101', 'MATH202'] };
  const mockUserStats = { studyHours: 120, topicsCompleted: 25 };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [UserApiService]
    });
    service = TestBed.inject(UserApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    // Verify that there are no outstanding requests after each test
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getUserById', () => {
    it('should make a GET request to the correct user endpoint', () => {
      service.getUserById(testUserId).subscribe(user => {
        expect(user).toEqual(mockUser);
      });

      const req = httpMock.expectOne(`${apiBaseUrl}/api/users/${testUserId}`);
      expect(req.request.method).toBe('GET');
      expect(req.request.headers.has('Authorization')).toBe(true);

      req.flush(mockUser);
    });
  });

  describe('getUserCourses', () => {
    it('should make a GET request to the correct user courses endpoint', () => {
      service.getUserCourses(testUserId).subscribe(courses => {
        expect(courses).toEqual(mockUserCourses);
      });

      const req = httpMock.expectOne(`${apiBaseUrl}/api/courses/${testUserId}`);
      expect(req.request.method).toBe('GET');
      req.flush(mockUserCourses);
    });
  });

  describe('getUserStats', () => {
    it('should make a GET request to the correct user stats endpoint', () => {
      service.getUserStats(testUserId).subscribe(stats => {
        expect(stats).toEqual(mockUserStats);
      });

      const req = httpMock.expectOne(`${apiBaseUrl}/api/users/stats/${testUserId}`);
      expect(req.request.method).toBe('GET');
      req.flush(mockUserStats);
    });

    it('should handle a server error', () => {
      const errorMessage = 'Service Unavailable';
      service.getUserStats(testUserId).subscribe({
        next: () => fail('should have failed with a 503 error'),
        error: (error) => {
          expect(error.status).toBe(503);
          expect(error.statusText).toBe(errorMessage);
        }
      });

      const req = httpMock.expectOne(`${apiBaseUrl}/api/users/stats/${testUserId}`);
      req.flush(errorMessage, { status: 503, statusText: errorMessage });
    });
  });
});
