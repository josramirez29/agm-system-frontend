import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatBadgeModule } from '@angular/material/badge';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';

import { ReportesService } from '../../../core/services/reportes.service';
import { MateriasService } from '../../../core/services/materias.service';
import { DocentesService } from '../../../core/services/docentes.service';
import { PeriodosService } from '../../../core/services/periodos.service';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

interface Reporte {
  id: number;
  materia_id: string;
  docente_id?: string;
  tipo: 'calificaciones' | 'asistencias';
  formato: 'pdf' | 'xls';
  fecha_generado: string;
}

interface MateriaPeriodo {
  materia_id: string;
  materia_nombre: string;
  nrc: string;
  periodos: Array<{
    id: string;
    nombre: string;
    activo: boolean;
    fecha_inicio: string;
    fecha_fin: string;
  }>;
}

interface Estadistica {
  id: number;
  materia_id: string;
  materia_nombre: string;
  materia_nrc: string;
  periodo_nombre: string;
  docente_id: string;
  total_alumnos: number;
  promedio_general: number;
  porcentaje_aprobados: number;
  fecha_registro: string;
}

interface EstadisticaAlumno {
  id: number;
  alumno_id: string;
  materia_id: string;
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
  selector: 'app-reportes',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule,
    MatTabsModule, MatCardModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatTableModule,
    MatPaginatorModule, MatProgressSpinnerModule, MatDialogModule,
    MatSnackBarModule, MatChipsModule, MatBadgeModule,
    MatProgressBarModule, MatDividerModule, MatTooltipModule
  ],
  templateUrl: './reportes.component.html',
  styleUrls: ['./reportes.component.scss']
})
export class ReportesComponent implements OnInit {
  private reportes = inject(ReportesService);
  private materias = inject(MateriasService);
  private docentes = inject(DocentesService);
  private periodos = inject(PeriodosService);
  private fb = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);

  // ── Historial de reportes ───────────────────────────────────────────────
  historialReportes = signal<Reporte[]>([]);
  loadingHistorial = signal(true);
  paginaHistorial = signal(1);
  limiteHistorial = signal(10);
  totalHistorial = signal(0);
  columnasHistorial = ['id', 'materia_id', 'docente_id', 'tipo', 'formato', 'fecha_generado'];

  // ── Generar reportes ───────────────────────────────────────────────────
  materiasPeriodos = signal<MateriaPeriodo[]>([]);
  loadingMaterias = signal(true);
  generandoReporte = signal(false);
  formGenerarReporte: FormGroup;

  // ── Estadísticas de materias ───────────────────────────────────────────
  estadisticas = signal<Estadistica[]>([]);
  loadingEstadisticas = signal(false);
  paginaEstadisticas = signal(1);
  limiteEstadisticas = signal(10);
  totalEstadisticas = signal(0);
  docentesList = signal<any[]>([]);
  selectedDocenteId = signal<string>('');
  formRegistrarEstadisticas: FormGroup;
  columnasEstadisticas = ['materia_nombre', 'materia_nrc', 'periodo_nombre', 'total_alumnos', 'promedio_general', 'porcentaje_aprobados', 'fecha_registro'];

  // ── Estadísticas de alumnos ────────────────────────────────────────────
  estadisticasAlumno = signal<EstadisticaAlumno[]>([]);
  loadingEstadisticasAlumno = signal(false);
  paginaEstadisticasAlumno = signal(1);
  limiteEstadisticasAlumno = signal(10);
  totalEstadisticasAlumno = signal(0);
  queryAlumnoId = signal<string>('');
  formRegistrarEstadisticasAlumno: FormGroup;
  columnasEstadisticasAlumno = ['alumno_id', 'materia_nombre', 'periodo_nombre', 'porcentaje_asistencia', 'promedio_calificaciones', 'sesiones_presentes', 'fecha_registro'];

  constructor() {
    this.formGenerarReporte = this.fb.group({
      materia_id: ['', Validators.required],
      tipo: ['calificaciones', Validators.required],
      formato: ['pdf', Validators.required],
    });

    this.formRegistrarEstadisticas = this.fb.group({
      materia_id: ['', Validators.required],
      materia_nombre: ['', Validators.required],
      materia_nrc: ['', Validators.required],
      periodo_nombre: ['', Validators.required],
      docente_id: ['', Validators.required],
      total_alumnos: [null, [Validators.required, Validators.min(1)]],
      promedio_general: [null, [Validators.required, Validators.min(0), Validators.max(100)]],
      porcentaje_aprobados: [null, [Validators.required, Validators.min(0), Validators.max(100)]],
    });

    this.formRegistrarEstadisticasAlumno = this.fb.group({
      alumno_id: ['', Validators.required],
      materia_id: ['', Validators.required],
      materia_nombre: ['', Validators.required],
      materia_nrc: ['', Validators.required],
      periodo_nombre: ['', Validators.required],
      porcentaje_asistencia: [null, [Validators.required, Validators.min(0), Validators.max(100)]],
      promedio_calificaciones: [null, [Validators.required, Validators.min(0), Validators.max(100)]],
      total_sesiones: [null, [Validators.required, Validators.min(1)]],
      sesiones_presentes: [null, [Validators.required, Validators.min(0)]],
    });
  }

  ngOnInit() {
    this.cargarHistorialReportes();
    this.cargarMateriasConPeriodos();
    this.cargarDocentes();
  }

  // ── Historial ──────────────────────────────────────────────────────────

  cargarHistorialReportes(page = 1) {
    this.loadingHistorial.set(true);
    this.reportes.getHistorial(page, this.limiteHistorial()).subscribe({
      next: (data) => {
        this.historialReportes.set(data.items || []);
        this.totalHistorial.set(data.total || 0);
        this.paginaHistorial.set(page);
      },
      error: () => {
        this.snackBar.open('Error al cargar historial de reportes', 'Cerrar', { duration: 5000 });
      },
      complete: () => this.loadingHistorial.set(false)
    });
  }

  onPaginaHistorialChange(event: PageEvent) {
    this.cargarHistorialReportes(event.pageIndex + 1);
  }

  // ── Generar reportes ───────────────────────────────────────────────────

  cargarMateriasConPeriodos() {
    this.loadingMaterias.set(true);
    forkJoin({
      materias: this.materias.getAll().pipe(catchError(() => of({}))),
      periodos: this.periodos.getAll().pipe(catchError(() => of({}))),
    }).subscribe({
      next: ({ materias, periodos }) => {
        const mats: any[] = (materias as any).results ?? (materias as any).items ?? [];
        const pers: any[] = (periodos as any).results ?? (periodos as any).items ?? [];
        const periodoMap = new Map<any, any>(pers.map(p => [p.id, p]));

        const materiasMap = new Map<string, MateriaPeriodo>();
        mats.forEach((m: any) => {
          const key = String(m.id);
          if (!materiasMap.has(key)) {
            materiasMap.set(key, {
              materia_id: String(m.id),
              materia_nombre: m.nombre,
              nrc: m.nrc,
              periodos: []
            });
          }
          if (m.periodo) {
            const periodo = periodoMap.get(m.periodo);
            const entry = materiasMap.get(key)!;
            if (periodo && !entry.periodos.find(p => p.id === String(periodo.id))) {
              entry.periodos.push({
                id: String(periodo.id),
                nombre: periodo.nombre,
                activo: !!periodo.activo,
                fecha_inicio: periodo.fecha_inicio ?? '',
                fecha_fin: periodo.fecha_fin ?? '',
              });
            }
          }
        });
        this.materiasPeriodos.set(Array.from(materiasMap.values()));
      },
      error: () => {
        this.snackBar.open('Error al cargar materias', 'Cerrar', { duration: 5000 });
      },
      complete: () => this.loadingMaterias.set(false)
    });
  }

  generarReporte() {
    if (this.formGenerarReporte.invalid) {
      this.snackBar.open('Por favor completa todos los campos', 'Cerrar', { duration: 5000 });
      return;
    }
    const { materia_id, tipo, formato } = this.formGenerarReporte.value;
    this.generandoReporte.set(true);

    const request$ = tipo === 'calificaciones'
      ? this.reportes.descargarCalificaciones(materia_id, formato)
      : this.reportes.descargarAsistencias(materia_id, formato);

    request$.subscribe({
      next: (response) => {
        const blob = response.body!;
        const cd = response.headers.get('content-disposition') ?? '';
        const match = cd.match(/filename="?([^";\n]+)"?/);
        const filename = match?.[1] ?? `${tipo}_${materia_id}_${Date.now()}.${formato === 'pdf' ? 'pdf' : 'xlsx'}`;
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
        this.snackBar.open('Reporte descargado exitosamente', 'Cerrar', { duration: 5000 });
        this.cargarHistorialReportes();
      },
      error: () => {
        this.snackBar.open('Error al generar reporte', 'Cerrar', { duration: 5000 });
      },
      complete: () => this.generandoReporte.set(false)
    });
  }

  periodosMasImpartidos(materia: MateriaPeriodo): string {
    const n = materia.periodos.length;
    return n > 1 ? `Impartida en ${n} periodos` : 'Impartida una única vez';
  }

  tieneComparativa(materia: MateriaPeriodo): boolean {
    return materia.periodos.length > 1;
  }

  estaActivo(periodo: any): boolean {
    return periodo.activo === true;
  }

  // ── Estadísticas de materias ───────────────────────────────────────────

  cargarDocentes() {
    this.docentes.getAll().pipe(catchError(() => of({}))).subscribe({
      next: (data) => {
        const list: any[] = (data as any).results ?? (data as any).items ?? [];
        this.docentesList.set(list);
      }
    });
  }

  seleccionarDocente(docenteId: any) {
    this.selectedDocenteId.set(String(docenteId));
    this.estadisticas.set([]);
    this.cargarEstadisticas(1);
  }

  cargarEstadisticas(page = 1) {
    const did = this.selectedDocenteId();
    if (!did) return;
    this.loadingEstadisticas.set(true);
    this.reportes.getEstadisticasDocente(did, page, this.limiteEstadisticas()).subscribe({
      next: (data) => {
        this.estadisticas.set(data.items || []);
        this.totalEstadisticas.set(data.total || 0);
        this.paginaEstadisticas.set(page);
      },
      error: () => {
        this.snackBar.open('Error al cargar estadísticas', 'Cerrar', { duration: 5000 });
      },
      complete: () => this.loadingEstadisticas.set(false)
    });
  }

  registrarEstadisticasMateria() {
    if (this.formRegistrarEstadisticas.invalid) {
      this.snackBar.open('Por favor completa todos los campos correctamente', 'Cerrar', { duration: 5000 });
      return;
    }
    const datos = this.formRegistrarEstadisticas.value;
    this.reportes.registrarEstadisticasMateria(datos).subscribe({
      next: () => {
        this.snackBar.open('Estadísticas de materia registradas exitosamente', 'Cerrar', { duration: 5000 });
        this.formRegistrarEstadisticas.reset();
        if (this.selectedDocenteId()) this.cargarEstadisticas(1);
      },
      error: () => {
        this.snackBar.open('Error al registrar estadísticas de materia', 'Cerrar', { duration: 5000 });
      }
    });
  }

  onPaginaEstadisticasChange(event: PageEvent) {
    this.cargarEstadisticas(event.pageIndex + 1);
  }

  // ── Estadísticas de alumnos ────────────────────────────────────────────

  buscarEstadisticasAlumno(input: string) {
    const id = input.trim();
    if (!id) {
      this.snackBar.open('Ingresa el ID del alumno', 'Cerrar', { duration: 3000 });
      return;
    }
    this.queryAlumnoId.set(id);
    this.estadisticasAlumno.set([]);
    this.cargarEstadisticasAlumno(1);
  }

  cargarEstadisticasAlumno(page = 1) {
    const aid = this.queryAlumnoId();
    if (!aid) return;
    this.loadingEstadisticasAlumno.set(true);
    this.reportes.getEstadisticasAlumno(aid, page, this.limiteEstadisticasAlumno()).subscribe({
      next: (data) => {
        this.estadisticasAlumno.set(data.items || []);
        this.totalEstadisticasAlumno.set(data.total || 0);
        this.paginaEstadisticasAlumno.set(page);
      },
      error: () => {
        this.snackBar.open('Error al cargar estadísticas del alumno', 'Cerrar', { duration: 5000 });
      },
      complete: () => this.loadingEstadisticasAlumno.set(false)
    });
  }

  registrarEstadisticasAlumno() {
    if (this.formRegistrarEstadisticasAlumno.invalid) {
      this.snackBar.open('Por favor completa todos los campos correctamente', 'Cerrar', { duration: 5000 });
      return;
    }
    const datos = this.formRegistrarEstadisticasAlumno.value;
    this.reportes.registrarEstadisticasAlumno(datos).subscribe({
      next: () => {
        this.snackBar.open('Estadísticas del alumno registradas exitosamente', 'Cerrar', { duration: 5000 });
        this.formRegistrarEstadisticasAlumno.reset();
      },
      error: () => {
        this.snackBar.open('Error al registrar estadísticas del alumno', 'Cerrar', { duration: 5000 });
      }
    });
  }

  onPaginaEstadisticasAlumnoChange(event: PageEvent) {
    this.cargarEstadisticasAlumno(event.pageIndex + 1);
  }
}
