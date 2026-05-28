import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { BaseChartDirective, provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { ChartData, ChartOptions } from 'chart.js';
import { AuthService } from '../../../core/services/auth.service';
import { DocentesService } from '../../../core/services/docentes.service';
import { AlumnosService } from '../../../core/services/alumnos.service';
import { Materia } from '../../../core/models';
import { switchMap, catchError, of, forkJoin } from 'rxjs';

@Component({
  selector: 'app-docente-dashboard',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, MatProgressSpinnerModule,
            MatSelectModule, MatFormFieldModule, BaseChartDirective],
  providers: [provideCharts(withDefaultRegisterables())],
  templateUrl: './docente-dashboard.component.html',
  styleUrls: ['./docente-dashboard.component.scss']
})
export class DocenteDashboardComponent implements OnInit {
  private auth       = inject(AuthService);
  private docenteSvc = inject(DocentesService);
  private alumnosSvc = inject(AlumnosService);

  loading   = signal(true);
  materias  = signal<Materia[]>([]);
  docenteId = signal<number | null>(null);

  barData   = signal<ChartData<'bar'>>({ labels: [], datasets: [] });
  pieData   = signal<ChartData<'doughnut'>>({ labels: [], datasets: [] });

  barOptions: ChartOptions<'bar'> = {
    responsive: true,
    plugins: { legend: { display: false }, title: { display: true, text: 'Alumnos inscritos por materia' } },
    scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
  };
  pieOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    plugins: { legend: { position: 'bottom' }, title: { display: true, text: 'Distribución de alumnos' } }
  };

  ngOnInit() {
    const email = this.auth.currentUser()?.email ?? '';
    this.docenteSvc.getByEmail(email).pipe(
      switchMap(docente => {
        if (!docente) return of(null);
        this.docenteId.set(docente.id);
        return this.docenteSvc.getMateriasByDocente(docente.id).pipe(catchError(() => of([])));
      }),
      catchError(() => of(null))
    ).subscribe(res => {
      const mats: Materia[] = (Array.isArray(res) ? res : []) as Materia[];
      this.materias.set(mats);
      this.buildCharts(mats);
    });
  }

  buildCharts(mats: Materia[]) {
    if (!mats.length) {
      this.loading.set(false);
      return;
    }
    const calls = mats.map(m =>
      this.alumnosSvc.getByMateria(m.nrc ?? '').pipe(catchError(() => of([])))
    );
    forkJoin(calls).subscribe(results => {
      const labels = mats.map(m => m.nombre ?? `NRC ${m.nrc}`);
      const counts = results.map((r: any) => (Array.isArray(r) ? r : r?.results ?? []).length);
      this.barData.set({
        labels,
        datasets: [{ data: counts, backgroundColor: '#1565c0', borderRadius: 6, label: 'Alumnos' }]
      });
      const total = counts.reduce((a: number, b: number) => a + b, 0);
      this.pieData.set({
        labels: labels,
        datasets: [{ data: counts, backgroundColor: ['#1565c0', '#42a5f5', '#90caf9', '#bbdefb'] }]
      });
      this.loading.set(false);
    });
  }
}
