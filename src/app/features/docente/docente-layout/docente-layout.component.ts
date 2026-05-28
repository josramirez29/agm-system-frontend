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
  selector: 'app-docente-layout',
  standalone: true,
  imports: [RouterModule, MatSidenavModule, MatToolbarModule, MatListModule,
            MatIconModule, MatButtonModule, MatMenuModule],
  templateUrl: './docente-layout.component.html',
  styleUrls: ['./docente-layout.component.scss']
})
export class DocenteLayoutComponent {
  auth = inject(AuthService);
  nav = [
    { label: 'Dashboard',      icon: 'dashboard',       path: 'dashboard'      },
    { label: 'Materias',       icon: 'menu_book',        path: 'materias'       },
    { label: 'Calificaciones', icon: 'grade',            path: 'calificaciones' },
    { label: 'Asistencias QR', icon: 'qr_code_scanner',  path: 'asistencias'   },
    { label: 'Reportes',       icon: 'bar_chart',        path: 'reportes'       },
  ];
  private bp = inject(BreakpointObserver);
  isMobile = toSignal(this.bp.observe(Breakpoints.Handset).pipe(map(r => r.matches)), { initialValue: false });
}
