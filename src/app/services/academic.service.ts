import { Injectable } from '@angular/core';
import {HttpClient, HttpHeaders} from '@angular/common/http';
import { Observable } from 'rxjs';
//import {environment} from '../../environments/environment';

@Injectable({
    providedIn: 'root' // Makes the service a singleton
})
export class AcademicApiService {
    constructor(private http: HttpClient) { }

    private url = "https://campus-study-budy-fwhpaahfach9g8bw.canadacentral-01.azurewebsites.net";

    private getHeaders(): HttpHeaders {
        return new HttpHeaders({
            'Authorization': `Bearer -LYaFN3XV-G9vVIEp0kwF9TlB3mcFyZFfZ9yWmV5gd4`, //needs fixing
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
