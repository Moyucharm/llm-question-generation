/**
 * 用户头像组件
 */

import React from 'react';
import { User } from 'lucide-react';

interface AvatarProps {
  src?: string | null;
  name?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeStyles = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
};

const iconSizes = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
};

// 根据名字生成颜色
function getColorFromName(name: string): string {
  const colors = [
    'bg-blue-500',
    'bg-green-500',
    'bg-purple-500',
    'bg-orange-500',
    'bg-pink-500',
    'bg-teal-500',
    'bg-indigo-500',
    'bg-cyan-500',
  ];
  const index = name.charCodeAt(0) % colors.length;
  return colors[index];
}

// 获取名字首字母
function getInitials(name: string): string {
  return name.charAt(0).toUpperCase();
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  name,
  size = 'md',
  className = '',
}) => {
  // 有图片
  if (src) {
    return (
      <img
        src={src}
        alt={name || 'Avatar'}
        className={`${sizeStyles[size]} rounded-full object-cover ${className}`}
      />
    );
  }

  // 有名字，显示首字母
  if (name) {
    return (
      <div
        className={`
          ${sizeStyles[size]} ${getColorFromName(name)}
          rounded-full flex items-center justify-center text-white font-medium
          ${className}
        `}
      >
        {getInitials(name)}
      </div>
    );
  }

  // 默认图标
  return (
    <div
      className={`
        ${sizeStyles[size]} bg-gray-200
        rounded-full flex items-center justify-center text-gray-500
        ${className}
      `}
    >
      <User className={iconSizes[size]} />
    </div>
  );
};
