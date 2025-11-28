import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { catchError, forkJoin, of } from 'rxjs';

export interface OrderMetrics {
  total: number;
  open: number;
  fulfilled: number;
  shipped: number;
  revenue: number;
  byStatus?: Record<string, number>;
  revenueByMonth?: Record<string, number>;
  byCity?: Record<string, number>;
  byCustomer?: Record<string, number>;
}

export interface QuoteMetrics {
  total: number;
  open: number;
  responded: number;
  approved: number;
  byStatus?: Record<string, number>;
  byMonth?: Record<string, number>;
  conversionRate?: number;
  byCity?: Record<string, number>;
  byCustomer?: Record<string, number>;
}

export interface ProductMetrics {
  total: number;
  lowStock?: number;
  outOfStock?: number;
}

export interface CustomerMetrics {
  total: number;
}

export interface CommunicationMetrics {
  threads: number;
  messages: number;
  unread: number;
  byType?: Record<string, number>;
}

@Injectable({ providedIn: 'root' })
export class MetricsService {
  private readonly http = inject(HttpClient);

  readonly orders = signal<OrderMetrics | null>(null);
  readonly quotes = signal<QuoteMetrics | null>(null);
  readonly products = signal<ProductMetrics | null>(null);
  readonly customers = signal<CustomerMetrics | null>(null);
  readonly comms = signal<CommunicationMetrics | null>(null);
  readonly loading = signal(false);

  load() {
    this.loading.set(true);
    forkJoin({
      orders: this.http.get<OrderMetrics>(`${environment.apiBaseUrl}/admin/metrics/orders`).pipe(catchError(() => of(null))),
      quotes: this.http.get<QuoteMetrics>(`${environment.apiBaseUrl}/admin/metrics/quotes`).pipe(catchError(() => of(null))),
      products: this.http.get<ProductMetrics>(`${environment.apiBaseUrl}/admin/metrics/products`).pipe(catchError(() => of(null))),
      customers: this.http.get<CustomerMetrics>(`${environment.apiBaseUrl}/admin/metrics/customers`).pipe(catchError(() => of(null))),
      comms: this.http.get<CommunicationMetrics>(`${environment.apiBaseUrl}/admin/metrics/communications`).pipe(catchError(() => of(null))),
    }).subscribe({
      next: ({ orders, quotes, products, customers, comms }) => {
        if (orders) this.orders.set(orders);
        if (quotes) this.quotes.set(quotes);
        if (products) this.products.set(products);
        if (customers) this.customers.set(customers);
        if (comms) this.comms.set(comms);
      },
      error: () => this.loading.set(false),
      complete: () => this.loading.set(false),
    });
  }
}
