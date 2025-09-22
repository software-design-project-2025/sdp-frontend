import { createClient } from '@supabase/supabase-js';
import {Injectable} from '@angular/core';
import {UUID} from 'node:crypto';
// import { environment } from '../environments/environment'; // adjust path

export const supabase = createClient(
  'https://cixdigfxjvranfleyamm.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpeGRpZ2Z4anZyYW5mbGV5YW1tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUyMDkyNzAsImV4cCI6MjA3MDc4NTI3MH0.ZgbRo8kxPZzhJe0BEw56seYrUlf3UiylCkeRPzdGWEQ'
);

@Injectable({
  providedIn: 'root'
})
export class UserService {

  async getUserById(userId: UUID) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single(); // returns one row instead of array
    if (error) throw error;
    return data;
  }

  async getAllUsers() {
    const { data, error } = await supabase
      .from('profiles')
      .select('*');
    if (error) throw error;
    return data;
  }
}
