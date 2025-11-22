import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CartService } from '../../shared/services/cart.service';
import { CommunicationService } from '../../shared/services/communication.service';
import { OrderService } from '../../shared/services/order.service';
import { AuthService } from '../../shared/services/auth.service';

@Component({
  selector: 'app-quote-cart',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './quote-cart.html',
  styleUrl: './quote-cart.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class QuoteCartComponent {
  private readonly cart = inject(CartService);
  private readonly comms = inject(CommunicationService);
  private readonly orders = inject(OrderService);
  private readonly auth = inject(AuthService);
  protected readonly items = this.cart.items;
  protected submissionStatus: 'idle' | 'sent' = 'idle';
  protected submitting = false;
  protected error: string | null = null;

  protected form = {
    name: '',
    email: '',
    phone: '',
    company: '',
    instructions: ''
  };

  constructor() {
    this.prefillFromAuth();
  }

  private prefillFromAuth() {
    const user = this.auth.user();
    if (!user) return;
    const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
    this.form.email = user.email ?? '';
    this.form.name = (meta['name'] as string) ?? '';
    this.form.phone = (meta['phone'] as string) ?? '';
    this.form.company = (meta['company'] as string) ?? '';
  }

  protected onQtyChange(id: string, minQty: number, available: boolean, value: number | null) {
    if (!available) return;
    const qty = value ?? minQty;
    this.cart.updateQuantity(id, Math.max(minQty, qty));
  }

  protected removeItem(id: string) {
    this.cart.removeItem(id);
  }

  protected clearAll() {
    this.cart.clear();
    this.submissionStatus = 'idle';
  }

  protected submitQuote() {
    const snapshot = this.cart.snapshot();
    if (!snapshot.length) {
      return;
    }
    this.submissionStatus = 'idle';
    this.submitting = true;
    this.error = null;

    const items = OrderService.mapCartItems(snapshot);
    const payload = {
      email: this.form.email,
      name: this.form.name,
      phone: this.form.phone,
      company: this.form.company,
      items
    };

    const isCustomer = this.auth.hasAnyRole('CUSTOMER', 'ADMIN');
    const request$ = isCustomer ? this.orders.createOrder(payload) : this.orders.createQuote(payload);

    request$.subscribe({
      next: () => {
        this.cart.clear();
        this.submissionStatus = 'sent';
      },
      error: (err) => {
        console.error('Failed to submit', err);
        this.error = 'Failed to submit. Please try again.';
      },
      complete: () => (this.submitting = false)
    });
  }
}
