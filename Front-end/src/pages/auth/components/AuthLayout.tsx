/**
 * 认证页面布局组件
 * 用于登录/注册页面的居中卡片布局
 */

import React from 'react';
import { Sparkles } from 'lucide-react';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children, title, subtitle }) => {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo 和标题 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          {subtitle && <p className="text-gray-500 mt-2">{subtitle}</p>}
        </div>

        {/* 卡片内容 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          {children}
        </div>

        {/* 底部版权 */}
        <div className="text-center mt-6 text-sm text-gray-400">
          QGen - AI 智能出题系统
        </div>
      </div>
    </div>
  );
};
