import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { map } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class CalificacionesService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrls.calificaciones}`;

  getActividades(materiaId: string | number) {
    return this.http.get<any>(`${this.base}/calificaciones/actividades/${materiaId}`).pipe(
      map(r => r.data ?? r)
    );
  }

  crearActividad(data: { materia_id: string; nombre: string; ponderacion: number }) {
    return this.http.post<any>(`${this.base}/calificaciones/actividades`, data);
  }

  registrarCalificacion(data: { actividad_id: string; alumno_id: string; valor: number }) {
    return this.http.post<any>(`${this.base}/calificaciones/calificaciones`, data);
  }

  importarExcel(actividadId: string, file: File) {
    const fd = new FormData();
    fd.append('actividad_id', actividadId);
    fd.append('file', file);
    return this.http.post<any>(`${this.base}/calificaciones/calificaciones/importar`, fd);
  }

  getPromedio(materiaId: string | number, alumnoId: string) {
    return this.http.get<any>(`${this.base}/calificaciones/calificaciones/${materiaId}/${alumnoId}/promedio`).pipe(
      map(r => r.data ?? r)
    );
  }

  getConcentrado(materiaId: string | number) {
    return this.http.get<any>(`${this.base}/calificaciones/concentrado/${materiaId}`).pipe(
      map(r => r.data ?? r)
    );
  }

  getPonderaciones(materiaId: string | number) {
    return this.http.get<any>(`${this.base}/calificaciones/ponderaciones/${materiaId}`).pipe(
      map(r => r.data ?? r)
    );
  }

  configurarPonderaciones(materiaId: string | number, ponderaciones: any[]) {
    return this.http.post<any>(`${this.base}/calificaciones/ponderaciones/${materiaId}`, { ponderaciones });
  }

  deletePonderaciones(materiaId: string | number) {
    return this.http.delete<any>(`${this.base}/calificaciones/ponderaciones/${materiaId}`);
  }

  getMisCalificaciones(matricula: string) {
    return this.http.get<any>(`${this.base}/calificaciones/alumno/${matricula}`).pipe(
      map(r => r.data ?? r)
    );
  }
}
