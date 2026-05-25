import { Routes } from '@angular/router';
import { AdminLayoutComponent } from './admin-layout/admin-layout.component';

export const adminRoutes: Routes = [
  {
    path: '',
    component: AdminLayoutComponent,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', loadComponent: () => import('./dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent) },
      { path: 'periodos',  loadComponent: () => import('./periodos/periodos.component').then(m => m.PeriodosComponent) },
      { path: 'materias',  loadComponent: () => import('./materias/materias.component').then(m => m.MateriasComponent) },
      { path: 'docentes',  loadComponent: () => import('./docentes/docentes.component').then(m => m.DocentesComponent) },
      { path: 'alumnos',   loadComponent: () => import('./alumnos/alumnos.component').then(m => m.AlumnosComponent) },
    ]
  }
];
