import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CartService } from '../../shared/services/cart.service';

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
  protected readonly items = this.cart.items;

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
}
