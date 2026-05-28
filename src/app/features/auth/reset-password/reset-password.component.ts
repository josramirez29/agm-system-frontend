import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, RouterModule,
    MatCardModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule, MatSnackBarModule
  ],
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.scss']
})
export class ResetPasswordComponent implements OnInit {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private snack = inject(MatSnackBar);

  loading = signal(false);
  hidePassword = signal(true);
  token = '';

  form = this.fb.group({
    newPassword: ['', [Validators.required, Validators.minLength(4)]]
  });

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.token = params['token'] || '';
      if (!this.token) {
        this.snack.open('Enlace inválido o sin token.', 'Cerrar', { duration: 4000 });
        this.router.navigate(['/login']);
      }
    });
  }

  submit() {
    if (this.form.invalid || !this.token) { this.form.markAllAsTouched(); return; }
    this.loading.set(true);
    
    this.auth.resetPassword(this.token, this.form.value.newPassword!).subscribe({
      next: () => {
        this.loading.set(false);
        this.snack.open('¡Contraseña actualizada con éxito!', 'Genial', { duration: 4000 });
        this.router.navigate(['/login']);
      },
      error: err => {
        this.loading.set(false);
        const msg = err.error?.detail ?? 'El enlace expiró o es inválido.';
        this.snack.open(msg, 'Cerrar', { duration: 4000, panelClass: 'snack-error' });
      }
    });
  }
}