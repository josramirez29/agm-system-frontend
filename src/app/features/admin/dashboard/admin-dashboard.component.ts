import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { RouterModule } from '@angular/router';
import { forkJoin, catchError, of, interval } from 'rxjs';
import { PeriodosService } from '../../../core/services/periodos.service';
import { MateriasService } from '../../../core/services/materias.service';
import { DocentesService } from '../../../core/services/docentes.service';
import { AlumnosService } from '../../../core/services/alumnos.service';

interface StatCard { label: string; value: number; icon: string; color: string; }
interface PeriodoActivo { id: string; nombre: string; activo: boolean; fecha_inicio: string; fecha_fin: string; }

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    CommonModule, MatCardModule, MatIconModule, MatProgressSpinnerModule,
    MatButtonModule, MatChipsModule, RouterModule
  ],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.scss']
})
export class AdminDashboardComponent implements OnInit {
  private periodos = inject(PeriodosService);
  private materias = inject(MateriasService);
  private docentes = inject(DocentesService);
  private alumnos  = inject(AlumnosService);

  loading = signal(true);
  stats = signal<StatCard[]>([]);
  periodoActivo = signal<PeriodoActivo | null>(null);
  fechaSistema = signal<string>('');

  ngOnInit() {
    this.cargarDatos();
    // Actualizar fecha y hora cada segundo
    interval(1000).subscribe(() => {
      this.actualizarFechaSistema();
    });
  }

  cargarDatos() {
    forkJoin({
      p: this.periodos.getAll().pipe(catchError(() => of({ items: [], count: 0 }))),
      m: this.materias.getAll().pipe(catchError(() => of({ items: [], count: 0 }))),
      d: this.docentes.getAll().pipe(catchError(() => of({ items: [], count: 0 }))),
      a: this.alumnos.getAll().pipe(catchError(() => of({ items: [], count: 0 }))),
    }).subscribe(r => {
      const periodosData = (r.p as any);
      const materiasData = (r.m as any);
      const docentesData = (r.d as any);
      const alumnosData = (r.a as any);

      // Obtener período activo
      const periodos = periodosData.items || [];
      const periodoActual = periodos.find((p: any) => p.activo === true);
      if (periodoActual) {
        this.periodoActivo.set({
          id: periodoActual.id,
          nombre: periodoActual.nombre,
          activo: periodoActual.activo,
          fecha_inicio: periodoActual.fecha_inicio,
          fecha_fin: periodoActual.fecha_fin
        });
      }

      this.stats.set([
        { label: 'Periodos',  value: periodosData.count ?? periodos.length, icon: 'date_range',  color: '#1565c0' },
        { label: 'Materias',  value: materiasData.count ?? (materiasData.items || []).length, icon: 'menu_book',   color: '#2e7d32' },
        { label: 'Docentes',  value: docentesData.count ?? (docentesData.items || []).length, icon: 'person_pin',  color: '#e65100' },
        { label: 'Alumnos',   value: alumnosData.count ?? (alumnosData.items || []).length, icon: 'groups',      color: '#6a1b9a' },
      ]);
      this.loading.set(false);
      this.actualizarFechaSistema();
    });
  }

  actualizarFechaSistema() {
    const ahora = new Date();
    const opciones: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    };
    this.fechaSistema.set(ahora.toLocaleDateString('es-ES', opciones));
  }

  obtenerDiasRestantes(fechaFin: string): number {
    const hoy = new Date();
    const fin = new Date(fechaFin);
    const diferencia = fin.getTime() - hoy.getTime();
    return Math.ceil(diferencia / (1000 * 60 * 60 * 24));
  }

  estaVigente(diasRestantes: number): boolean {
    return diasRestantes > 0;
  }
}
