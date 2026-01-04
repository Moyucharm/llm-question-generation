/**
 * API 类型定义
 * 与后端 schemas 保持一致
 */

// 用户角色枚举
export type UserRole = 'student' | 'teacher' | 'admin';

// 用户信息
export interface User {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  is_active: boolean;
  avatar?: string;
  bio?: string;
  created_at: string;
  updated_at: string;
}

// 登录请求
export interface LoginRequest {
  email: string;
  password: string;
}

// 注册请求
export interface RegisterRequest {
  email: string;
  name: string;
  password: string;
  role?: UserRole;
}

// 认证响应 (登录/注册成功)
export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

// API 错误响应
export interface ApiError {
  detail: string;
  status?: number;
}

// 通用 API 响应包装
export interface ApiResponse<T> {
  data?: T;
  error?: ApiError;
  success: boolean;
}
