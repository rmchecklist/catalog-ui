import { computed, Injectable, signal } from '@angular/core';

export interface CartItem {
  id: string;
  name: string;
  option: string;
  minQty: number;
  quantity: number;
  available: boolean;
}

@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly itemsSignal = signal<CartItem[]>([
    { id: 'stainless-bottle-750', name: 'Stainless Bottle', option: '750ml', minQty: 25, quantity: 25, available: true },
    { id: 'eco-mailer-m', name: 'Eco Mailer', option: 'M', minQty: 100, quantity: 200, available: true },
    { id: 'hex-bolt-m10x50', name: 'Carbon Steel Hex Bolt', option: 'M10 x 50', minQty: 50, quantity: 50, available: false }
  ]);

  readonly items = this.itemsSignal.asReadonly();

  readonly totalQuantity = computed(() =>
    this.itemsSignal()
      .filter((item) => item.available)
      .reduce((sum, item) => sum + (item.quantity || 0), 0)
  );

  updateQuantity(id: string, quantity: number) {
    this.itemsSignal.update((items) =>
      items.map((item) =>
        item.id === id
          ? { ...item, quantity: Math.max(item.minQty ?? 1, Math.floor(quantity || 0)) }
          : item
      )
    );
  }

  setItems(items: CartItem[]) {
    this.itemsSignal.set(items);
  }
}
