import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { QRCodeComponent } from 'angularx-qrcode';
import { AuthService } from '../../../core/services/auth.service';
import { AlumnosService } from '../../../core/services/alumnos.service';
import { AsistenciasService } from '../../../core/services/asistencias.service';
import { MateriasService } from '../../../core/services/materias.service';
import { forkJoin, switchMap } from 'rxjs';

@Component({
  selector: 'app-asistencia-qr',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatCardModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatProgressSpinnerModule, MatSnackBarModule,
    MatDividerModule, QRCodeComponent
  ],
  templateUrl: './asistencia-qr.component.html',
  styleUrls: ['./asistencia-qr.component.scss']
})
export class AsistenciaQrComponent implements OnInit {
  private auth      = inject(AuthService);
  private alumnoSvc = inject(AlumnosService);
  private materiaSvc = inject(MateriasService);
  private asistSvc  = inject(AsistenciasService);
  private snack     = inject(MatSnackBar);
  private fb        = inject(FormBuilder);

  alumnoId   = signal<number | null>(null);
  matricula  = signal<string>('');
  nrc        = signal<string>('');
  materiaId  = signal<number | null>(null);
  qrData     = signal<string>('');
  loading    = signal(false);
  configured = signal(false);

  setupForm = this.fb.group({
    matricula: ['', [Validators.required, Validators.minLength(6)]],
    nrc:       ['', [Validators.required, Validators.minLength(3)]],
  });

  ngOnInit() {
    const saved = localStorage.getItem('agm_alumno_setup');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        this.alumnoId.set(data.alumnoId);
        this.matricula.set(data.matricula);
        this.nrc.set(data.nrc ?? '');
        this.materiaId.set(data.materiaId ?? null);
        this.configured.set(true);
        this.generateQr();
      } catch { /* ignore */ }
    }
  }

  configure() {
    if (this.setupForm.invalid) { this.setupForm.markAllAsTouched(); return; }
    this.loading.set(true);
    const nrc = this.setupForm.value.nrc!;
    const mat = this.setupForm.value.matricula!;

    forkJoin({
      alumnos: this.alumnoSvc.getByMateria(nrc),
      materias: this.materiaSvc.getAll(),
    }).pipe(
      switchMap(({ alumnos, materias }) => {
        const list = Array.isArray(alumnos) ? alumnos : (alumnos?.results ?? []);
        const alumno = list.find((a: any) => a.matricula?.toLowerCase() === mat.toLowerCase());
        if (!alumno) throw new Error('Matrícula no encontrada en ese NRC');

        const materiaList = Array.isArray(materias) ? materias : (materias?.results ?? []);
        const materia = materiaList.find((m: any) => String(m.nrc) === String(nrc));
        if (!materia) throw new Error('No se pudo resolver la materia para ese NRC');

        return this.asistSvc.generarQrToken({
          alumno_id: alumno.id,
          materia_id: materia.id,
        }).pipe(
          switchMap(tokenData => {
            const setup = {
              alumnoId: alumno.id,
              matricula: alumno.matricula,
              nrc,
              materiaId: materia.id,
            };
            localStorage.setItem('agm_alumno_setup', JSON.stringify(setup));
            this.alumnoId.set(alumno.id);
            this.matricula.set(alumno.matricula);
            this.nrc.set(nrc);
            this.materiaId.set(materia.id);
            this.configured.set(true);
            this.qrData.set(JSON.stringify({
              token_qr: tokenData.token_qr,
              alumno_id: alumno.id,
              materia_id: materia.id,
              matricula: alumno.matricula,
              nrc,
              ts: Date.now(),
            }));
            this.loading.set(false);
            this.snack.open('QR generado correctamente', '', { duration: 2500 });
            return [];
          })
        );
      })
    ).subscribe({
      error: (err: any) => {
        this.loading.set(false);
        const msg = err?.message ?? err?.error?.detail ?? 'Error al buscar alumno o materia';
        this.snack.open(msg, '', { duration: 3500, panelClass: 'snack-error' });
      }
    });
  }

  generateQr() {
    if (!this.alumnoId() || !this.materiaId() || !this.nrc()) return;
    this.asistSvc.generarQrToken({
      alumno_id: this.alumnoId()!,
      materia_id: this.materiaId()!,
    }).subscribe({
      next: tokenData => {
        this.qrData.set(JSON.stringify({
          token_qr: tokenData.token_qr,
          alumno_id: this.alumnoId(),
          materia_id: this.materiaId(),
          matricula: this.matricula(),
          nrc: this.nrc(),
          ts: Date.now(),
        }));
      },
      error: () => {
        this.snack.open('No se pudo regenerar el QR', '', { duration: 3000, panelClass: 'snack-error' });
      }
    });
  }

  resetSetup() {
    localStorage.removeItem('agm_alumno_setup');
    this.configured.set(false);
    this.alumnoId.set(null);
    this.matricula.set('');
    this.nrc.set('');
    this.materiaId.set(null);
    this.qrData.set('');
    this.setupForm.reset();
  }
}
