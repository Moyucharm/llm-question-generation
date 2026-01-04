/**
 * LLM模块入口文件
 * 统一导出所有LLM相关功能
 *
 * 改造说明：
 * - 不再检查前端API密钥配置（由后端管理）
 * - 配置检查改为检查用户登录状态和后端连接
 */

// API相关
export * from './api/config';
export * from './api/client';

// 提示词相关
export * from './prompt/quizGeneration';
export * from './prompt/quizGrading';

// 服务相关
export * from './services/baseService';
export * from './services/quizGenerationService';
export * from './services/quizGradingService';
export * from './services/serviceFactory';
export * from './services/quizService'; // 保持向后兼容

// 便捷导出
export { defaultLLMClient, createLLMClient } from './api/client';
export {
  quizGenerationService,
  quizGradingService,
  createQuizServices,
  getDefaultServices,
  updateDefaultLLMClient,
} from './services/serviceFactory';

/**
 * LLM模块配置检查
 *
 * 改造后：不再需要检查API密钥，密钥由后端管理
 * 只检查后端API地址是否配置
 */
export function checkLLMConfig(): {
  isConfigured: boolean;
  missingFields: string[];
} {
  // 后端API模式下，前端不需要配置敏感信息
  // 只需要确保baseUrl可用即可
  const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api';

  // 检查用户是否已登录
  const isLoggedIn = !!localStorage.getItem('access_token');

  return {
    isConfigured: !!baseUrl && isLoggedIn,
    missingFields: isLoggedIn ? [] : ['用户未登录'],
  };
}

/**
 * 获取LLM配置状态
 */
export function getLLMConfigStatus(): string {
  const isLoggedIn = !!localStorage.getItem('access_token');

  if (isLoggedIn) {
    return 'LLM服务就绪，通过后端API调用';
  }

  return '请先登录后使用LLM功能';
}

/**
 * 检查用户是否已登录
 */
export function isUserLoggedIn(): boolean {
  return !!localStorage.getItem('access_token');
}

/**
 * 获取后端API基础URL
 */
export function getApiBaseUrl(): string {
  return import.meta.env.VITE_API_BASE_URL || '/api';
}
