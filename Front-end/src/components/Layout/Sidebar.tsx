/**
 * 侧边栏组件
 */

import React from 'react';
import {
  Home,
  Sparkles,
  BookOpen,
  FileText,
  ClipboardList,
  BarChart2,
  History,
  Settings,
  X,
} from 'lucide-react';
import { SidebarItem } from './SidebarItem';

// 菜单项配置
const menuItems = [
  { icon: Home, label: '仪表板', path: 'dashboard', enabled: true },
  { icon: Sparkles, label: 'AI出题', path: 'generation', enabled: true },
  { icon: BookOpen, label: '课程管理', path: 'courses', enabled: true },
  { icon: ClipboardList, label: '考试管理', path: 'exams', enabled: true },
  { icon: FileText, label: '题库管理', path: 'question-bank', enabled: true },
  { icon: BarChart2, label: '学习分析', path: 'analytics', enabled: false, badge: '即将推出' },
  { icon: History, label: '历史记录', path: 'history', enabled: false, badge: '即将推出' },
];

const bottomItems = [
  { icon: Settings, label: '设置', path: 'settings', enabled: false },
];

interface SidebarProps {
  currentPage: string;
  onPageChange: (page: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  onPageChange,
  isOpen = true,
  onClose,
}) => {
  return (
    <>
      {/* 移动端遮罩 */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* 侧边栏 */}
      <aside
        className={`
          fixed top-0 left-0 z-50 h-full w-64 bg-white border-r border-gray-200
          transform transition-transform duration-300 ease-in-out
          lg:translate-x-0 lg:static lg:z-0
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-xl text-gray-900">QGen</span>
            </div>
            {/* 移动端关闭按钮 */}
            <button
              onClick={onClose}
              className="lg:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 主菜单 */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {menuItems.map((item) => (
              <SidebarItem
                key={item.path}
                icon={item.icon}
                label={item.label}
                active={currentPage === item.path}
                enabled={item.enabled}
                badge={item.badge}
                onClick={() => {
                  if (item.enabled) {
                    onPageChange(item.path);
                    onClose?.();
                  }
                }}
              />
            ))}
          </nav>

          {/* 底部菜单 */}
          <div className="p-4 border-t border-gray-200">
            {bottomItems.map((item) => (
              <SidebarItem
                key={item.path}
                icon={item.icon}
                label={item.label}
                active={currentPage === item.path}
                enabled={item.enabled}
                onClick={() => item.enabled && onPageChange(item.path)}
              />
            ))}
          </div>
        </div>
      </aside>
    </>
  );
};
