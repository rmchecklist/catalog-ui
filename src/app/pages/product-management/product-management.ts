import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NgChartsModule } from 'ng2-charts';
import { ChartConfiguration, ChartOptions } from 'chart.js';
import { finalize } from 'rxjs';
import { Product } from '../../shared/models/product';
import { CreateProductRequest, ProductService } from '../../shared/services/product.service';
import { MetricsService } from '../../shared/services/metrics.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-product-management',
  standalone: true,
  imports: [CommonModule, HttpClientModule, RouterLink, FormsModule, NgChartsModule],
  templateUrl: './product-management.html',
  styleUrl: './product-management.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductManagement {
  private readonly productService = inject(ProductService);
  private readonly http = inject(HttpClient);
  readonly metrics = inject(MetricsService);
  protected readonly products = this.productService.products;
  protected readonly orderMetrics = this.metrics.orders;
  protected readonly quoteMetrics = this.metrics.quotes;
  protected readonly productMetrics = this.metrics.products;
  protected readonly customerMetrics = this.metrics.customers;
  protected readonly commMetrics = this.metrics.comms;
  protected readonly metricsLoading = this.metrics.loading;
  protected orderStatusChart: ChartConfiguration['data'] = { labels: [], datasets: [] };
  protected orderRevenueChart: ChartConfiguration['data'] = { labels: [], datasets: [] };
  protected quoteStatusChart: ChartConfiguration['data'] = { labels: [], datasets: [] };
  protected commsChart: ChartConfiguration['data'] = { labels: [], datasets: [] };
  protected chartOptions: ChartOptions = {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: { x: { grid: { display: false } }, y: { grid: { color: '#e5e7eb' } } },
  };
  private readonly chartsEffect = effect(() => {
    this.orderMetrics();
    this.quoteMetrics();
    this.buildCharts();
  });

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

  ngOnInit() {
    this.metrics.load();
  }

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

  private buildCharts() {
    const orders = this.orderMetrics();
    if (orders?.byStatus) {
      const labels = Object.keys(orders.byStatus);
      const data = Object.values(orders.byStatus);
      this.orderStatusChart = {
        labels,
        datasets: [{ data, backgroundColor: '#2563eb' }],
      };
    }
    if (orders?.revenueByMonth) {
      const labels = Object.keys(orders.revenueByMonth).sort();
      const data = labels.map((l) => orders.revenueByMonth![l] ?? 0);
      this.orderRevenueChart = {
        labels,
        datasets: [{ data, backgroundColor: '#0ea5e9' }],
      };
    }
    const quotes = this.quoteMetrics();
    if (quotes?.byStatus) {
      const labels = Object.keys(quotes.byStatus);
      const data = Object.values(quotes.byStatus);
      this.quoteStatusChart = {
        labels,
        datasets: [{ data, backgroundColor: '#f59e0b' }],
      };
    }
    const comms = this.commMetrics();
    if (comms?.byType) {
      const labels = Object.keys(comms.byType);
      const data = Object.values(comms.byType);
      this.commsChart = {
        labels,
        datasets: [{ data, backgroundColor: '#10b981' }],
      };
    }
  }
}
