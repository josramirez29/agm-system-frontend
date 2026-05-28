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
import { PageEvent } from '@angular/material/paginator';
import { MateriasService } from '../../../core/services/materias.service';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { MateriaFormDialogComponent } from './materia-form-dialog.component';
import { MateriaImportDialogComponent } from './materia-import-dialog.component';
import { Materia } from '../../../core/models';

@Component({
  selector: 'app-materias',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatTableModule, MatPaginatorModule, MatSortModule,
    MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, MatCardModule,
    MatDialogModule, MatSnackBarModule, MatProgressSpinnerModule, MatTooltipModule],
  templateUrl: './materias.component.html',
  styleUrls: ['./materias.component.scss']
})
export class MateriasComponent implements OnInit {
  private svc    = inject(MateriasService);
  private dialog = inject(MatDialog);
  private snack  = inject(MatSnackBar);

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort)      sort!: MatSort;

  displayedColumns = ['nrc', 'nombre', 'periodo_nombre', 'horario', 'docente_nombre', 'acciones'];
  dataSource = new MatTableDataSource<Materia>([]);
  loading = signal(false);
  importing = signal(false);
  total = signal(0);
  pageIndex = 0;
  pageSize = 10;
  searchTerm = '';

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.svc.getAll(this.pageIndex + 1, this.pageSize, this.searchTerm).subscribe({
      next: r => {
        const payload = (r as any);
        this.dataSource.data = payload.results ?? [];
        this.total.set(payload.count ?? this.dataSource.data.length);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  applyFilter(e: Event) {
    this.searchTerm = (e.target as HTMLInputElement).value.trim().toLowerCase();
    this.pageIndex = 0;
    this.load();
  }

  onPage(event: PageEvent) {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.load();
  }

  openForm(materia?: Materia) {
    const ref = this.dialog.open(MateriaFormDialogComponent, { width: '520px', data: materia ?? null });
    ref.afterClosed().subscribe(saved => { if (saved) { this.snack.open('Guardado', '', { duration: 2500 }); this.load(); } });
  }

  openImportDialog() {
    const ref = this.dialog.open(MateriaImportDialogComponent, { width: '560px' });
    ref.afterClosed().subscribe(saved => {
      if (saved) {
        this.snack.open('Importación completada', '', { duration: 2500 });
        this.load();
      }
    });
  }

  delete(m: Materia) {
    this.dialog.open(ConfirmDialogComponent, {
      data: { title: 'Eliminar materia', message: `¿Eliminar "${m.nombre}" (NRC: ${m.nrc})?` }
    }).afterClosed().subscribe(ok => {
      if (!ok) return;
      this.svc.delete(m.id).subscribe({
        next: () => { this.snack.open('Materia eliminada', '', { duration: 2500 }); this.load(); },
        error: () => this.snack.open('Error al eliminar', '', { duration: 3000, panelClass: 'snack-error' })
      });
    });
  }
}
