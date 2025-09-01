// app-routing.module.ts
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './auth/login/login.component';
import { SignupComponent } from './auth/signup/signup.component';
import { LoginSuccessComponent } from './auth/LoginSuccessComponent/LoginSuccessComponent';
import { HomeComponent } from './dashboard/home/home';
import { AuthGuard } from './guards/auth.guard';
import { SessionsComponent } from './sessions/sessions.component';

const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'signup', component: SignupComponent },
  { path: 'login-success', component: LoginSuccessComponent },
  { path: 'sessions', component: SessionsComponent },
  { path: '', redirectTo: '/login', pathMatch: 'full' }, // Add default route
  { path: '**', redirectTo: '/login' } // Add wildcard route
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { } // Changed from AuthRoutingModule
