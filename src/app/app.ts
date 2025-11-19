import { Component, effect, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatBadgeModule } from '@angular/material/badge';
import { CartService } from './shared/services/cart.service';

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
    MatBadgeModule
  ],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  private readonly cart = inject(CartService);
  protected readonly theme = signal<'light' | 'dark'>('light');
  protected readonly quoteCount = this.cart.totalQuantity;

  constructor() {
    effect(() => {
      const mode = this.theme();
      const body = document.body;
      body.classList.toggle('dark-theme', mode === 'dark');
    });
  }

  protected toggleTheme(): void {
    this.theme.update((val) => (val === 'light' ? 'dark' : 'light'));
  }
}
