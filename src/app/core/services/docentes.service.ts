import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Docente } from '../models';
import { map, catchError } from 'rxjs/operators';
import { throwError, forkJoin } from 'rxjs';

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
    const materiasParams = new HttpParams().set('limit', '500');
    return forkJoin({
      docentesRes: this.http.get<any>(`${this.base}/docentes/`),
      materiasRes:  this.http.get<any>(`${this.base}/materias/`, { params: materiasParams }),
    }).pipe(
      map(({ docentesRes, materiasRes }) => {
        const list: any[] = docentesRes.data?.results ?? docentesRes.results ?? docentesRes.data ?? docentesRes;
        const docente = list.find((d: any) => d.id === docenteId);
        if (!docente?.materias) return [];

        const allMaterias: any[] = materiasRes.results ?? materiasRes.data?.results ?? materiasRes.data ?? [];
        const activoByNrc = new Map<string, boolean>(
          allMaterias.map((m: any) => [String(m.nrc), !!m.activo])
        );

        return docente.materias.map((m: any) => ({
          id:         m.id,
          nrc:        m.nrc,
          nombre:     m.nombre_materia ?? m.nombre ?? `NRC ${m.nrc}`,
          seccion:    m.seccion ?? '',
          clave:      m.clave ?? '',
          horario:    m.horario ?? '',
          periodo_id: 0,
          activo:     activoByNrc.has(String(m.nrc)) ? activoByNrc.get(String(m.nrc))! : true,
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
