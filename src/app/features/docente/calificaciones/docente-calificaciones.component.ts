import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormArray, Validators, FormGroup } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialogModule } from '@angular/material/dialog';
import { AuthService } from '../../../core/services/auth.service';
import { DocentesService } from '../../../core/services/docentes.service';
import { CalificacionesService } from '../../../core/services/calificaciones.service';
import { Materia } from '../../../core/models';
import { switchMap, catchError, of } from 'rxjs';

interface Actividad {
  id: string;
  nombre: string;
  ponderacion: number;
  materia_id: string;
}

interface ConcentradoRow {
  alumno_id: string;
  nombre: string;
  promedio_exacto: number;
  promedio_redondeado: number;
}

@Component({
  selector: 'app-docente-calificaciones',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatCardModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatTabsModule, MatTableModule,
    MatProgressSpinnerModule, MatSnackBarModule, MatDividerModule, MatChipsModule,
    MatTooltipModule, MatDialogModule
  ],
  templateUrl: './docente-calificaciones.component.html',
  styleUrls: ['./docente-calificaciones.component.scss']
})
export class DocenteCalificacionesComponent implements OnInit {
  private auth       = inject(AuthService);
  private docenteSvc = inject(DocentesService);
  private califSvc   = inject(CalificacionesService);
  private snack      = inject(MatSnackBar);
  private fb         = inject(FormBuilder);

  loadingMaterias  = signal(true);
  loadingPond      = signal(false);
  guardandoPond    = signal(false);
  eliminandoPond   = signal(false);
  loadingConc      = signal(false);
  importandoCalif  = signal<number | null>(null);
  guardandoCalif   = signal<number | null>(null);
  reconfigurandoPond = signal(false);

  materias         = signal<Materia[]>([]);
  selectedMateria  = signal<Materia | null>(null);
  actividades      = signal<Actividad[]>([]);
  concentrado      = signal<ConcentradoRow[]>([]);
  sumaPonderacion  = signal(0);

  formPonderaciones!: FormGroup;
  formCalif = this.fb.group({
    actividad_id: ['', Validators.required],
    alumno_id:    ['', Validators.required],
    valor:        [null as number | null, [Validators.required, Validators.min(0), Validators.max(100)]]
  });

  colActividades = ['nombre', 'ponderacion', 'acciones'];
  colConcentrado = ['alumno_id', 'nombre', 'promedio_exacto', 'promedio_redondeado'];

  ngOnInit() {
    this.initFormPonderaciones();
    const email = this.auth.currentUser()?.email ?? '';
    this.docenteSvc.getByEmail(email).pipe(
      switchMap(doc => {
        if (!doc) return of([]);
        return this.docenteSvc.getMateriasByDocente(doc.id).pipe(catchError(() => of([])));
      }),
      catchError(() => of([]))
    ).subscribe((mats: Materia[]) => {
      this.materias.set(mats);
      this.loadingMaterias.set(false);
    });
  }

  initFormPonderaciones() {
    this.formPonderaciones = this.fb.group({ filas: this.fb.array([this.nuevaFila()]) });
    this.filas.valueChanges.subscribe(() => this.calcularSuma());
  }

  get filas() { return this.formPonderaciones.get('filas') as FormArray; }

  nuevaFila() {
    return this.fb.group({
      nombre:      ['', Validators.required],
      ponderacion: [null as number | null, [Validators.required, Validators.min(1), Validators.max(100)]]
    });
  }

  agregarFila() { this.filas.push(this.nuevaFila()); this.calcularSuma(); }

  eliminarFila(i: number) {
    if (this.filas.length > 1) { this.filas.removeAt(i); this.calcularSuma(); }
  }

  calcularSuma() {
    const s = this.filas.controls.reduce((acc, c) => acc + (Number(c.get('ponderacion')?.value) || 0), 0);
    this.sumaPonderacion.set(Math.round(s * 100) / 100);
  }

  onMateriaChange(mat: Materia) {
    this.selectedMateria.set(mat);
    this.actividades.set([]);
    this.concentrado.set([]);
    this.reconfigurandoPond.set(false);
    this.initFormPonderaciones();
    this.cargarPonderaciones(mat);
  }

  cargarPonderaciones(mat: Materia) {
    this.loadingPond.set(true);
    this.califSvc.getPonderaciones(String(mat.id)).pipe(
      catchError(() => of({ detalles: [] }))
    ).subscribe((res: any) => {
      const acts: Actividad[] = res.detalles ?? res.actividades ?? [];
      this.actividades.set(acts);
      this.sumaPonderacion.set(acts.reduce((a, b) => a + b.ponderacion, 0));
      this.loadingPond.set(false);
    });
  }

  guardarPonderaciones() {
    if (this.formPonderaciones.invalid) { this.formPonderaciones.markAllAsTouched(); return; }
    if (this.sumaPonderacion() !== 100) {
      this.snack.open(`La suma es ${this.sumaPonderacion()}%. Debe ser exactamente 100%.`, 'OK', { duration: 5000 });
      return;
    }
    const mat = this.selectedMateria()!;
    const ponderaciones = this.filas.value.map((f: any) => ({
      nombre: f.nombre,
      ponderacion: Number(f.ponderacion)
    }));
    this.guardandoPond.set(true);
    this.califSvc.configurarPonderaciones(String(mat.id), ponderaciones).pipe(
      catchError(err => {
        this.snack.open(err.error?.detail ?? 'Error al guardar', 'OK', { duration: 6000 });
        return of(null);
      })
    ).subscribe(res => {
      this.guardandoPond.set(false);
      if (res) {
        this.snack.open('Ponderaciones configuradas correctamente', 'OK', { duration: 4000 });
        this.reconfigurandoPond.set(false);
        this.cargarPonderaciones(mat);
      }
    });
  }

  iniciarReconfiguracion() {
    // Pre-llenar el formulario con los valores actuales
    const acts = this.actividades();
    while (this.filas.length > 0) this.filas.removeAt(0);
    acts.forEach(a => {
      this.filas.push(this.fb.group({
        nombre:      [a.nombre, Validators.required],
        ponderacion: [a.ponderacion, [Validators.required, Validators.min(1), Validators.max(100)]]
      }));
    });
    this.calcularSuma();
    this.reconfigurandoPond.set(true);
  }

  cancelarReconfiguracion() {
    this.reconfigurandoPond.set(false);
    this.initFormPonderaciones();
  }

  cargarConcentrado() {
    const mat = this.selectedMateria();
    if (!mat) return;
    this.loadingConc.set(true);
    this.califSvc.getConcentrado(String(mat.id)).pipe(
      catchError(() => of([]))
    ).subscribe((data: any) => {
      const rows: ConcentradoRow[] = Array.isArray(data) ? data : (data?.results ?? []);
      this.concentrado.set(rows);
      this.loadingConc.set(false);
    });
  }

  registrarCalificacion() {
    if (this.formCalif.invalid) return;
    const v = this.formCalif.value;
    const idx = this.actividades().findIndex(a => String(a.id) === v.actividad_id);
    this.guardandoCalif.set(idx);
    this.califSvc.registrarCalificacion({
      actividad_id: String(v.actividad_id!),
      alumno_id:    v.alumno_id!,
      valor:        Number(v.valor)
    }).pipe(catchError(err => {
      this.snack.open(err.error?.detail ?? 'Error al registrar', 'OK', { duration: 5000 });
      return of(null);
    })).subscribe(res => {
      this.guardandoCalif.set(null);
      if (res) {
        this.snack.open('Calificación registrada correctamente', 'OK', { duration: 4000 });
        this.formCalif.reset();
      }
    });
  }

  importarExcel(actividadId: string, event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    input.value = '';
    const idx = this.actividades().findIndex(a => String(a.id) === String(actividadId));
    this.importandoCalif.set(idx);
    this.califSvc.importarExcel(String(actividadId), file).pipe(
      catchError(err => {
        this.snack.open(err.error?.detail ?? 'Error al importar Excel', 'OK', { duration: 5000 });
        return of(null);
      })
    ).subscribe(res => {
      this.importandoCalif.set(null);
      if (res) {
        const n = res.data?.registros_procesados ?? res.registros_procesados ?? 0;
        this.snack.open(`${n} calificación(es) importadas`, 'OK', { duration: 4000 });
      }
    });
  }
}
