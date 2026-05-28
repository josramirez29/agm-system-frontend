import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Docente } from '../models';
import { map } from 'rxjs/operators';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';

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

  darDeBaja(id: number | string) {
    return this.http.delete(`${this.base}/docentes/${id}/baja`).pipe(
      catchError(err => {
        if (err.status === 404 || err.status === 405) {
          return this.http.delete(`${this.base}/docentes/${id}/`).pipe(
            catchError(aliasErr => {
              if (aliasErr.status === 404 || aliasErr.status === 405) {
                return this.http.delete(`${this.base}/docentes/${id}`);
              }
              return throwError(() => aliasErr);
            })
          );
        }
        return throwError(() => err);
      })
    );
  }

  getMateriasByDocente(docenteId: number) {
    // Las materias están embebidas en la respuesta del docente de ms-docentes.
    // ms-periodos-materias usa docente_id como hash SHA1 del nombre (incompatible).
    return this.http.get<any>(`${this.base}/docentes/`).pipe(
      map((r: any) => {
        const list: any[] = r.data?.results ?? r.results ?? r.data ?? r;
        const docente = list.find((d: any) => d.id === docenteId);
        if (!docente?.materias) return [];
        return docente.materias.map((m: any) => ({
          id: m.id,
          nrc: m.nrc,
          nombre: m.nombre_materia ?? m.nombre ?? `NRC ${m.nrc}`,
          seccion: m.seccion ?? '',
          clave: m.clave ?? '',
          horario: m.horario ?? '',
          periodo_id: 0,
          activo: true,
        }));
      })
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
