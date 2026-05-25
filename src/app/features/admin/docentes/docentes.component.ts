import { Component, inject, OnInit, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
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
import { DocentesService } from '../../../core/services/docentes.service';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { Docente } from '../../../core/models';

@Component({
  selector: 'app-docentes',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatPaginatorModule, MatSortModule,
    MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, MatCardModule,
    MatDialogModule, MatSnackBarModule, MatProgressSpinnerModule, MatTooltipModule],
  templateUrl: './docentes.component.html',
  styleUrls: ['./docentes.component.scss']
})
export class DocentesComponent implements OnInit {
  private svc    = inject(DocentesService);
  private dialog = inject(MatDialog);
  private snack  = inject(MatSnackBar);

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort)      sort!: MatSort;

  displayedColumns = ['nombre', 'apellido', 'email', 'clave_empleado', 'departamento', 'acciones'];
  dataSource = new MatTableDataSource<Docente>([]);
  loading    = signal(false);
  importing  = signal(false);

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.svc.getAll().subscribe({
      next: r => {
        this.dataSource.data = (r as any).results ?? [];
        setTimeout(() => { this.dataSource.paginator = this.paginator; this.dataSource.sort = this.sort; });
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  applyFilter(e: Event) {
    this.dataSource.filter = (e.target as HTMLInputElement).value.trim().toLowerCase();
  }

  importPdf(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.importing.set(true);
    this.svc.importPdf(file).subscribe({
      next: r => {
        this.importing.set(false);
        const msg = (r as any).message ?? 'Importación completada';
        this.snack.open(msg, '', { duration: 3000 });
        this.load();
      },
      error: () => { this.importing.set(false); this.snack.open('Error en la importación', '', { duration: 3000, panelClass: 'snack-error' }); }
    });
  }

  darDeBaja(d: Docente) {
    this.dialog.open(ConfirmDialogComponent, {
      data: { title: 'Dar de baja', message: `¿Dar de baja a ${d.nombre} ${d.apellido}?` }
    }).afterClosed().subscribe(ok => {
      if (!ok) return;
      this.svc.darDeBaja(d.id).subscribe({
        next: () => { this.snack.open('Docente dado de baja', '', { duration: 2500 }); this.load(); },
        error: () => this.snack.open('Error', '', { duration: 3000, panelClass: 'snack-error' })
      });
    });
  }
}
