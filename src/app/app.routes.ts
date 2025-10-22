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
import { LandingPage } from './landingpage/landingpage';
import { SessionRoom } from './session-room/session-room';

export const routes: Routes = [
  { path: '', redirectTo: 'landingpage', pathMatch: 'full' }, // Default route
  { path: 'login', component: LoginComponent },
  { path: 'signup', component: SignupComponent },
  { path: 'login-success', component: LoginSuccessComponent },
  { path: 'session-room/:id', component: SessionRoom },
  { path: 'chat', component: Chat},
  { path: 'findpartners', component: FindPartners},
  { path: 'profile', component: Profile},
  { path: 'progress', component: Progress},
  { path: 'home', component: HomeComponent },
  { path: 'landingpage', component: LandingPage },
  { path: 'sessions', component: SessionsComponent },
  { path: '**', redirectTo: 'landingpage' } // Fallback route
];
