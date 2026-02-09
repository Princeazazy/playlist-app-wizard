// Simple session management for custom app auth (not Supabase Auth)

export interface AppUser {
  id: string;
  username: string;
  display_name: string | null;
  is_admin: boolean;
}

interface AppSession {
  user: AppUser;
  token: string;
}

const SESSION_KEY = 'app_session';

export const getAppSession = (): AppSession | null => {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const setAppSession = (session: AppSession) => {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
};

export const clearAppSession = () => {
  localStorage.removeItem(SESSION_KEY);
};

export const isLoggedIn = (): boolean => !!getAppSession();
export const isAdmin = (): boolean => getAppSession()?.user?.is_admin === true;
