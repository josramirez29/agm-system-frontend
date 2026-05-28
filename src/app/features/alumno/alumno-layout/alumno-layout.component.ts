import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-alumno-layout',
  standalone: true,
  imports: [RouterModule, MatSidenavModule, MatToolbarModule, MatListModule,
            MatIconModule, MatButtonModule, MatMenuModule],
  templateUrl: './alumno-layout.component.html',
  styleUrls: ['./alumno-layout.component.scss']
})
export class AlumnoLayoutComponent {
  auth = inject(AuthService);
  nav = [
    { label: 'Mis Materias',        icon: 'school',          path: 'panel'          },
    { label: 'Mi QR de Asistencia', icon: 'qr_code_2',       path: 'asistencia'     },
    { label: 'Calificaciones',      icon: 'grade',            path: 'calificaciones' },
    { label: 'Mis Asistencias',     icon: 'event_available',  path: 'asistencias'    },
  ];
  private bp = inject(BreakpointObserver);
  isMobile = toSignal(this.bp.observe(Breakpoints.Handset).pipe(map(r => r.matches)), { initialValue: false });
}
