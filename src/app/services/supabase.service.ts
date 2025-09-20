import { createClient } from '@supabase/supabase-js';
import {Injectable} from '@angular/core';
import {UUID} from 'node:crypto';
import { environment } from '../../environments/environment.prod'


export const supabase = createClient(
  environment.apiBaseUrl,
  environment.supabaseKey
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
}

