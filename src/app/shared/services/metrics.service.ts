import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface OrderMetrics {
  total: number;
  open: number;
  fulfilled: number;
  shipped: number;
  revenue: number;
  byStatus?: Record<string, number>;
  revenueByMonth?: Record<string, number>;
}

export interface QuoteMetrics {
  total: number;
  open: number;
  responded: number;
  approved: number;
  byStatus?: Record<string, number>;
  byMonth?: Record<string, number>;
}

export interface ProductMetrics {
  total: number;
}

export interface CustomerMetrics {
  total: number;
}

@Injectable({ providedIn: 'root' })
export class MetricsService {
  private readonly http = inject(HttpClient);

  readonly orders = signal<OrderMetrics | null>(null);
  readonly quotes = signal<QuoteMetrics | null>(null);
  readonly products = signal<ProductMetrics | null>(null);
  readonly customers = signal<CustomerMetrics | null>(null);
  readonly loading = signal(false);

  load() {
    this.loading.set(true);
    Promise.all([
      this.http.get<OrderMetrics>(`${environment.apiBaseUrl}/admin/metrics/orders`).toPromise(),
      this.http.get<QuoteMetrics>(`${environment.apiBaseUrl}/admin/metrics/quotes`).toPromise(),
      this.http.get<ProductMetrics>(`${environment.apiBaseUrl}/admin/metrics/products`).toPromise(),
      this.http.get<CustomerMetrics>(`${environment.apiBaseUrl}/admin/metrics/customers`).toPromise(),
    ])
      .then(([orders, quotes, products, customers]) => {
        if (orders) this.orders.set(orders);
        if (quotes) this.quotes.set(quotes);
        if (products) this.products.set(products);
        if (customers) this.customers.set(customers);
      })
      .finally(() => this.loading.set(false));
  }
}
