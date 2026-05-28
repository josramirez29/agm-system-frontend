import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from '../../../core/services/auth.service';
import { DocentesService } from '../../../core/services/docentes.service';
import { AlumnosService } from '../../../core/services/alumnos.service';
import { MateriasService } from '../../../core/services/materias.service';
import { ReportesService } from '../../../core/services/reportes.service';
import { Materia } from '../../../core/models';
import { switchMap, catchError, of } from 'rxjs';

interface AlumnoRow {
  id: number;
  matricula: string;
  nombre: string;
  email: string;
  activo: boolean;
}

interface MateriaState {
  materia: Materia;
  alumnos: AlumnoRow[];
  loadingAlumnos: boolean;
  cargado: boolean;
}

@Component({
  selector: 'app-docente-materias',
  standalone: true,
  imports: [
    CommonModule, MatExpansionModule, MatCardModule, MatButtonModule,
    MatIconModule, MatChipsModule, MatTableModule, MatProgressSpinnerModule,
    MatSnackBarModule, MatDialogModule, MatTooltipModule
  ],
  templateUrl: './docente-materias.component.html',
  styleUrls: ['./docente-materias.component.scss']
})
export class DocenteMateriasComponent implements OnInit {
  private auth        = inject(AuthService);
  private docenteSvc  = inject(DocentesService);
  private alumnosSvc  = inject(AlumnosService);
  private materiasSvc = inject(MateriasService);
  private reporteSvc  = inject(ReportesService);
  private snack       = inject(MatSnackBar);
  private dialog      = inject(MatDialog);

  loading    = signal(true);
  estados    = signal<MateriaState[]>([]);
  columnas   = ['matricula', 'nombre', 'email', 'activo'];
  importando = signal<number | null>(null);
  cerrando   = signal<number | null>(null);
  docenteId  = signal<number | null>(null);

  ngOnInit() {
    const email = this.auth.currentUser()?.email ?? '';
    this.docenteSvc.getByEmail(email).pipe(
      switchMap(docente => {
        if (!docente) return of([]);
        this.docenteId.set(docente.id);
        return this.docenteSvc.getMateriasByDocente(docente.id).pipe(catchError(() => of([])));
      }),
      catchError(() => of([]))
    ).subscribe((mats: Materia[]) => {
      this.estados.set(mats.map(m => ({ materia: m, alumnos: [], loadingAlumnos: false, cargado: false })));
      this.loading.set(false);
    });
  }

  expandir(idx: number) {
    const est = this.estados()[idx];
    if (est.cargado) return;
    const lista = [...this.estados()];
    lista[idx] = { ...est, loadingAlumnos: true };
    this.estados.set(lista);
    this.alumnosSvc.getByMateria(est.materia.nrc).pipe(
      catchError(() => of([]))
    ).subscribe((alumnos: any[]) => {
      const actualizada = [...this.estados()];
      actualizada[idx] = { ...actualizada[idx], alumnos: alumnos ?? [], loadingAlumnos: false, cargado: true };
      this.estados.set(actualizada);
    });
  }

  importarPdf(idx: number, event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    input.value = '';
    this.importando.set(idx);
    this.alumnosSvc.importPdf(file).pipe(catchError(err => {
      const msg = err.error?.detail ?? 'Error al importar PDF';
      this.snack.open(msg, 'OK', { duration: 5000 });
      return of(null);
    })).subscribe(res => {
      this.importando.set(null);
      if (res) {
        const registros = res.registros_importados ?? res.data?.registros_importados ?? 0;
        this.snack.open(`${registros} alumno(s) importado(s) correctamente`, 'OK', { duration: 4000 });
        // Recargar lista de alumnos para este panel
        const lista = [...this.estados()];
        lista[idx] = { ...lista[idx], cargado: false };
        this.estados.set(lista);
        this.expandir(idx);
      }
    });
  }

  cerrarMateria(idx: number) {
    const est = this.estados()[idx];
    if (!confirm(`¿Cerrar la materia "${est.materia.nombre}" (NRC: ${est.materia.nrc})? Esta acción notificará a todos los alumnos inscritos.`)) return;
    this.cerrando.set(idx);
    this.materiasSvc.cerrarPorNrc(est.materia.nrc).pipe(
      catchError(err => {
        const msg = err.error?.detail ?? 'Error al cerrar materia';
        this.snack.open(msg, 'OK', { duration: 5000 });
        return of(null);
      })
    ).subscribe(res => {
      this.cerrando.set(null);
      if (res !== null) {
        this.snack.open('Materia cerrada correctamente', 'OK', { duration: 4000 });
        const lista = [...this.estados()];
        lista[idx] = { ...lista[idx], materia: { ...lista[idx].materia, activo: false } };
        this.estados.set(lista);
        this.reporteSvc.autoRegistrarEstadisticas(est.materia.nrc, this.docenteId())
          .pipe(catchError(() => of(null))).subscribe();
      }
    });
  }
}
