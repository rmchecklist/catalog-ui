import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class NavService {
  readonly sidenavOpen = signal(true);

  toggle() {
    this.sidenavOpen.update((open) => !open);
  }

  open() {
    this.sidenavOpen.set(true);
  }

  close() {
    this.sidenavOpen.set(false);
  }
}
