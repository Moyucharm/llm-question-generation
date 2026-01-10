/**
 * 认证状态管理
 * 管理用户登录状态、Token、用户信息
 */

import { create } from 'zustand';
import type { User } from '@/services/types';
import {
  login as apiLogin,
  register as apiRegister,
  getCurrentUser,
  saveToken,
  clearToken,
  hasToken,
} from '@/services/authService';

interface AuthState {
  // 状态
  user: User | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;

  // 计算属性
  isLoggedIn: boolean;
}

interface AuthActions {
  // 认证操作
  login: (email: string, password: string) => Promise<boolean>;
  register: (
    email: string,
    name: string,
    password: string,
    role?: 'student' | 'teacher'
  ) => Promise<boolean>;
  logout: () => void;

  // 初始化
  initialize: () => Promise<void>;

  // 辅助方法
  clearError: () => void;
  setUser: (user: User | null) => void;
}

type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>((set, get) => ({
  // 初始状态
  user: null,
  isLoading: false,
  isInitialized: false,
  error: null,
  isLoggedIn: false,

  /**
   * 用户登录
   */
  login: async (email: string, password: string): Promise<boolean> => {
    set({ isLoading: true, error: null });

    try {
      const result = await apiLogin({ email, password });

      if (result.success && result.data) {
        // 保存 Token
        saveToken(result.data.access_token);
        // 更新状态
        set({
          user: result.data.user,
          isLoggedIn: true,
          isLoading: false,
          error: null,
        });
        return true;
      } else {
        const status = result.error?.status;
        const detail = result.error?.detail;
        const message =
          status === 401 || detail === 'Incorrect email or password'
            ? '邮箱或密码错误'
            : detail || '登录失败';
        set({
          isLoading: false,
          error: message,
        });
        return false;
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : '登录失败，请稍后重试';
      set({ isLoading: false, error: message });
      return false;
    }
  },

  /**
   * 用户注册
   */
  register: async (
    email: string,
    name: string,
    password: string,
    role: 'student' | 'teacher' = 'student'
  ): Promise<boolean> => {
    set({ isLoading: true, error: null });

    try {
      const result = await apiRegister({ email, name, password, role });

      if (result.success && result.data) {
        // 注册成功后自动登录
        saveToken(result.data.access_token);
        set({
          user: result.data.user,
          isLoggedIn: true,
          isLoading: false,
          error: null,
        });
        return true;
      } else {
        set({
          isLoading: false,
          error: result.error?.detail || '注册失败',
        });
        return false;
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : '注册失败，请稍后重试';
      set({ isLoading: false, error: message });
      return false;
    }
  },

  /**
   * 用户登出
   */
  logout: () => {
    clearToken();
    set({
      user: null,
      isLoggedIn: false,
      error: null,
    });
  },

  /**
   * 初始化：检查本地 Token 并验证
   */
  initialize: async () => {
    // 如果已经初始化过，跳过
    if (get().isInitialized) return;

    // 检查是否有 Token
    if (!hasToken()) {
      set({ isInitialized: true });
      return;
    }

    // 有 Token，验证有效性
    set({ isLoading: true });

    try {
      const result = await getCurrentUser();

      if (result.success && result.data) {
        set({
          user: result.data,
          isLoggedIn: true,
          isLoading: false,
          isInitialized: true,
        });
      } else {
        // Token 无效，清除
        clearToken();
        set({
          user: null,
          isLoggedIn: false,
          isLoading: false,
          isInitialized: true,
        });
      }
    } catch {
      // 验证失败，清除 Token
      clearToken();
      set({
        user: null,
        isLoggedIn: false,
        isLoading: false,
        isInitialized: true,
      });
    }
  },

  /**
   * 清除错误信息
   */
  clearError: () => {
    set({ error: null });
  },

  /**
   * 设置用户信息
   */
  setUser: (user: User | null) => {
    set({ user, isLoggedIn: !!user });
  },
}));
