import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { AuthService } from '../../../core/services/auth.service';
import { AlumnosService } from '../../../core/services/alumnos.service';
import { MateriasService } from '../../../core/services/materias.service';
import { forkJoin, of, switchMap } from 'rxjs';
import { catchError } from 'rxjs/operators';

interface MateriaPanel {
  id: number;
  nrc: string;
  nombre: string;
  activo: boolean;
}

@Component({
  selector: 'app-panel',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, MatProgressSpinnerModule, MatChipsModule],
  templateUrl: './panel.component.html',
  styleUrls: ['./panel.component.scss']
})
export class PanelComponent implements OnInit {
  private auth       = inject(AuthService);
  private alumnoSvc  = inject(AlumnosService);
  private materiaSvc = inject(MateriasService);

  loading     = signal(true);
  sinRegistro = signal(false);
  nombre      = signal<string>('');
  materias    = signal<MateriaPanel[]>([]);

  ngOnInit() {
    const email = this.auth.currentUser()?.email ?? '';
    if (!email) { this.loading.set(false); this.sinRegistro.set(true); return; }

    let nrcs: string[] = [];

    this.alumnoSvc.getAll(1, email).pipe(
      switchMap((res: any) => {
        const list: any[] = res?.results ?? res ?? [];
        const rows = list.filter((a: any) => a.email?.toLowerCase() === email.toLowerCase());
        if (!rows.length) {
          this.sinRegistro.set(true);
          return of(null);
        }
        if (rows[0].nombre) this.nombre.set(rows[0].nombre);
        nrcs = [...new Set<string>(rows.map((r: any) => String(r.nrc)))];
        const lookups: Record<string, any> = {};
        nrcs.forEach(nrc => {
          lookups[nrc] = this.materiaSvc.getAll(1, 10, nrc).pipe(catchError(() => of(null)));
        });
        return (nrcs.length ? forkJoin(lookups) : of<Record<string, any>>({})).pipe(catchError(() => of({})));
      }),
      catchError(() => of(null))
    ).subscribe(results => {
      if (results) {
        const mats: MateriaPanel[] = [];
        for (const [nrc, result] of Object.entries(results)) {
          const mList: any[] = (result as any)?.results ?? result ?? [];
          const m = mList.find((m: any) => String(m.nrc) === String(nrc));
          mats.push({
            id:     m?.id ?? 0,
            nrc:    String(nrc),
            nombre: m?.nombre ?? `NRC ${nrc}`,
            activo: m?.activo ?? true,
          });
        }
        this.materias.set(mats);
      }
      this.loading.set(false);
    });
  }
}
