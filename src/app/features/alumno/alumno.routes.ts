import { Routes } from '@angular/router';
import { AlumnoLayoutComponent } from './alumno-layout/alumno-layout.component';

export const alumnoRoutes: Routes = [
  {
    path: '',
    component: AlumnoLayoutComponent,
    children: [
      { path: '', redirectTo: 'panel', pathMatch: 'full' },
      { path: 'panel',         loadComponent: () => import('./panel/panel.component').then(m => m.PanelComponent) },
      { path: 'asistencia',    loadComponent: () => import('./asistencia-qr/asistencia-qr.component').then(m => m.AsistenciaQrComponent) },
      { path: 'calificaciones', loadComponent: () => import('./calificaciones/calificaciones.component').then(m => m.CalificacionesComponent) },
      { path: 'asistencias',   loadComponent: () => import('./asistencias/asistencias-alumno.component').then(m => m.AsistenciasAlumnoComponent) },
    ]
  }
];
