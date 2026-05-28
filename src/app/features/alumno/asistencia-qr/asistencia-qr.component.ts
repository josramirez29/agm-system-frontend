import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { QRCodeComponent } from 'angularx-qrcode';
import { AuthService } from '../../../core/services/auth.service';
import { AlumnosService } from '../../../core/services/alumnos.service';
import { AsistenciasService } from '../../../core/services/asistencias.service';
import { MateriasService } from '../../../core/services/materias.service';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

interface AlumnoRow { id: number; nombre: string; email: string; matricula: string; nrc: string; }

@Component({
  selector: 'app-asistencia-qr',
  standalone: true,
  imports: [
    CommonModule, MatCardModule, MatButtonModule, MatIconModule,
    MatProgressSpinnerModule, MatSnackBarModule, QRCodeComponent
  ],
  templateUrl: './asistencia-qr.component.html',
  styleUrls: ['./asistencia-qr.component.scss']
})
export class AsistenciaQrComponent implements OnInit {
  private auth       = inject(AuthService);
  private alumnoSvc  = inject(AlumnosService);
  private materiaSvc = inject(MateriasService);
  private asistSvc   = inject(AsistenciasService);
  private snack      = inject(MatSnackBar);

  loading     = signal(true);
  generating  = signal(false);
  sinRegistro = signal(false);
  sinSesion   = signal(false);

  alumnoRows   = signal<AlumnoRow[]>([]);
  materiaNames = signal<Map<string, string>>(new Map());  // NRC → nombre (display only)
  selectedRow  = signal<AlumnoRow | null>(null);
  qrData       = signal<string>('');

  ngOnInit() {
    const email = this.auth.currentUser()?.email ?? '';
    if (!email) { this.loading.set(false); this.sinRegistro.set(true); return; }

    this.alumnoSvc.getAll(1, email).pipe(catchError(() => of(null))).subscribe((res: any) => {
      const list: AlumnoRow[] = res?.results ?? res ?? [];
      const rows = list.filter((a: any) => a.email?.toLowerCase() === email.toLowerCase());
      if (!rows.length) {
        this.sinRegistro.set(true);
        this.loading.set(false);
        return;
      }
      this.alumnoRows.set(rows);
      this.loadMateriaNames(rows);  // non-blocking, for display only

      if (rows.length === 1) {
        this.doSelectRow(rows[0]);
      } else {
        this.loading.set(false);
      }
    });
  }

  private loadMateriaNames(rows: AlumnoRow[]) {
    const nrcs = [...new Set(rows.map(r => r.nrc))];
    const lookups: Record<string, any> = {};
    nrcs.forEach(nrc => {
      lookups[nrc] = this.materiaSvc.getAll(1, 10, String(nrc)).pipe(catchError(() => of(null)));
    });
    forkJoin(lookups).pipe(catchError(() => of({}))).subscribe(results => {
      const names = new Map<string, string>();
      for (const [nrc, res] of Object.entries(results)) {
        const mList: any[] = (res as any)?.results ?? res ?? [];
        const m = mList.find((m: any) => String(m.nrc) === String(nrc));
        if (m?.nombre) names.set(nrc, m.nombre);
      }
      this.materiaNames.set(names);
    });
  }

  selectRow(row: AlumnoRow) { this.doSelectRow(row); }

  private doSelectRow(row: AlumnoRow) {
    this.selectedRow.set(row);
    this.generateQr();
  }

  generateQr() {
    const row = this.selectedRow();
    if (!row) return;
    // Use NRC as materia_id — consistent with the key the docente stores: sesion_activa:{nrc}
    const nrcAsId = Number(row.nrc);
    this.generating.set(true);
    this.sinSesion.set(false);
    this.asistSvc.generarQrToken({ alumno_id: row.id, materia_id: nrcAsId }).subscribe({
      next: tokenData => {
        this.qrData.set(JSON.stringify({
          token_qr: tokenData.token_qr,
          alumno_id: row.id,
          materia_id: nrcAsId,
          matricula: row.matricula,
          nrc: row.nrc,
          ts: Date.now(),
        }));
        this.generating.set(false);
        this.loading.set(false);
      },
      error: (err: any) => {
        this.generating.set(false);
        this.loading.set(false);
        if (err?.status === 404) { this.sinSesion.set(true); }
        else { this.snack.open('Error al generar QR', '', { duration: 3500, panelClass: 'snack-error' }); }
      }
    });
  }

  changeMateria() {
    this.selectedRow.set(null);
    this.qrData.set('');
    this.sinSesion.set(false);
  }
}
