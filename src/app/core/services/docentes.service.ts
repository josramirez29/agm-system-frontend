import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Docente } from '../models';
import { map } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class DocentesService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrls.docentes}`;

  getAll(page = 1, search = '') {
    let params = new HttpParams().set('page', page);
    if (search) params = params.set('search', search);
    return this.http.get<any>(`${this.base}/docentes/`, { params }).pipe(
      map(r => r.data ?? r)
    );
  }

  importPdf(file: File) {
    const fd = new FormData();
    fd.append('file', file);
    return this.http.post<any>(`${this.base}/docentes/importar/`, fd);
  }

  darDeBaja(id: number) {
    return this.http.delete(`${this.base}/docentes/${id}/`);
  }

  getMateriasByDocente(docenteId: number) {
    return this.http.get<any>(`${this.base}/docentes/${docenteId}/materias/`).pipe(
      map(r => r.data ?? r)
    );
  }

  getByEmail(email: string) {
    return this.http.get<any>(`${this.base}/docentes/`).pipe(
      map((r: any) => {
        const list: Docente[] = r.data?.results ?? r.results ?? r.data ?? r;
        return list.find((d: Docente) => d.email === email) ?? null;
      })
    );
  }
}
