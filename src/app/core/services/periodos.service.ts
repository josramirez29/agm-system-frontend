import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { ApiResponse, Periodo, PaginatedResponse } from '../models';
import { map } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class PeriodosService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrls.periodos}/api/periodos`;

  getAll(page = 1, search = '') {
    let params = new HttpParams().set('page', page);
    if (search) params = params.set('search', search);
    return this.http.get<ApiResponse<PaginatedResponse<Periodo>>>(this.base + '/', { params }).pipe(
      map(r => (r as any).data ?? r)
    );
  }

  create(data: Partial<Periodo>) {
    return this.http.post<Periodo>(this.base + '/', data);
  }

  update(id: number, data: Partial<Periodo>) {
    return this.http.put<Periodo>(`${this.base}/${id}/`, data);
  }

  delete(id: number) {
    return this.http.delete(`${this.base}/${id}/`);
  }
}
