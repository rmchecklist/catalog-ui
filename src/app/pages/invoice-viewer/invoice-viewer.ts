import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface InvoiceItem {
  productSlug: string;
  productName: string;
  optionLabel: string;
  sku?: string;
  quantity: number;
}

interface InvoiceResponse {
  id: string;
  invoiceNumber?: string;
  customerCode?: string;
  email?: string;
  name?: string;
  phone?: string;
  company?: string;
  status?: string;
  createdAt?: string;
  items: InvoiceItem[];
  pdfUrl?: string;
  viewUrl?: string;
}

@Component({
  selector: 'app-invoice-viewer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './invoice-viewer.html',
  styleUrl: './invoice-viewer.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InvoiceViewerComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly http = inject(HttpClient);
  protected readonly loading = signal(true);
  protected readonly data = signal<InvoiceResponse | null>(null);
  protected readonly type = signal<'ORDER' | 'QUOTE' | null>(null);

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;
    const selfView = `${window.location.origin}/invoice/${id}`;
    // try order first, then quote
    this.http.get<InvoiceResponse>(`${environment.apiBaseUrl}/orders/${id}`).subscribe({
      next: (res) => {
        this.type.set('ORDER');
        this.data.set(this.withFallbacks(res, selfView));
        this.loading.set(false);
      },
      error: () => {
        this.http.get<InvoiceResponse>(`${environment.apiBaseUrl}/quotes/${id}`).subscribe({
          next: (res) => {
            this.type.set('QUOTE');
            this.data.set(this.withFallbacks(res, selfView));
          },
          error: () => this.data.set(null),
          complete: () => this.loading.set(false),
        });
      },
    });
  }

  private withFallbacks(res: InvoiceResponse, selfView: string): InvoiceResponse {
    return {
      ...res,
      viewUrl: res.viewUrl || selfView,
      pdfUrl: res.pdfUrl || res.viewUrl || selfView,
    };
  }
}
