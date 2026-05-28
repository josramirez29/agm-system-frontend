import { Routes } from '@angular/router';
import { AlumnoLayoutComponent } from './alumno-layout/alumno-layout.component';

export const alumnoRoutes: Routes = [
  {
    path: '',
    component: AlumnoLayoutComponent,
    children: [
      { path: '', redirectTo: 'asistencia', pathMatch: 'full' },
      { path: 'asistencia',     loadComponent: () => import('./asistencia-qr/asistencia-qr.component').then(m => m.AsistenciaQrComponent) },
      { path: 'calificaciones', loadComponent: () => import('./calificaciones/calificaciones.component').then(m => m.CalificacionesComponent) },
      { path: 'reportes',       loadComponent: () => import('./reportes/reportes-alumno.component').then(m => m.ReportesAlumnoComponent) },
    ]
  }
];
