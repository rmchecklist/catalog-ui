import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog';

interface Expense {
  id?: string;
  category: string;
  description: string;
  amount: number;
  currency: string;
  date: string;
  vendor?: string;
  receiptUrl?: string;
  notes?: string;
}

interface Category {
  code: string;
  name: string;
}

@Component({
  selector: 'app-expenses',
  standalone: true,
  imports: [CommonModule, FormsModule, ConfirmDialogComponent],
  templateUrl: './expenses.html',
  styleUrl: './expenses.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExpensesComponent {
  private readonly http = inject(HttpClient);
  protected readonly expenses = signal<Expense[]>([]);
  protected readonly categories = signal<Category[]>([]);
  protected readonly loading = signal(false);
  protected showModal = false;
  protected error: string | null = null;
  protected form: Expense = {
    category: '',
    description: '',
    amount: 0,
    currency: 'USD',
    date: new Date().toISOString().slice(0, 10),
    vendor: '',
    receiptUrl: '',
    notes: '',
  };
  protected uploading = false;
  protected confirmDelete: string | null = null;

  ngOnInit() {
    this.load();
    this.loadCategories();
  }

  protected load() {
    this.loading.set(true);
    this.http.get<Expense[]>(`${environment.apiBaseUrl}/admin/expenses`).subscribe({
      next: (data) => this.expenses.set(data),
      error: (err) => {
        console.error('Failed to load expenses', err);
        this.error = 'Failed to load expenses';
      },
      complete: () => this.loading.set(false),
    });
  }

  protected loadCategories() {
    this.http.get<Category[]>(`${environment.apiBaseUrl}/admin/expenses/categories`).subscribe({
      next: (data) => this.categories.set(data),
      error: (err) => console.error('Failed to load categories', err),
    });
  }

  protected openModal(expense?: Expense) {
    this.error = null;
    if (expense) {
      this.form = { ...expense };
    } else {
      this.resetForm();
    }
    this.showModal = true;
  }

  protected closeModal() {
    this.showModal = false;
  }

  protected save() {
    if (!this.form.category || !this.form.description || !this.form.amount || !this.form.date) {
      this.error = 'Category, description, amount, and date are required.';
      return;
    }
    const payload = { ...this.form };
    const request = this.form.id
      ? this.http.put<Expense>(`${environment.apiBaseUrl}/admin/expenses/${this.form.id}`, payload)
      : this.http.post<Expense>(`${environment.apiBaseUrl}/admin/expenses`, payload);
    request.subscribe({
      next: (saved) => {
        const filtered = this.expenses().filter((e) => e.id !== saved.id);
        this.expenses.set([...filtered, saved]);
        this.closeModal();
      },
      error: (err) => {
        console.error('Failed to save expense', err);
        this.error = 'Failed to save expense';
      },
    });
  }

  protected delete(id?: string) {
    if (!id) return;
    this.confirmDelete = id;
  }

  protected uploadReceipt(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    this.uploading = true;
    this.http.post<{ url: string; path: string }>(`${environment.apiBaseUrl}/storage/upload`, formData).subscribe({
      next: (res) => {
        this.form.receiptUrl = res.url;
        this.uploading = false;
      },
      error: (err) => {
        console.error('Upload failed', err);
        this.error = 'Upload failed';
        this.uploading = false;
      },
    });
  }

  protected resetForm() {
    this.form = {
      category: '',
      description: '',
      amount: 0,
      currency: 'USD',
      date: new Date().toISOString().slice(0, 10),
      vendor: '',
      receiptUrl: '',
      notes: '',
    };
  }

  protected confirmDeleteOk() {
    const id = this.confirmDelete;
    if (!id) return;
    this.http.delete<void>(`${environment.apiBaseUrl}/admin/expenses/${id}`).subscribe({
      next: () => this.expenses.set(this.expenses().filter((e) => e.id !== id)),
      error: (err) => {
        console.error('Failed to delete expense', err);
        this.error = 'Failed to delete expense';
      },
      complete: () => (this.confirmDelete = null),
    });
  }

  protected cancelDelete() {
    this.confirmDelete = null;
  }
}
