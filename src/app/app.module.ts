import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { AuthRoutingModule } from './app-routing.module';  // Make sure this path is correct

@NgModule({
  declarations: [],
  imports: [
    BrowserModule,
    HttpClientModule,
    AuthRoutingModule  // Must be a properly exported NgModule
  ],
  providers: []
})
export class AppModule { }