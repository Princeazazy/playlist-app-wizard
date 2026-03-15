// ═══════════════════════════════════════════════════════════════
// Provider Account Storage — Cloud-backed per-user storage
// with localStorage cache for fast startup
// ═══════════════════════════════════════════════════════════════

import { ProviderAccount, ProviderConfig } from './types';
import { supabase } from '@/integrations/supabase/client';
import { getAppSession } from '@/lib/appSession';

const LOCAL_CACHE_KEY = 'iptv-provider-accounts-cache';
const ACTIVE_ACCOUNT_KEY = 'iptv-active-account-id';

// ── Helpers ─────────────────────────────────────────────────

function getAuthHeaders(): Record<string, string> {
  const session = getAppSession();
  if (!session) return {};
  return {
    'x-session-token': session.token,
    'x-session-user-id': session.user.id,
  };
}

async function invokeAuth(action: string, params: Record<string, unknown> = {}) {
  const session = getAppSession();
  const headers = getAuthHeaders();

  const { data, error } = await supabase.functions.invoke('app-auth', {
    body: { action, ...params },
    ...(Object.keys(headers).length > 0 ? { headers } : {}),
  });

  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return data;
}

// ── Local Cache (fast reads) ────────────────────────────────

function getCachedAccounts(): ProviderAccount[] {
  try {
    const raw = localStorage.getItem(LOCAL_CACHE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function setCachedAccounts(accounts: ProviderAccount[]) {
  localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(accounts));
}

function clearCache() {
  localStorage.removeItem(LOCAL_CACHE_KEY);
  localStorage.removeItem(ACTIVE_ACCOUNT_KEY);
}

// ── Map DB row to ProviderAccount ───────────────────────────

function dbRowToAccount(row: any): ProviderAccount {
  return {
    id: row.id,
    name: row.name,
    config: row.config as ProviderConfig,
    createdAt: new Date(row.created_at).getTime(),
    lastUsedAt: new Date(row.last_used_at).getTime(),
    providerName: row.provider_name || undefined,
    providerLogo: row.provider_logo || undefined,
    accountInfo: row.account_info || undefined,
    settings: row.settings || undefined,
  };
}

// ── Public API ──────────────────────────────────────────────

/** Fetch providers from DB and update cache */
export async function fetchProviderAccounts(): Promise<ProviderAccount[]> {
  try {
    const data = await invokeAuth('list_providers');
    const accounts = (data.providers || []).map(dbRowToAccount);
    setCachedAccounts(accounts);
    return accounts;
  } catch (err) {
    console.warn('Failed to fetch providers from cloud, using cache:', err);
    return getCachedAccounts();
  }
}

/** Get cached accounts synchronously (for initial render) */
export const getProviderAccounts = (): ProviderAccount[] => getCachedAccounts();

/** Add a provider to DB and cache */
export async function addProviderAccount(account: {
  name: string;
  config: ProviderConfig;
  accountInfo?: any;
  providerName?: string;
  providerLogo?: string;
  settings?: any;
}): Promise<ProviderAccount> {
  const data = await invokeAuth('add_provider', {
    name: account.name,
    provider_type: account.config.type,
    config: account.config,
    account_info: account.accountInfo || null,
    provider_name: account.providerName || null,
    provider_logo: account.providerLogo || null,
    settings: account.settings || null,
  });

  const newAccount = dbRowToAccount(data.provider);

  // Update cache
  const cached = getCachedAccounts();
  cached.push(newAccount);
  setCachedAccounts(cached);

  return newAccount;
}

/** Remove a provider from DB and cache */
export async function removeProviderAccount(id: string): Promise<void> {
  try {
    await invokeAuth('delete_provider', { provider_id: id });
  } catch (err) {
    console.warn('Failed to delete provider from cloud:', err);
  }

  const cached = getCachedAccounts().filter(a => a.id !== id);
  setCachedAccounts(cached);

  if (getActiveAccountId() === id) {
    clearActiveAccount();
  }
}

/** Touch a provider (update last_used_at) */
export async function touchProvider(id: string): Promise<void> {
  try {
    await invokeAuth('touch_provider', { provider_id: id });
  } catch {
    // non-critical
  }
}

// ── Active Account ──────────────────────────────────────────

export const getActiveAccountId = (): string | null => {
  return localStorage.getItem(ACTIVE_ACCOUNT_KEY);
};

export const setActiveAccountId = (id: string): void => {
  localStorage.setItem(ACTIVE_ACCOUNT_KEY, id);
  touchProvider(id); // fire-and-forget
};

export const clearActiveAccount = (): void => {
  localStorage.removeItem(ACTIVE_ACCOUNT_KEY);
};

export const getActiveAccount = (): ProviderAccount | null => {
  const id = getActiveAccountId();
  if (!id) return null;
  return getCachedAccounts().find(a => a.id === id) || null;
};

// ── Helpers ─────────────────────────────────────────────────

export const hasAnyAccounts = (): boolean => {
  return getCachedAccounts().length > 0;
};

export const generateAccountId = (): string => {
  return `provider-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/** @deprecated use addProviderAccount instead */
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

export const saveProviderAccounts = (accounts: ProviderAccount[]): void => {
  setCachedAccounts(accounts);
};

export const updateProviderAccount = (id: string, updates: Partial<ProviderAccount>): void => {
  const accounts = getCachedAccounts();
  const idx = accounts.findIndex(a => a.id === id);
  if (idx >= 0) {
    accounts[idx] = { ...accounts[idx], ...updates, id };
    setCachedAccounts(accounts);
  }
};

export const getProviderAccount = (id: string): ProviderAccount | null => {
  return getCachedAccounts().find(a => a.id === id) || null;
};

/** Clear all local caches on sign out */
export const clearProviderCache = (): void => {
  clearCache();
};

// ── Migration (no-op now, providers come from DB) ───────────
export const migrateFromLegacyProviders = (): void => {
  // Legacy migration is no longer needed since providers are stored per-user in the cloud
};
