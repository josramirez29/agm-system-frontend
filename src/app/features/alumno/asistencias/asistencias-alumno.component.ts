import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../../core/services/auth.service';
import { AlumnosService } from '../../../core/services/alumnos.service';
import { AsistenciasService } from '../../../core/services/asistencias.service';
import { catchError, of, switchMap } from 'rxjs';

interface AsistenciaMateria {
  materia_id: string;
  presentes: number;
  retardos: number;
  total_sesiones: number;
  porcentaje: number;
}

@Component({
  selector: 'app-asistencias-alumno',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, MatTableModule, MatProgressSpinnerModule],
  templateUrl: './asistencias-alumno.component.html',
  styleUrls: ['./asistencias-alumno.component.scss'],
})
export class AsistenciasAlumnoComponent implements OnInit {
  private auth       = inject(AuthService);
  private alumnoSvc  = inject(AlumnosService);
  private asistSvc   = inject(AsistenciasService);

  loading    = signal(true);
  sinRegistro = signal(false);
  rows       = signal<AsistenciaMateria[]>([]);
  dataSource = new MatTableDataSource<AsistenciaMateria>([]);

  columns = ['materia_id', 'presentes', 'retardos', 'total_sesiones', 'porcentaje'];

  ngOnInit() {
    const email = this.auth.currentUser()?.email ?? '';
    if (!email) { this.loading.set(false); this.sinRegistro.set(true); return; }

    this.alumnoSvc.getAll(1, email).pipe(
      switchMap((res: any) => {
        const list: any[] = res?.results ?? res ?? [];
        const alumno = list.find((a: any) => a.email?.toLowerCase() === email.toLowerCase());
        if (!alumno?.id) { this.sinRegistro.set(true); return of(null); }
        return this.asistSvc.getMisAsistencias(alumno.id).pipe(catchError(() => of(null)));
      }),
      catchError(() => of(null))
    ).subscribe(data => {
      const list: AsistenciaMateria[] = Array.isArray(data) ? data : [];
      this.rows.set(list);
      this.dataSource.data = list;
      this.loading.set(false);
    });
  }
}
