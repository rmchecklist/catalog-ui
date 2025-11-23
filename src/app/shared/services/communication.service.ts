import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { tap } from 'rxjs';

export interface CommMessage {
  id: string;
  from: string;
  to: string;
  body: string;
  direction: 'inbound' | 'outbound';
  createdAt: string;
}

export interface CommThread {
  id: string;
  subject: string;
  status: string;
  type?: string;
  updatedAt: string;
  messages: CommMessage[];
}

@Injectable({ providedIn: 'root' })
export class CommunicationService {
  private readonly http = inject(HttpClient);
  private readonly threadsSignal = signal<CommThread[]>([]);
  readonly loading = signal(false);

  readonly threads = this.threadsSignal.asReadonly();

  loadThreads() {
    this.loading.set(true);
    this.http.get<CommThread[]>(`${environment.apiBaseUrl}/communications`)
      .pipe(tap(() => this.loading.set(false)))
      .subscribe((threads) => this.threadsSignal.set(threads));
  }

  getThread(id: string) {
    return this.http.get<CommThread>(`${environment.apiBaseUrl}/communications/${id}`);
  }

  createThread(subject: string, from: string, to: string, body: string, type?: string) {
    return this.http.post<CommThread>(`${environment.apiBaseUrl}/communications`, { subject, from, to, body, type });
  }

  sendReply(threadId: string, from: string, to: string, body: string, status?: string) {
    return this.http.post<CommThread>(`${environment.apiBaseUrl}/communications/${threadId}/reply`, { from, to, body, status });
  }

  sendQuote(contact: { name: string; email: string; instructions: string }, items: Array<{ name: string; option: string; minQty: number; quantity: number; available: boolean }>) {
    const payload = {
      contact,
      items
    };
    return this.http.post<CommThread>(`${environment.apiBaseUrl}/communications/quote`, payload);
  }

  sendVendorEmail(subject: string, from: string, to: string, body: string) {
    return this.http.post<CommThread>(`${environment.apiBaseUrl}/communications/vendor`, { subject, from, to, body });
  }
}
