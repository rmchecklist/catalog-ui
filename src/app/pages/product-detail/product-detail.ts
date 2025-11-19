import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ProductService } from '../../shared/services/product.service';
import { Product } from '../../shared/models/product';
import { CartService } from '../../shared/services/cart.service';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './product-detail.html',
  styleUrl: './product-detail.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductDetailComponent {
  private readonly slug: string | null;
  protected readonly product = signal<Product | undefined>(undefined);

  constructor(
    route: ActivatedRoute,
    private readonly productService: ProductService,
    private readonly cartService: CartService
  ) {
    this.slug = route.snapshot.paramMap.get('slug');
    if (this.slug) {
      const cached = this.productService.getProductBySlug(this.slug);
      if (cached) {
        this.product.set(cached);
      } else {
        this.productService
          .fetchProduct(this.slug)
          .subscribe((p) => this.product.set(p ?? undefined));
      }
    }
  }

  protected addOptionToCart(optionLabel: string) {
    const current = this.product();
    if (!current) {
      return;
    }
    this.cartService.addProductSelection(current, optionLabel).subscribe();
  }
}
