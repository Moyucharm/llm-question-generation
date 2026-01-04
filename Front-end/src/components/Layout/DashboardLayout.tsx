/**
 * 仪表板主布局组件
 */

import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { PageContainer } from './PageContainer';
import type { User } from '@/services/types';

// 页面标题映射
const pageTitles: Record<string, string> = {
  dashboard: '仪表板',
  generation: 'AI出题',
  'question-bank': '题库管理',
  exams: '考试管理',
  analytics: '学习分析',
  history: '历史记录',
  settings: '设置',
};

interface DashboardLayoutProps {
  children: React.ReactNode;
  user: User;
  currentPage: string;
  onPageChange: (page: string) => void;
  onLogout: () => void;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  user,
  currentPage,
  onPageChange,
  onLogout,
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen flex">
      {/* 侧边栏 */}
      <Sidebar
        currentPage={currentPage}
        onPageChange={onPageChange}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* 主内容区 */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 顶栏 */}
        <TopBar
          user={user}
          pageTitle={pageTitles[currentPage]}
          onMenuClick={() => setSidebarOpen(true)}
          onLogout={onLogout}
        />

        {/* 内容区 */}
        <PageContainer>
          {children}
        </PageContainer>
      </div>
    </div>
  );
};
