import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog';
import { US_STATES } from '../../shared/constants/us-states';

type CustomerType = 'BUSINESS' | 'INDIVIDUAL';

interface Address {
  attention?: string;
  address1?: string;
  address2?: string;
  city?: string;
  state?: string;
  zip?: string;
  phone?: string;
}

interface ContactPerson {
  firstName?: string;
  lastName?: string;
  email?: string;
  workPhone?: string;
  mobilePhone?: string;
}

interface Customer {
  code: string;
  type: CustomerType;
  primaryFirstName?: string;
  primaryLastName?: string;
  displayName?: string;
  company?: string;
  email?: string;
  phoneWork?: string;
  phoneMobile?: string;
  billingAddress: Address;
  shippingAddress: Address;
  contacts?: ContactPerson[];
}

@Component({
  selector: 'app-customers',
  standalone: true,
  imports: [CommonModule, FormsModule, ConfirmDialogComponent],
  templateUrl: './customers.html',
  styleUrl: './customers.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomersComponent {
  private readonly http = inject(HttpClient);
  protected readonly customers = signal<Customer[]>([]);
  protected readonly loading = signal(false);
  protected error: string | null = null;
  protected showModal = false;
  protected confirmDelete: string | null = null;
  protected shipSameAsBilling = false;

  protected form: Customer = {
    code: '',
    type: 'BUSINESS',
    primaryFirstName: '',
    primaryLastName: '',
    displayName: '',
    company: '',
    email: '',
    phoneWork: '',
    phoneMobile: '',
    billingAddress: {},
    shippingAddress: {},
    contacts: [],
  };
  protected readonly states = US_STATES;

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
    if (!this.form.code || !this.form.displayName) {
      this.error = 'Code and display name are required';
      return;
    }
    this.error = null;
    this.http.post<Customer>(`${environment.apiBaseUrl}/admin/customers`, this.form).subscribe({
      next: (saved) => {
        const updated = this.customers().filter((c) => c.code !== saved.code);
        this.customers.set([...updated, saved]);
        this.resetForm();
        this.showModal = false;
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
    this.form = {
      ...c,
      billingAddress: { ...(c.billingAddress ?? {}) },
      shippingAddress: { ...(c.shippingAddress ?? {}) },
      contacts: [...(c.contacts ?? [])],
    };
    this.shipSameAsBilling = false;
    this.showModal = true;
  }

  protected remove(code: string) {
    this.confirmDelete = code;
  }

  protected resetForm() {
    this.form = {
      code: '',
      type: 'BUSINESS',
      primaryFirstName: '',
      primaryLastName: '',
      displayName: '',
      company: '',
      email: '',
      phoneWork: '',
      phoneMobile: '',
      billingAddress: {},
      shippingAddress: {},
      contacts: [],
    };
    this.shipSameAsBilling = false;
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
    this.http.delete<void>(`${environment.apiBaseUrl}/admin/customers/${code}`).subscribe({
      next: () => this.customers.set(this.customers().filter((c) => c.code !== code)),
      error: (err) => {
        console.error('Failed to delete customer', err);
        this.error = 'Failed to delete customer';
      },
      complete: () => (this.confirmDelete = null),
    });
  }

  protected cancelDelete() {
    this.confirmDelete = null;
  }

  protected addContact() {
    const contacts = this.form.contacts ?? [];
    this.form.contacts = [
      ...contacts,
      { firstName: '', lastName: '', email: '', workPhone: '', mobilePhone: '' },
    ];
  }

  protected removeContact(index: number) {
    if (!this.form.contacts) return;
    this.form.contacts = this.form.contacts.filter((_, i) => i !== index);
  }

  protected toggleShipSameAsBilling(checked: boolean) {
    this.shipSameAsBilling = checked;
    if (checked) {
      this.form.shippingAddress = { ...this.form.billingAddress };
    }
  }

  protected syncShippingIfLinked() {
    if (this.shipSameAsBilling) {
      this.form.shippingAddress = { ...this.form.billingAddress };
    }
  }

  protected formatPhone(field: 'phoneWork' | 'phoneMobile') {
    const raw = (this.form as any)[field] as string | undefined;
    if (!raw) return;
    const digits = raw.replace(/\D/g, '').slice(0, 10);
    if (!digits) {
      (this.form as any)[field] = '';
      return;
    }
    if (digits.length < 4) {
      (this.form as any)[field] = `(${digits}`;
      return;
    }
    if (digits.length < 7) {
      (this.form as any)[field] = `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
      return;
    }
    (this.form as any)[field] = `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
}
