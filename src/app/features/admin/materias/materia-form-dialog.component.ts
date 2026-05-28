import { Component, DestroyRef, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormControl, FormGroup } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSelectModule } from '@angular/material/select';
import { MateriasService } from '../../../core/services/materias.service';
import { DocentesService } from '../../../core/services/docentes.service';
import { PeriodosService } from '../../../core/services/periodos.service';
import { Docente, Materia, Periodo } from '../../../core/models';
import { firstValueFrom } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-materia-form-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatFormFieldModule,
            MatInputModule, MatButtonModule, MatProgressSpinnerModule, MatSnackBarModule,
            MatAutocompleteModule, MatCheckboxModule, MatSelectModule],
  template: `
    <h2 mat-dialog-title>{{ data ? 'Editar' : 'Nueva' }} Materia</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="form-grid">
        <mat-form-field appearance="outline">
          <mat-label>NRC</mat-label>
          <input matInput formControlName="nrc" inputmode="numeric" maxlength="5" />
          @if (form.get('nrc')?.touched && form.get('nrc')?.hasError('required')) { <mat-error>Requerido</mat-error> }
          @if (form.get('nrc')?.touched && form.get('nrc')?.hasError('pattern')) { <mat-error>Solo 5 dígitos numéricos</mat-error> }
          @if (form.get('nrc')?.touched && form.get('nrc')?.hasError('maxlength')) { <mat-error>Máximo 5 caracteres</mat-error> }
        </mat-form-field>
        <mat-form-field appearance="outline" class="full">
          <mat-label>Nombre</mat-label>
          <input matInput formControlName="nombre" />
          @if (form.get('nombre')?.touched && form.get('nombre')?.invalid) { <mat-error>Requerido</mat-error> }
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Periodo</mat-label>
          <mat-select formControlName="periodo_id">
            @for (periodo of periodos(); track periodo.id) {
              <mat-option [value]="periodo.id">{{ periodo.nombre }} (ID: {{ periodo.id }})</mat-option>
            }
          </mat-select>
          @if (form.get('periodo_id')?.touched && form.get('periodo_id')?.hasError('required')) { <mat-error>Requerido</mat-error> }
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Docente</mat-label>
          <input matInput [formControl]="docenteSearchCtrl" [matAutocomplete]="docenteAuto" placeholder="Escribe para buscar" />
          <mat-autocomplete #docenteAuto="matAutocomplete" (optionSelected)="onDocenteSelected($event.option.value)">
            @for (docente of filteredDocentes(); track docente.id) {
              <mat-option [value]="docente">{{ docenteLabel(docente) }}</mat-option>
            }
          </mat-autocomplete>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Sección</mat-label>
          <input matInput formControlName="seccion" placeholder="Ej. 001" />
          @if (form.get('seccion')?.touched && form.get('seccion')?.hasError('required')) { <mat-error>Requerido</mat-error> }
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Clave</mat-label>
          <input matInput formControlName="clave" />
        </mat-form-field>
        <div class="full schedule-grid">
          <div class="schedule-title">Horario</div>
          <div class="schedule-hint">Selecciona los días y la franja horaria</div>
          <div formGroupName="dias" class="days-grid">
            @for (day of days; track day.value) {
              <mat-checkbox [formControlName]="day.value">{{ day.label }}</mat-checkbox>
            }
          </div>
        <mat-form-field appearance="outline">
          <mat-label>Hora inicio</mat-label>
          <input matInput type="time" formControlName="hora_inicio" />
          @if (form.get('hora_inicio')?.touched && form.get('hora_inicio')?.hasError('required')) { <mat-error>Requerido</mat-error> }
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Hora fin</mat-label>
          <input matInput type="time" formControlName="hora_fin" />
          @if (form.get('hora_fin')?.touched && form.get('hora_fin')?.hasError('required')) { <mat-error>Requerido</mat-error> }
        </mat-form-field>
        </div>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancelar</button>
      <button mat-flat-button color="primary" (click)="save()" [disabled]="saving()">
        @if (saving()) { <mat-spinner diameter="18" /> } @else { Guardar }
      </button>
    </mat-dialog-actions>
  `,
  styles: [`.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:0 1rem;padding-top:.5rem}
            .full{grid-column:1/-1}
            .schedule-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.75rem 1rem;align-items:start;margin-top:.25rem}
            .schedule-title{grid-column:1/-1;font-weight:700}
            .schedule-hint{grid-column:1/-1;color:var(--muted-text,#666);font-size:.9rem;margin-top:-.25rem}
            .days-grid{grid-column:1/-1;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.25rem 1rem}
            .days-grid mat-checkbox{justify-self:start}`]
})
export class MateriaFormDialogComponent {
  data   = inject<Materia | null>(MAT_DIALOG_DATA);
  private svc = inject(MateriasService);
  private docentesSvc = inject(DocentesService);
  private periodosSvc = inject(PeriodosService);
  private ref = inject(MatDialogRef<MateriaFormDialogComponent>);
  private fb  = inject(FormBuilder);
  private snack = inject(MatSnackBar);
  private destroyRef = inject(DestroyRef);
  saving = signal(false);
  periodos = signal<Periodo[]>([]);
  docentes = signal<Docente[]>([]);
  filteredDocentes = signal<Docente[]>([]);
  selectedDocente: Docente | null = null;
  docenteSearchCtrl = new FormControl<string>('', { nonNullable: true });
  days = [
    { value: 'L', label: 'Lunes' },
    { value: 'M', label: 'Martes' },
    { value: 'X', label: 'Miércoles' },
    { value: 'J', label: 'Jueves' },
    { value: 'V', label: 'Viernes' },
    { value: 'S', label: 'Sábado' },
  ] as const;
    form = this.fb.group({
    nrc:        [this.data?.nrc ?? '', [Validators.required, Validators.pattern(/^[0-9]{5}$/), Validators.maxLength(5)]],
    nombre:     [this.data?.nombre ?? '', Validators.required],
    periodo_id: [this.data?.periodo_id ?? '', Validators.required],
    docente_id: [this.data?.docente_id ?? null],
    docente_nombre: [this.data?.docente_nombre ?? ''],
    seccion:    [this.data?.seccion ?? '', Validators.required],
    clave:      [this.data?.clave ?? ''],
    hora_inicio: ['08:00', Validators.required],
    hora_fin: ['09:00', Validators.required],
    dias: this.fb.group({
      L: [false],
      M: [false],
      X: [false],
      J: [false],
      V: [false],
      S: [false],
    }),
  });

  constructor() {
    this.docenteSearchCtrl.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(value => {
      const query = value.trim();
      this.filteredDocentes.set(this.filterDocentes(query));
      if (!query) {
        this.selectedDocente = null;
        this.form.patchValue({ docente_id: null, docente_nombre: '' }, { emitEvent: false });
        return;
      }
      if (!this.selectedDocente || this.docenteLabel(this.selectedDocente) !== query) {
        this.selectedDocente = null;
        this.form.patchValue({ docente_id: null, docente_nombre: query }, { emitEvent: false });
      }
    });
  }

  ngOnInit() {
    void this.loadLookups();
    this.applyInitialValues();
  }

  private async loadLookups() {
    const [periodos, docentes] = await Promise.all([
      this.loadAllPages<Periodo>((page) => this.periodosSvc.getAll(page)),
      this.loadAllPages<Docente>((page) => this.docentesSvc.getAll(page)),
    ]);
    this.periodos.set(periodos);
    this.docentes.set(docentes);
    this.filteredDocentes.set(this.filterDocentes(this.docenteSearchCtrl.value));
    if (this.data?.docente_id) {
      const matched = docentes.find(d => d.id === this.data?.docente_id) ?? null;
      this.selectedDocente = matched;
      const label = matched ? this.docenteLabel(matched) : (this.data.docente_nombre ?? '');
      this.docenteSearchCtrl.setValue(label, { emitEvent: false });
      this.form.patchValue({
        docente_id: this.data.docente_id,
        docente_nombre: label,
      }, { emitEvent: false });
    } else if (this.data?.docente_nombre) {
      this.docenteSearchCtrl.setValue(this.data.docente_nombre, { emitEvent: false });
      this.form.patchValue({ docente_nombre: this.data.docente_nombre }, { emitEvent: false });
    }
    if (this.data?.horario) {
      this.patchHorario(this.data.horario);
    }
  }

  private applyInitialValues() {
    if (this.data?.periodo_id) {
      this.form.patchValue({ periodo_id: this.data.periodo_id }, { emitEvent: false });
    }
  }

  private async loadAllPages<T>(loader: (page: number) => any): Promise<T[]> {
    const items: T[] = [];
    let page = 1;
    while (true) {
      const response = await firstValueFrom((loader(page) as any));
      const chunk = (response as any)?.results ?? [];
      if (Array.isArray(chunk)) items.push(...chunk);
      else if (Array.isArray(response)) items.push(...response);
      if (!(response as any)?.next) break;
      page += 1;
    }
    return items;
  }

  docenteLabel(docente: Docente) {
    const fullName = [docente.nombre, docente.apellido].filter(Boolean).join(' ').trim();
    return fullName || docente.email || `Docente ${docente.id}`;
  }

  onDocenteSelected(docente: Docente) {
    this.selectedDocente = docente;
    const label = this.docenteLabel(docente);
    this.docenteSearchCtrl.setValue(label, { emitEvent: false });
    this.form.patchValue({
      docente_id: docente.id,
      docente_nombre: label,
    }, { emitEvent: false });
  }

  private filterDocentes(query: string) {
    const q = query.toLowerCase().trim();
    if (!q) return this.docentes();
    return this.docentes().filter(docente => {
      const label = this.docenteLabel(docente).toLowerCase();
      return label.includes(q) || String(docente.id).includes(q) || (docente.email ?? '').toLowerCase().includes(q);
    });
  }

  private patchHorario(horario: string) {
    const diasGroup = this.form.get('dias') as FormGroup;
    diasGroup.reset({
      L: false,
      M: false,
      X: false,
      J: false,
      V: false,
      S: false,
    }, { emitEvent: false });
    const segments = horario.split(';').map(part => part.trim()).filter(Boolean);
    let inicio = '';
    let fin = '';
    for (const segment of segments) {
      const match = segment.match(/^([LMXJVS])\s+([0-9]{4}|[0-9]{2}:[0-9]{2})-([0-9]{4}|[0-9]{2}:[0-9]{2})$/i);
      if (!match) continue;
      const dia = match[1].toUpperCase();
      const a = this.normalizeTime(match[2]);
      const b = this.normalizeTime(match[3]);
      if (!inicio) inicio = a;
      if (!fin) fin = b;
      diasGroup.get(dia)?.setValue(true, { emitEvent: false });
    }
    if (inicio) this.form.patchValue({ hora_inicio: inicio }, { emitEvent: false });
    if (fin) this.form.patchValue({ hora_fin: fin }, { emitEvent: false });
  }

  private normalizeTime(value: string) {
    if (!value) return '';
    const clean = value.replace(':', '');
    if (/^[0-9]{4}$/.test(clean)) {
      return `${clean.slice(0, 2)}:${clean.slice(2)}`;
    }
    if (/^[0-9]{2}:[0-9]{2}$/.test(value)) return value;
    return value;
  }

  save() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    const raw = this.form.getRawValue();
    const horaInicio = String(this.form.get('hora_inicio')?.value ?? '').trim();
    const horaFin = String(this.form.get('hora_fin')?.value ?? '').trim();
    const selectedDays = this.days.filter(day => Boolean((raw.dias as any)?.[day.value])).map(day => day.value);
    if (!selectedDays.length) {
      this.snack.open('Selecciona al menos un día', 'Cerrar', { duration: 3500, panelClass: 'snack-error' });
      this.saving.set(false);
      return;
    }
    if (!horaInicio || !horaFin) {
      this.snack.open('Indica hora de inicio y fin', 'Cerrar', { duration: 3500, panelClass: 'snack-error' });
      this.saving.set(false);
      return;
    }
    if (horaFin <= horaInicio) {
      this.snack.open('La hora fin debe ser mayor que la hora inicio', 'Cerrar', { duration: 3500, panelClass: 'snack-error' });
      this.saving.set(false);
      return;
    }
    const horario = selectedDays
      .map(day => `${day} ${horaInicio.replace(':', '')}-${horaFin.replace(':', '')}`)
      .join(' ; ');
    const docenteNombre = this.selectedDocente
      ? this.docenteLabel(this.selectedDocente)
      : String(raw.docente_nombre ?? this.docenteSearchCtrl.value ?? '').trim();
    const payload = {
      nrc: String(raw.nrc).trim(),
      nombre: String(raw.nombre).trim(),
      periodo_id: Number(raw.periodo_id),
      docente_id: raw.docente_id == null ? null : Number(raw.docente_id),
      docente_nombre: docenteNombre,
      seccion: String(raw.seccion).trim(),
      clave: String(raw.clave ?? '').trim(),
      horario,
      activo: true,
    };
    const obs = this.data
      ? this.svc.update(this.data.id, payload as any)
      : this.svc.create(payload as any);
    obs.subscribe({
      next: () => this.ref.close(true),
      error: (err) => {
        const detail = err?.error?.message
          ?? err?.error?.detail
          ?? err?.error?.non_field_errors?.[0]
          ?? err?.error?.nrc?.[0]
          ?? err?.error?.periodo_id?.[0]
          ?? err?.error?.docente_id?.[0]
          ?? err?.error?.docente_nombre?.[0]
          ?? err?.error?.seccion?.[0]
          ?? err?.error?.horario?.[0]
          ?? 'No se pudo guardar la materia';
        this.snack.open(detail, 'Cerrar', { duration: 4500, panelClass: 'snack-error' });
        this.saving.set(false);
      }
    });
  }
}
