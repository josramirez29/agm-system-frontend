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

  displayedColumns = ['nombre', 'apellido', 'email', 'departamento', 'acciones'];
  dataSource = new MatTableDataSource<Docente>([]);
  loading    = signal(false);
  importing  = signal(false);

  ngOnInit() {
    this.dataSource.sortingDataAccessor = (item, property) => {
      if (property === 'nombre') return this.nombreMostrado(item).toLowerCase();
      if (property === 'apellido') return this.apellidoMostrado(item).toLowerCase();
      return (item as any)[property] ?? '';
    };
    this.dataSource.filterPredicate = (item, filter) => {
      const docente = [
        this.nombreMostrado(item),
        this.apellidoMostrado(item),
        item.email,
        item.departamento
      ].join(' ').toLowerCase();

      return docente.includes(filter);
    };
    this.load();
  }

  load() {
    this.loading.set(true);
    this.svc.getAll().subscribe({
      next: r => {
        this.dataSource.data = this.getRows(r);
        setTimeout(() => { this.dataSource.paginator = this.paginator; this.dataSource.sort = this.sort; });
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  applyFilter(e: Event) {
    this.dataSource.filter = (e.target as HTMLInputElement).value.trim().toLowerCase();
  }

  nombreMostrado(d: Docente) {
    return this.separarNombre(d).nombre;
  }

  apellidoMostrado(d: Docente) {
    return this.separarNombre(d).apellido;
  }

  private separarNombre(d: Docente) {
    const raw = d as any;
    const nombre = (raw.nombre ?? raw.nombre_completo ?? raw.nombreCompleto ?? raw.full_name ?? raw.name ?? '').trim();
    const apellido = (raw.apellido ?? raw.apellidos ?? raw.last_name ?? '').trim();
    const campoConSeparador = [nombre, apellido].find(valor => /[,;]/.test(valor));

    if (campoConSeparador) {
      const [apellidoParte, ...nombreParts] = campoConSeparador.split(/[,;]/);
      const nombreSeparado = nombreParts.join(' ').trim();
      const apellidoSeparado = apellidoParte.trim();

      return {
        nombre: nombreSeparado || nombre,
        apellido: apellidoSeparado || apellido
      };
    }

    if (apellido) {
      return { nombre, apellido };
    }

    const partes = nombre.split(/\s+/).filter(Boolean);
    if (partes.length < 2) {
      return { nombre, apellido };
    }

    const cantidadApellidos = partes.length > 2 ? 2 : 1;

    return {
      nombre: partes.slice(cantidadApellidos).join(' '),
      apellido: partes.slice(0, cantidadApellidos).join(' ')
    };
  }

  private getRows(response: any): Docente[] {
    return response?.results ?? response?.data?.results ?? response?.data ?? (Array.isArray(response) ? response : []);
  }

  importPdf(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.importing.set(true);
    this.svc.importPdf(file).subscribe({
      next: (r: any) => {
        this.importing.set(false);
        const msg = r.message ?? 'Importacion completada';
        this.snack.open(msg, '', { duration: 3000 });
        this.load();
      },
      error: () => {
        this.importing.set(false);
        this.snack.open('Error en la importacion', '', { duration: 3000, panelClass: 'snack-error' });
      }
    });
  }

  darDeBaja(d: Docente) {
    const docenteId = this.getDocenteId(d);
    if (!docenteId) {
      this.snack.open('No se encontro el ID del docente', '', { duration: 3000, panelClass: 'snack-error' });
      return;
    }

    this.dialog.open(ConfirmDialogComponent, {
      data: { title: 'Dar de baja', message: `Dar de baja a ${this.nombreMostrado(d)} ${this.apellidoMostrado(d)}?` }
    }).afterClosed().subscribe(ok => {
      if (!ok) return;
      this.svc.darDeBaja(docenteId).subscribe({
        next: () => { this.snack.open('Docente dado de baja', '', { duration: 2500 }); this.load(); },
        error: err => {
          const msg = err.error?.detail ?? err.error?.message ?? 'Error al dar de baja docente';
          this.snack.open(msg, '', { duration: 4000, panelClass: 'snack-error' });
        }
      });
    });
  }

  private getDocenteId(d: Docente) {
    const raw = d as any;
    return raw.id ?? raw.docente_id ?? raw.id_docente ?? raw.pk ?? raw.clave_empleado;
  }
}
