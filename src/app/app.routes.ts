import { Routes } from '@angular/router';
import { LoginComponent } from './auth/login/login.component';
import { AuthCallbackComponent } from './auth/auth-callback/auth-callback.component';
import { SignupComponent } from './auth/signup/signup.component';
import { LoginSuccessComponent } from './auth/LoginSuccessComponent/LoginSuccessComponent';
import { HomeComponent } from './dashboard/home/home.component';
export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' }, // Default route
  { path: 'login', component: LoginComponent },
  { path: 'signup', component: SignupComponent },
  { path: 'auth/callback', component: AuthCallbackComponent },
  { path: 'login-success', component: LoginSuccessComponent },
  { path: 'dashboard/home', component: HomeComponent },
  { path: '**', redirectTo: 'login' } // Fallback route
];