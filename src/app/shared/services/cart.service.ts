import { HttpClient } from '@angular/common/http';
import { computed, Injectable, signal } from '@angular/core';
import { catchError, tap, of } from 'rxjs';
import { environment } from '../../../environments/environment';

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
}
