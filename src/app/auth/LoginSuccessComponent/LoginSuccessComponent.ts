import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login-success',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './login-success.component.html',
  styleUrls: ['./login-success.component.scss']
})
export class LoginSuccessComponent implements OnInit {
  isLoading = true;
  userName = '';
  userEmail = '';
  private maxRetries = 5;
  private retryDelay = 1000; // 1 second
  user: any = null;
  constructor(
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit() {
    console.log('Initializing LoginSuccessComponent');
    this.isLoading = true;
    
    try {
      // Wait for potential OAuth callback processing
      await this.delay(500);
      
      const user = await this.getUserWithRetry();
      
      if (user) {
        this.userName = user.user_metadata?.['name'] || 
                      user.user_metadata?.['full_name'] || 
                      user.email?.split('@')[0] || 
                      'User';
        this.userEmail = user.email || '';
        console.log('User authenticated successfully:', { userName: this.userName, userEmail: this.userEmail });
        
        // Force change detection
        setTimeout(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
          console.log('Loading set to false, isLoading:', this.isLoading);
        }, 100);
        
      } else {
        throw new Error('No valid user session found');
      }
    } catch (error) {
      console.error('Authentication check failed:', error);
      this.isLoading = false;
      setTimeout(() => {
        this.router.navigate(['/login'], { 
          queryParams: { error: 'Authentication failed. Please try again.' }
        });
      }, 2000);
    }
  }

  private async getUserWithRetry(): Promise<any> {
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(`Attempt ${attempt} to get user session`);
        
        const { data, error } = await this.authService.getCurrentUser();
        
        if (error) {
          console.warn(`Attempt ${attempt} failed:`, error);
          if (attempt === this.maxRetries) {
            throw error;
          }
          await this.delay(this.retryDelay * attempt);
          continue;
        }

        if (data?.user) {
          console.log(`Session found on attempt ${attempt}:`, data.user);
          return data.user;
        }

        console.log(`No user found on attempt ${attempt}`);
        if (attempt < this.maxRetries) {
          await this.delay(this.retryDelay * attempt);
        }
        
      } catch (error) {
        console.error(`Error on attempt ${attempt}:`, error);
        if (attempt === this.maxRetries) {
          throw error;
        }
        await this.delay(this.retryDelay * attempt);
      }
    }
    
    throw new Error('Failed to get user session after all retry attempts');
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  goToDashboard() {
    if (this.isLoading) return;
    this.router.navigate(['/dashboard']);
  }

  goToProfile() {
    if (this.isLoading) return;
    this.router.navigate(['/profile']);
  }
    async checkAuth() {
  this.isLoading = true;
  try {
    const { data: { session }, error } = await this.authService.getSession();
    
    if (error) throw error;
    if (!session) throw new Error('No session found');
    
    this.user = {
      userName: session.user.user_metadata?.['full_name'] || '',
      userEmail: session.user.email || ''
    };
      
  } catch (error) {
    console.error('Auth check failed:', error);
    this.router.navigate(['/login']);
  } finally {
    this.isLoading = false;
   }
  }

  async logout() {
    if (this.isLoading) return;
    
    this.isLoading = true;
    try {
      console.log('Logging out...');
      await this.authService.signOut();
      this.router.navigate(['/login']);
    } catch (error) {
      console.error('Error logging out:', error);
    } finally {
      this.isLoading = false;
    }
  }
}