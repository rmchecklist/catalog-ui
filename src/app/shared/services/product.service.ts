import { HttpClient } from '@angular/common/http';
import { Injectable, Signal, computed, signal } from '@angular/core';
import { tap, catchError, of } from 'rxjs';
import { Product } from '../models/product';
import { environment } from '../../../environments/environment';

const API_BASE = `${environment.apiBaseUrl}/products`;

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
  }>;
}

@Injectable({ providedIn: 'root' })
export class ProductService {
  private readonly productsSignal = signal<Product[]>([]);
  readonly products: Signal<Product[]> = this.productsSignal.asReadonly();
  readonly loading = signal(false);

  constructor(private readonly http: HttpClient) {
    this.refresh();
  }

  refresh() {
    this.loading.set(true);
    this.http
      .get<Product[]>(API_BASE)
      .pipe(
        tap((products) => this.productsSignal.set(products)),
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
