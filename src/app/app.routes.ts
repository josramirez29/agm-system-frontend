import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'forgot-password',
    loadComponent: () => import('./features/auth/forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent)
  },
  {
    path: 'reset-password',
    loadComponent: () => import('./features/auth/reset-password/reset-password.component').then(m => m.ResetPasswordComponent)
  },
  {
    path: 'admin',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ADMIN'] },
    loadChildren: () => import('./features/admin/admin.routes').then(m => m.adminRoutes)
  },
  {
    path: 'docente',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['DOCENTE'] },
    loadChildren: () => import('./features/docente/docente.routes').then(m => m.docenteRoutes)
  },
  {
    path: 'alumno',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ALUMNO'] },
    loadChildren: () => import('./features/alumno/alumno.routes').then(m => m.alumnoRoutes)
  },
  { path: '**', redirectTo: 'login' }
];
