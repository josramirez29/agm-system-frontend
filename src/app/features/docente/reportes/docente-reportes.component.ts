import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { DocentesService } from '../../../core/services/docentes.service';
import { ReportesService } from '../../../core/services/reportes.service';
import { Materia } from '../../../core/models';
import { switchMap, catchError, of } from 'rxjs';

@Component({
  selector: 'app-docente-reportes',
  standalone: true,
  imports: [CommonModule, FormsModule, MatCardModule, MatButtonModule, MatIconModule,
            MatSelectModule, MatFormFieldModule, MatTableModule, MatProgressSpinnerModule, MatSnackBarModule],
  templateUrl: './docente-reportes.component.html',
  styleUrls: ['./docente-reportes.component.scss']
})
export class DocenteReportesComponent implements OnInit {
  private auth       = inject(AuthService);
  private docenteSvc = inject(DocentesService);
  private reporteSvc = inject(ReportesService);
  private snack      = inject(MatSnackBar);

  loadingMaterias = signal(true);
  loadingReporte  = signal(false);
  downloading     = signal(false);
  materias        = signal<Materia[]>([]);
  selectedMateria = signal<string | null>(null);
  docenteId       = signal<number | null>(null);
  estadisticas    = signal<any[]>([]);

  columns = ['materia_id', 'periodo_nombre', 'promedio_general', 'porcentaje_asistencia', 'total_alumnos'];
  dataSource = new MatTableDataSource<any>([]);

  ngOnInit() {
    const email = this.auth.currentUser()?.email ?? '';
    this.docenteSvc.getByEmail(email).pipe(
      switchMap(d => {
        if (!d) return of([]);
        this.docenteId.set(d.id);
        return this.docenteSvc.getMateriasByDocente(d.id).pipe(catchError(() => of([])));
      })
    ).subscribe(r => {
      this.materias.set(Array.isArray(r) ? r : []);
      this.loadingMaterias.set(false);
      if (this.docenteId()) this.cargarEstadisticas();
    });
  }

  cargarEstadisticas() {
    const did = this.docenteId();
    if (!did) return;
    this.loadingReporte.set(true);
    this.reporteSvc.getEstadisticasDocente(did).pipe(catchError(() => of({items: []}))).subscribe(r => {
      const rows: any[] = (r as any)?.items ?? [];
      this.estadisticas.set(rows);
      this.dataSource.data = rows;
      this.loadingReporte.set(false);
    });
  }

  descargar(tipo: 'calificaciones' | 'asistencias', formato: 'pdf' | 'xls') {
    const mid = this.selectedMateria();
    if (!mid) { this.snack.open('Selecciona una materia', '', { duration: 2000 }); return; }
    this.downloading.set(true);
    const obs = tipo === 'calificaciones'
      ? this.reporteSvc.descargarCalificaciones(mid, formato)
      : this.reporteSvc.descargarAsistencias(mid, formato);

    obs.pipe(catchError(() => { this.snack.open('Error al descargar', '', { duration: 3000 }); return of(null); }))
      .subscribe(res => {
        this.downloading.set(false);
        if (!res) return;
        const blob = res.body!;
        const cd   = res.headers.get('Content-Disposition') ?? '';
        const name = cd.match(/filename="?([^"]+)"?/)?.[1] ?? `reporte.${formato === 'xls' ? 'xlsx' : 'pdf'}`;
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href = url; a.download = name; a.click();
        URL.revokeObjectURL(url);
      });
  }
}
