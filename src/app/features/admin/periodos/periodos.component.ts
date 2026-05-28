import { Component, inject, OnInit, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { PeriodosService } from '../../../core/services/periodos.service';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { Periodo } from '../../../core/models';
import { PeriodoFormDialogComponent } from './periodo-form-dialog.component';

@Component({
  selector: 'app-periodos',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatTableModule, MatPaginatorModule, MatSortModule,
    MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, MatCardModule,
    MatDialogModule, MatSnackBarModule, MatProgressSpinnerModule, MatTooltipModule
  ],
  templateUrl: './periodos.component.html',
  styleUrls: ['./periodos.component.scss']
})
export class PeriodosComponent implements OnInit {
  private svc    = inject(PeriodosService);
  private dialog = inject(MatDialog);
  private snack  = inject(MatSnackBar);

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort)      sort!: MatSort;

  displayedColumns = ['id', 'nombre', 'plan_estudios', 'fecha_inicio', 'fecha_fin', 'activo', 'acciones'];
  dataSource = new MatTableDataSource<Periodo>([]);
  loading = signal(false);
  total   = signal(0);

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.svc.getAll().subscribe({
      next: r => {
        const rows: Periodo[] = (r as any).results ?? (r as any) ?? [];
        this.dataSource.data = rows;
        this.total.set((r as any).count ?? rows.length);
        setTimeout(() => {
          this.dataSource.paginator = this.paginator;
          this.dataSource.sort      = this.sort;
        });
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  applyFilter(event: Event) {
    const v = (event.target as HTMLInputElement).value;
    this.dataSource.filter = v.trim().toLowerCase();
  }

  openForm(periodo?: Periodo) {
    const ref = this.dialog.open(PeriodoFormDialogComponent, {
      width: '480px', data: periodo ?? null
    });
    ref.afterClosed().subscribe(saved => { if (saved) { this.snack.open('Guardado', '', { duration: 2500 }); this.load(); } });
  }

  delete(p: Periodo) {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: { title: 'Eliminar periodo', message: `¿Eliminar "${p.nombre}"? Esta acción no se puede deshacer.` }
    });
    ref.afterClosed().subscribe(ok => {
      if (!ok) return;
      this.svc.delete(p.id).subscribe({
        next: () => { this.snack.open('Periodo eliminado', '', { duration: 2500 }); this.load(); },
        error: () => this.snack.open('Error al eliminar', '', { duration: 3000, panelClass: 'snack-error' })
      });
    });
  }
}
