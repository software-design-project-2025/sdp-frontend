import { Routes } from '@angular/router';
import { LoginComponent } from './auth/login/login.component';
import { SignupComponent } from './auth/signup/signup.component';
import { LoginSuccessComponent } from './auth/LoginSuccessComponent/LoginSuccessComponent';
import {SessionsComponent} from './sessions/sessions.component';
import {HomeComponent} from './dashboard/home/home';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' }, // Default route
  { path: 'login', component: LoginComponent },
  { path: 'home', component: HomeComponent },
  { path: 'signup', component: SignupComponent },
  { path: 'login-success', component: LoginSuccessComponent },
  { path: 'sessions', component: SessionsComponent },
  { path: '**', redirectTo: 'login' } // Fallback route
];
