import { API_URL } from '@/services/api';
import React from 'react';

interface UserAvatarProps {
  photoUrl?: string | null;
  name?: string;
  size?: number;
  className?: string;
  fontSize?: number;
}

export const getAvatarUrl = (photoUrl?: string | null) => {
  if (!photoUrl) return '';

  if (/^https?:\/\//i.test(photoUrl)) return photoUrl;

  const apiOrigin = new URL(API_URL).origin;

  return `${apiOrigin}${photoUrl.startsWith('/') ? photoUrl : `/${photoUrl}`}`;
};

export const UserAvatar: React.FC<UserAvatarProps> = ({
  photoUrl,
  name,
  size = 38,
  className = '',
  fontSize,
}) => {
  const initial = name?.charAt(0).toUpperCase() || '?';

  const avatarStyle: React.CSSProperties = {
    position: 'relative',
    zIndex: 1,
    width: size,
    height: size,
    fontSize: fontSize ?? size * 0.4,
    userSelect: 'none'
  };
  
  return (
    <div
      role="img"
      aria-label={`Foto de ${name || 'usuário'}`}
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full ${photoUrl
          ? 'bg-white'
          : 'bg-[#db1e2f] text-white font-semibold'
        } ${className}`}
      style={avatarStyle}
    >
      {photoUrl ? (
        <img
          src={getAvatarUrl(photoUrl)}
          alt={name || 'Foto do perfil'}
          className="h-full w-full object-cover"
        />
      ) : (
        initial
      )}
    </div>
  );
};