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
  private snack     = inject(MatSnackBar);
  private fb        = inject(FormBuilder);

  alumnoId   = signal<number | null>(null);
  matricula  = signal<string>('');
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

    this.alumnoSvc.getByMateria(nrc).subscribe({
      next: (r: any) => {
        const list = Array.isArray(r) ? r : (r?.results ?? []);
        const alumno = list.find((a: any) =>
          a.matricula?.toLowerCase() === mat.toLowerCase()
        );
        if (!alumno) {
          this.loading.set(false);
          this.snack.open('Matrícula no encontrada en ese NRC', '', { duration: 3500, panelClass: 'snack-error' });
          return;
        }
        const setup = { alumnoId: alumno.id, matricula: alumno.matricula };
        localStorage.setItem('agm_alumno_setup', JSON.stringify(setup));
        this.alumnoId.set(alumno.id);
        this.matricula.set(alumno.matricula);
        this.configured.set(true);
        this.loading.set(false);
        this.generateQr();
      },
      error: () => {
        this.loading.set(false);
        this.snack.open('Error al buscar alumno', '', { duration: 3000, panelClass: 'snack-error' });
      }
    });
  }

  generateQr() {
    const payload = JSON.stringify({
      alumno_id: this.alumnoId(),
      matricula: this.matricula(),
      ts: Date.now()
    });
    this.qrData.set(payload);
  }

  resetSetup() {
    localStorage.removeItem('agm_alumno_setup');
    this.configured.set(false);
    this.alumnoId.set(null);
    this.matricula.set('');
    this.qrData.set('');
    this.setupForm.reset();
  }
}
