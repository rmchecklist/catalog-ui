import { Injectable, signal } from '@angular/core';
import { Session, User } from '@supabase/supabase-js';
import { getSupabaseClient } from './supabase.client';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly supabase = getSupabaseClient();
  readonly session = signal<Session | null>(null);
  readonly user = signal<User | null>(null);
  readonly loading = signal(true);

  constructor() {
    this.init();
  }

  private async init() {
    const { data } = await this.supabase.auth.getSession();
    this.session.set(data.session);
    this.user.set(data.session?.user ?? null);
    this.loading.set(false);

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
}
