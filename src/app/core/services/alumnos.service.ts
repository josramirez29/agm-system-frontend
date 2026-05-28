import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { map } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class AlumnosService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrls.docentes}`;

  getAll(page = 1, search = '') {
    let params = new HttpParams().set('page', page);
    if (search) params = params.set('search', search);
    return this.http.get<any>(`${this.base}/alumnos/`, { params }).pipe(
      map(r => r.data ?? r)
    );
  }

  getByMateria(nrc: string) {
    return this.http.get<any>(`${this.base}/alumnos/materia/${nrc}/`).pipe(
      map(r => r.data ?? r)
    );
  }

  importPdf(file: File) {
    const fd = new FormData();
    fd.append('file', file);
    return this.http.post<any>(`${this.base}/alumnos/importar/`, fd);
  }

  darDeBaja(id: number) {
    return this.http.delete(`${this.base}/alumnos/${id}/`);
  }
}
