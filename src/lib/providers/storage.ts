// ═══════════════════════════════════════════════════════════════
// Provider Account Storage — Save / Load / Switch / Delete
// ═══════════════════════════════════════════════════════════════

import { ProviderAccount, ProviderConfig } from './types';

const ACCOUNTS_KEY = 'iptv-provider-accounts';
const ACTIVE_ACCOUNT_KEY = 'iptv-active-account-id';

// ── Account CRUD ────────────────────────────────────────────

export const getProviderAccounts = (): ProviderAccount[] => {
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const saveProviderAccounts = (accounts: ProviderAccount[]): void => {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
};

export const addProviderAccount = (account: ProviderAccount): void => {
  const accounts = getProviderAccounts();
  // Replace if same ID exists
  const idx = accounts.findIndex(a => a.id === account.id);
  if (idx >= 0) {
    accounts[idx] = account;
  } else {
    accounts.push(account);
  }
  saveProviderAccounts(accounts);
};

export const updateProviderAccount = (id: string, updates: Partial<ProviderAccount>): void => {
  const accounts = getProviderAccounts();
  const idx = accounts.findIndex(a => a.id === id);
  if (idx >= 0) {
    accounts[idx] = { ...accounts[idx], ...updates, id };
    saveProviderAccounts(accounts);
  }
};

export const removeProviderAccount = (id: string): void => {
  const accounts = getProviderAccounts().filter(a => a.id !== id);
  saveProviderAccounts(accounts);
  // If we removed the active account, clear it
  if (getActiveAccountId() === id) {
    clearActiveAccount();
  }
};

export const getProviderAccount = (id: string): ProviderAccount | null => {
  return getProviderAccounts().find(a => a.id === id) || null;
};

// ── Active Account ──────────────────────────────────────────

export const getActiveAccountId = (): string | null => {
  return localStorage.getItem(ACTIVE_ACCOUNT_KEY);
};

export const setActiveAccountId = (id: string): void => {
  localStorage.setItem(ACTIVE_ACCOUNT_KEY, id);
  // Update lastUsedAt
  updateProviderAccount(id, { lastUsedAt: Date.now() });
};

export const clearActiveAccount = (): void => {
  localStorage.removeItem(ACTIVE_ACCOUNT_KEY);
};

export const getActiveAccount = (): ProviderAccount | null => {
  const id = getActiveAccountId();
  if (!id) return null;
  return getProviderAccount(id);
};

// ── Helpers ─────────────────────────────────────────────────

export const generateAccountId = (): string => {
  return `provider-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export const createProviderAccount = (
  name: string,
  config: ProviderConfig,
  extras?: Partial<ProviderAccount>
): ProviderAccount => {
  return {
    id: generateAccountId(),
    name,
    config,
    createdAt: Date.now(),
    lastUsedAt: Date.now(),
    ...extras,
  };
};

export const hasAnyAccounts = (): boolean => {
  return getProviderAccounts().length > 0;
};

// ── Migration from old system ───────────────────────────────

export const migrateFromLegacyProviders = (): void => {
  const MIGRATED_KEY = 'iptv-provider-migrated-v1';
  if (localStorage.getItem(MIGRATED_KEY)) return;

  // Check for old multi-playlist sources
  try {
    const oldSources = localStorage.getItem('mi-player-multi-playlists');
    if (oldSources) {
      const sources = JSON.parse(oldSources);
      if (Array.isArray(sources) && sources.length > 0) {
        const accounts = getProviderAccounts();
        for (const src of sources) {
          if (!src.url) continue;
          // Check if already migrated
          const exists = accounts.some(a =>
            a.config.type === 'm3u' && (a.config as any).m3uUrl === src.url
          );
          if (exists) continue;

          const account = createProviderAccount(
            src.name || 'Migrated Playlist',
            { type: 'm3u', m3uUrl: src.url }
          );
          accounts.push(account);
        }
        if (accounts.length > 0) {
          saveProviderAccounts(accounts);
          // Set first as active
          if (!getActiveAccountId()) {
            setActiveAccountId(accounts[0].id);
          }
        }
      }
    }
  } catch (e) {
    console.warn('Migration from legacy playlists failed:', e);
  }

  localStorage.setItem(MIGRATED_KEY, '1');
};
