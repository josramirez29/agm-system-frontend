import { Routes } from '@angular/router';
import { DocenteLayoutComponent } from './docente-layout/docente-layout.component';

export const docenteRoutes: Routes = [
  {
    path: '',
    component: DocenteLayoutComponent,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard',      loadComponent: () => import('./dashboard/docente-dashboard.component').then(m => m.DocenteDashboardComponent) },
      { path: 'materias',       loadComponent: () => import('./materias/docente-materias.component').then(m => m.DocenteMateriasComponent) },
      { path: 'calificaciones', loadComponent: () => import('./calificaciones/docente-calificaciones.component').then(m => m.DocenteCalificacionesComponent) },
      { path: 'asistencias',    loadComponent: () => import('./asistencias-qr/asistencias-qr.component').then(m => m.AsistenciasQrComponent) },
      { path: 'reportes',       loadComponent: () => import('./reportes/docente-reportes.component').then(m => m.DocenteReportesComponent) },
    ]
  }
];
