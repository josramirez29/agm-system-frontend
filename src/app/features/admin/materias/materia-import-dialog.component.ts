import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Periodo } from '../../../core/models';
import { PeriodosService } from '../../../core/services/periodos.service';
import { MateriasService } from '../../../core/services/materias.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-materia-import-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatSnackBarModule,
  ],
  template: `
    <h2 mat-dialog-title>Importar materias desde PDF</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="form-grid">
        <mat-form-field appearance="outline" class="full">
          <mat-label>Periodo</mat-label>
          <mat-select formControlName="periodo_id">
            @for (periodo of periodos(); track periodo.id) {
              <mat-option [value]="periodo.id">{{ periodo.nombre }} - {{ periodo.plan_estudios ?? 'Sin plan' }}</mat-option>
            }
          </mat-select>
          @if (form.get('periodo_id')?.touched && form.get('periodo_id')?.hasError('required')) {
            <mat-error>Requerido</mat-error>
          }
        </mat-form-field>

        @if (selectedPeriodo()) {
          <div class="full periodo-summary">
            <strong>{{ selectedPeriodo()?.nombre }}</strong>
            <div class="upload-hint">
              Plan de estudios: {{ selectedPeriodo()?.plan_estudios ?? '—' }}
            </div>
          </div>
        }

        <label class="upload-box full">
          <mat-icon>upload_file</mat-icon>
          <div>
            <strong>{{ fileName() || 'Selecciona el PDF que contiene las materias a importar' }}</strong>
            <div class="upload-hint">Solo archivos .pdf</div>
          </div>
          <input type="file" accept=".pdf" (change)="onFileChange($event)" hidden />
        </label>

        @if (form.get('archivo')?.touched && form.get('archivo')?.hasError('required')) {
          <div class="full error-msg">Debes seleccionar un PDF</div>
        }
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close [disabled]="importing()">Cancelar</button>
      <button mat-flat-button color="primary" (click)="importar()" [disabled]="importing()">
        @if (importing()) { <mat-spinner diameter="18" /> } @else { Importar }
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .form-grid{display:grid;grid-template-columns:1fr;gap:1rem;padding-top:.5rem}
    .full{grid-column:1/-1}
    .periodo-summary{padding:.85rem 1rem;border-radius:14px;background:rgba(0,0,0,.03);border:1px solid rgba(0,0,0,.08)}
    .upload-box{display:flex;align-items:center;gap:1rem;padding:1rem;border:1px dashed rgba(0,0,0,.25);border-radius:14px;cursor:pointer}
    .upload-box mat-icon{font-size:28px;width:28px;height:28px}
    .upload-hint{font-size:.85rem;color:var(--muted-text,#666)}
    .error-msg{color:#c62828;font-size:.9rem}
  `]
})
export class MateriaImportDialogComponent {
  private fb = inject(FormBuilder);
  private svc = inject(MateriasService);
  private periodosSvc = inject(PeriodosService);
  private ref = inject(MatDialogRef<MateriaImportDialogComponent>);
  private snack = inject(MatSnackBar);

  periodos = signal<Periodo[]>([]);
  importing = signal(false);
  fileName = signal('');
  private file: File | null = null;

  form = this.fb.group({
    periodo_id: ['', Validators.required],
    archivo: [null as File | null, Validators.required],
  });

  constructor() {
    void this.loadPeriodos();
  }

  selectedPeriodo() {
    const periodoId = Number(this.form.get('periodo_id')?.value ?? 0);
    if (!periodoId) return null;
    return this.periodos().find(periodo => periodo.id === periodoId) ?? null;
  }

  private async loadPeriodos() {
    const items: Periodo[] = [];
    let page = 1;
    while (true) {
      const response = await firstValueFrom(this.periodosSvc.getAll(page));
      const chunk = (response as any)?.results ?? [];
      if (Array.isArray(chunk)) items.push(...chunk);
      if (!(response as any)?.next) break;
      page += 1;
    }
    this.periodos.set(items);
  }

  onFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.file = file;
    this.fileName.set(file?.name ?? '');
    this.form.patchValue({ archivo: file });
    this.form.get('archivo')?.markAsTouched();
  }

  importar() {
    if (this.form.invalid || !this.file) {
      this.form.markAllAsTouched();
      return;
    }
    const periodoId = Number(this.form.get('periodo_id')?.value);
    if (!periodoId) {
      this.snack.open('Selecciona un periodo válido', 'Cerrar', { duration: 3500, panelClass: 'snack-error' });
      return;
    }
    this.importing.set(true);
    this.svc.importPdf(periodoId, this.file).subscribe({
      next: (r) => {
        this.importing.set(false);
        this.snack.open((r as any).message ?? 'Importación completada', '', { duration: 3500 });
        this.ref.close(true);
      },
      error: (err) => {
        this.importing.set(false);
        const detail = err?.error?.message ?? err?.error?.detail ?? 'No se pudo importar el PDF';
        this.snack.open(detail, 'Cerrar', { duration: 4500, panelClass: 'snack-error' });
      }
    });
  }
}
