import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, signal, inject } from '@angular/core';
import { NavigationEnd, ActivatedRouteSnapshot, RouterLink, RouterStateSnapshot, Router } from '@angular/router';

interface Crumb {
  label: string;
  url: string;
}

@Component({
  selector: 'app-breadcrumbs',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './breadcrumbs.html',
  styleUrl: './breadcrumbs.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BreadcrumbsComponent {
  private readonly router = inject(Router);
  protected readonly crumbs = signal<Crumb[]>([]);

  constructor() {
    this.updateCrumbs();
    this.router.events.subscribe((ev) => {
      if (ev instanceof NavigationEnd) {
        this.updateCrumbs();
      }
    });
  }

  private build(route: ActivatedRouteSnapshot, url: string, crumbs: Crumb[]) {
    const label = route.data['breadcrumb'] as string | undefined;
    const segment = route.url.map((u) => u.path).join('/');
    const nextUrl = segment ? `${url}/${segment}` : url || '/';
    if (label) {
      crumbs.push({ label, url: nextUrl });
    }
    for (const child of route.children) {
      this.build(child, nextUrl, crumbs);
    }
  }

  private updateCrumbs() {
    const state: RouterStateSnapshot = this.router.routerState.snapshot;
    const list: Crumb[] = [];
    this.build(state.root, '', list);
    this.crumbs.set(list);
  }
}
