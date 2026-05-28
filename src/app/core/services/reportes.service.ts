import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { map } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class ReportesService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrls.reportes}`;

  getHistorial(page = 1, limit = 10) {
    const params = new HttpParams().set('page', page).set('limit', limit);
    return this.http.get<any>(`${this.base}/reportes/historial`, { params }).pipe(
      map(r => r.data ?? r)
    );
  }

  descargarCalificaciones(materiaId: number | string, formato: 'pdf' | 'xls' = 'pdf') {
    const params = new HttpParams().set('formato', formato);
    return this.http.get(`${this.base}/reportes/calificaciones/${materiaId}`,
      { params, responseType: 'blob', observe: 'response' }
    );
  }

  generarCalificaciones(materiaId: number | string, datos: any, formato: 'pdf' | 'xls' = 'pdf') {
    const params = new HttpParams().set('formato', formato);
    return this.http.post(`${this.base}/reportes/calificaciones/${materiaId}`, datos,
      { params, responseType: 'blob', observe: 'response' }
    );
  }

  descargarAsistencias(materiaId: number | string, formato: 'pdf' | 'xls' = 'pdf') {
    const params = new HttpParams().set('formato', formato);
    return this.http.get(`${this.base}/reportes/asistencias/${materiaId}`,
      { params, responseType: 'blob', observe: 'response' }
    );
  }

  generarAsistencias(materiaId: number | string, datos: any, formato: 'pdf' | 'xls' = 'pdf') {
    const params = new HttpParams().set('formato', formato);
    return this.http.post(`${this.base}/reportes/asistencias/${materiaId}`, datos,
      { params, responseType: 'blob', observe: 'response' }
    );
  }

  getEstadisticasDocente(docenteId: number | string, page = 1, limit = 10) {
    const params = new HttpParams().set('page', page).set('limit', limit);
    return this.http.get<any>(`${this.base}/reportes/estadisticas/docente/${docenteId}`, { params }).pipe(
      map(r => r.data ?? r)
    );
  }

  autoRegistrarEstadisticas(nrc: string, docenteId: number | null) {
    return this.http.post<any>(
      `${this.base}/reportes/estadisticas/auto/${nrc}`,
      { docente_id: String(docenteId ?? '') }
    );
  }

  getEstadisticasAlumno(alumnoId: number | string, page = 1, limit = 10) {
    const params = new HttpParams().set('page', page).set('limit', limit);
    return this.http.get<any>(`${this.base}/reportes/estadisticas/alumno/${alumnoId}`, { params }).pipe(
      map(r => r.data ?? r)
    );
  }
}
