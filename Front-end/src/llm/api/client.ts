/**
 * LLM API 客户端模块
 * 负责与后端LLM API进行通信，支持普通和流式请求
 *
 * 改造说明：
 * - 所有LLM请求通过后端API转发，前端不再直连LLM厂商
 * - 使用JWT Token进行身份认证
 * - 适配后端SSE响应格式
 */

import type { LLMConfig, LLMResponse, LLMStreamChunk } from './config';
import { DEFAULT_LLM_CONFIG } from './config';
import { logger } from '@/stores/useLogStore';

/**
 * 消息接口定义
 */
export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * LLM请求接口
 */
export interface LLMRequest {
  messages: Message[];
  temperature?: number;
  max_tokens?: number;
  provider?: string;
}

/**
 * 简化的响应接口
 */
export interface SimpleLLMResponse {
  content: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * LLM API 客户端
 * 通过后端API与大模型进行通信
 */
export class LLMClient {
  private config: LLMConfig;

  constructor(config?: Partial<LLMConfig>) {
    this.config = { ...DEFAULT_LLM_CONFIG, ...config };
  }

  /**
   * 获取JWT Token
   */
  private getAuthToken(): string | null {
    return localStorage.getItem('access_token');
  }

  /**
   * 构建请求头
   * 使用JWT Token进行身份认证
   */
  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    const token = this.getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  /**
   * 构建请求体
   * 适配后端ChatRequest格式
   */
  private buildRequestBody(
    messages: Message[],
    options: {
      temperature?: number;
      max_tokens?: number;
      stream?: boolean;
      provider?: string;
    }
  ): string {
    return JSON.stringify({
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      temperature: options.temperature ?? this.config.temperature,
      max_tokens: options.max_tokens ?? this.config.maxTokens,
      stream: options.stream ?? false,
      provider: options.provider,
    });
  }

  /**
   * 处理错误响应
   */
  private async handleErrorResponse(response: Response): Promise<never> {
    let errorMessage: string;

    try {
      const errorData = await response.json();
      errorMessage = errorData.detail || JSON.stringify(errorData);
    } catch {
      errorMessage = await response.text();
    }

    // 处理认证错误
    if (response.status === 401) {
      throw new Error('认证失败，请重新登录');
    }

    throw new Error(`HTTP ${response.status}: ${errorMessage}`);
  }

  /**
   * 验证配置是否完整
   */
  private validateConfig(): boolean {
    // 只检查baseUrl，不再需要apiKey
    return !!this.config.baseUrl;
  }

  /**
   * 检查用户是否已登录
   */
  private isAuthenticated(): boolean {
    return !!this.getAuthToken();
  }

  /**
   * 获取当前配置信息
   */
  getConfig(): LLMConfig {
    return { ...this.config };
  }

  /**
   * 普通聊天请求
   */
  async chat(options: {
    messages: Message[];
    temperature?: number;
    max_tokens?: number;
    provider?: string;
  }): Promise<SimpleLLMResponse> {
    const requestId = `chat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    try {
      if (!this.validateConfig()) {
        const error = 'LLM API配置不完整，请检查baseUrl配置';
        logger.llm.error('配置验证失败', { requestId, error });
        throw new Error(error);
      }

      if (!this.isAuthenticated()) {
        const error = '请先登录后再使用LLM功能';
        logger.llm.error('认证检查失败', { requestId, error });
        throw new Error(error);
      }

      const response = await fetch(`${this.config.baseUrl}/llm/chat`, {
        method: 'POST',
        headers: this.buildHeaders(),
        body: this.buildRequestBody(options.messages, {
          temperature: options.temperature,
          max_tokens: options.max_tokens,
          stream: false,
          provider: options.provider,
        }),
      });

      if (!response.ok) {
        await this.handleErrorResponse(response);
      }

      const data: LLMResponse = await response.json();

      const result: SimpleLLMResponse = {
        content: data.content,
        usage: data.total_tokens
          ? {
              prompt_tokens: data.prompt_tokens || 0,
              completion_tokens: data.completion_tokens || 0,
              total_tokens: data.total_tokens,
            }
          : undefined,
      };

      logger.llm.success('普通聊天请求成功', {
        requestId,
        contentLength: result.content.length,
        provider: data.provider,
        model: data.model,
      });

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      logger.llm.error('普通聊天请求失败', { requestId, error: errorMessage });
      throw new Error(`聊天请求失败: ${errorMessage}`);
    }
  }

  /**
   * 流式聊天请求
   * 适配后端SSE响应格式: {"content": "...", "done": false/true}
   */
  async *chatStream(options: {
    messages: Message[];
    temperature?: number;
    max_tokens?: number;
    provider?: string;
  }): AsyncGenerator<string, void, unknown> {
    const requestId = `chat-stream-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    try {
      if (!this.validateConfig()) {
        const error = 'LLM API配置不完整，请检查baseUrl配置';
        logger.llm.error('配置验证失败', { requestId, error });
        throw new Error(error);
      }

      if (!this.isAuthenticated()) {
        const error = '请先登录后再使用LLM功能';
        logger.llm.error('认证检查失败', { requestId, error });
        throw new Error(error);
      }

      const response = await fetch(`${this.config.baseUrl}/llm/chat/stream`, {
        method: 'POST',
        headers: this.buildHeaders(),
        body: this.buildRequestBody(options.messages, {
          temperature: options.temperature,
          max_tokens: options.max_tokens,
          stream: true,
          provider: options.provider,
        }),
      });

      if (!response.ok) {
        await this.handleErrorResponse(response);
      }

      if (!response.body) {
        throw new Error('响应体为空');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let totalChunks = 0;

      try {
        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine || trimmedLine === 'data: [DONE]') {
              continue;
            }

            if (trimmedLine.startsWith('data: ')) {
              try {
                const jsonStr = trimmedLine.slice(6);
                const data: LLMStreamChunk = JSON.parse(jsonStr);

                // 检查是否有错误
                if (data.error) {
                  throw new Error(data.error);
                }

                // 提取内容
                if (data.content) {
                  totalChunks++;
                  yield data.content;
                }
              } catch (parseError) {
                // JSON解析错误，可能是不完整的数据
                if (
                  parseError instanceof SyntaxError &&
                  !trimmedLine.includes('[DONE]')
                ) {
                  logger.llm.error('解析流式数据失败', {
                    requestId,
                    line: trimmedLine,
                    error: parseError,
                  });
                }
              }
            }
          }
        }

        logger.llm.success('流式聊天请求完成', { requestId, totalChunks });
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      logger.llm.error('流式聊天请求失败', { requestId, error: errorMessage });
      throw new Error(`流式聊天请求失败: ${errorMessage}`);
    }
  }
}

/**
 * 默认LLM客户端实例
 */
export const defaultLLMClient = new LLMClient();

/**
 * 创建LLM客户端实例
 * @param config 配置选项
 * @returns LLM客户端实例
 */
export function createLLMClient(config?: Partial<LLMConfig>): LLMClient {
  return new LLMClient(config);
}
