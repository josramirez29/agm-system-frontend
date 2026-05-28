import { Component, inject, signal } from '@angular/core';
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

const NAV = [
  { label: 'Dashboard',  icon: 'dashboard',    path: 'dashboard'  },
  { label: 'Periodos',   icon: 'date_range',   path: 'periodos'   },
  { label: 'Materias',   icon: 'menu_book',    path: 'materias'   },
  { label: 'Docentes',   icon: 'person_pin',   path: 'docentes'   },
  { label: 'Alumnos',    icon: 'groups',       path: 'alumnos'    },
  { label: 'Reportes',   icon: 'description',  path: 'reportes'   },
];

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterModule, MatSidenavModule, MatToolbarModule, MatListModule,
            MatIconModule, MatButtonModule, MatMenuModule],
  templateUrl: './admin-layout.component.html',
  styleUrls: ['./admin-layout.component.scss']
})
export class AdminLayoutComponent {
  auth = inject(AuthService);
  nav = NAV;
  private bp = inject(BreakpointObserver);
  isMobile = toSignal(this.bp.observe(Breakpoints.Handset).pipe(map(r => r.matches)), { initialValue: false });
}
