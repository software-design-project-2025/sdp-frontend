import { Routes } from '@angular/router';
import { LoginComponent } from './auth/login/login.component';
import { SignupComponent } from './auth/signup/signup.component';
import { LoginSuccessComponent } from './auth/LoginSuccessComponent/LoginSuccessComponent';
import {SessionsComponent} from './sessions/sessions.component';
//import {HomeComponent} from './dashboard/home/home';
import { HomeComponent} from './dashboard/home/home.component';
import { Chat } from './chat/chat';
import { FindPartners } from './findpartners/findpartners';
import { Profile } from './profile/profile'
import { Progress } from './progress/progress'

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' }, // Default route
  { path: 'login', component: LoginComponent },
  { path: 'signup', component: SignupComponent },
  { path: 'login-success', component: LoginSuccessComponent },
  { path: 'chat', component: Chat},
  { path: 'findpartners', component: FindPartners},
  { path: 'profile', component: Profile},
  { path: 'progress', component: Progress},
  { path: 'home', component: HomeComponent },
  { path: 'sessions', component: SessionsComponent },
  { path: '**', redirectTo: 'login' } // Fallback route
];
