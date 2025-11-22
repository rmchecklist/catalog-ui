import { ChangeDetectionStrategy, Component, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Product, ProductOption } from '../../shared/models/product';
import { ProductService } from '../../shared/services/product.service';
import { computed, Signal } from '@angular/core';
import { CartService } from '../../shared/services/cart.service';
import { AuthService } from '../../shared/services/auth.service';

@Component({
  selector: 'app-catalog-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './catalog-page.html',
  styleUrl: './catalog-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CatalogPageComponent {
  protected searchTerm = '';
  protected selectedBrand = '';
  protected selectedCategory = '';

  protected readonly products: Signal<Product[]>;
  protected readonly brands: Signal<string[]>;
  protected readonly categories: Signal<string[]>;
  protected readonly loading: Signal<boolean>;
  protected readonly cartItems: Signal<any>;
  protected readonly showPrices = computed(() => {
    // touch user signal so changes propagate
    this.auth.user();
    return this.auth.hasAnyRole('ADMIN', 'CUSTOMER');
  });

  constructor(
    private readonly productService: ProductService,
    private readonly cartService: CartService,
    private readonly auth: AuthService
  ) {
    this.products = productService.products;
    this.loading = productService.loading;

    effect(() => {
      this.productService.refresh({
        search: this.searchTerm,
        brand: this.selectedBrand,
        category: this.selectedCategory
      });
    });

    this.brands = computed(() =>
      Array.from(
        new Set(
          this.products()
            .map((p) => p.brand?.trim())
            .filter((v): v is string => !!v)
        )
      ).sort((a, b) => a.localeCompare(b))
    );
    this.categories = computed(() =>
      Array.from(
        new Set(
          this.products()
            .map((p) => p.category?.trim())
            .filter((v): v is string => !!v)
        )
      ).sort((a, b) => a.localeCompare(b))
    );

    // effect(() => {
    //   const current = { ...this.selectedOptions() };
    //   for (const product of this.products()) {
    //     if (!current[product.slug] && product.options.length) {
    //       const preferred =
    //         product.options.find((opt) => opt.available !== false)?.label ??
    //         product.options[0]?.label;
    //       if (preferred) {
    //         current[product.slug] = preferred;
    //       }
    //     }
    //   }
    //   this.selectedOptions.set(current);
    // });
    this.cartItems = this.cartService.items;
  }

  protected addOptionToQuote(product: Product, option: ProductOption) {
    if (option.available === false || this.isInCart(product.slug, option.label)) {
      return;
    }
    const min = option.minQty ?? 1;
    this.cartService.addProductSelection(product, option.label, min).subscribe();
  }

  protected isInCart(slug: string, optionLabel: string): boolean {
    return this.cartItems().some(
      (item: { slug: string; option: string }) => item.slug === slug && item.option === optionLabel
    );
  }

  protected discountPercent(option: ProductOption): number | null {
    if (
      option.marketPrice == null ||
      option.sellingPrice == null ||
      option.marketPrice <= option.sellingPrice
    ) {
      return null;
    }
    const discount = ((option.marketPrice - option.sellingPrice) / option.marketPrice) * 100;
    return Math.round(discount);
  }
}
