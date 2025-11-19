import { ChangeDetectionStrategy, Component, effect, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
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
  protected readonly filteredProducts: Signal<Product[]>;
  protected readonly brands: Signal<string[]>;
  protected readonly categories: Signal<string[]>;
  protected readonly loading: Signal<boolean>;
  protected readonly selectedOptions = signal<Record<string, string>>({});

  constructor(
    private readonly productService: ProductService,
    private readonly cartService: CartService
  ) {
    this.products = productService.products;
    this.loading = productService.loading;

    // ensure fetch from API
    this.productService.refresh();

    this.brands = computed(() => Array.from(new Set(this.products().map((p) => p.brand))));
    this.categories = computed(() => Array.from(new Set(this.products().map((p) => p.category))));
    this.filteredProducts = computed(() =>
      this.products().filter((product) => {
        const matchesSearch =
          !this.searchTerm ||
          product.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
          product.description.toLowerCase().includes(this.searchTerm.toLowerCase());
        const matchesBrand = !this.selectedBrand || product.brand === this.selectedBrand;
        const matchesCategory =
          !this.selectedCategory || product.category === this.selectedCategory;
        return matchesSearch && matchesBrand && matchesCategory;
      })
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
    this.cartService.addProductSelection(product, option).subscribe();
  }
}
