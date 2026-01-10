/**
 * 顶部导航栏组件
 */

import React from 'react';
import { Menu, Bell } from 'lucide-react';
import { UserDropdown } from './UserDropdown';
import type { User } from '@/services/types';

interface TopBarProps {
  user: User;
  pageTitle?: string;
  onMenuClick: () => void;
  onLogout: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  user,
  pageTitle,
  onMenuClick,
  onLogout,
}) => {
  return (
    <header className='h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6'>
      {/* 左侧：菜单按钮 + 标题 */}
      <div className='flex items-center gap-4'>
        {/* 移动端菜单按钮 */}
        <button
          onClick={onMenuClick}
          className='lg:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-lg'
        >
          <Menu className='w-5 h-5' />
        </button>

        {/* 页面标题 */}
        {pageTitle && (
          <h1 className='text-lg font-semibold text-gray-900'>{pageTitle}</h1>
        )}
      </div>

      {/* 右侧：通知 + 用户 */}
      <div className='flex items-center gap-2'>
        {/* 通知按钮 (占位) */}
        <button className='p-2 text-gray-500 hover:bg-gray-100 rounded-lg relative'>
          <Bell className='w-5 h-5' />
          {/* 未读标记 */}
          {/* <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" /> */}
        </button>

        {/* 用户下拉 */}
        <UserDropdown user={user} onLogout={onLogout} />
      </div>
    </header>
  );
};
