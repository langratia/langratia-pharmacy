const COLORS = ['#174B37', '#0F3526', '#15803D', '#047857', '#059669', '#20543C', '#2ECC71'];

const hashString = (s: string): number => {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 5) - hash) + s.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

export const getUserAvatarUrl = (user?: { id?: number; username?: string; full_name?: string } | null): string => {
  if (!user) return LOCAL_AVATAR('U');

  const custom = localStorage.getItem(`user_avatar_${user.id || user.username}`);
  if (custom) return custom;

  const name = user.full_name || user.username || 'User';
  return LOCAL_AVATAR(name);
};

const LOCAL_AVATAR = (name: string): string => {
  const initials = name
    .split(' ')
    .map(w => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || '?';

  const bg = COLORS[hashString(name) % COLORS.length];

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
    <rect width="100" height="100" fill="${bg}" rx="50"/>
    <text x="50" y="50" text-anchor="middle" dominant-baseline="central"
          fill="white" font-family="Inter,sans-serif" font-weight="600"
          font-size="40">${initials}</text>
  </svg>`;

  return `data:image/svg+xml,${encodeURIComponent(svg.replace(/\s+/g, ' '))}`;
};

export const saveCustomAvatar = (userIdOrName: string | number, dataUrl: string) => {
  localStorage.setItem(`user_avatar_${userIdOrName}`, dataUrl);
  window.dispatchEvent(new Event('avatar-changed'));
};
