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
import { BreadcrumbsComponent } from './shared/components/breadcrumbs';
import { FormsModule } from '@angular/forms';
import { SearchService, ProductSuggestion } from './shared/services/search.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatBadgeModule,
    MatMenuModule,
    BreadcrumbsComponent
  ],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  private readonly cart = inject(CartService);
  protected readonly nav = inject(NavService);
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly search = inject(SearchService);
  protected readonly theme = signal<'light' | 'dark'>('light');
  protected readonly quoteCount = this.cart.totalCount;
  protected readonly user = this.auth.user;
  protected readonly showAdminNav = signal(false);
  protected readonly searchTerm = signal('');
  protected readonly suggestions = signal<ProductSuggestion[]>([]);
  protected showSuggestions = signal(false);
  private searchTimer: any;

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

  protected onSearchInput(value: string) {
    this.searchTerm.set(value);
    if (!value || !value.trim()) {
      this.suggestions.set([]);
      this.showSuggestions.set(false);
      return;
    }
    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
    }
    this.searchTimer = setTimeout(() => {
      this.search.suggest(value.trim()).subscribe((res) => {
        this.suggestions.set(res);
        this.showSuggestions.set(res.length > 0);
      });
    }, 200);
  }

  protected submitSearch(term?: string) {
    const value = term ?? this.searchTerm().trim();
    if (!value) return;
    this.showSuggestions.set(false);
    this.router.navigate(['/'], { queryParams: { search: value } });
  }

  protected goToSuggestion(s: ProductSuggestion) {
    this.showSuggestions.set(false);
    this.searchTerm.set('');
    this.router.navigate(['/products', s.slug]);
  }
}
