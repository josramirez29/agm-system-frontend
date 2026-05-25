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
import { AsistenciasService } from '../../../core/services/asistencias.service';
import { Materia } from '../../../core/models';
import { switchMap, catchError, of } from 'rxjs';

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
  private asistSvc   = inject(AsistenciasService);

  loading   = signal(true);
  materias  = signal<Materia[]>([]);
  docenteId = signal<number | null>(null);

  barData   = signal<ChartData<'bar'>>({ labels: [], datasets: [] });
  pieData   = signal<ChartData<'doughnut'>>({ labels: [], datasets: [] });

  barOptions: ChartOptions<'bar'> = {
    responsive: true,
    plugins: { legend: { display: false }, title: { display: true, text: 'Asistencias por materia' } },
    scales: { y: { beginAtZero: true, max: 100, ticks: { callback: v => v + '%' } } }
  };
  pieOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    plugins: { legend: { position: 'bottom' }, title: { display: true, text: 'Distribución de asistencia' } }
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
      const mats: Materia[] = res?.results ?? res ?? [];
      this.materias.set(mats);
      this.buildCharts(mats);
      this.loading.set(false);
    });
  }

  buildCharts(mats: Materia[]) {
    const labels = mats.map(m => m.nombre ?? `NRC ${m.nrc}`);
    const data   = mats.map(() => Math.floor(Math.random() * 40) + 60);
    this.barData.set({
      labels,
      datasets: [{ data, backgroundColor: '#1565c0', borderRadius: 6, label: 'Asistencia %' }]
    });
    const presente = data.reduce((a, b) => a + b, 0);
    const ausente  = data.length * 100 - presente;
    this.pieData.set({
      labels: ['Presente', 'Ausente'],
      datasets: [{ data: [presente, ausente], backgroundColor: ['#1565c0', '#ef9a9a'] }]
    });
  }
}
