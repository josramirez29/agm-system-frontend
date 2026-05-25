import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { map } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class AsistenciasService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrls.asistencias}`;

  iniciarSesion(payload: { materia_id: number; docente_id: number }) {
    return this.http.post<any>(`${this.base}/sesiones/iniciar/`, payload);
  }

  cerrarSesion(sesionId: number) {
    return this.http.delete(`${this.base}/sesiones/${sesionId}/cerrar/`);
  }

  getSesionActiva(docenteId: number) {
    return this.http.get<any>(`${this.base}/sesiones/activa/?docente_id=${docenteId}`).pipe(
      map(r => r.data ?? r)
    );
  }

  getAsistenciasBySesion(sesionId: number) {
    return this.http.get<any>(`${this.base}/asistencias/?sesion_id=${sesionId}`).pipe(
      map(r => r.data?.results ?? r.results ?? r.data ?? r)
    );
  }

  registrarAsistencia(payload: { sesion_id: number; alumno_id: number; token: string }) {
    return this.http.post<any>(`${this.base}/asistencias/registrar/`, payload);
  }

  getEstadisticasByMateria(materiaId: number) {
    return this.http.get<any>(`${this.base}/estadisticas/materia/${materiaId}/`).pipe(
      map(r => r.data ?? r)
    );
  }
}
