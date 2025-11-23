import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ProductService } from '../../shared/services/product.service';
import { Product } from '../../shared/models/product';
import { CartService } from '../../shared/services/cart.service';
import { CartItem } from '../../shared/services/cart.service';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './product-detail.html',
  styleUrl: './product-detail.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductDetailComponent {
  private readonly slug: string | null;
  protected readonly product = signal<Product | undefined>(undefined);
  // Tracks quantities selected per option label
  protected readonly quantities = signal<Record<string, number>>({});
  protected readonly cartItems = () => this.cartService.items();
  protected readonly selectedCount = computed(() => {
    const p = this.product();
    if (!p) return 0;
    const map = this.quantities();
    return p.options.filter((opt) => (map[opt.label] ?? 0) > 0 && opt.available !== false).length;
  });

  constructor(
    route: ActivatedRoute,
    private readonly productService: ProductService,
    private readonly cartService: CartService
  ) {
    this.slug = route.snapshot.paramMap.get('slug');
    const preselectedOption = route.snapshot.queryParamMap.get('option');
    if (this.slug) {
      const cached = this.productService.getProductBySlug(this.slug);
      if (cached) {
        this.product.set(cached);
        this.setInitialQuantities(cached);
        if (preselectedOption) {
          this.quantities.update((map) => ({
            ...map,
            [preselectedOption]: map[preselectedOption] ?? (cached.options.find((o) => o.label === preselectedOption)?.minQty ?? 1)
          }));
        }
      } else {
        this.productService
          .fetchProduct(this.slug)
          .subscribe((p) => {
            if (p) {
              this.product.set(p);
              this.setInitialQuantities(p);
              if (preselectedOption) {
                this.quantities.update((map) => ({
                  ...map,
                  [preselectedOption]: map[preselectedOption] ?? (p.options.find((o) => o.label === preselectedOption)?.minQty ?? 1)
                }));
              }
            }
          });
      }
    }
  }

  private setInitialQuantities(product: Product) {
    const map: Record<string, number> = {};
    for (const option of product.options) {
      map[option.label] = option.minQty ?? 1;
    }
    this.quantities.set(map);
  }

  protected updateQuantity(optionLabel: string, value: string) {
    const num = Number(value);
    this.quantities.update((map) => ({
      ...map,
      [optionLabel]: Number.isFinite(num) ? num : 0,
    }));
  }

  protected addSelectedOptionsToCart() {
    const current = this.product();
    if (!current) return;
    const map = this.quantities();
    const selections = current.options.filter((opt) => {
      const qty = map[opt.label] ?? 0;
      return qty > 0 && opt.available !== false;
    });
    for (const opt of selections) {
      const min = opt.minQty ?? 1;
      const qty = Math.max(map[opt.label] ?? min, min);
      this.cartService.addProductSelection(current, opt.label, qty).subscribe();
    }
  }

  protected addSingleOption(optLabel: string) {
    const current = this.product();
    if (!current) return;
    const qty = this.quantities()[optLabel] ?? 1;
    this.cartService.addProductSelection(current, optLabel, qty).subscribe();
  }

  protected isInCart(optLabel: string): boolean {
    const p = this.product();
    if (!p) return false;
    return this.cartItems().some((item: CartItem) => item.slug === p.slug && item.option === optLabel);
  }
}
