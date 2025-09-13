// app-routing.module.ts
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './auth/login/login.component';
import { SignupComponent } from './auth/signup/signup.component';
import { LoginSuccessComponent } from './auth/LoginSuccessComponent/LoginSuccessComponent';
// import { HomeComponent } from './dashboard/home/home.component';
// import { AuthGuard } from './guards/auth.guard';
import { Chat } from './chat/chat';
import { HomeComponent } from './dashboard/home/home.component';
import { AuthGuard } from './guards/auth.guard';
import { SessionsComponent } from './sessions/sessions.component';
const routes: Routes = [
  { path: 'login', component: LoginComponent },
  {path: 'home', component: HomeComponent},
  { path: 'signup', component: SignupComponent },
  { path: 'login-success', component: LoginSuccessComponent },
  { path: 'chat', component: Chat}
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AuthRoutingModule { }
