import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { LoginSuccessComponent } from './LoginSuccessComponent';
import { AuthService } from '../../services/auth.service';
import { createMockUserResponse } from '../../test-utils/auth-mocks';

xdescribe('LoginSuccessComponent', () => {
  let component: LoginSuccessComponent;
  let fixture: ComponentFixture<LoginSuccessComponent>;
  let authService: jasmine.SpyObj<AuthService>;

  beforeEach(async () => {
    const authServiceSpy = jasmine.createSpyObj('AuthService', ['getCurrentUser']);

    await TestBed.configureTestingModule({
      imports: [LoginSuccessComponent],
      providers: [
        { provide: AuthService, useValue: authServiceSpy }
      ]
    }).compileComponents();

    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    authService.getCurrentUser.and.returnValue(Promise.resolve(createMockUserResponse()));

    fixture = TestBed.createComponent(LoginSuccessComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display user email', fakeAsync(() => {
    authService.getCurrentUser.and.returnValue(Promise.resolve(
      createMockUserResponse({ email: 'user@example.com' })
    ));
    component.ngOnInit();
    tick();
    fixture.detectChanges();

    const compiled = fixture.nativeElement;
    expect(compiled.querySelector('p').textContent).toContain('user@example.com');
  }));
});
