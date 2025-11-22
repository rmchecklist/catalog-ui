import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';
import { CartItem } from './cart.service';

export interface OrderPayload {
  email: string;
  name?: string;
  phone?: string;
  company?: string;
  items: Array<{
    productSlug: string;
    productName: string;
    optionLabel: string;
    sku?: string;
    quantity: number;
    sellingPrice?: number;
    marketPrice?: number;
  }>;
}

export interface OrderResult {
  id: string;
  pdfUrl?: string;
  status: string;
}

@Injectable({ providedIn: 'root' })
export class OrderService {
  private readonly http = inject(HttpClient);

  createOrder(payload: OrderPayload): Observable<OrderResult> {
    return this.http.post<OrderResult>(`${environment.apiBaseUrl}/orders`, payload);
  }

  createQuote(payload: OrderPayload): Observable<OrderResult> {
    return this.http.post<OrderResult>(`${environment.apiBaseUrl}/quotes`, payload);
  }

  static mapCartItems(items: CartItem[], prices?: Record<string, { sellingPrice?: number; marketPrice?: number; sku?: string }>) {
    return items.map((item) => {
      const key = `${item.slug}__${item.option}`;
      const priceInfo = prices?.[key];
      return {
        productSlug: item.slug,
        productName: item.name,
        optionLabel: item.option,
        sku: priceInfo?.sku,
        quantity: item.quantity,
        sellingPrice: priceInfo?.sellingPrice,
        marketPrice: priceInfo?.marketPrice,
      };
    });
  }
}
