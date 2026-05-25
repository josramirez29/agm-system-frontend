import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PeriodosService } from '../../../core/services/periodos.service';
import { Periodo } from '../../../core/models';
import { signal } from '@angular/core';

@Component({
  selector: 'app-periodo-form-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatFormFieldModule,
            MatInputModule, MatButtonModule, MatCheckboxModule, MatProgressSpinnerModule],
  template: `
    <h2 mat-dialog-title>{{ data ? 'Editar' : 'Nuevo' }} Periodo</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="form-grid">
        <mat-form-field appearance="outline" class="full">
          <mat-label>Nombre</mat-label>
          <input matInput formControlName="nombre" />
          @if (form.get('nombre')?.touched && form.get('nombre')?.hasError('required')) {
            <mat-error>Requerido</mat-error>
          }
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Fecha inicio</mat-label>
          <input matInput formControlName="fecha_inicio" type="date" />
          @if (form.get('fecha_inicio')?.touched && form.get('fecha_inicio')?.hasError('required')) {
            <mat-error>Requerido</mat-error>
          }
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Fecha fin</mat-label>
          <input matInput formControlName="fecha_fin" type="date" />
          @if (form.get('fecha_fin')?.touched && form.get('fecha_fin')?.hasError('required')) {
            <mat-error>Requerido</mat-error>
          }
        </mat-form-field>
        <mat-checkbox formControlName="activo">Periodo activo</mat-checkbox>
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
            .full{grid-column:1/-1}.form-grid mat-checkbox{grid-column:1/-1}`]
})
export class PeriodoFormDialogComponent {
  data   = inject<Periodo | null>(MAT_DIALOG_DATA);
  private svc = inject(PeriodosService);
  private ref = inject(MatDialogRef<PeriodoFormDialogComponent>);
  private fb  = inject(FormBuilder);
  saving = signal(false);

  form = this.fb.group({
    nombre:      [this.data?.nombre ?? '', Validators.required],
    fecha_inicio:[this.data?.fecha_inicio ?? '', Validators.required],
    fecha_fin:   [this.data?.fecha_fin ?? '', Validators.required],
    activo:      [this.data?.activo ?? true],
  });

  save() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    const obs = this.data
      ? this.svc.update(this.data.id, this.form.value as any)
      : this.svc.create(this.form.value as any);
    obs.subscribe({ next: () => this.ref.close(true), error: () => this.saving.set(false) });
  }
}
