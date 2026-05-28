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
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatBadgeModule } from '@angular/material/badge';

import { ReportesService } from '../../../core/services/reportes.service';
import { DocentesService } from '../../../core/services/docentes.service';
import { PeriodosService } from '../../../core/services/periodos.service';
import { AuthService } from '../../../core/services/auth.service';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

interface Materia {
  id: string;
  nombre: string;
  nrc: string;
}

interface PeriodoHistorial {
  nombre: string;
  activo: boolean;
  total_alumnos?: number;
  promedio_general?: number;
  porcentaje_aprobados?: number;
  fecha_registro?: string;
}

interface MateriaHistorial {
  materia_nombre: string;
  materia_nrc: string;
  periodos: PeriodoHistorial[];
  tiene_comparativa: boolean;
}

interface Estadistica {
  materia_nombre: string;
  materia_nrc: string;
  periodo_nombre: string;
  total_alumnos: number;
  promedio_general: number;
  porcentaje_aprobados: number;
  fecha_registro: string;
}

@Component({
  selector: 'app-docente-reportes',
  standalone: true,
  imports: [
    CommonModule,
    MatTabsModule, MatCardModule, MatButtonModule, MatIconModule,
    MatTableModule, MatPaginatorModule, MatProgressSpinnerModule,
    MatSnackBarModule, MatChipsModule, MatProgressBarModule,
    MatTooltipModule, MatBadgeModule
  ],
  templateUrl: './docente-reportes.component.html',
  styleUrls: ['./docente-reportes.component.scss']
})
export class DocenteReportesComponent implements OnInit {
  private reportes = inject(ReportesService);
  private docentes = inject(DocentesService);
  private periodos = inject(PeriodosService);
  private auth = inject(AuthService);
  private snackBar = inject(MatSnackBar);

  materiasList = signal<Materia[]>([]);
  historialesMateria = signal<MateriaHistorial[]>([]);
  estadisticasList = signal<Estadistica[]>([]);
  loading = signal(true);
  loadingHistorial = signal(false);
  loadingEstadisticas = signal(false);
  docenteId = signal<string>('');

  columnasEstadisticas = ['materia_nombre', 'materia_nrc', 'periodo_nombre', 'total_alumnos', 'promedio_general', 'porcentaje_aprobados', 'fecha_registro'];

  paginaEstadisticas = signal(1);
  limiteEstadisticas = signal(10);
  totalEstadisticas = signal(0);

  ngOnInit() {
    this.identificarDocente();
  }

  identificarDocente() {
    const user = this.auth.getCurrentUser();
    if (!user) return;

    this.docentes.getByEmail(user.email).subscribe({
      next: (docente) => {
        const did = docente ? String(docente.id) : String(user.id);
        this.docenteId.set(did);
        this.cargarDatos();
      },
      error: () => {
        this.docenteId.set(String(user.id));
        this.cargarDatos();
      }
    });
  }

  cargarDatos() {
    const did = this.docenteId();
    if (!did) return;

    this.loading.set(true);
    this.loadingHistorial.set(true);

    forkJoin({
      materias: this.docentes.getMateriasByDocente(Number(did)).pipe(catchError(() => of([]))),
      periodos: this.periodos.getAll().pipe(catchError(() => of({}))),
      estadisticas: this.reportes.getEstadisticasDocente(did, 1, 100).pipe(catchError(() => of({ items: [] }))),
    }).subscribe({
      next: ({ materias, periodos, estadisticas }) => {
        const matList: any[] = Array.isArray(materias)
          ? materias
          : (materias as any)?.results ?? (materias as any)?.items ?? [];

        const perList: any[] = (periodos as any)?.results ?? (periodos as any)?.items ?? [];
        const statsList: Estadistica[] = (estadisticas as any)?.items ?? [];

        const periodoMap = new Map<any, any>(perList.map(p => [p.id, p]));

        // Materias actuales para el tab "Mis Materias"
        this.materiasList.set(matList.map((m: any) => ({
          id: String(m.id),
          nombre: m.nombre,
          nrc: m.nrc,
        })));

        // Historial agrupado por materia nombre
        const grouped = new Map<string, MateriaHistorial>();
        matList.forEach((m: any) => {
          const key = m.nombre;
          const periodo = periodoMap.get(m.periodo);
          const periodoNombre = periodo?.nombre ?? m.periodo_nombre ?? `Periodo ${m.periodo}`;
          const isActivo = periodo ? !!periodo.activo : false;

          if (!grouped.has(key)) {
            grouped.set(key, { materia_nombre: key, materia_nrc: m.nrc, periodos: [], tiene_comparativa: false });
          }

          const entry = grouped.get(key)!;
          const stats = statsList.find(s =>
            s.materia_nombre === key &&
            s.periodo_nombre === periodoNombre
          );

          if (!entry.periodos.find(p => p.nombre === periodoNombre)) {
            entry.periodos.push({
              nombre: periodoNombre,
              activo: isActivo,
              total_alumnos: stats?.total_alumnos,
              promedio_general: stats?.promedio_general,
              porcentaje_aprobados: stats?.porcentaje_aprobados,
              fecha_registro: stats?.fecha_registro,
            });
          }
        });

        grouped.forEach(h => { h.tiene_comparativa = h.periodos.length > 1; });
        this.historialesMateria.set(Array.from(grouped.values()));

        // Estadísticas para la tabla
        this.estadisticasList.set(statsList);
        this.totalEstadisticas.set(statsList.length);
      },
      error: () => {
        this.snackBar.open('Error al cargar datos', 'Cerrar', { duration: 5000 });
      },
      complete: () => {
        this.loading.set(false);
        this.loadingHistorial.set(false);
      }
    });
  }

  cargarEstadisticas(page = 1) {
    const did = this.docenteId();
    if (!did) return;
    this.loadingEstadisticas.set(true);
    this.reportes.getEstadisticasDocente(did, page, this.limiteEstadisticas()).subscribe({
      next: (data) => {
        this.estadisticasList.set(data.items || []);
        this.totalEstadisticas.set(data.total || 0);
        this.paginaEstadisticas.set(page);
      },
      error: () => {
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
        const blob = response.body!;
        const cd = response.headers.get('content-disposition') ?? '';
        const match = cd.match(/filename="?([^";\n]+)"?/);
        const filename = match?.[1] ?? `${tipo}_${materiaId}_${Date.now()}.${formato === 'pdf' ? 'pdf' : 'xlsx'}`;
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
        this.snackBar.open('Reporte descargado exitosamente', 'Cerrar', { duration: 5000 });
      },
      error: () => {
        this.snackBar.open('Error al descargar reporte', 'Cerrar', { duration: 5000 });
      }
    });
  }

  onPaginaEstadisticasChange(event: PageEvent) {
    this.cargarEstadisticas(event.pageIndex + 1);
  }

  promedioComparativo(periodos: PeriodoHistorial[]): string {
    const conStats = periodos.filter(p => p.promedio_general !== undefined);
    if (conStats.length < 2) return '';
    const max = Math.max(...conStats.map(p => p.promedio_general!));
    const min = Math.min(...conStats.map(p => p.promedio_general!));
    const diff = max - min;
    return diff > 0 ? `Δ ${diff.toFixed(1)}%` : 'Sin variación';
  }

  colorBarra(val: number): string {
    if (val >= 80) return 'high';
    if (val >= 60) return 'medium';
    return 'low';
  }
}
