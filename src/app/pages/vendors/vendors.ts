import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog';

interface Vendor {
  code: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  address?: string;
}

@Component({
  selector: 'app-vendors',
  standalone: true,
  imports: [CommonModule, FormsModule, ConfirmDialogComponent],
  templateUrl: './vendors.html',
  styleUrl: './vendors.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VendorsComponent {
  private readonly http = inject(HttpClient);
  protected readonly vendors = signal<Vendor[]>([]);
  protected readonly loading = signal(false);
  protected error: string | null = null;
  protected showModal = false;
  protected confirmDelete: string | null = null;

  protected form: Vendor = {
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
    this.http.get<Vendor[]>(`${environment.apiBaseUrl}/admin/vendors`).subscribe({
      next: (data) => this.vendors.set(data),
      error: (err) => {
        console.error('Failed to load vendors', err);
        this.error = 'Failed to load vendors';
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
    this.http.post<Vendor>(`${environment.apiBaseUrl}/admin/vendors`, this.form).subscribe({
      next: (saved) => {
        const updated = this.vendors().filter((v) => v.code !== saved.code);
        this.vendors.set([...updated, saved]);
        this.resetForm();
        this.showModal = false;
      },
      error: (err) => {
        console.error('Failed to save vendor', err);
        this.error = 'Failed to save vendor';
      },
    });
  }

  protected edit(code: string) {
    const v = this.vendors().find((it) => it.code === code);
    if (!v) return;
    this.form = { ...v };
    this.showModal = true;
  }

  protected remove(code: string) {
    this.confirmDelete = code;
  }

  protected resetForm() {
    this.form = { code: '', name: '', email: '', phone: '', company: '', address: '' };
  }

  protected openModal() {
    this.resetForm();
    this.error = null;
    this.showModal = true;
  }

  protected closeModal() {
    this.showModal = false;
  }

  protected confirmDeleteOk() {
    const code = this.confirmDelete;
    if (!code) return;
    this.http.delete<void>(`${environment.apiBaseUrl}/admin/vendors/${code}`).subscribe({
      next: () => this.vendors.set(this.vendors().filter((v) => v.code !== code)),
      error: (err) => {
        console.error('Failed to delete vendor', err);
        this.error = 'Failed to delete vendor';
      },
      complete: () => (this.confirmDelete = null),
    });
  }

  protected cancelDelete() {
    this.confirmDelete = null;
  }
}
