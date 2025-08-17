import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AuthRoutingModule } from './app-routing.module';  // Make sure this path is correct

@NgModule({
  declarations: [],  // Can be empty if using standalone components
  imports: [
    BrowserModule,
    AuthRoutingModule  // Must be a properly exported NgModule
  ],
  providers: []
})
export class AppModule { }