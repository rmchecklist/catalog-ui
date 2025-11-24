import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, Signal, computed, signal } from '@angular/core';
import { tap, catchError, of } from 'rxjs';
import { Product } from '../models/product';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';
import { HttpParams } from '@angular/common/http';

const API_BASE = `${environment.apiBaseUrl}/products`;
const API_PAGE = `${API_BASE}/page`;

export interface ProductPage {
  items: Product[];
  total: number;
  page: number;
  size: number;
}

export interface CreateProductRequest {
  name: string;
  brand: string;
  vendor?: string;
  category: string;
  description: string;
  imageUrl?: string;
  options: Array<{
    label: string;
    weight?: string;
    minQty: number;
    available?: boolean;
    purchasePrice?: number;
    sellingPrice?: number;
    marketPrice?: number;
    sku?: string;
    stock?: number;
    lowStockThreshold?: number;
  }>;
}

@Injectable({ providedIn: 'root' })
export class ProductService {
  private readonly productsSignal = signal<Product[]>([]);
  readonly products: Signal<Product[]> = this.productsSignal.asReadonly();
  private readonly totalSignal = signal(0);
  readonly total = this.totalSignal.asReadonly();
  private readonly pageSignal = signal(0);
  readonly page = this.pageSignal.asReadonly();
  private readonly sizeSignal = signal(12);
  readonly size = this.sizeSignal.asReadonly();
  readonly loading = signal(false);

  constructor(private readonly http: HttpClient, private readonly auth: AuthService) {
    this.refresh();
  }

  refresh(filters?: { search?: string; brand?: string; category?: string; page?: number; size?: number }) {
    this.loading.set(true);
    let params = new HttpParams();
    const page = filters?.page ?? this.pageSignal();
    const size = filters?.size ?? this.sizeSignal();
    if (filters?.search) params = params.set('search', filters.search);
    if (filters?.brand) params = params.set('brand', filters.brand);
    if (filters?.category) params = params.set('category', filters.category);
    params = params.set('page', page);
    params = params.set('size', size);
    const token = this.auth.getAccessToken();
    const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : undefined;
    this.http
      .get<ProductPage>(API_PAGE, { params, headers })
      .pipe(
        tap((res) => {
          this.productsSignal.set(res.items);
          this.totalSignal.set(res.total);
          this.pageSignal.set(res.page);
          this.sizeSignal.set(res.size);
        }),
        catchError((err) => {
          console.error('Failed to load products', err);
          return of([] as Product[]);
        })
      )
      .subscribe({
        complete: () => this.loading.set(false),
      });
  }

  getProductBySlug(slug: string): Product | undefined {
    return this.productsSignal().find((product) => product.slug === slug);
  }

  fetchProduct(slug: string) {
    return this.http.get<Product>(`${API_BASE}/${slug}`).pipe(
      tap((product) =>
        this.productsSignal.update((items) => {
          const exists = items.some((p) => p.slug === product.slug);
          return exists
            ? items.map((p) => (p.slug === product.slug ? product : p))
            : [...items, product];
        })
      ),
      catchError((err) => {
        console.error(`Failed to load product ${slug}`, err);
        return of(null as unknown as Product);
      })
    );
  }

  addProduct(request: CreateProductRequest) {
    return this.http
      .post<Product>(API_BASE, request)
      .pipe(tap((product) => this.productsSignal.update((items) => [...items, product])));
  }

  updateProduct(slug: string, request: CreateProductRequest) {
    return this.http
      .put<Product>(`${API_BASE}/${slug}`, request)
      .pipe(
        tap((updated) =>
          this.productsSignal.update((items) =>
            items.map((item) => (item.slug === slug ? updated : item))
          )
        )
      );
  }

  deleteProduct(slug: string) {
    return this.http
      .delete<void>(`${API_BASE}/${slug}`)
      .pipe(
        tap(() => this.productsSignal.update((items) => items.filter((item) => item.slug !== slug)))
      );
  }
}
