import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AuthRoutingModule } from './app-routing.module';  // Make sure this path is correct
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

import { AppComponent } from './app.component';


@NgModule({
  declarations: [],  // Can be empty if using standalone components
  imports: [
    BrowserModule,
    AuthRoutingModule,  // Must be a properly exported NgModule
    HttpClientModule,
    FormsModule
  ],
  providers: [],
  bootstrap: []
})
export class AppModule { }