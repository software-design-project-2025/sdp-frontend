import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { SignupComponent } from './signup/signup.component';
import { LoginComponent } from './login/login.component';
import { LoginSuccessComponent } from './LoginSuccessComponent/LoginSuccessComponent';

@NgModule({
  declarations: [
   //SignupComponent,
    //LoginComponent,
   // LoginSuccessComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule.forChild([  // Child routes for auth
      { path: 'signup', component: SignupComponent },
      { path: 'login', component: LoginComponent },
      { path: 'login-success', component: LoginSuccessComponent }
    ])
  ],
  exports: [
    // Export components if needed by other modules
  ]
})
export class AuthModule {}