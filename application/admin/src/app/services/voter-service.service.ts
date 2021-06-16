import {Injectable} from '@angular/core';
import {DataService} from './data.service';
import {HttpClient, HttpHeaders} from '@angular/common/http';
import {Observable, throwError} from 'rxjs';
import {catchError} from 'rxjs/operators';
import {Voter} from '../models/voter.model';


@Injectable({
  providedIn: 'root'
})
export class VoterService {
  private API: string = 'http://localhost:3000/voter';
  private headers = new HttpHeaders();

  constructor(private http: HttpClient) {
    this.headers = this.headers.append('Authorization', 'Basic ' + btoa('admin:adminpw'));
  }

  getall(): Observable<any> {
    return this.http.get(this.API.toString(), {headers: this.headers}).pipe(catchError(this.hendelError));
  }

  create(ressource: any): Observable<any> {
    return this.http.post(this.API.toString(), ressource, {headers: this.headers}).pipe(catchError(this.hendelError));
  }

  update(ressource: any): Observable<any> {
    return this.http.put(this.API + '/' + ressource.id, ressource, {headers: this.headers}).pipe(catchError(this.hendelError));
  }

  delete(ressource: any): Observable<any> {
    return this.http.delete(this.API + '/' + ressource.id, {headers: this.headers}).pipe(catchError(this.hendelError));
  }

  private hendelError(err: Response): Observable<any> {
    if (err.status === 400) {
      return throwError('');
    } else if (err.status === 404) {
      return throwError('not found');
    } else {
      return throwError(('Error Unexpected'));
    }
  }

  acceptOrRejectVoter(voterId: string, status: boolean) {
    const body = {voterId, status};
    this.http.post(this.API + '/' + voterId, body, {headers: this.headers});
  }
}
