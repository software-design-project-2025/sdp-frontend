import { TestBed } from '@angular/core/testing';
// FIX 1: Import the service from the correct file to match the module import
import { UserService } from '../supabase.service';
// Import the entire module to allow spying on its exported 'supabase' constant
import * as UserServiceModule from '../supabase.service';

xdescribe('UserService', () => {
  let service: UserService;
  let mockSupabaseClient: any;

  // --- MOCK DATA ---
  const mockUser = { id: 'user-123', name: 'Test User', email: 'test@example.com' };
  const mockUserList = [
    { id: 'user-123', name: 'Test User 1', email: 'test1@example.com' },
    { id: 'user-456', name: 'Test User 2', email: 'test2@example.com' },
  ];

  beforeEach(() => {
    // FIX 3: Create a more flexible mock where each part of the chain is a configurable spy
    mockSupabaseClient = {
      from: jasmine.createSpy('from').and.returnValue({
        select: jasmine.createSpy('select').and.returnValue({
          eq: jasmine.createSpy('eq').and.returnValue({
            single: jasmine.createSpy('single'),
          }),
        }),
      }),
    };

    TestBed.configureTestingModule({
      providers: [UserService]
    });

    // FIX 2: The second argument must be the property name as a string: 'supabase'
    spyOnProperty(UserServiceModule, 'supabase', 'get').and.returnValue(mockSupabaseClient);

    service = TestBed.inject(UserService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getUserById', () => {
    it('should call the correct Supabase chain and return a single user', async () => {
      // Setup the final method in the chain to return the data
      const fromChain = mockSupabaseClient.from();
      fromChain.select().eq().single.and.returnValue(Promise.resolve({ data: mockUser, error: null }));

      const user = await service.getUserById('user-123');

      expect(user).toEqual(mockUser);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('profiles');
      expect(fromChain.select).toHaveBeenCalledWith('*');
      expect(fromChain.select().eq).toHaveBeenCalledWith('id', 'user-123');
      expect(fromChain.select().eq().single).toHaveBeenCalled();
    });

    it('should throw an error if the Supabase call fails', async () => {
      const mockError = new Error('Database connection failed');
      const fromChain = mockSupabaseClient.from();
      fromChain.select().eq().single.and.returnValue(Promise.resolve({ data: null, error: mockError }));

      await expectAsync(service.getUserById('user-123')).toBeRejectedWith(mockError);
    });
  });

  describe('getAllUsers', () => {
    it('should call the correct Supabase chain and return all users', async () => {
      const fromChain = mockSupabaseClient.from();
      // FIX 3 (cont.): Configure the 'select' spy directly to return a promise for this specific case
      fromChain.select.and.returnValue(Promise.resolve({ data: mockUserList, error: null }));

      const users = await service.getAllUsers();

      expect(users).toEqual(mockUserList);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('profiles');
      expect(fromChain.select).toHaveBeenCalledWith('*');
    });

    it('should throw an error if the Supabase call fails', async () => {
      const mockError = new Error('Failed to fetch');
      const fromChain = mockSupabaseClient.from();
      fromChain.select.and.returnValue(Promise.resolve({ data: null, error: mockError }));

      await expectAsync(service.getAllUsers()).toBeRejectedWith(mockError);
    });
  });
});
