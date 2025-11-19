import { HttpClient } from '@angular/common/http';
import { computed, Injectable, signal } from '@angular/core';
import { catchError, tap, of, EMPTY, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Product } from '../models/product';

export interface CartItem {
  id: string;
  name: string;
  option: string;
  minQty: number;
  quantity: number;
  available: boolean;
}

const CART_API = `${environment.apiBaseUrl}/cart`;

@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly itemsSignal = signal<CartItem[]>([]);
  readonly loading = signal(false);

  readonly items = this.itemsSignal.asReadonly();

  readonly totalQuantity = computed(() =>
    this.itemsSignal()
      .filter((item) => item.available)
      .reduce((sum, item) => sum + (item.quantity || 0), 0)
  );

  constructor(private readonly http: HttpClient) {
    this.refresh();
  }

  refresh() {
    this.loading.set(true);
    this.http
      .get<CartItem[]>(CART_API)
      .pipe(
        tap((items) => this.itemsSignal.set(items)),
        catchError((err) => {
          console.error('Failed to load cart', err);
          return of([] as CartItem[]);
        })
      )
      .subscribe({
        complete: () => this.loading.set(false)
      });
  }

  addItem(payload: Omit<CartItem, 'id'>) {
    return this.http.post<CartItem>(CART_API, payload).pipe(
      tap((item) => this.itemsSignal.update((items) => [...items, item]))
    );
  }

  updateQuantity(id: string, quantity: number) {
    const body = { quantity };
    return this.http.patch<CartItem>(`${CART_API}/${id}`, body).pipe(
      tap((updated) =>
        this.itemsSignal.update((items) =>
          items.map((item) => (item.id === updated.id ? updated : item))
        )
      )
    );
  }

  removeItem(id: string) {
    return this.http.delete<void>(`${CART_API}/${id}`).pipe(
      tap(() => this.itemsSignal.update((items) => items.filter((item) => item.id !== id)))
    );
  }

  setItems(items: CartItem[]) {
    this.itemsSignal.set(items);
  }

  addProductSelection(product: Product, optionLabel?: string): Observable<CartItem> {
    const option =
      product.options.find((opt) => opt.label === optionLabel) ??
      product.options.find((opt) => opt.available !== false) ??
      product.options[0];

    if (!option) {
      console.warn('No options available for product', product);
      return EMPTY;
    }

    const payload: Omit<CartItem, 'id'> = {
      name: product.name,
      option: option.label,
      minQty: option.minQty ?? 1,
      quantity: option.minQty ?? 1,
      available: option.available !== false
    };

    return this.addItem(payload);
  }
}
