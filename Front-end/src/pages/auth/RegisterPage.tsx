/**
 * 注册页面
 */

import React, { useState, useEffect } from 'react';
import { Mail, Lock, User, Loader2 } from 'lucide-react';
import { AuthLayout, FormInput } from './components';
import { useAuthStore } from '@/stores/useAuthStore';

interface RegisterPageProps {
  onSwitchToLogin: () => void;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({ onSwitchToLogin }) => {
  const { register, isLoading, error, clearError } = useAuthStore();

  const [formData, setFormData] = useState({
    email: '',
    name: '',
    password: '',
    confirmPassword: '',
    role: 'student' as 'student' | 'teacher',
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // 清除错误
  useEffect(() => {
    return () => clearError();
  }, [clearError]);

  // 更新表单字段
  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // 清除该字段的错误
    if (formErrors[field]) {
      setFormErrors((prev) => {
        const { [field]: _, ...rest } = prev;
        return rest;
      });
    }
  };

  // 表单验证
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.email) {
      errors.email = '请输入邮箱';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = '请输入有效的邮箱地址';
    }

    if (!formData.name) {
      errors.name = '请输入姓名';
    } else if (formData.name.length < 2) {
      errors.name = '姓名至少2个字符';
    }

    if (!formData.password) {
      errors.password = '请输入密码';
    } else if (formData.password.length < 6) {
      errors.password = '密码至少6位';
    }

    if (!formData.confirmPassword) {
      errors.confirmPassword = '请确认密码';
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = '两次密码不一致';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // 提交注册
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    if (!validateForm()) return;

    await register(formData.email, formData.name, formData.password, formData.role);
  };

  return (
    <AuthLayout title="创建账号" subtitle="注册以开始使用 QuAIz">
      <form onSubmit={handleSubmit} className="space-y-4">
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
          value={formData.email}
          onChange={(e) => updateField('email', e.target.value)}
          error={formErrors.email}
          disabled={isLoading}
          autoComplete="email"
        />

        {/* 姓名 */}
        <FormInput
          label="姓名"
          type="text"
          icon={User}
          placeholder="你的名字"
          value={formData.name}
          onChange={(e) => updateField('name', e.target.value)}
          error={formErrors.name}
          disabled={isLoading}
          autoComplete="name"
        />

        {/* 角色选择 */}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-gray-700">身份</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="role"
                value="student"
                checked={formData.role === 'student'}
                onChange={() => updateField('role', 'student')}
                className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                disabled={isLoading}
              />
              <span className="text-sm text-gray-700">学生</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="role"
                value="teacher"
                checked={formData.role === 'teacher'}
                onChange={() => updateField('role', 'teacher')}
                className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                disabled={isLoading}
              />
              <span className="text-sm text-gray-700">教师</span>
            </label>
          </div>
        </div>

        {/* 密码 */}
        <FormInput
          label="密码"
          type="password"
          icon={Lock}
          placeholder="至少6位"
          value={formData.password}
          onChange={(e) => updateField('password', e.target.value)}
          error={formErrors.password}
          disabled={isLoading}
          autoComplete="new-password"
        />

        {/* 确认密码 */}
        <FormInput
          label="确认密码"
          type="password"
          icon={Lock}
          placeholder="再次输入密码"
          value={formData.confirmPassword}
          onChange={(e) => updateField('confirmPassword', e.target.value)}
          error={formErrors.confirmPassword}
          disabled={isLoading}
          autoComplete="new-password"
        />

        {/* 注册按钮 */}
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
              注册中...
            </>
          ) : (
            '注册'
          )}
        </button>

        {/* 切换到登录 */}
        <div className="text-center text-sm text-gray-600">
          已有账号？{' '}
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            立即登录
          </button>
        </div>
      </form>
    </AuthLayout>
  );
};
