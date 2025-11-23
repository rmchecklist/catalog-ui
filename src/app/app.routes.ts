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
    loadComponent: () => import('./pages/admin-shell/admin-shell').then((m) => m.AdminShellComponent),
    children: [
      { path: '', redirectTo: 'product-management', pathMatch: 'full' },
      {
        path: 'product-management',
        loadComponent: () =>
          import('./pages/admin-dashboard/admin-dashboard').then((m) => m.AdminDashboardComponent),
      },
      {
        path: 'communications',
        loadComponent: () =>
          import('./pages/communications/communications').then((m) => m.CommunicationsComponent),
      },
      {
        path: 'invoices',
        loadComponent: () => import('./pages/invoices/invoices').then((m) => m.InvoicesPageComponent),
      },
      {
        path: 'customers',
        loadComponent: () => import('./pages/customers/customers').then((m) => m.CustomersComponent),
      },
    ],
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login').then((m) => m.LoginComponent)
  },
  {
    path: 'invoice/:id',
    loadComponent: () => import('./pages/invoice-viewer/invoice-viewer').then((m) => m.InvoiceViewerComponent)
  },
  { path: '**', redirectTo: '' }
];
