import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AcademicApiService } from '../academic.service';
import { environment } from '../../../environments/environment.prod';

describe('AcademicApiService', () => {
  let service: AcademicApiService;
  let httpMock: HttpTestingController;
  const apiBaseUrl = environment.apiBaseUrl;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AcademicApiService]
    });
    service = TestBed.inject(AcademicApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    // Ensure that there are no outstanding requests after each test
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getAllDegrees', () => {
    it('should make a GET request to the degrees endpoint and return data', () => {
      const mockDegrees = [
        { degreeid: 1, degree_name: 'BSc Computer Science' },
        { degreeid: 2, degree_name: 'BCom Accounting' }
      ];

      // Subscribe to the method
      service.getAllDegrees().subscribe(degrees => {
        expect(degrees).toEqual(mockDegrees);
      });

      // Expect a request to the correct URL with the correct method
      const req = httpMock.expectOne(`${apiBaseUrl}/api/degree/all`);
      expect(req.request.method).toBe('GET');

      // Check for the presence of the Authorization header
      expect(req.request.headers.has('Authorization')).toBe(true);

      // Respond with mock data
      req.flush(mockDegrees);
    });

    it('should handle an error if the API call fails', () => {
      const errorMessage = 'Internal Server Error';

      service.getAllDegrees().subscribe({
        next: () => fail('should have failed with the 500 error'),
        error: (error) => {
          expect(error.status).toEqual(500);
          expect(error.statusText).toEqual(errorMessage);
        },
      });

      const req = httpMock.expectOne(`${apiBaseUrl}/api/degree/all`);
      req.flush(errorMessage, { status: 500, statusText: errorMessage });
    });
  });

  describe('getAllModules', () => {
    it('should make a GET request to the modules endpoint and return data', () => {
      const mockModules = [
        { courseCode: 'COMS101', courseName: 'Intro to Programming' },
        { courseCode: 'MATH101', courseName: 'Calculus I' }
      ];

      service.getAllModules().subscribe(modules => {
        expect(modules).toEqual(mockModules);
      });

      const req = httpMock.expectOne(`${apiBaseUrl}/api/module/all`);
      expect(req.request.method).toBe('GET');
      expect(req.request.headers.has('Authorization')).toBe(true);
      req.flush(mockModules);
    });

    it('should handle an error if the API call fails', () => {
      const errorMessage = 'Not Found';

      service.getAllModules().subscribe({
        next: () => fail('should have failed with the 404 error'),
        error: (error) => {
          expect(error.status).toEqual(404);
          expect(error.statusText).toEqual(errorMessage);
        },
      });

      const req = httpMock.expectOne(`${apiBaseUrl}/api/module/all`);
      req.flush(errorMessage, { status: 404, statusText: errorMessage });
    });
  });
});
