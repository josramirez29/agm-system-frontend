import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { map } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class AsistenciasService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrls.asistencias}`;

  iniciarSesion(payload: { materia_id: number; docente_id: number }) {
    const body = {
      materia_id: String(payload.materia_id),
      docente_id: String(payload.docente_id)
    };
    return this.http.post<any>(`${this.base}/asistencias/sesiones/iniciar`, body);
  }

  cerrarSesion(materiaId: string | number) {
    return this.http.delete(`${this.base}/asistencias/sesiones/${String(materiaId)}/cerrar`);
  }

  getSesionActiva(docenteId: number) {
    return this.http.get<any>(`${this.base}/asistencias/sesiones/activa/?docente_id=${docenteId}`).pipe(
      map(r => r.data ?? r)
    );
  }

  getAsistenciasByMateria(materiaId: string | number) {
    return this.http.get<any>(`${this.base}/asistencias/${String(materiaId)}/hoy`).pipe(
      map(r => r.data?.registros ?? r.data ?? r)
    );
  }

  registrarAsistencia(payload: { materia_id: number; alumno_id: number; token_qr: string }) {
    const body = {
      materia_id: String(payload.materia_id),
      alumno_id: String(payload.alumno_id),
      token_qr: payload.token_qr,
    };
    return this.http.post<any>(`${this.base}/asistencias/registrar`, body);
  }

  generarQrToken(payload: { alumno_id: number; materia_id: number }) {
    const body = {
      alumno_id: String(payload.alumno_id),
      materia_id: String(payload.materia_id),
    };
    return this.http.post<any>(`${this.base}/asistencias/qr/generar`, body).pipe(
      map(r => r.data ?? r)
    );
  }

  getEstadisticasByMateria(materiaId: number) {
    return this.http.get<any>(`${this.base}/asistencias/estadisticas/materia/${materiaId}/`).pipe(
      map(r => r.data ?? r)
    );
  }
}
