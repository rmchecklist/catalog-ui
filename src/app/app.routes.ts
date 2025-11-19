import { Routes } from '@angular/router';
import { CatalogPageComponent } from './pages/catalog-page/catalog-page';
import { ProductDetailComponent } from './pages/product-detail/product-detail';
import { QuoteCartComponent } from './pages/quote-cart/quote-cart';
import { AdminDashboardComponent } from './pages/admin-dashboard/admin-dashboard';

export const routes: Routes = [
  { path: '', component: CatalogPageComponent },
  { path: 'products/:slug', component: ProductDetailComponent },
  { path: 'quote', component: QuoteCartComponent },
  { path: 'admin', component: AdminDashboardComponent },
  { path: '**', redirectTo: '' }
];
