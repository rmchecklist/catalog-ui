import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CartService } from '../../shared/services/cart.service';
import { CommunicationService } from '../../shared/services/communication.service';

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
  protected readonly items = this.cart.items;
  protected submissionStatus: 'idle' | 'sent' = 'idle';

  protected form = {
    name: '',
    email: '',
    instructions: ''
  };

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
    this.comms.sendQuote({ ...this.form }, snapshot).subscribe({
      next: () => {
        this.cart.clear();
        this.submissionStatus = 'sent';
      },
      error: (err) => {
        console.error('Failed to submit quote', err);
      }
    });
  }
}
