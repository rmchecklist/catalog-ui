import { Routes } from '@angular/router';
import { authGuard } from './shared/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/catalog-page/catalog-page').then((m) => m.CatalogPageComponent)
  },
  {
    path: 'products/:slug',
    loadComponent: () => import('./pages/product-detail/product-detail').then((m) => m.ProductDetailComponent)
  },
  {
    path: 'quote',
    loadComponent: () => import('./pages/quote-cart/quote-cart').then((m) => m.QuoteCartComponent)
  },
  {
    path: 'admin',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/admin-dashboard/admin-dashboard').then((m) => m.AdminDashboardComponent)
  },
  {
    path: 'admin/communications',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/communications/communications').then((m) => m.CommunicationsComponent)
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login').then((m) => m.LoginComponent)
  },
  { path: '**', redirectTo: '' }
];
