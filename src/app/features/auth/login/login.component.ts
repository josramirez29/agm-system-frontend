import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatCardModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule, MatSnackBarModule
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private snack = inject(MatSnackBar);

  loading = signal(false);
  hidePassword = signal(true);

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(4)]]
  });

  get emailError() {
    const c = this.form.get('email');
    if (c?.hasError('required')) return 'El correo es obligatorio';
    if (c?.hasError('email')) return 'Ingresa un correo válido';
    return '';
  }

  get passwordError() {
    const c = this.form.get('password');
    if (c?.hasError('required')) return 'La contraseña es obligatoria';
    if (c?.hasError('minlength')) return 'Mínimo 4 caracteres';
    return '';
  }

  submit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading.set(true);
    this.auth.login(this.form.value as any).subscribe({
      next: () => {
        this.loading.set(false);
        const routes: Record<string, string> = { Administrador: '/admin', Docente: '/docente', Alumno: '/alumno' };
        this.router.navigate([routes[this.auth.getRole() ?? ''] ?? '/login']);
      },
      error: err => {
        this.loading.set(false);
        const msg = err.error?.detail ?? 'Credenciales incorrectas';
        this.snack.open(msg, 'Cerrar', { duration: 4000, panelClass: 'snack-error' });
      }
    });
  }
}
