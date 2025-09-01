import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppRoutingModule } from './app-routing.module'; // Updated import name
import { AppComponent } from './app.component'; // Add this import

@NgModule({
  declarations: [],
  imports: [
    BrowserModule,
    AppRoutingModule, // Updated name
    AppComponent // Add standalone AppComponent to imports
  ],
  providers: [],
  bootstrap: [] // Empty since using standalone components
})
export class AppModule { }
