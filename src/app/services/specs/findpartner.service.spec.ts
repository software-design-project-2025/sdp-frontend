import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ApiService } from '../findpartner.service';
import { environment } from '../../../environments/environment.prod';

describe('ApiService', () => {
  let service: ApiService;
  let httpMock: HttpTestingController;
  const apiBaseUrl = environment.apiBaseUrl;

  // --- MOCK DATA ---
  const mockUsers = [{ userid: 'user-1', username: 'Alice' }];
  const mockDegrees = [{ degreeid: 101, degree_name: 'Computer Science' }];
  const mockModules = [{ courseCode: 'CS101', courseName: 'Intro to Programming' }];
  const mockUserCourses = [{ userid: 'user-1', courseCode: 'CS101' }];

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ApiService]
    });
    service = TestBed.inject(ApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    // Ensure that there are no outstanding requests after each test
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getUser', () => {
    it('should make a GET request to the users endpoint', () => {
      service.getUser().subscribe(users => {
        expect(users).toEqual(mockUsers);
      });

      const req = httpMock.expectOne(`${apiBaseUrl}/api/users/all`);
      expect(req.request.method).toBe('GET');
      expect(req.request.headers.has('Authorization')).toBe(true);
      req.flush(mockUsers);
    });
  });

  describe('getDegree', () => {
    it('should make a GET request to the degrees endpoint', () => {
      service.getDegree().subscribe(degrees => {
        expect(degrees).toEqual(mockDegrees);
      });

      const req = httpMock.expectOne(`${apiBaseUrl}/api/degree/all`);
      expect(req.request.method).toBe('GET');
      req.flush(mockDegrees);
    });
  });

  describe('getModule', () => {
    it('should make a GET request to the modules endpoint', () => {
      service.getModule().subscribe(modules => {
        expect(modules).toEqual(mockModules);
      });

      const req = httpMock.expectOne(`${apiBaseUrl}/api/module/all`);
      expect(req.request.method).toBe('GET');
      req.flush(mockModules);
    });
  });

  describe('getUserCourseById', () => {
    it('should make a GET request to the specific user course endpoint', () => {
      const testUserId = 'user-1';
      service.getUserCourseById(testUserId).subscribe(courses => {
        expect(courses).toEqual(mockUserCourses);
      });

      const req = httpMock.expectOne(`${apiBaseUrl}/api/courses/${testUserId}`);
      expect(req.request.method).toBe('GET');
      req.flush(mockUserCourses);
    });
  });

  describe('getAllUserCourses', () => {
    it('should make a GET request to the all user courses endpoint', () => {
      service.getAllUserCourses().subscribe(courses => {
        expect(courses).toEqual(mockUserCourses);
      });

      const req = httpMock.expectOne(`${apiBaseUrl}/api/courses/all`);
      expect(req.request.method).toBe('GET');
      req.flush(mockUserCourses);
    });

    it('should handle a server error', () => {
      const errorMessage = 'Internal Server Error';
      service.getAllUserCourses().subscribe({
        next: () => fail('should have failed with a 500 error'),
        error: (error) => {
          expect(error.status).toBe(500);
          expect(error.statusText).toBe(errorMessage);
        }
      });

      const req = httpMock.expectOne(`${apiBaseUrl}/api/courses/all`);
      req.flush(errorMessage, { status: 500, statusText: errorMessage });
    });
  });

  describe('postData', () => {
    it('should make a POST request to the specified endpoint', () => {
      const postData = { name: 'test' };
      const mockResponse = { id: 1, name: 'test' };

      service.postData(postData).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne('YOUR_API_ENDPOINT/data');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(postData);
      // This method does not use the getHeaders() helper, so we check that the header is NOT present
      expect(req.request.headers.has('Authorization')).toBe(false);

      req.flush(mockResponse);
    });
  });
});
