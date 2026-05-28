import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { ReportesService } from '../../../core/services/reportes.service';
import { AuthService } from '../../../core/services/auth.service';
import { AlumnosService } from '../../../core/services/alumnos.service';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';

interface Estadistica {
  materia_nombre: string;
  materia_nrc: string;
  periodo_nombre: string;
  porcentaje_asistencia: number;
  promedio_calificaciones: number;
  total_sesiones: number;
  sesiones_presentes: number;
  fecha_registro: string;
}

@Component({
  selector: 'app-reportes-alumno',
  standalone: true,
  imports: [
    CommonModule,
    MatTabsModule, MatCardModule, MatButtonModule, MatIconModule,
    MatTableModule, MatPaginatorModule, MatProgressSpinnerModule,
    MatSnackBarModule, MatChipsModule, MatProgressBarModule
  ],
  templateUrl: './reportes-alumno.component.html',
  styleUrls: ['./reportes-alumno.component.scss']
})
export class ReportesAlumnoComponent implements OnInit {
  private reportes = inject(ReportesService);
  private auth = inject(AuthService);
  private alumnos = inject(AlumnosService);
  private snackBar = inject(MatSnackBar);

  // Signals
  estadisticasList = signal<Estadistica[]>([]);
  loadingEstadisticas = signal(false);
  alumnoId = signal<string>('');
  nombreAlumno = signal<string>('');

  columnasEstadisticas: string[] = ['materia_nombre', 'periodo_nombre', 'porcentaje_asistencia', 'promedio_calificaciones', 'sesiones_presentes', 'fecha_registro'];

  paginaEstadisticas = signal(1);
  limiteEstadisticas = signal(10);
  totalEstadisticas = signal(0);

  ngOnInit() {
    this.obtenerAlumnoId();
  }

  obtenerAlumnoId() {
    const user = this.auth.getCurrentUser();
    if (!user) return;

    this.alumnos.getByEmail(user.email).pipe(
      catchError(() => of(null))
    ).subscribe({
      next: (alumno) => {
        const aid = alumno ? String(alumno.id) : String(user.id);
        const nombre = alumno ? `${alumno.nombre} ${alumno.apellido}` : user.email;
        this.alumnoId.set(aid);
        this.nombreAlumno.set(nombre);
        this.cargarEstadisticas();
      }
    });
  }

  cargarEstadisticas(page = 1) {
    if (!this.alumnoId()) return;

    this.loadingEstadisticas.set(true);
    this.reportes.getEstadisticasAlumno(this.alumnoId(), page, this.limiteEstadisticas()).subscribe({
      next: (data) => {
        this.estadisticasList.set(data.items || []);
        this.totalEstadisticas.set(data.total || 0);
        this.paginaEstadisticas.set(page);
      },
      error: (err) => {
        console.error('Error cargando estadísticas:', err);
        this.snackBar.open('Error al cargar estadísticas', 'Cerrar', { duration: 5000 });
      },
      complete: () => this.loadingEstadisticas.set(false)
    });
  }

  onPaginaEstadisticasChange(event: PageEvent) {
    this.cargarEstadisticas(event.pageIndex + 1);
  }

  obtenerEstadoAsistencia(porcentaje: number): string {
    if (porcentaje >= 90) return 'Excelente';
    if (porcentaje >= 80) return 'Muy Bien';
    if (porcentaje >= 70) return 'Bien';
    if (porcentaje >= 60) return 'Aceptable';
    return 'Bajo';
  }

  obtenerEstadoCalificacion(promedio: number): string {
    if (promedio >= 90) return 'Excelente';
    if (promedio >= 80) return 'Muy Bien';
    if (promedio >= 70) return 'Bien';
    if (promedio >= 60) return 'Aprobado';
    return 'No Aprobado';
  }

  obtenerColorAsistencia(porcentaje: number): string {
    if (porcentaje >= 90) return 'high';
    if (porcentaje >= 70) return 'medium';
    return 'low';
  }

  obtenerColorCalificacion(promedio: number): string {
    if (promedio >= 80) return 'high';
    if (promedio >= 60) return 'medium';
    return 'low';
  }

  promedioAsistencia(): string {
    const lista = this.estadisticasList();
    if (!lista.length) return '0.0';
    return (lista.reduce((acc, s) => acc + s.porcentaje_asistencia, 0) / lista.length).toFixed(1);
  }

  promedioCalificaciones(): string {
    const lista = this.estadisticasList();
    if (!lista.length) return '0.0';
    return (lista.reduce((acc, s) => acc + s.promedio_calificaciones, 0) / lista.length).toFixed(1);
  }

  totalSesionesPresentes(): number {
    return this.estadisticasList().reduce((acc, s) => acc + s.sesiones_presentes, 0);
  }
}
