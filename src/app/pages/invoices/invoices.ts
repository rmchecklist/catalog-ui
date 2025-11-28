import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { NavService } from '../../shared/services/nav.service';
import { SearchService, ProductSuggestion } from '../../shared/services/search.service';
import { ProductService } from '../../shared/services/product.service';
import { ProductOption } from '../../shared/models/product';

interface InvoiceSummary {
  id: string;
  invoiceNumber: string;
  customerCode: string;
  email: string;
  type: 'ORDER' | 'QUOTE';
  status: string;
  createdAt: string;
  pdfUrl?: string;
  viewUrl: string;
}

interface InvoiceItem {
  productSlug?: string;
  productName?: string;
  optionLabel?: string;
  sku?: string;
  quantity?: number;
  sellingPrice?: number;
  marketPrice?: number;
}

interface InvoiceDetail extends InvoiceSummary {
  items: InvoiceItem[];
}

interface StatusHistory {
  status: string;
  changedAt: string;
}

@Component({
  selector: 'app-invoices',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './invoices.html',
  styleUrl: './invoices.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InvoicesPageComponent {
  private readonly http = inject(HttpClient);
  protected readonly nav = inject(NavService);
  private readonly search = inject(SearchService);
  private readonly products = inject(ProductService);
  protected readonly invoices = signal<InvoiceSummary[]>([]);
  protected readonly loading = signal(false);
  protected readonly sendEmails = signal<Record<string, string>>({});
  protected actionError: string | null = null;
  protected editing: InvoiceDetail | null = null;
  protected readonly editingOpen = signal(false);
  protected editable = false;
  protected readonly statuses = ['DRAFT', 'PENDING', 'APPROVED', 'CONFIRMED', 'FULFILLED', 'SHIPPED', 'CLOSED', 'CANCELLED'];
  protected history: StatusHistory[] = [];
  protected productSuggestions: Record<number, ProductSuggestion[]> = {};
  protected productOptions: Record<number, ProductOption[]> = {};
  protected productSearch: Record<number, string> = {};
  protected formError: string | null = null;

  ngOnInit() {
    this.load();
  }

  protected load() {
    this.loading.set(true);
    this.http
      .get<InvoiceSummary[]>(`${environment.apiBaseUrl}/admin/invoices`)
      .subscribe({
        next: (data) => {
          this.invoices.set(data);
          const map: Record<string, string> = {};
          data.forEach((inv) => {
            if (inv.email) {
              map[inv.id] = inv.email;
            }
          });
          this.sendEmails.set(map);
        },
      error: (err) => console.error('Failed to load invoices', err),
      complete: () => this.loading.set(false),
    });
  }

  protected deleteInvoice(inv: InvoiceSummary) {
    const path = inv.type === 'ORDER' ? 'orders' : 'quotes';
    this.http.delete<void>(`${environment.apiBaseUrl}/admin/invoices/${path}/${inv.id}`).subscribe({
      next: () => this.invoices.set(this.invoices().filter((i) => i.id !== inv.id)),
      error: (err) => {
        console.error('Failed to delete invoice', err);
        this.actionError = 'Failed to delete. Try again.';
      },
      });
  }

  protected resend(inv: InvoiceSummary) {
    const email = this.getEmail(inv);
    if (!email) {
      this.actionError = 'Enter an email address to send.';
      return;
    }
    const path = inv.type === 'ORDER' ? 'orders' : 'quotes';
    this.actionError = null;
    this.http
      .post<void>(`${environment.apiBaseUrl}/admin/invoices/${path}/${inv.id}/send`, {
        email,
      })
      .subscribe({
        error: (err) => {
          console.error('Failed to send invoice', err);
          this.actionError = 'Failed to send email.';
        },
      });
  }

  protected getEmail(inv: InvoiceSummary): string {
    return this.sendEmails()[inv.id] ?? inv.email ?? '';
  }

  protected updateEmail(id: string, value: string) {
    const next = { ...this.sendEmails() };
    next[id] = value;
    this.sendEmails.set(next);
  }

  protected openEdit(inv: InvoiceSummary) {
    const path = inv.type === 'ORDER' ? 'orders' : 'quotes';
    this.http.get<InvoiceDetail>(`${environment.apiBaseUrl}/${path}/${inv.id}`).subscribe({
      next: (detail) => {
        this.editing = {
          ...inv,
          email: inv.email,
          items: detail.items ?? [],
        };
        this.editable = !this.isFinal(inv.status);
        this.loadHistory(inv);
        this.editingOpen.set(true);
      },
      error: (err) => {
        console.error('Failed to load invoice', err);
        this.actionError = 'Failed to load invoice for edit.';
      },
    });
  }

  protected addItem() {
    if (!this.editing) return;
    this.editing = {
      ...this.editing,
      items: [...(this.editing.items ?? []), { quantity: 1 }],
    };
  }

  protected removeItem(idx: number) {
    if (!this.editing) return;
    this.editing = {
      ...this.editing,
      items: this.editing.items.filter((_, i) => i !== idx),
    };
  }

  protected saveEdit() {
    if (!this.editing) return;
    if (this.isFinal(this.editing.status)) {
      this.formError = 'Finalized invoices cannot be edited.';
      return;
    }
    const validation = this.validateItems();
    if (validation) {
      this.formError = validation;
      return;
    }
    this.formError = null;
    const path = this.editing.type === 'ORDER' ? 'orders' : 'quotes';
    this.actionError = null;
    this.http
      .put<void>(`${environment.apiBaseUrl}/admin/invoices/${path}/${this.editing.id}`, {
        status: this.editing.status,
        items: this.editing.items,
      })
      .subscribe({
        next: () => {
          this.load();
          this.editing = null;
        },
        error: (err) => {
          console.error('Failed to save invoice', err);
          this.actionError = 'Failed to save invoice.';
        },
      });
  }

  protected closeEdit() {
    this.editing = null;
    this.history = [];
    this.editingOpen.set(false);
  }

  protected isFinal(status: string) {
    return status === 'SHIPPED' || status === 'CLOSED' || status === 'CANCELLED';
  }

  private loadHistory(inv: InvoiceSummary) {
    const path = inv.type === 'ORDER' ? 'orders' : 'quotes';
    this.http
      .get<StatusHistory[]>(`${environment.apiBaseUrl}/admin/invoices/${path}/${inv.id}/history`)
      .subscribe({
        next: (data) => (this.history = data),
        error: () => (this.history = []),
      });
  }

  protected searchProduct(idx: number, term: string) {
    this.productSearch[idx] = term;
    if (!term || term.length < 2) {
      this.productSuggestions[idx] = [];
      return;
    }
    this.search.suggest(term, 6).subscribe((results) => (this.productSuggestions[idx] = results));
  }

  protected selectProduct(idx: number, suggestion: ProductSuggestion) {
    if (!this.editing) return;
    const items = [...this.editing.items];
    const item = { ...(items[idx] ?? {}) };
    item.productName = suggestion.name;
    item.productSlug = suggestion.slug;
    items[idx] = item;
    this.editing = { ...this.editing, items };
    this.productSuggestions[idx] = [];
    this.products.fetchProduct(suggestion.slug).subscribe((product) => {
      if (product?.options) {
        this.productOptions[idx] = product.options;
      }
    });
  }

  protected applyOption(idx: number, label: string) {
    if (!this.editing) return;
    const option = (this.productOptions[idx] || []).find((o) => o.label === label);
    const items = [...this.editing.items];
    const item = { ...(items[idx] ?? {}) };
    item.optionLabel = label;
    if (option) {
        item.sku = option.sku;
        item.sellingPrice = option.sellingPrice;
        item.marketPrice = option.marketPrice;
    }
    items[idx] = item;
    this.editing = { ...this.editing, items };
  }

  protected totalAmount(): number {
    if (!this.editing?.items?.length) return 0;
    return this.editing.items.reduce((sum, item) => {
      const qty = item.quantity ?? 0;
      const price = item.sellingPrice ?? 0;
      return sum + qty * price;
    }, 0);
  }

  private validateItems(): string | null {
    if (!this.editing?.items?.length) {
      return 'Add at least one line item.';
    }
    for (const item of this.editing.items) {
      if (!item.productName || !item.optionLabel) return 'Select a product and option for each line.';
      if (!item.quantity || item.quantity <= 0) return 'Quantity must be greater than zero.';
      if (item.sellingPrice !== undefined && item.sellingPrice < 0) return 'Price must be zero or greater.';
    }
    return null;
  }
}
