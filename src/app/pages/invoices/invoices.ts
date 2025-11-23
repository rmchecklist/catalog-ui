import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { NavService } from '../../shared/services/nav.service';

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
  protected readonly invoices = signal<InvoiceSummary[]>([]);
  protected readonly loading = signal(false);
  protected sendEmail = '';
  protected actionError: string | null = null;

  ngOnInit() {
    this.load();
  }

  protected load() {
    this.loading.set(true);
    this.http
      .get<InvoiceSummary[]>(`${environment.apiBaseUrl}/admin/invoices`)
      .subscribe({
        next: (data) => this.invoices.set(data),
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
    if (!this.sendEmail) {
      this.actionError = 'Enter an email address to send.';
      return;
    }
    const path = inv.type === 'ORDER' ? 'orders' : 'quotes';
    this.actionError = null;
    this.http
      .post<void>(`${environment.apiBaseUrl}/admin/invoices/${path}/${inv.id}/send`, {
        email: this.sendEmail,
      })
      .subscribe({
        error: (err) => {
          console.error('Failed to send invoice', err);
          this.actionError = 'Failed to send email.';
        },
      });
  }
}
