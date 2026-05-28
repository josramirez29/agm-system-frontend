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
import { switchMap, catchError, of, finalize } from 'rxjs';

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
  cameraError   = signal<string | null>(null);
  registering   = signal(false);

  displayedColumns = ['alumno_nombre', 'alumno_matricula', 'timestamp'];
  allowedFormats  = [BarcodeFormat.QR_CODE];
  dataSource = new MatTableDataSource<Asistencia>([]);

  form = this.fb.group({
    materia_id: ['', Validators.required]
  });

  private pollSub?: Subscription;
  private scanErrorHandled = false;

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
    if (!this.auth.isAuthenticated()) {
      this.snack.open('Tu sesión expiró. Vuelve a iniciar sesión.', '', { duration: 3500, panelClass: 'snack-error' });
      this.auth.logout();
      return;
    }
    this.cameraError.set(null);
    this.scanErrorHandled = false;
    this.loading.set(true);
    this.asistSvc.iniciarSesion({
      materia_id: Number(this.form.value.materia_id),
      docente_id: this.docenteId()!
    }).subscribe({
      next: res => {
        const sesionId = res?.data?.sesion_id ?? res?.sesion_id ?? res?.id;
        if (!sesionId) {
          this.loading.set(false);
          this.snack.open('La respuesta no incluyó sesion_id', '', { duration: 3000, panelClass: 'snack-error' });
          return;
        }

        this.sesionActiva.set({
          ...res,
          id: sesionId,
          materia_id: Number(this.form.value.materia_id)
        });
        this.loading.set(false);
        this.scanning.set(true);
        this.startPoll();
        this.loadAsistencias();
        this.snack.open('Sesión iniciada — apunta la cámara al QR del alumno', '', { duration: 4000 });
      },
      error: err => {
        this.loading.set(false);
        this.scanning.set(false);
        if (err?.status === 401) {
          this.snack.open('Tu sesión expiró. Vuelve a iniciar sesión.', '', { duration: 3500, panelClass: 'snack-error' });
          this.auth.logout();
          return;
        }
        this.snack.open('Error al iniciar sesión', '', { duration: 3000, panelClass: 'snack-error' });
      }
    });
  }

  onQrScanned(result: string) {
    const sesion = this.sesionActiva();
    if (!result || result === this.lastScanned() || !sesion?.id || this.registering()) return;
    this.lastScanned.set(result);

    let alumnoId: number | null = null;
    let tokenQr = result;
    try {
      const payload = JSON.parse(result);
      alumnoId = payload.alumno_id ?? payload.id ?? null;
      tokenQr = payload.token_qr ?? result;
    } catch {
      // Se conserva el resultado crudo como token si el QR no viene en JSON.
    }

    if (!alumnoId) {
      this.snack.open('QR inválido: faltan datos del alumno', '', { duration: 2500, panelClass: 'snack-error' });
      setTimeout(() => this.lastScanned.set(''), 2000);
      return;
    }

    this.registering.set(true);
    this.asistSvc.registrarAsistencia({
      materia_id: sesion.materia_id,
      alumno_id: alumnoId,
      token_qr: tokenQr
    }).pipe(
      finalize(() => this.registering.set(false))
    ).subscribe({
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
    const sesion = this.sesionActiva();
    if (!sesion) return;
    const materiaId = sesion?.materia_id;
    if (materiaId === undefined || materiaId === null) {
      this.snack.open('No se encontró el materia_id de la sesión activa', '', { duration: 3000, panelClass: 'snack-error' });
      return;
    }

    this.asistSvc.cerrarSesion(materiaId).subscribe({
      next: () => {
        this.scanning.set(false);
        this.cameraError.set(null);
        this.scanErrorHandled = false;
        this.sesionActiva.set(null);
        this.stopPoll();
        this.snack.open('Sesión cerrada', '', { duration: 2500 });
      },
      error: () => this.snack.open('Error al cerrar', '', { duration: 3000, panelClass: 'snack-error' })
    });
  }

  private loadAsistencias() {
    const sesion = this.sesionActiva();
    if (!sesion?.materia_id) return;
    this.asistSvc.getAsistenciasByMateria(sesion.materia_id).subscribe(r => {
      const list: Asistencia[] = Array.isArray(r) ? r : [];
      this.asistencias.set(list);
      this.dataSource.data = list;
    });
  }

  private startPoll() {
    this.pollSub = interval(10_000).subscribe(() => this.loadAsistencias());
  }

  private stopPoll() { this.pollSub?.unsubscribe(); }

  onScanError(error: unknown) {
    if (this.scanErrorHandled) return;

    const message = error instanceof Error ? error.message : String(error ?? 'Error desconocido');
    if (/No scanning is running at the time/i.test(message)) {
      return;
    }

    this.scanErrorHandled = true;
    this.cameraError.set(message);
    this.snack.open(`No se pudo iniciar la cámara: ${message}`, '', { duration: 4000, panelClass: 'snack-error' });
  }

  reintentarCamara() {
    if (!this.sesionActiva()) return;
    this.cameraError.set(null);
    this.scanErrorHandled = false;
    this.scanning.set(false);
    setTimeout(() => this.scanning.set(true));
  }

  ngOnDestroy() { this.stopPoll(); }
}
