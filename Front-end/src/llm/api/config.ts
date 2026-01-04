/**
 * LLM API配置文件
 * 管理后端LLM API的基础配置信息
 *
 * 注意：API密钥由后端管理，前端不再需要配置敏感信息
 */

/**
 * LLM配置接口
 * 简化版 - 不包含敏感信息
 */
export interface LLMConfig {
  baseUrl: string;
  maxTokens: number;
  temperature: number;
  stream: boolean;
}

/**
 * 默认LLM配置
 * 使用后端API，不再直连LLM厂商
 */
export const DEFAULT_LLM_CONFIG: LLMConfig = {
  baseUrl: import.meta.env.VITE_API_BASE_URL || '/api',
  maxTokens: Number(import.meta.env.VITE_LLM_MAX_TOKENS) || 4000,
  temperature: Number(import.meta.env.VITE_LLM_TEMPERATURE) || 0.7,
  stream: true,
};

/**
 * 后端LLM聊天响应接口
 */
export interface LLMResponse {
  content: string;
  model: string;
  provider: string;
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
}

/**
 * 后端流式响应数据接口
 */
export interface LLMStreamChunk {
  content: string;
  done?: boolean;
  error?: string;
}

/**
 * API错误接口定义
 */
export interface LLMError {
  detail: string;
}
