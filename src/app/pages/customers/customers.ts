import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface Customer {
  code: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  address?: string;
}

@Component({
  selector: 'app-customers',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './customers.html',
  styleUrl: './customers.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomersComponent {
  private readonly http = inject(HttpClient);
  protected readonly customers = signal<Customer[]>([]);
  protected readonly loading = signal(false);
  protected error: string | null = null;

  protected form: Customer = {
    code: '',
    name: '',
    email: '',
    phone: '',
    company: '',
    address: '',
  };

  ngOnInit() {
    this.load();
  }

  protected load() {
    this.loading.set(true);
    this.http.get<Customer[]>(`${environment.apiBaseUrl}/admin/customers`).subscribe({
      next: (data) => this.customers.set(data),
      error: (err) => {
        console.error('Failed to load customers', err);
        this.error = 'Failed to load customers';
      },
      complete: () => this.loading.set(false),
    });
  }

  protected save() {
    if (!this.form.code || !this.form.name) {
      this.error = 'Code and name are required';
      return;
    }
    this.error = null;
    this.http.post<Customer>(`${environment.apiBaseUrl}/admin/customers`, this.form).subscribe({
      next: (saved) => {
        const updated = this.customers().filter((c) => c.code !== saved.code);
        this.customers.set([...updated, saved]);
        this.resetForm();
      },
      error: (err) => {
        console.error('Failed to save customer', err);
        this.error = 'Failed to save customer';
      },
    });
  }

  protected edit(code: string) {
    const c = this.customers().find((it) => it.code === code);
    if (!c) return;
    this.form = { ...c };
  }

  protected remove(code: string) {
    this.http.delete<void>(`${environment.apiBaseUrl}/admin/customers/${code}`).subscribe({
      next: () => this.customers.set(this.customers().filter((c) => c.code !== code)),
      error: (err) => {
        console.error('Failed to delete customer', err);
        this.error = 'Failed to delete customer';
      },
    });
  }

  protected resetForm() {
    this.form = { code: '', name: '', email: '', phone: '', company: '', address: '' };
  }
}
