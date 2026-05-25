import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { AuthService } from '../../../core/services/auth.service';
import { ReportesService } from '../../../core/services/reportes.service';
import { catchError, of } from 'rxjs';

@Component({
  selector: 'app-calificaciones',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule,
            MatTableModule, MatProgressSpinnerModule, MatSnackBarModule, MatTabsModule],
  templateUrl: './calificaciones.component.html',
  styleUrls: ['./calificaciones.component.scss']
})
export class CalificacionesComponent implements OnInit {
  private auth      = inject(AuthService);
  private reporteSvc = inject(ReportesService);
  private snack      = inject(MatSnackBar);

  loading     = signal(false);
  alumnoId    = signal<number | null>(null);
  estadisticas = signal<any[]>([]);

  columns = ['materia_id', 'periodo_nombre', 'promedio_calificaciones', 'porcentaje_asistencia', 'total_sesiones', 'sesiones_presentes'];
  ds = new MatTableDataSource<any>([]);

  ngOnInit() {
    const user = this.auth.currentUser();
    if (!user) return;
    this.alumnoId.set(user.id);
    this.load(user.id);
  }

  load(id: number) {
    this.loading.set(true);
    this.reporteSvc.getEstadisticasAlumno(id).pipe(catchError(() => of({ items: [] }))).subscribe(r => {
      const rows = (r as any)?.items ?? [];
      this.estadisticas.set(rows);
      this.ds.data = rows;
      this.loading.set(false);
    });
  }
}
