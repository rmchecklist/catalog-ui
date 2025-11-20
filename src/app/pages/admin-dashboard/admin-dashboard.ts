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
    category: '',
    description: '',
    imageUrl: '',
    optionLabel: '',
    optionMinQty: 1,
    options: [] as { label: string; minQty: number }[],
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
      : this.form.optionLabel
      ? [{ label: this.form.optionLabel, minQty: Math.max(1, Number(this.form.optionMinQty) || 1) }]
      : [];

    if (!options.length) {
      return;
    }

    const payload: CreateProductRequest = {
      name: this.form.name,
      brand: this.form.brand,
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
    if (!this.form.optionLabel) return;
    this.form.options = [
      ...this.form.options,
      {
        label: this.form.optionLabel,
        minQty: Math.max(1, Number(this.form.optionMinQty) || 1),
      },
    ];
    this.form.optionLabel = '';
    this.form.optionMinQty = 1;
  }

  protected removeOption(index: number) {
    this.form.options = this.form.options.filter((_, i) => i !== index);
  }

  protected startEdit(product: Product) {
    this.editingSlug = product.slug;
    this.form = {
      name: product.name,
      brand: product.brand,
      category: product.category,
      description: product.description,
      imageUrl: product.imageUrl ?? '',
      optionLabel: '',
      optionMinQty: 1,
      options: product.options.map((opt) => ({
        label: opt.label,
        minQty: opt.minQty ?? 1,
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
      category: '',
      description: '',
      imageUrl: '',
      optionLabel: '',
      optionMinQty: 1,
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
