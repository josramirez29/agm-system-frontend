import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Materia, ApiResponse, PaginatedResponse } from '../models';
import { map } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class MateriasService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrls.periodos}/materias`;

  getAll(page = 1, search = '') {
    let params = new HttpParams().set('page', page);
    if (search) params = params.set('search', search);
    return this.http.get<ApiResponse<PaginatedResponse<Materia>>>(this.base + '/', { params }).pipe(
      map(r => (r as any).data ?? r)
    );
  }

  create(data: Partial<Materia>) {
    return this.http.post<Materia>(this.base + '/', data);
  }

  update(id: number, data: Partial<Materia>) {
    return this.http.put<Materia>(`${this.base}/${id}/`, data);
  }

  delete(id: number) {
    return this.http.delete(`${this.base}/${id}/`);
  }
}
