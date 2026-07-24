export const getUserAvatarUrl = (user?: { id?: number; username?: string; full_name?: string } | null): string => {
  if (!user) return 'https://ui-avatars.com/api/?name=User&background=047857&color=fff';
  
  const custom = localStorage.getItem(`user_avatar_${user.id || user.username}`);
  if (custom) return custom;

  const name = user.full_name || user.username || 'User';
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=047857&color=ffffff&bold=true&font-size=0.45`;
};

export const saveCustomAvatar = (userIdOrName: string | number, dataUrl: string) => {
  localStorage.setItem(`user_avatar_${userIdOrName}`, dataUrl);
  window.dispatchEvent(new Event('avatar-changed'));
};
