import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatChipsModule } from '@angular/material/chips';
import { AuthService } from '../../../core/services/auth.service';
import { AlumnosService } from '../../../core/services/alumnos.service';
import { CalificacionesService } from '../../../core/services/calificaciones.service';
import { catchError, of, switchMap, forkJoin } from 'rxjs';

interface ActividadCalif {
  nombre: string;
  ponderacion: number;
  calificacion: number;
  puntos_aportados: number;
}

interface MateriaCalif {
  materia_id: string;
  actividades: ActividadCalif[];
  promedio_exacto: number;
  promedio_redondeado: number;
}

@Component({
  selector: 'app-calificaciones',
  standalone: true,
  imports: [
    CommonModule, MatCardModule, MatButtonModule, MatIconModule, MatTableModule,
    MatProgressSpinnerModule, MatSnackBarModule, MatExpansionModule, MatChipsModule
  ],
  templateUrl: './calificaciones.component.html',
  styleUrls: ['./calificaciones.component.scss']
})
export class CalificacionesComponent implements OnInit {
  private auth       = inject(AuthService);
  private alumnoSvc  = inject(AlumnosService);
  private califSvc   = inject(CalificacionesService);
  private snack      = inject(MatSnackBar);

  loading    = signal(true);
  matricula  = signal<string>('');
  materias   = signal<MateriaCalif[]>([]);

  colActs = ['nombre', 'ponderacion', 'calificacion', 'puntos_aportados'];

  ngOnInit() {
    const email = this.auth.currentUser()?.email ?? '';
    if (!email) { this.loading.set(false); return; }

    // Buscar el alumno por email en ms-docentes para obtener su matrícula
    this.alumnoSvc.getAll(1, email).pipe(
      switchMap((res: any) => {
        const list: any[] = res?.results ?? res ?? [];
        const alumno = list.find((a: any) =>
          a.email?.toLowerCase() === email.toLowerCase()
        );
        if (!alumno?.matricula) {
          return of(null);
        }
        this.matricula.set(alumno.matricula);
        return this.califSvc.getMisCalificaciones(alumno.matricula).pipe(
          catchError(() => of(null))
        );
      }),
      catchError(() => of(null))
    ).subscribe(data => {
      if (data?.materias) {
        this.materias.set(data.materias);
      }
      this.loading.set(false);
    });
  }
}
