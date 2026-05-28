import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatChipsModule } from '@angular/material/chips';
import { AuthService } from '../../../core/services/auth.service';
import { AlumnosService } from '../../../core/services/alumnos.service';
import { CalificacionesService } from '../../../core/services/calificaciones.service';
import { MateriasService } from '../../../core/services/materias.service';
import { catchError, of, switchMap, forkJoin } from 'rxjs';

interface ActividadCalif {
  nombre: string;
  ponderacion: number;
  calificacion: number;
  puntos_aportados: number;
}

interface MateriaCalif {
  materia_id: string;
  materia_nombre: string;
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
  private auth        = inject(AuthService);
  private alumnoSvc   = inject(AlumnosService);
  private califSvc    = inject(CalificacionesService);
  private materiasSvc = inject(MateriasService);

  loading   = signal(true);
  matricula = signal<string>('');
  materias  = signal<MateriaCalif[]>([]);

  colActs = ['nombre', 'ponderacion', 'calificacion', 'puntos_aportados'];

  ngOnInit() {
    const email = this.auth.currentUser()?.email ?? '';
    if (!email) { this.loading.set(false); return; }

    this.alumnoSvc.getAll(1, email).pipe(
      switchMap((res: any) => {
        const list: any[] = res?.results ?? res ?? [];
        const alumnoRows = list.filter((a: any) => a.email?.toLowerCase() === email.toLowerCase());
        if (!alumnoRows.length) return of(null);

        const alumno = alumnoRows[0];
        this.matricula.set(alumno.matricula);

        const nrcs = [...new Set<string>(alumnoRows.map((r: any) => String(r.nrc)))];
        const materiaLookups: Record<string, any> = {};
        nrcs.forEach(nrc => {
          materiaLookups[nrc] = this.materiasSvc.getAll(1, 10, nrc).pipe(catchError(() => of(null)));
        });

        return forkJoin({
          calif: this.califSvc.getMisCalificaciones(alumno.matricula).pipe(catchError(() => of(null))),
          materiasByNrc: (nrcs.length ? forkJoin(materiaLookups) : of<Record<string, any>>({}))
            .pipe(catchError(() => of({}))),
        });
      }),
      catchError(() => of(null))
    ).subscribe(res => {
      if (res?.calif?.materias) {
        const nombreById = new Map<string, string>();
        for (const [nrc, result] of Object.entries((res as any).materiasByNrc ?? {})) {
          const mList: any[] = (result as any)?.results ?? result ?? [];
          const m = mList.find((m: any) => String(m.nrc) === String(nrc));
          if (m) nombreById.set(String(m.id), m.nombre ?? `NRC ${nrc}`);
        }
        this.materias.set(res.calif.materias.map((m: any) => ({
          ...m,
          materia_nombre: nombreById.get(String(m.materia_id)) ?? `Materia ${m.materia_id}`,
        })));
      }
      this.loading.set(false);
    });
  }
}
