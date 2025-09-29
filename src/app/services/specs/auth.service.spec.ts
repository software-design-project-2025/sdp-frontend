import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { Router } from '@angular/router';
import { AuthService, profiles } from '../auth.service';
import { environment } from '../../../environments/environment.prod';
import * as supabaseJs from '@supabase/supabase-js';
import { User } from '@supabase/supabase-js';

// --- MOCK DATA ---
const mockUser: User = {
  id: 'user-123',
  email: 'test@example.com',
  user_metadata: { name: 'Test User' },
  app_metadata: {},
  aud: 'authenticated',
  created_at: new Date().toISOString(),
};
const mockSession = { access_token: 'abc-123', user: mockUser };
// const mockProfile: profiles = { id: 'user-123', name: 'Test User', email: 'test@example.com' };

xdescribe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let router: Router;
  let mockSupabaseClient: any;

  // FIX: Make the beforeEach async to ensure proper setup order
  beforeEach(async () => {
    mockSupabaseClient = {
      auth: {
        signInWithPassword: jasmine.createSpy('signInWithPassword'),
        signInWithOAuth: jasmine.createSpy('signInWithOAuth'),
        signUp: jasmine.createSpy('signUp'),
        refreshSession: jasmine.createSpy('refreshSession'),
        getSession: jasmine.createSpy('getSession'),
        signOut: jasmine.createSpy('signOut'),
      },
      from: jasmine.createSpy('from').and.callFake(() => ({
        select: jasmine.createSpy('select').and.returnValue({
          eq: jasmine.createSpy('eq').and.returnValue({
            maybeSingle: jasmine.createSpy('maybeSingle'),
          }),
        }),
        upsert: jasmine.createSpy('upsert'),
      })),
    };

    // Spy on the createClient function BEFORE configuring the TestBed
    spyOn(supabaseJs, 'createClient').and.returnValue(mockSupabaseClient);

    // FIX: Await the TestBed configuration
    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, RouterTestingModule.withRoutes([])],
      providers: [AuthService],
    }).compileComponents(); // Use compileComponents for consistency with async setup

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('signIn', () => {
    it('should call supabase.auth.signInWithPassword and return data on success', async () => {
      const mockAuthResponse = { data: { session: mockSession }, error: null };
      mockSupabaseClient.auth.signInWithPassword.and.returnValue(Promise.resolve(mockAuthResponse));
      const result = await service.signIn('test@example.com', 'password');
      expect(result.data).toEqual(mockAuthResponse.data);
      expect(result.error).toBeNull();
    });

    it('should return an error message on failure', async () => {
      const mockError = { message: 'Invalid credentials' };
      mockSupabaseClient.auth.signInWithPassword.and.returnValue(Promise.resolve({ data: null, error: mockError }));
      const result = await service.signIn('test@example.com', 'wrong-password');
      expect(result.error).toEqual({ message: 'Invalid credentials' });
    });
  });

  describe('signUp', () => {
    it('should perform signUp, refreshSession, and upsert profile on success', async () => {
      mockSupabaseClient.auth.signUp.and.returnValue(Promise.resolve({ data: { user: mockUser }, error: null }));
      mockSupabaseClient.auth.refreshSession.and.returnValue(Promise.resolve({ data: { session: mockSession }, error: null }));
      mockSupabaseClient.from().upsert.and.returnValue(Promise.resolve({ error: null }));

      const result = await service.signUp('test@example.com', 'password', 'Test User');

      expect(mockSupabaseClient.auth.signUp).toHaveBeenCalled();
      expect(mockSupabaseClient.auth.refreshSession).toHaveBeenCalled();
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('profiles');
      expect(result.user).toEqual(mockUser);
    });

    it('should throw an error if supabase.auth.signUp fails', async () => {
      const authError = new Error('Auth sign up failed');
      // FIX: Ensure the mock response shape matches what the signUp method expects for destructuring
      mockSupabaseClient.auth.signUp.and.returnValue(Promise.resolve({ data: { user: null }, error: authError }));

      await expectAsync(service.signUp('test@example.com', 'password', 'Test')).toBeRejectedWith(authError);
      expect(mockSupabaseClient.auth.refreshSession).not.toHaveBeenCalled();
    });
  });

  describe('getCurrentUser', () => {
    it('should get session and emit the current user', async () => {
      mockSupabaseClient.auth.getSession.and.returnValue(Promise.resolve({ data: { session: mockSession }, error: null }));
      let emittedUser: any;
      service.currentUser$.subscribe(user => emittedUser = user);

      await service.getCurrentUser();

      expect(emittedUser).toEqual(mockUser);
    });
  });

  describe('signOut', () => {
    it('should call supabase.auth.signOut and navigate to login on success', fakeAsync(() => {
      mockSupabaseClient.auth.signOut.and.returnValue(Promise.resolve({ error: null }));
      const navigateSpy = spyOn(router, 'navigate');

      service.signOut();
      tick();

      expect(mockSupabaseClient.auth.signOut).toHaveBeenCalled();
      expect(navigateSpy).toHaveBeenCalledWith(['/login']);
    }));
  });

  describe('createUser', () => {
    it('should make a POST request to create a user in the backend', () => {
      const newUserId = 'new-user-456';
      service.createUser(newUserId).subscribe();
      const req = httpMock.expectOne(`${environment.apiBaseUrl}/api/users/createUser`);
      expect(req.request.method).toBe('POST');
      req.flush({ success: true });
    });
  });
});
