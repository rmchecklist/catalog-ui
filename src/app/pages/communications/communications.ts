import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommunicationService, CommThread } from '../../shared/services/communication.service';

@Component({
  selector: 'app-communications',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './communications.html',
  styleUrl: './communications.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CommunicationsComponent implements OnInit {
  private readonly service = new CommunicationService();
  protected readonly threads = this.service.threads;
  protected readonly loading = this.service.loading;

  protected readonly selectedThreadId = signal<string | null>(null);
  protected replyBody = '';
  protected currentThread = signal<CommThread | null>(null);

  ngOnInit(): void {
    this.service.loadThreads();
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
    this.service.sendReply(id, 'sales@ilanfoods.com', this.participants(thread)[0] ?? '', this.replyBody)
      .subscribe((updated) => {
        this.currentThread.set(updated);
        this.replyBody = '';
        this.service.loadThreads();
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
}
