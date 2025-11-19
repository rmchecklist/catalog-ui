import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ProductService } from '../../shared/services/product.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminDashboardComponent {
  private readonly products = inject(ProductService);

  protected form = {
    name: '',
    brand: '',
    category: '',
    description: '',
    imageUrl: '',
    optionLabel: '',
    optionMinQty: 1,
    options: [] as { label: string; minQty: number }[]
  };

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

    this.products.addProduct({
      name: this.form.name,
      brand: this.form.brand,
      category: this.form.category,
      description: this.form.description || 'No description yet.',
      imageUrl: this.form.imageUrl || undefined,
      options: options.map((opt) => ({
        ...opt,
        available: true
      }))
    }).subscribe(() => this.reset());
  }

  protected addOption() {
    if (!this.form.optionLabel) return;
    this.form.options = [
      ...this.form.options,
      {
        label: this.form.optionLabel,
        minQty: Math.max(1, Number(this.form.optionMinQty) || 1)
      }
    ];
    this.form.optionLabel = '';
    this.form.optionMinQty = 1;
  }

  protected removeOption(index: number) {
    this.form.options = this.form.options.filter((_, i) => i !== index);
  }

  protected handleImageUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      this.form.imageUrl = typeof reader.result === 'string' ? reader.result : '';
    };
    reader.readAsDataURL(file);
  }

  private reset() {
    this.form = {
      name: '',
      brand: '',
      category: '',
      description: '',
      imageUrl: '',
      optionLabel: '',
      optionMinQty: 1,
      options: []
    };
  }
}
