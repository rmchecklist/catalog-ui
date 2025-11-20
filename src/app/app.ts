import { Component, effect, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatBadgeModule } from '@angular/material/badge';
import { CartService } from './shared/services/cart.service';
import { AuthService } from './shared/services/auth.service';
import { MatMenuModule } from '@angular/material/menu';
import { NavService } from './shared/services/nav.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatBadgeModule,
    MatMenuModule
  ],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  private readonly cart = inject(CartService);
  protected readonly nav = inject(NavService);
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly theme = signal<'light' | 'dark'>('light');
  protected readonly quoteCount = this.cart.totalCount;
  protected readonly user = this.auth.user;
  protected readonly showAdminNav = signal(false);

  constructor() {
    effect(() => {
      const mode = this.theme();
      const body = document.body;
      body.classList.toggle('dark-theme', mode === 'dark');
    });

    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.showAdminNav.set(event.urlAfterRedirects.startsWith('/admin'));
      }
    });
  }

  protected toggleTheme(): void {
    this.theme.update((val) => (val === 'light' ? 'dark' : 'light'));
  }

  protected async logout() {
    await this.auth.signOut();
  }

  protected toggleNav() {
    this.nav.toggle();
  }
}
