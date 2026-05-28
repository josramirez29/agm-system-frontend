import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { LoginRequest, LoginResponse, JwtPayload } from '../models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http   = inject(HttpClient);
  private router = inject(Router);

  readonly currentUser = signal<LoginResponse | null>(this.loadUser());

  private normalizeRole(role: string | null | undefined): LoginResponse['rol'] | null {
    const normalized = String(role ?? '').trim().toLowerCase();
    if (!normalized) return null;
    if (normalized === 'admin' || normalized === 'administrador') return 'Administrador';
    if (normalized === 'docente' || normalized === 'profesor') return 'Docente';
    if (normalized === 'alumno' || normalized === 'estudiante') return 'Alumno';
    return null;
  }

  login(req: LoginRequest) {
    const body = new URLSearchParams();
    body.set('username', req.email);
    body.set('password', req.password);

    return this.http.post<{ access_token: string; token_type: string }>(
      `${environment.apiUrls.auth}/auth/login`,
      body.toString(),
      { headers: new HttpHeaders({ 'Content-Type': 'application/x-www-form-urlencoded' }) }
    ).pipe(
      tap(res => {
        const payload  = this.decodeToken(res.access_token);
        const fullUser: LoginResponse = {
          access_token: res.access_token,
          token_type:   res.token_type,
          rol:          this.normalizeRole(payload.rol) ?? 'Alumno',
          email:        req.email,
          id:           Number(payload.sub),
        };
        localStorage.setItem(environment.jwtKey, res.access_token);
        localStorage.setItem('agm_user', JSON.stringify(fullUser));
        this.currentUser.set(fullUser);
      })
    );
  }

  logout() {
    localStorage.removeItem(environment.jwtKey);
    localStorage.removeItem('agm_user');
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem(environment.jwtKey);
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    if (!token) return false;
    try {
      const payload = this.decodeToken(token);
      return payload.exp * 1000 > Date.now();
    } catch {
      return false;
    }
  }

  getRole(): string | null {
    return this.normalizeRole(this.currentUser()?.rol) ?? null;
  }

  decodeToken(token: string): JwtPayload {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
  }


  resetPassword(token: string, newPassword: string) {
    const body = { token, new_password: newPassword };
    return this.http.post(`${environment.apiUrls.auth}/auth/reset-password`, body);
  }

  forgotPassword(email: string) {
    return this.http.post(`${environment.apiUrls.auth}/auth/forgot-password`, { email });
  }

  private loadUser(): LoginResponse | null {
    try {
      const raw = localStorage.getItem('agm_user');
      if (!raw) return null;
      const user = JSON.parse(raw) as LoginResponse;
      return {
        ...user,
        rol: this.normalizeRole(user.rol) ?? user.rol,
      };
    } catch { return null; }
  }
}
