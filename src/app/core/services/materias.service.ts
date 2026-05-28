import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Materia, ApiResponse, PaginatedResponse } from '../models';
import { map } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class MateriasService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrls.materias}`;

  getAll(page = 1, limit = 10, search = '') {
    let params = new HttpParams().set('page', page).set('limit', limit);
    if (search) params = params.set('search', search);
    return this.http.get<ApiResponse<PaginatedResponse<Materia>>>(`${this.base}/materias/`, { params }).pipe(
      map(r => (r as any).data ?? r)
    );
  }

  create(data: Partial<Materia>) {
    return this.http.post<Materia>(`${this.base}/materias/`, data);
  }

  update(id: number, data: Partial<Materia>) {
    return this.http.put<Materia>(`${this.base}/materias/${id}/`, data);
  }

  delete(id: number) {
    return this.http.delete(`${this.base}/materias/${id}/`);
  }

  cerrar(id: number) {
    return this.http.post(`${this.base}/materias/${id}/cerrar/`, {});
  }

  importPdf(periodoId: number, file: File) {
    const fd = new FormData();
    fd.append('periodo_id', String(periodoId));
    fd.append('archivo', file);
    return this.http.post<any>(`${this.base}/materias/importar/`, fd);
  }
}
