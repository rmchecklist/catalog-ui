import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Product } from '../../shared/models/product';
import { CreateProductRequest, ProductService } from '../../shared/services/product.service';
import { NavService } from '../../shared/services/nav.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminDashboardComponent {
  private readonly productService = inject(ProductService);
  private readonly http = inject(HttpClient);
  protected readonly nav = inject(NavService);
  protected readonly products = this.productService.products;

  protected form = {
    name: '',
    brand: '',
    vendor: '',
    category: '',
    description: '',
    imageUrl: '',
    optionLabel: '',
    optionWeight: '',
    optionMinQty: 1,
    optionPurchasePrice: 0,
    optionSellingPrice: 0,
    optionMarketPrice: 0,
    optionSku: '',
    optionStock: 0,
    optionLowStockThreshold: 10,
    options: [] as {
      label: string;
      minQty: number;
      weight?: string;
      purchasePrice?: number;
      sellingPrice?: number;
      marketPrice?: number;
      sku?: string;
      stock?: number;
      lowStockThreshold?: number;
    }[],
  };
  protected uploadingImage = false;
  protected uploadError: string | null = null;
  protected uploadedImageName: string | null = null;
  protected uploadWarning: string | null = null;
  protected editingSlug: string | null = null;
  protected showForm = false;
  protected saving = false;
  protected saveError: string | null = null;
  protected deletePending: { slug: string; name: string } | null = null;

  protected submit() {
    if (!this.form.name || !this.form.brand || !this.form.category) {
      return;
    }

    const options = this.form.options.length
      ? this.form.options
      : this.form.optionLabel?.trim()
      ? [
          {
            label: this.form.optionLabel.trim(),
            minQty: Math.max(1, Number(this.form.optionMinQty) || 1),
            weight: this.form.optionWeight || undefined,
            purchasePrice: Number(this.form.optionPurchasePrice) || 0,
            sellingPrice: Number(this.form.optionSellingPrice) || 0,
            marketPrice: Number(this.form.optionMarketPrice) || 0,
            sku: this.form.optionSku || undefined,
            stock: Number.isFinite(this.form.optionStock) ? Number(this.form.optionStock) : 0,
            lowStockThreshold: Number.isFinite(this.form.optionLowStockThreshold)
              ? Number(this.form.optionLowStockThreshold)
              : 10,
          },
        ]
      : [];

    if (!options.length) {
      this.saveError = 'Add at least one option.';
      return;
    }

    const payload: CreateProductRequest = {
      name: this.form.name,
      brand: this.form.brand,
      vendor: this.form.vendor || undefined,
      category: this.form.category,
      description: this.form.description || 'No description yet.',
      imageUrl: this.form.imageUrl || undefined,
      options: options.map((opt) => ({
        ...opt,
        available: true,
      })),
    };

    this.saving = true;
    this.saveError = null;

    const request$ = this.editingSlug
      ? this.productService.updateProduct(this.editingSlug, payload)
      : this.productService.addProduct(payload);

    request$.subscribe({
      next: () => this.closeModal(),
      error: (err) => {
        console.error('Failed to save product', err);
        this.saveError = 'Failed to save product. Please try again.';
      },
      complete: () => (this.saving = false),
    });
  }

  protected addOption() {
    if (!this.form.optionLabel?.trim()) {
      this.saveError = 'Option label is required.';
      return;
    }
    this.saveError = null;
    this.form.options = [
      ...this.form.options,
      {
        label: this.form.optionLabel.trim(),
        minQty: Math.max(1, Number(this.form.optionMinQty) || 1),
        weight: this.form.optionWeight || undefined,
        purchasePrice: Number(this.form.optionPurchasePrice) || 0,
        sellingPrice: Number(this.form.optionSellingPrice) || 0,
        marketPrice: Number(this.form.optionMarketPrice) || 0,
        sku: this.form.optionSku || undefined,
        stock: Number.isFinite(this.form.optionStock) ? Number(this.form.optionStock) : 0,
        lowStockThreshold: Number.isFinite(this.form.optionLowStockThreshold)
          ? Number(this.form.optionLowStockThreshold)
          : 10,
      },
    ];
    this.form.optionLabel = '';
    this.form.optionWeight = '';
    this.form.optionMinQty = 1;
    this.form.optionPurchasePrice = 0;
    this.form.optionSellingPrice = 0;
    this.form.optionMarketPrice = 0;
    this.form.optionSku = '';
    this.form.optionStock = 0;
    this.form.optionLowStockThreshold = 10;
  }

  protected removeOption(index: number) {
    this.form.options = this.form.options.filter((_, i) => i !== index);
  }

  protected startEdit(product: Product) {
    this.editingSlug = product.slug;
    this.form = {
      name: product.name,
      brand: product.brand,
      vendor: product.vendor ?? '',
      category: product.category,
      description: product.description,
      imageUrl: product.imageUrl ?? '',
      optionLabel: '',
      optionWeight: '',
      optionMinQty: 1,
      optionPurchasePrice: 0,
      optionSellingPrice: 0,
      optionMarketPrice: 0,
      optionSku: '',
      optionStock: 0,
      optionLowStockThreshold: 10,
      options: product.options.map((opt) => ({
        label: opt.label,
        minQty: opt.minQty ?? 1,
        weight: opt.weight,
        purchasePrice: opt.purchasePrice ?? 0,
        sellingPrice: opt.sellingPrice ?? 0,
        marketPrice: opt.marketPrice ?? 0,
        sku: opt.sku,
        stock: opt.stock ?? 0,
        lowStockThreshold: opt.lowStockThreshold ?? 10,
      })),
    };
    this.uploadedImageName = product.imageUrl ? 'Existing image' : null;
    this.uploadError = null;
    this.saveError = null;
    this.showForm = true;
  }

  protected deleteProduct(slug: string) {
    const product = this.products().find((p) => p.slug === slug);
    if (!product) return;
    this.deletePending = { slug, name: product.name };
  }

  protected handleImageUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    // basic client-side size check (e.g., 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      this.uploadWarning = 'File too large (max 5MB).';
      this.uploadError = null;
      this.uploadedImageName = null;
      return;
    }
    this.uploadWarning = null;
    const formData = new FormData();
    formData.append('file', file);
    this.uploadingImage = true;
    this.uploadError = null;
    this.http
      .post<{ url: string; path: string }>(`${environment.apiBaseUrl}/storage/upload`, formData)
      .pipe(finalize(() => (this.uploadingImage = false)))
      .subscribe({
        next: (response) => {
          this.form.imageUrl = response.url;
          this.uploadedImageName = file.name;
          this.uploadWarning = null;
        },
        error: (err) => {
          console.error('Image upload failed', err);
          this.uploadError = 'Failed to upload image. Please try again.';
          this.uploadedImageName = null;
        },
      });
  }

  protected reset() {
    this.form = {
      name: '',
      brand: '',
      vendor: '',
      category: '',
      description: '',
      imageUrl: '',
      optionLabel: '',
      optionWeight: '',
      optionMinQty: 1,
      optionPurchasePrice: 0,
      optionSellingPrice: 0,
      optionMarketPrice: 0,
      optionSku: '',
      optionStock: 0,
      optionLowStockThreshold: 10,
      options: [],
    };
    this.uploadingImage = false;
    this.uploadError = null;
    this.uploadedImageName = null;
    this.editingSlug = null;
    this.saveError = null;
    this.saving = false;
  }

  protected openCreateModal() {
    this.reset();
    this.showForm = true;
  }

  protected closeModal() {
    this.showForm = false;
    this.reset();
  }

  protected toggleSidenav() {
    this.nav.toggle();
  }

  protected confirmDelete() {
    const pending = this.deletePending;
    if (!pending) return;
    this.productService.deleteProduct(pending.slug).subscribe(() => {
      if (this.editingSlug === pending.slug) {
        this.closeModal();
      }
      this.deletePending = null;
    });
  }

  protected cancelDelete() {
    this.deletePending = null;
  }
}
