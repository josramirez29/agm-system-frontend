import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { ReportesService } from '../../../core/services/reportes.service';
import { MateriasService } from '../../../core/services/materias.service';
import { AuthService } from '../../../core/services/auth.service';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';

interface Reporte {
  id: number;
  tipo: 'calificaciones' | 'asistencias';
  formato: 'pdf' | 'xls';
  fecha_generado: string;
}

interface Materia {
  id: string;
  nombre: string;
  nrc: string;
}

interface Estadistica {
  materia_nombre: string;
  periodo_nombre: string;
  total_alumnos: number;
  promedio_general: number;
  porcentaje_aprobados: number;
  fecha_registro: string;
}

@Component({
  selector: 'app-reportes-docente',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule,
    MatTabsModule, MatCardModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatSelectModule, MatTableModule,
    MatPaginatorModule, MatProgressSpinnerModule,
    MatSnackBarModule, MatChipsModule, MatProgressBarModule
  ],
  templateUrl: './reportes-docente.component.html',
  styleUrls: ['./reportes-docente.component.scss']
})
export class ReportesDocenteComponent implements OnInit {
  private reportes = inject(ReportesService);
  private materias = inject(MateriasService);
  private auth = inject(AuthService);
  private snackBar = inject(MatSnackBar);

  // Signals
  materiasList = signal<Materia[]>([]);
  estadisticasList = signal<Estadistica[]>([]);
  loading = signal(true);
  loadingEstadisticas = signal(false);
  docenteId = signal<string>('');

  columnasEstadisticas: string[] = ['materia_nombre', 'periodo_nombre', 'total_alumnos', 'promedio_general', 'porcentaje_aprobados', 'fecha_registro'];

  paginaEstadisticas = signal(1);
  limiteEstadisticas = signal(10);
  totalEstadisticas = signal(0);

  ngOnInit() {
    this.cargarDatosMaterias();
    this.obtenerDocenteId();
  }

  obtenerDocenteId() {
    const user = this.auth.getCurrentUser();
    if (user) {
      this.docenteId.set(String(user.id));
      this.cargarEstadisticas();
    }
  }

  cargarDatosMaterias() {
    this.loading.set(true);
    this.materias.getAll().pipe(
      catchError(() => of({ items: [] }))
    ).subscribe({
      next: (data) => {
        const items = (data as any).items || [];
        this.materiasList.set(items.map((m: any) => ({
          id: m.id,
          nombre: m.nombre,
          nrc: m.nrc
        })));
      },
      error: (err) => {
        console.error('Error cargando materias:', err);
        this.snackBar.open('Error al cargar materias', 'Cerrar', { duration: 5000 });
      },
      complete: () => this.loading.set(false)
    });
  }

  cargarEstadisticas(page = 1) {
    if (!this.docenteId()) return;

    this.loadingEstadisticas.set(true);
    this.reportes.getEstadisticasDocente(this.docenteId(), page, this.limiteEstadisticas()).subscribe({
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

  descargarReporte(materiaId: string, tipo: 'calificaciones' | 'asistencias', formato: 'pdf' | 'xls') {
    const request$ = tipo === 'calificaciones'
      ? this.reportes.descargarCalificaciones(materiaId, formato)
      : this.reportes.descargarAsistencias(materiaId, formato);

    request$.subscribe({
      next: (response) => {
        const blob = response.body;
        const contentDisposition = response.headers.get('content-disposition');
        let filename = `${tipo}_${materiaId}_${new Date().getTime()}.${formato === 'pdf' ? 'pdf' : 'xlsx'}`;

        if (contentDisposition) {
          const filenameMatch = contentDisposition.match(/filename="(.+?)"/);
          if (filenameMatch) filename = filenameMatch[1];
        }

        const url = window.URL.createObjectURL(blob!);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        window.URL.revokeObjectURL(url);

        this.snackBar.open('Reporte descargado exitosamente', 'Cerrar', { duration: 5000 });
      },
      error: (err) => {
        console.error('Error descargando reporte:', err);
        this.snackBar.open('Error al descargar reporte', 'Cerrar', { duration: 5000 });
      }
    });
  }

  onPaginaEstadisticasChange(event: PageEvent) {
    this.cargarEstadisticas(event.pageIndex + 1);
  }
}
