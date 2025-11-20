import { computed, Injectable, signal } from '@angular/core';
import { of, EMPTY, Observable } from 'rxjs';
import { Product } from '../models/product';

export interface CartItem {
  id: string;
  slug: string;
  name: string;
  option: string;
  minQty: number;
  quantity: number;
  available: boolean;
}

const STORAGE_KEY = 'quote-cart-items';

@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly itemsSignal = signal<CartItem[]>([]);

  readonly items = this.itemsSignal.asReadonly();

  // Number of unique product/option selections (not total quantity)
  readonly totalCount = computed(() => this.itemsSignal().length);

  constructor() {
    this.loadFromStorage();
  }

  refresh() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? (JSON.parse(raw) as CartItem[]) : [];
      this.itemsSignal.set(parsed);
    } catch (err) {
      console.error('Failed to load cart from storage', err);
      this.itemsSignal.set([]);
    }
  }

  private persist(items: CartItem[]) {
    this.itemsSignal.set(items);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (err) {
      console.error('Failed to persist cart to storage', err);
    }
  }

  addItem(payload: Omit<CartItem, 'id'>): Observable<CartItem> {
    const existing = this.itemsSignal().find(
      (item) => item.slug === payload.slug && item.option === payload.option
    );

    let item: CartItem;
    if (existing) {
      item = { ...existing, quantity: existing.quantity + payload.quantity };
      const items = this.itemsSignal().map((it) => (it.id === existing.id ? item : it));
      this.persist(items);
    } else {
      item = { ...payload, id: this.createId() };
      this.persist([...this.itemsSignal(), item]);
    }
    return of(item);
  }

  private createId(): string {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID();
    }
    return `cart-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  updateQuantity(id: string, quantity: number) {
    const updated = this.itemsSignal().map((item) =>
      item.id === id ? { ...item, quantity: Math.max(quantity, item.minQty) } : item
    );
    this.persist(updated);
    return of(null);
  }

  removeItem(id: string) {
    const filtered = this.itemsSignal().filter((item) => item.id !== id);
    this.persist(filtered);
    return of(null);
  }

  snapshot(): CartItem[] {
    return this.itemsSignal();
  }

  clear() {
    this.persist([]);
  }

  addProductSelection(
    product: Product,
    optionLabel?: string,
    quantityOverride?: number
  ): Observable<CartItem> {
    const option =
      product.options.find((opt) => opt.label === optionLabel) ??
      product.options.find((opt) => opt.available !== false) ??
      product.options[0];

    if (!option) {
      console.warn('No options available for product', product);
      return EMPTY;
    }

    const payload: Omit<CartItem, 'id'> = {
      slug: product.slug,
      name: product.name,
      option: option.label,
      minQty: option.minQty ?? 1,
      quantity: Math.max(quantityOverride ?? option.minQty ?? 1, option.minQty ?? 1),
      available: option.available !== false
    };

    return this.addItem(payload);
  }
}
