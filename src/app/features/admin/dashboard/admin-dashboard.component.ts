import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { forkJoin, catchError, of } from 'rxjs';
import { PeriodosService } from '../../../core/services/periodos.service';
import { MateriasService } from '../../../core/services/materias.service';
import { DocentesService } from '../../../core/services/docentes.service';
import { AlumnosService } from '../../../core/services/alumnos.service';

interface StatCard { label: string; value: number; icon: string; color: string; }

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, MatProgressSpinnerModule],
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

  ngOnInit() {
    forkJoin({
      p: this.periodos.getAll().pipe(catchError(() => of({ count: 0 }))),
      m: this.materias.getAll().pipe(catchError(() => of({ count: 0 }))),
      d: this.docentes.getAll().pipe(catchError(() => of({ count: 0 }))),
      a: this.alumnos.getAll().pipe(catchError(() => of({ count: 0 }))),
    }).subscribe(r => {
      this.stats.set([
        { label: 'Periodos',  value: (r.p as any).count ?? 0, icon: 'date_range',  color: '#1565c0' },
        { label: 'Materias',  value: (r.m as any).count ?? 0, icon: 'menu_book',   color: '#2e7d32' },
        { label: 'Docentes',  value: (r.d as any).count ?? 0, icon: 'person_pin',  color: '#e65100' },
        { label: 'Alumnos',   value: (r.a as any).count ?? 0, icon: 'groups',      color: '#6a1b9a' },
      ]);
      this.loading.set(false);
    });
  }
}
