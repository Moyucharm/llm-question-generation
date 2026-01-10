/**
 * 侧边栏菜单项组件
 */

import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface SidebarItemProps {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  enabled?: boolean;
  onClick?: () => void;
  badge?: string;
}

export const SidebarItem: React.FC<SidebarItemProps> = ({
  icon: Icon,
  label,
  active = false,
  enabled = true,
  onClick,
  badge,
}) => {
  const handleClick = () => {
    if (enabled && onClick) {
      onClick();
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={!enabled}
      className={`
        w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left
        ${
          active
            ? 'bg-blue-50 text-blue-600 font-medium'
            : enabled
              ? 'text-gray-600 hover:bg-gray-100'
              : 'text-gray-400 cursor-not-allowed'
        }
      `}
    >
      <Icon className='w-5 h-5 flex-shrink-0' />
      <span className='flex-1 truncate'>{label}</span>
      {badge && (
        <span className='px-2 py-0.5 text-xs rounded-full bg-gray-200 text-gray-600'>
          {badge}
        </span>
      )}
    </button>
  );
};
