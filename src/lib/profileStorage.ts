const PROFILE_KEY = 'universe-tv-profile-name';

export const getProfileName = (): string => {
  return localStorage.getItem(PROFILE_KEY) || '';
};

export const setProfileName = (name: string): void => {
  localStorage.setItem(PROFILE_KEY, name.trim());
};

export const getProfileInitial = (): string => {
  const name = getProfileName();
  return name ? name.charAt(0).toUpperCase() : 'U';
};
