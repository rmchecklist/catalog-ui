import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommunicationService, CommThread } from '../../shared/services/communication.service';
import { NavService } from '../../shared/services/nav.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-communications',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './communications.html',
  styleUrl: './communications.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CommunicationsComponent implements OnInit {
  private readonly service = inject(CommunicationService);
  protected readonly nav = inject(NavService);
  private readonly http = inject(HttpClient);
  protected readonly threads = this.service.threads;
  protected readonly loading = this.service.loading;

  protected readonly selectedThreadId = signal<string | null>(null);
  protected replyBody = '';
  protected currentThread = signal<CommThread | null>(null);
  protected vendorEmail = '';
  protected vendorSubject = '';
  protected vendorBody = '';
  protected vendors = signal<Array<{ code: string; name: string; email?: string }>>([]);
  protected typeFilter: 'ALL' | 'CUSTOMER' | 'VENDOR' = 'ALL';
  protected statusFilter: string = 'ALL';
  protected showCompose = false;
  protected compose = { to: '', subject: '', body: '' };
  protected composeError: string | null = null;
  protected reminder = {
    subject: '',
    message: '',
    emails: '',
    phones: '',
    sendEmail: true,
    sendSms: false,
    sendWhatsapp: false,
    includeAllCustomers: false,
  };
  protected reminderStatus: string | null = null;
  protected customersEmails: string[] = [];

  ngOnInit(): void {
    this.service.loadThreads();
    this.loadVendors();
    this.loadCustomers();
  }

  protected filteredThreads() {
    return this.threads().filter((t) => {
      const typeOk = this.typeFilter === 'ALL' || t.type?.toUpperCase() === this.typeFilter;
      const statusOk = this.statusFilter === 'ALL' || t.status?.toUpperCase() === this.statusFilter;
      return typeOk && statusOk;
    });
  }

  protected selectThread(id: string) {
    this.selectedThreadId.set(id);
    this.service.getThread(id).subscribe((thread) => {
      this.currentThread.set(thread);
    });
  }

  protected refresh() {
    this.service.loadThreads();
    this.currentThread.set(null);
    this.selectedThreadId.set(null);
  }

  protected sendReply() {
    const id = this.selectedThreadId();
    const thread = this.currentThread();
    if (!id || !thread || !this.replyBody.trim()) return;
    // TODO wire real from/to; for now use thread's first message participants
    this.service.sendReply(id, 'sales@ilanfoods.com', this.participants(thread)[0] ?? '', this.replyBody, thread.status)
      .subscribe((updated) => {
        this.currentThread.set(updated);
        this.replyBody = '';
        this.service.loadThreads();
      });
  }

  protected sendVendor() {
    if (!this.compose.to || !this.compose.subject || !this.compose.body) {
      this.composeError = 'To, subject, and body are required';
      return;
    }
    this.composeError = null;
    this.service
      .createThread(this.compose.subject, 'sales@ilanfoods.com', this.compose.to, this.compose.body)
      .subscribe({
        next: () => {
          this.compose = { to: '', subject: '', body: '' };
          this.showCompose = false;
          this.refresh();
        },
        error: (err) => {
          console.error('Failed to send email', err);
          this.composeError = 'Failed to send email';
        },
      });
  }

  protected threadForDisplay(): CommThread | null {
    return this.currentThread();
  }

  protected participants(thread: CommThread | null): string[] {
    if (!thread || !thread.messages.length) return [];
    const first = thread.messages[0];
    const list = [first.from, first.to].filter(Boolean);
    return Array.from(new Set(list));
  }

  protected preview(thread: CommThread): string {
    if (!thread.messages.length) return '';
    const last = thread.messages[thread.messages.length - 1];
    return last.body.length > 80 ? last.body.slice(0, 77) + '…' : last.body;
  }

  private loadVendors() {
    this.http.get<Array<{ code: string; name: string; email?: string }>>(`${environment.apiBaseUrl}/admin/vendors`)
      .subscribe({
        next: (list) => this.vendors.set(list),
        error: (err) => console.error('Failed to load vendors', err)
      });
  }

  private loadCustomers() {
    this.http.get<Array<{ email?: string }>>(`${environment.apiBaseUrl}/admin/customers`).subscribe({
      next: (list) => {
        this.customersEmails = list.map((c) => c.email).filter((e): e is string => !!e);
      },
      error: (err) => console.error('Failed to load customers', err),
    });
  }

  protected openCompose() {
    this.compose = { to: '', subject: '', body: '' };
    this.composeError = null;
    this.showCompose = true;
  }

  protected closeCompose() {
    this.showCompose = false;
  }

  protected sendReminder() {
    const emails = (this.reminder.emails || '')
      .split(/[\n,]+/)
      .map((e) => e.trim())
      .filter(Boolean);
    if (this.reminder.includeAllCustomers) {
      emails.push(...this.customersEmails);
    }
    const phones = (this.reminder.phones || '')
      .split(/[\n,]+/)
      .map((p) => p.trim())
      .filter(Boolean);
    if (!this.reminder.subject || !this.reminder.message) {
      this.reminderStatus = 'Subject and message are required.';
      return;
    }
    this.reminderStatus = 'Sending…';
    this.http
      .post(`${environment.apiBaseUrl}/communications/reminders`, {
        subject: this.reminder.subject,
        message: this.reminder.message,
        emails,
        phones,
        sendEmail: this.reminder.sendEmail,
        sendSms: this.reminder.sendSms,
        sendWhatsapp: this.reminder.sendWhatsapp,
      })
      .subscribe({
        next: () => (this.reminderStatus = 'Sent'),
        error: (err) => {
          console.error('Failed to send reminder', err);
          this.reminderStatus = 'Failed to send reminder';
        },
      });
  }
}
