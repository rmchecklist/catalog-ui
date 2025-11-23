import { Injectable, signal } from '@angular/core';
import { Session, User } from '@supabase/supabase-js';
import { getSupabaseClient } from './supabase.client';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly supabase = getSupabaseClient();
  readonly session = signal<Session | null>(null);
  readonly user = signal<User | null>(null);
  readonly loading = signal(true);
  private readonly ready: Promise<void>;
  private resolveReady?: () => void;

  constructor() {
    this.ready = new Promise((resolve) => (this.resolveReady = resolve));
    this.init();
  }

  private async init() {
    const { data } = await this.supabase.auth.getSession();
    this.session.set(data.session);
    this.user.set(data.session?.user ?? null);
    this.loading.set(false);
    this.resolveReady?.();

    this.supabase.auth.onAuthStateChange((_event, session) => {
      this.session.set(session);
      this.user.set(session?.user ?? null);
    });
  }

  async signInWithEmail(email: string, password: string) {
    const { error } = await this.supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async signUpWithEmail(email: string, password: string) {
    const { error } = await this.supabase.auth.signUp({ email, password });
    if (error) throw error;
  }

  async signOut() {
    await this.supabase.auth.signOut();
  }

  getAccessToken(): string | null {
    return this.session()?.access_token ?? null;
  }

  private extractRoles(): string[] {
    const user = this.user();
    if (!user) return [];
    const roles: string[] = [];
    const meta = (user.app_metadata ?? {}) as Record<string, unknown>;
    const userMeta = (user.user_metadata ?? {}) as Record<string, unknown>;
    const pushRole = (val: unknown) => {
      if (typeof val === 'string' && val.trim()) {
        roles.push(val.trim().toUpperCase());
      } else if (Array.isArray(val)) {
        val.forEach((v) => pushRole(v));
      }
    };

    pushRole(meta['role']);
    pushRole(meta['roles']);
    pushRole(userMeta['role']);
    pushRole(userMeta['roles']);
    pushRole((user as unknown as Record<string, unknown>)['role']);

    // dedupe
    return Array.from(new Set(roles));
  }

  getRole(): string | null {
    const roles = this.extractRoles();
    return roles[0] ?? null;
  }

  hasAnyRole(...roles: string[]): boolean {
    const current = this.extractRoles();
    if (!current.length) return false;
    const target = roles.map((r) => r.toUpperCase());
    return current.some((r) => target.includes(r));
  }

  getCustomerCode(): string | null {
    const user = this.user();
    const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
    const appMeta = (user?.app_metadata ?? {}) as Record<string, unknown>;
    const code = (meta['customerCode'] as string) || (appMeta['customerCode'] as string);
    return code?.trim() || null;
  }

  waitForSession(): Promise<boolean> {
    if (!this.loading()) {
      return Promise.resolve(!!this.session());
    }
    return this.ready.then(() => !!this.session());
  }
}
