import { getAppSession } from './appSession';
import avatar1 from '@/assets/avatars/avatar-1.png';
import avatar2 from '@/assets/avatars/avatar-2.png';
import avatar3 from '@/assets/avatars/avatar-3.png';
import avatar4 from '@/assets/avatars/avatar-4.png';
import avatar5 from '@/assets/avatars/avatar-5.png';
import avatar6 from '@/assets/avatars/avatar-6.png';
import avatar7 from '@/assets/avatars/avatar-7.png';
import avatar8 from '@/assets/avatars/avatar-8.png';

export const AVATARS: { id: string; src: string; label: string }[] = [
  { id: 'neon-fox', src: avatar1, label: 'Neon Fox' },
  { id: 'purge', src: avatar2, label: 'Purge' },
  { id: 'gasmask', src: avatar3, label: 'Visor' },
  { id: 'bear', src: avatar4, label: 'Bear' },
  { id: 'astronaut', src: avatar5, label: 'Astronaut' },
  { id: 'lion', src: avatar6, label: 'Lion' },
  { id: 'samurai', src: avatar7, label: 'Samurai' },
  { id: 'ninja', src: avatar8, label: 'Ninja' },
];

const LEGACY_NAME_KEY = 'universe-tv-profile-name';
const nameKey = (uid?: string) => `universe-tv-profile-name:${uid || 'guest'}`;
const avatarKey = (uid?: string) => `universe-tv-profile-avatar:${uid || 'guest'}`;

const currentUserId = (): string | undefined => getAppSession()?.user?.id;
const currentDisplay = (): string => {
  const u = getAppSession()?.user;
  return u?.display_name || u?.username || '';
};

export const getProfileName = (): string => {
  const uid = currentUserId();
  // 1) Per-user saved name (persists across logouts)
  const stored = localStorage.getItem(nameKey(uid));
  if (stored) return stored;
  // 2) Logged-in user's display name
  const sess = currentDisplay();
  if (sess) return sess;
  // 3) Legacy fallback
  return localStorage.getItem(LEGACY_NAME_KEY) || '';
};

export const setProfileName = (name: string): void => {
  const uid = currentUserId();
  localStorage.setItem(nameKey(uid), name.trim());
  localStorage.setItem(LEGACY_NAME_KEY, name.trim());
};

export const getProfileInitial = (): string => {
  const name = getProfileName();
  return name ? name.charAt(0).toUpperCase() : 'U';
};

export const getProfileAvatarId = (): string | null => {
  const uid = currentUserId();
  return localStorage.getItem(avatarKey(uid));
};

export const getProfileAvatarSrc = (): string | null => {
  const id = getProfileAvatarId();
  if (!id) return null;
  return AVATARS.find((a) => a.id === id)?.src || null;
};

export const setProfileAvatar = (id: string | null): void => {
  const uid = currentUserId();
  if (!id) localStorage.removeItem(avatarKey(uid));
  else localStorage.setItem(avatarKey(uid), id);
};
