/**
 * 登录页面
 */

import React, { useState, useEffect } from 'react';
import { Mail, Lock, Loader2 } from 'lucide-react';
import { AuthLayout, FormInput } from './components';
import { useAuthStore } from '@/stores/useAuthStore';

interface LoginPageProps {
  onSwitchToRegister: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onSwitchToRegister }) => {
  const { login, isLoading, error, clearError } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formErrors, setFormErrors] = useState<{ email?: string; password?: string }>({});

  // 清除错误
  useEffect(() => {
    return () => clearError();
  }, [clearError]);

  // 表单验证
  const validateForm = (): boolean => {
    const errors: { email?: string; password?: string } = {};

    if (!email) {
      errors.email = '请输入邮箱';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = '请输入有效的邮箱地址';
    }

    if (!password) {
      errors.password = '请输入密码';
    } else if (password.length < 6) {
      errors.password = '密码至少6位';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // 提交登录
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    if (!validateForm()) return;

    await login(email, password);
  };

  return (
    <AuthLayout title="欢迎回来" subtitle="登录以继续使用 QuAIz">
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* 错误提示 */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
            {error}
          </div>
        )}

        {/* 邮箱 */}
        <FormInput
          label="邮箱"
          type="email"
          icon={Mail}
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={formErrors.email}
          disabled={isLoading}
          autoComplete="email"
        />

        {/* 密码 */}
        <FormInput
          label="密码"
          type="password"
          icon={Lock}
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={formErrors.password}
          disabled={isLoading}
          autoComplete="current-password"
        />

        {/* 登录按钮 */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-lg
                     hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                     disabled:opacity-50 disabled:cursor-not-allowed
                     transition-colors flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              登录中...
            </>
          ) : (
            '登录'
          )}
        </button>

        {/* 切换到注册 */}
        <div className="text-center text-sm text-gray-600">
          还没有账号？{' '}
          <button
            type="button"
            onClick={onSwitchToRegister}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            立即注册
          </button>
        </div>
      </form>
    </AuthLayout>
  );
};
