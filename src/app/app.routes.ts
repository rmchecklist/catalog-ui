import { Routes } from '@angular/router';
import { authGuard } from './shared/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    data: { breadcrumb: 'Catalog' },
    loadComponent: () =>
      import('./pages/catalog-page/catalog-page').then((m) => m.CatalogPageComponent),
  },
  {
    path: 'products/:slug',
    data: { breadcrumb: 'Product' },
    loadComponent: () =>
      import('./pages/product-detail/product-detail').then((m) => m.ProductDetailComponent),
  },
  {
    path: 'quote',
    data: { breadcrumb: 'Quote cart' },
    loadComponent: () => import('./pages/quote-cart/quote-cart').then((m) => m.QuoteCartComponent),
  },
  {
    path: 'admin',
    canActivate: [authGuard],
    data: { breadcrumb: 'Admin' },
    loadComponent: () =>
      import('./pages/admin-shell/admin-shell').then((m) => m.AdminShellComponent),
    children: [
      { path: '', redirectTo: 'product-management', pathMatch: 'full' },
      {
        path: 'product-management',
        data: { breadcrumb: 'Product management' },
        loadComponent: () =>
          import('./pages/admin-dashboard/admin-dashboard').then((m) => m.AdminDashboardComponent),
      },
      {
        path: 'communications',
        data: { breadcrumb: 'Communications' },
        loadComponent: () =>
          import('./pages/communications/communications').then((m) => m.CommunicationsComponent),
      },
      {
        path: 'invoices',
        data: { breadcrumb: 'Invoices' },
        loadComponent: () =>
          import('./pages/invoices/invoices').then((m) => m.InvoicesPageComponent),
      },
      {
        path: 'customers',
        data: { breadcrumb: 'Customers' },
        loadComponent: () =>
          import('./pages/customers/customers').then((m) => m.CustomersComponent),
      },
      {
        path: 'vendors',
        data: { breadcrumb: 'Vendors' },
        loadComponent: () => import('./pages/vendors/vendors').then((m) => m.VendorsComponent),
      },
      {
        path: 'expenses',
        data: { breadcrumb: 'Expenses' },
        loadComponent: () => import('./pages/expenses/expenses').then((m) => m.ExpensesComponent),
      },
    ],
  },
  {
    path: 'login',
    data: { breadcrumb: 'Login' },
    loadComponent: () => import('./pages/login/login').then((m) => m.LoginComponent),
  },
  {
    path: 'invoice/:id',
    data: { breadcrumb: 'Invoice' },
    loadComponent: () =>
      import('./pages/invoice-viewer/invoice-viewer').then((m) => m.InvoiceViewerComponent),
  },
  { path: '**', redirectTo: '' },
];
