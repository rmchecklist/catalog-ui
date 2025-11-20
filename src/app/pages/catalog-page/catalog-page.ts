import { ChangeDetectionStrategy, Component, effect, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Product } from '../../shared/models/product';
import { ProductService } from '../../shared/services/product.service';
import { computed, Signal } from '@angular/core';
import { CartService } from '../../shared/services/cart.service';

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
  protected readonly selectedOptions = signal<Record<string, string>>({});

  constructor(
    private readonly productService: ProductService,
    private readonly cartService: CartService,
    private readonly router: Router
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
  }

  protected selectOption(slug: string, label: string) {
    this.selectedOptions.update((map) => ({ ...map, [slug]: label }));
  }

  protected addToQuote(product: Product) {
    const option = this.selectedOptions()[product.slug];
    this.router.navigate(['/products', product.slug], {
      queryParams: option ? { option } : undefined
    });
  }
}
