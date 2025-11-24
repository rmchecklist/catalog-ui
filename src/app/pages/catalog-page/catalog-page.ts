import { ChangeDetectionStrategy, Component, effect, signal } from '@angular/core';
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
  protected readonly searchTerm = signal('');
  protected readonly selectedBrand = signal('');
  protected readonly selectedCategory = signal('');
  protected readonly page = signal(0);
  protected readonly pageSize = signal(12);

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
  protected readonly showStock = this.showPrices;
  protected readonly total: Signal<number>;
  protected readonly totalPages: Signal<number>;

  constructor(
    private readonly productService: ProductService,
    private readonly cartService: CartService,
    private readonly auth: AuthService
  ) {
    this.products = productService.products;
    this.loading = productService.loading;
    this.total = productService.total;
    this.totalPages = computed(() =>
      Math.max(1, Math.ceil((this.total() || 0) / this.pageSize()))
    );

    effect(() => {
      this.productService.refresh({
        search: this.searchTerm(),
        brand: this.selectedBrand(),
        category: this.selectedCategory(),
        page: this.page(),
        size: this.pageSize()
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

  protected nextPage() {
    if (this.page() < this.totalPages() - 1) {
      this.page.update((p) => p + 1);
    }
  }

  protected prevPage() {
    if (this.page() > 0) {
      this.page.update((p) => p - 1);
    }
  }

  protected goToPage(page: number) {
    if (page >= 0 && page < this.totalPages()) {
      this.page.set(page);
    }
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

  protected isLowStock(option: ProductOption): boolean {
    if (option.stock == null) return false;
    const threshold = option.lowStockThreshold ?? 10;
    return option.stock <= threshold;
  }
}
