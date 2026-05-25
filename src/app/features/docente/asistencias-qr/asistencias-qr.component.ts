import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { ZXingScannerModule } from '@zxing/ngx-scanner';
import { BarcodeFormat } from '@zxing/library';
import { AuthService } from '../../../core/services/auth.service';
import { DocentesService } from '../../../core/services/docentes.service';
import { AsistenciasService } from '../../../core/services/asistencias.service';
import { Materia, Asistencia } from '../../../core/models';
import { interval, Subscription } from 'rxjs';
import { switchMap, catchError, of } from 'rxjs';

@Component({
  selector: 'app-asistencias-qr',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatCardModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatSnackBarModule,
    MatProgressSpinnerModule, MatTableModule, MatChipsModule, ZXingScannerModule
  ],
  templateUrl: './asistencias-qr.component.html',
  styleUrls: ['./asistencias-qr.component.scss']
})
export class AsistenciasQrComponent implements OnInit, OnDestroy {
  private auth       = inject(AuthService);
  private docenteSvc = inject(DocentesService);
  private asistSvc   = inject(AsistenciasService);
  private snack      = inject(MatSnackBar);
  private fb         = inject(FormBuilder);

  loading       = signal(false);
  scanning      = signal(false);
  sesionActiva  = signal<any>(null);
  docenteId     = signal<number | null>(null);
  materias      = signal<Materia[]>([]);
  asistencias   = signal<Asistencia[]>([]);
  lastScanned   = signal<string>('');

  displayedColumns = ['alumno_nombre', 'alumno_matricula', 'timestamp'];
  allowedFormats  = [BarcodeFormat.QR_CODE];
  dataSource = new MatTableDataSource<Asistencia>([]);

  form = this.fb.group({
    materia_id: ['', Validators.required]
  });

  private pollSub?: Subscription;

  ngOnInit() {
    const email = this.auth.currentUser()?.email ?? '';
    this.docenteSvc.getByEmail(email).pipe(
      switchMap(d => {
        if (!d) return of([]);
        this.docenteId.set(d.id);
        return this.docenteSvc.getMateriasByDocente(d.id).pipe(catchError(() => of([])));
      })
    ).subscribe(r => {
      this.materias.set((r as any)?.results ?? r ?? []);
    });
  }

  iniciarSesion() {
    if (this.form.invalid || !this.docenteId()) return;
    this.loading.set(true);
    this.asistSvc.iniciarSesion({
      materia_id: Number(this.form.value.materia_id),
      docente_id: this.docenteId()!
    }).subscribe({
      next: res => {
        this.sesionActiva.set(res);
        this.loading.set(false);
        this.scanning.set(true);
        this.startPoll();
        this.snack.open('Sesión iniciada — apunta la cámara al QR del alumno', '', { duration: 4000 });
      },
      error: () => { this.loading.set(false); this.snack.open('Error al iniciar sesión', '', { duration: 3000, panelClass: 'snack-error' }); }
    });
  }

  onQrScanned(result: string) {
    if (!result || result === this.lastScanned() || !this.sesionActiva()) return;
    this.lastScanned.set(result);

    let alumnoId: number;
    try {
      const payload = JSON.parse(result);
      alumnoId = payload.alumno_id ?? payload.id;
    } catch {
      const num = parseInt(result, 10);
      if (isNaN(num)) { this.snack.open('QR inválido', '', { duration: 2000 }); return; }
      alumnoId = num;
    }

    this.asistSvc.registrarAsistencia({
      sesion_id: this.sesionActiva().id,
      alumno_id: alumnoId,
      token: `${this.sesionActiva().id}_${alumnoId}_${Date.now()}`
    }).subscribe({
      next: () => {
        this.snack.open(`✓ Alumno #${alumnoId} registrado`, '', { duration: 2000 });
        this.loadAsistencias();
        setTimeout(() => this.lastScanned.set(''), 3000);
      },
      error: err => {
        const msg = err.error?.detail ?? 'Error al registrar';
        this.snack.open(msg, '', { duration: 3000, panelClass: 'snack-error' });
        setTimeout(() => this.lastScanned.set(''), 2000);
      }
    });
  }

  cerrarSesion() {
    if (!this.sesionActiva()) return;
    this.asistSvc.cerrarSesion(this.sesionActiva().id).subscribe({
      next: () => {
        this.scanning.set(false);
        this.sesionActiva.set(null);
        this.stopPoll();
        this.snack.open('Sesión cerrada', '', { duration: 2500 });
      },
      error: () => this.snack.open('Error al cerrar', '', { duration: 3000, panelClass: 'snack-error' })
    });
  }

  private loadAsistencias() {
    if (!this.sesionActiva()) return;
    this.asistSvc.getAsistenciasBySesion(this.sesionActiva().id).subscribe(r => {
      const list: Asistencia[] = Array.isArray(r) ? r : [];
      this.asistencias.set(list);
      this.dataSource.data = list;
    });
  }

  private startPoll() {
    this.pollSub = interval(10_000).subscribe(() => this.loadAsistencias());
  }

  private stopPoll() { this.pollSub?.unsubscribe(); }

  ngOnDestroy() { this.stopPoll(); }
}
