import { Routes } from '@angular/router';
import { LoginComponent } from './auth/login/login.component';
import { SignupComponent } from './auth/signup/signup.component';
import { LoginSuccessComponent } from './auth/LoginSuccessComponent/LoginSuccessComponent';
import { HomeComponent} from './dashboard/home/home.component';
import { Chat } from './chat/chat';
import { FindPartners } from './findpartners/findpartners';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' }, // Default route
  { path: 'login', component: LoginComponent },
  { path: 'signup', component: SignupComponent },
  { path: 'login-success', component: LoginSuccessComponent },
  { path: 'chat', component: Chat},
  { path: 'findpartners', component: FindPartners},
  { path: 'home', component: HomeComponent },
  { path: '**', redirectTo: 'login' } // Fallback route

];
