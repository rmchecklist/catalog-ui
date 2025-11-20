import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../shared/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginComponent {
  protected email = '';
  protected password = '';
  protected error: string | null = null;
  protected loading = false;

  constructor(private readonly auth: AuthService, private readonly router: Router) {}

  async signIn() {
    this.error = null;
    this.loading = true;
    try {
      await this.auth.signInWithEmail(this.email, this.password);
      this.router.navigate(['/']);
    } catch (err: any) {
      this.error = err?.message ?? 'Login failed';
    } finally {
      this.loading = false;
    }
  }
}
