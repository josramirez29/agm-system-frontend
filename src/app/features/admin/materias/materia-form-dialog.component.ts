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
          <mat-label>Periodo ID</mat-label>
          <input
            matInput
            formControlName="periodo_id"
            inputmode="numeric"
            pattern="[0-9]*"
            placeholder="Ej. 3"
          />
          @if (form.get('periodo_id')?.touched && form.get('periodo_id')?.hasError('required')) { <mat-error>Requerido</mat-error> }
          @if (form.get('periodo_id')?.touched && form.get('periodo_id')?.hasError('pattern')) { <mat-error>Solo números</mat-error> }
        </mat-form-field>
        @if (selectedPeriodo()) {
          <div class="full periodo-summary">
            <strong>{{ selectedPeriodo()?.nombre }}</strong>
            <div class="upload-hint">Plan de estudios: {{ selectedPeriodo()?.plan_estudios ?? '—' }}</div>
          </div>
        }
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
        <div class="full schedule-grid" formGroupName="schedule">
          <div class="schedule-title">Horario</div>
          <div class="schedule-hint">Activa cada día y define su propio horario</div>
          @for (day of days; track day.value) {
            <div class="day-row" [formGroupName]="day.value">
              <mat-checkbox formControlName="enabled">{{ day.label }}</mat-checkbox>
              <mat-form-field appearance="outline">
                <mat-label>Inicio</mat-label>
                <input matInput type="time" formControlName="start" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Fin</mat-label>
                <input matInput type="time" formControlName="end" />
              </mat-form-field>
            </div>
          }
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
            .schedule-grid{display:grid;grid-template-columns:1fr;gap:.75rem 1rem;align-items:start;margin-top:.25rem}
            .schedule-title{grid-column:1/-1;font-weight:700}
            .schedule-hint{grid-column:1/-1;color:var(--muted-text,#666);font-size:.9rem;margin-top:-.25rem}
            .day-row{display:grid;grid-template-columns:140px 1fr 1fr;gap:0 1rem;align-items:center}
            .day-row mat-checkbox{justify-self:start}`]
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
    { value: 'A', label: 'Martes' },
    { value: 'M', label: 'Miércoles' },
    { value: 'J', label: 'Jueves' },
    { value: 'V', label: 'Viernes' },
    { value: 'S', label: 'Sábado' },
  ] as const;
  form = this.fb.group({
    nrc:        [this.data?.nrc ?? '', [Validators.required, Validators.pattern(/^[0-9]{5}$/), Validators.maxLength(5)]],
    nombre:     [this.data?.nombre ?? '', Validators.required],
    periodo_id: [this.data?.periodo_id ?? '', [Validators.required, Validators.pattern(/^[0-9]+$/)]],
    docente_id: [this.data?.docente_id ?? null],
    docente_nombre: [this.data?.docente_nombre ?? ''],
    seccion:    [this.data?.seccion ?? '', Validators.required],
    clave:      [this.data?.clave ?? ''],
    schedule: this.fb.group({
      L: this.createDaySchedule(),
      A: this.createDaySchedule(),
      M: this.createDaySchedule(),
      J: this.createDaySchedule(),
      V: this.createDaySchedule(),
      S: this.createDaySchedule(),
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
    if (this.data?.horario) {
      this.patchHorario(this.data.horario);
    }
    void this.loadLookups();
    this.applyInitialValues();
  }

  private async loadLookups() {
    const periodosResult = await Promise.allSettled([
      this.loadAllPages<Periodo>((page) => this.periodosSvc.getAll(page)),
    ]);
    const docentesResult = await Promise.allSettled([
      this.loadAllPages<Docente>((page) => this.docentesSvc.getAll(page)),
    ]);

    if (periodosResult[0].status === 'fulfilled') {
      this.periodos.set(periodosResult[0].value);
    } else {
      this.periodos.set([]);
      this.snack.open('No se pudieron cargar los periodos', 'Cerrar', { duration: 3500, panelClass: 'snack-error' });
    }

    if (this.data?.periodo_id) {
      this.form.patchValue({ periodo_id: this.data.periodo_id }, { emitEvent: false });
    }

    if (docentesResult[0].status === 'fulfilled') {
      const docentes = docentesResult[0].value;
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
    } else {
      this.docentes.set([]);
      this.filteredDocentes.set([]);
      if (this.data?.docente_nombre) {
        this.docenteSearchCtrl.setValue(this.data.docente_nombre, { emitEvent: false });
        this.form.patchValue({ docente_nombre: this.data.docente_nombre }, { emitEvent: false });
      }
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
    const scheduleGroup = this.form.get('schedule') as FormGroup;
    this.days.forEach(day => {
      const dayGroup = scheduleGroup.get(day.value) as FormGroup;
      dayGroup.patchValue({
        enabled: false,
        start: '',
        end: '',
      }, { emitEvent: false });
    });
    const segments = horario.split(';').map(part => part.trim()).filter(Boolean);
    for (const segment of segments) {
      const match = segment.match(/^(.+?)\s+([0-9]{4}|[0-9]{2}:[0-9]{2})\s*-\s*([0-9]{4}|[0-9]{2}:[0-9]{2})$/i);
      if (!match) continue;
      const dia = this.normalizeDayCode(this.extractDayToken(match[1]));
      const a = this.normalizeTime(match[2]);
      const b = this.normalizeTime(match[3]);
      const dayGroup = scheduleGroup.get(dia) as FormGroup | null;
      if (dayGroup) {
        dayGroup.patchValue({
          enabled: true,
          start: a,
          end: b,
        }, { emitEvent: false });
      }
    }
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

  private normalizeDayCode(value: string) {
    const token = value
      .trim()
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    if (token === 'X' || token === 'MIERCOLES' || token === 'MIE') return 'M';
    if (token === 'L' || token === 'LUNES') return 'L';
    if (token === 'A' || token === 'MARTES') return 'A';
    if (token === 'M') return 'M';
    if (token === 'J' || token === 'JUEVES') return 'J';
    if (token === 'V' || token === 'VIERNES') return 'V';
    if (token === 'S' || token === 'SABADO') return 'S';
    return token;
  }

  selectedPeriodo() {
    const periodoId = Number(this.form.get('periodo_id')?.value ?? 0);
    if (!periodoId) return null;
    return this.periodos().find(periodo => periodo.id === periodoId) ?? null;
  }

  private extractDayToken(segment: string) {
    const cleaned = segment.trim();
    const byLeading = cleaned.match(/^([A-ZÁÉÍÓÚÜÑ]+)\s+/i);
    if (byLeading) return byLeading[1];

    const byWord = cleaned.match(/\b(LUNES|MARTES|MIERCOLES|MIÉRCOLES|JUEVES|VIERNES|SABADO|SÁBADO|L|A|M|J|V|S|X)\b/i);
    return byWord?.[1] ?? cleaned;
  }

  save() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    const raw = this.form.getRawValue();
    const schedule = raw.schedule as Record<string, { enabled?: boolean; start?: string; end?: string }>;
    const selectedDays = this.days
      .map(day => {
        const item = schedule?.[day.value];
        return {
          code: day.value,
          enabled: Boolean(item?.enabled),
          start: String(item?.start ?? '').trim(),
          end: String(item?.end ?? '').trim(),
        };
      })
      .filter(day => day.enabled);

    if (!selectedDays.length) {
      this.snack.open('Selecciona al menos un día', 'Cerrar', { duration: 3500, panelClass: 'snack-error' });
      this.saving.set(false);
      return;
    }
    const invalidDay = selectedDays.find(day => !day.start || !day.end);
    if (invalidDay) {
      this.snack.open(`Completa la hora de ${this.labelForDay(invalidDay.code)}`, 'Cerrar', { duration: 3500, panelClass: 'snack-error' });
      this.saving.set(false);
      return;
    }

    const invalidRange = selectedDays.find(day => day.end <= day.start);
    if (invalidRange) {
      this.snack.open(
        `La hora fin debe ser mayor que la hora inicio en ${this.labelForDay(invalidRange.code)}`,
        'Cerrar',
        { duration: 3500, panelClass: 'snack-error' },
      );
      this.saving.set(false);
      return;
    }

    const horario = selectedDays
      .map(day => `${day.code} ${day.start.replace(':', '')}-${day.end.replace(':', '')}`)
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

  private createDaySchedule() {
    return this.fb.group({
      enabled: [false],
      start: [''],
      end: [''],
    });
  }

  private labelForDay(code: string) {
    return this.days.find(day => day.value === code)?.label ?? code;
  }
}
