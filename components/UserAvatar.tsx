import React from 'react';
import { UserCircle } from 'lucide-react';
import { User } from '../types';

interface UserAvatarProps {
  user: User | undefined | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({ user, size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-lg',
    lg: 'w-16 h-16 text-3xl',
    xl: 'w-24 h-24 text-4xl'
  };

  const baseClasses = `${sizeClasses[size]} rounded-full shadow-sm flex items-center justify-center shrink-0 ${className}`;

  if (!user) {
    return <UserCircle className={`${sizeClasses[size]} text-slate-300 dark:text-slate-600 ${className}`} />;
  }

  // 1. Image URL or Base64
  if (user.avatar && user.avatar.length > 20) {
    return (
      <img 
        src={user.avatar} 
        alt={user.name} 
        className={`${baseClasses} object-cover border-2 border-white dark:border-[#2D1B0E] bg-white dark:bg-[#2D1B0E]`} 
      />
    );
  } 
  
  // 2. Emoji Avatar
  else if (user.avatar) {
    return (
      <div className={`${baseClasses} bg-orange-100 dark:bg-orange-900 border-2 border-orange-200 dark:border-orange-800 select-none`}>
        {user.avatar}
      </div>
    );
  }
  
  // 3. Initials Fallback
  return (
     <div className={`${baseClasses} bg-[#2D1B0E] dark:bg-[#431407] text-orange-200 border-2 border-orange-800 dark:border-orange-900 font-black uppercase select-none`}>
        {user.name.charAt(0)}
     </div>
  );
};