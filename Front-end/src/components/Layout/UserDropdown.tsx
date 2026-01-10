/**
 * 用户下拉菜单组件
 */

import React, { useState, useRef, useEffect } from 'react';
import { LogOut, User as UserIcon, ChevronDown } from 'lucide-react';
import { Avatar } from '@/components/UI';
import type { User } from '@/services/types';

interface UserDropdownProps {
  user: User;
  onLogout: () => void;
}

export const UserDropdown: React.FC<UserDropdownProps> = ({
  user,
  onLogout,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 角色显示
  const roleLabel = {
    student: '学生',
    teacher: '教师',
    admin: '管理员',
  }[user.role];

  return (
    <div className='relative' ref={dropdownRef}>
      {/* 触发按钮 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className='flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 transition-colors'
      >
        <Avatar src={user.avatar} name={user.name} size='sm' />
        <div className='hidden sm:block text-left'>
          <div className='text-sm font-medium text-gray-900'>{user.name}</div>
          <div className='text-xs text-gray-500'>{roleLabel}</div>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* 下拉菜单 */}
      {isOpen && (
        <div className='absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50'>
          {/* 用户信息 */}
          <div className='px-4 py-3 border-b border-gray-100'>
            <div className='font-medium text-gray-900'>{user.name}</div>
            <div className='text-sm text-gray-500 truncate'>{user.email}</div>
          </div>

          {/* 菜单项 */}
          <div className='py-1'>
            <button
              onClick={() => {
                setIsOpen(false);
                // TODO: 跳转到个人资料页
              }}
              className='w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50'
            >
              <UserIcon className='w-4 h-4' />
              个人资料
            </button>
            <button
              onClick={() => {
                setIsOpen(false);
                onLogout();
              }}
              className='w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50'
            >
              <LogOut className='w-4 h-4' />
              退出登录
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
