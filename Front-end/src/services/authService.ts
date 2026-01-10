/**
 * 认证 API 服务
 * 封装后端认证相关接口调用
 */

import type {
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  User,
  ApiResponse,
} from './types';

const API_BASE = '/api';

/**
 * 通用请求处理
 */
async function handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
  if (response.ok) {
    const data = await response.json();
    return { data, success: true };
  }

  // 处理错误响应
  try {
    const error = await response.json();
    return {
      error: {
        detail: error.detail || '请求失败',
        status: response.status,
      },
      success: false,
    };
  } catch {
    return {
      error: {
        detail: `请求失败 (${response.status})`,
        status: response.status,
      },
      success: false,
    };
  }
}

/**
 * 获取认证头
 */
function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('access_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

/**
 * 用户登录
 */
export async function login(
  data: LoginRequest
): Promise<ApiResponse<AuthResponse>> {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse<AuthResponse>(response);
}

/**
 * 用户注册
 */
export async function register(
  data: RegisterRequest
): Promise<ApiResponse<AuthResponse>> {
  const response = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse<AuthResponse>(response);
}

/**
 * 获取当前用户信息
 */
export async function getCurrentUser(): Promise<ApiResponse<User>> {
  const response = await fetch(`${API_BASE}/auth/me`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  return handleResponse<User>(response);
}

/**
 * 保存 Token 到 localStorage
 */
export function saveToken(token: string): void {
  localStorage.setItem('access_token', token);
}

/**
 * 清除 Token
 */
export function clearToken(): void {
  localStorage.removeItem('access_token');
}

/**
 * 获取保存的 Token
 */
export function getToken(): string | null {
  return localStorage.getItem('access_token');
}

/**
 * 检查是否有 Token
 */
export function hasToken(): boolean {
  return !!getToken();
}
