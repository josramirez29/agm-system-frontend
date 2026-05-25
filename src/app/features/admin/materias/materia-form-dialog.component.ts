import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MateriasService } from '../../../core/services/materias.service';
import { Materia } from '../../../core/models';

@Component({
  selector: 'app-materia-form-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatFormFieldModule,
            MatInputModule, MatButtonModule, MatProgressSpinnerModule],
  template: `
    <h2 mat-dialog-title>{{ data ? 'Editar' : 'Nueva' }} Materia</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="form-grid">
        <mat-form-field appearance="outline">
          <mat-label>NRC</mat-label>
          <input matInput formControlName="nrc" />
          @if (form.get('nrc')?.touched && form.get('nrc')?.invalid) { <mat-error>Requerido</mat-error> }
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Créditos</mat-label>
          <input matInput formControlName="creditos" type="number" />
          @if (form.get('creditos')?.touched && form.get('creditos')?.invalid) { <mat-error>Requerido</mat-error> }
        </mat-form-field>
        <mat-form-field appearance="outline" class="full">
          <mat-label>Nombre</mat-label>
          <input matInput formControlName="nombre" />
          @if (form.get('nombre')?.touched && form.get('nombre')?.invalid) { <mat-error>Requerido</mat-error> }
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>ID Periodo</mat-label>
          <input matInput formControlName="periodo" type="number" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>ID Docente</mat-label>
          <input matInput formControlName="docente" type="number" />
        </mat-form-field>
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
            .full{grid-column:1/-1}`]
})
export class MateriaFormDialogComponent {
  data   = inject<Materia | null>(MAT_DIALOG_DATA);
  private svc = inject(MateriasService);
  private ref = inject(MatDialogRef<MateriaFormDialogComponent>);
  private fb  = inject(FormBuilder);
  saving = signal(false);

  form = this.fb.group({
    nrc:     [this.data?.nrc ?? '', Validators.required],
    nombre:  [this.data?.nombre ?? '', Validators.required],
    creditos:[this.data?.creditos ?? '', Validators.required],
    periodo: [this.data?.periodo ?? ''],
    docente: [this.data?.docente ?? ''],
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
