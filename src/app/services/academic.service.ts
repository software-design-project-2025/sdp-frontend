import { Injectable } from '@angular/core';
import {HttpClient, HttpHeaders} from '@angular/common/http';
import { Observable } from 'rxjs';
import {environment} from '../../environments/environment.prod';
//import {environment} from '../../environments/environment';

@Injectable({
    providedIn: 'root' // Makes the service a singleton
})
export class AcademicApiService {
    constructor(private http: HttpClient) { }

    private url = `${environment.apiBaseUrl}`;

    private getHeaders(): HttpHeaders {
        return new HttpHeaders({
            'Authorization': `Bearer ${environment.API_KEY_ADMIN}`, //needs fixing
            'Content-Type': 'application/json'
        });
    }

    getAllDegrees(): Observable<any> {
        return this.http.get(`${this.url}/api/degree/all`,
            {headers: this.getHeaders()}
        );
    }

    getAllModules(): Observable<any> {
      return this.http.get(`${this.url}/api/module/all`,
        {headers: this.getHeaders()}
      );
    }
}
