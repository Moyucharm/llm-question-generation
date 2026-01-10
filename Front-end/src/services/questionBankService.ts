/**
 * 题库管理 API 服务
 */

import axios, { type InternalAxiosRequestConfig } from 'axios';

// 类型定义
export interface Question {
  id: number;
  type: 'single' | 'multiple' | 'blank' | 'short';
  stem: string;
  options: Record<string, string> | null;
  answer: unknown;
  explanation: string | null;
  difficulty: number;
  score: number;
  course_id: number | null;
  course_name: string | null;
  knowledge_point_id: number | null;
  knowledge_point_name: string | null;
  created_by: number;
  creator_name: string | null;
  status: 'draft' | 'approved' | 'needs_review' | 'rejected';
  created_at: string;
  updated_at: string;
}

export interface QuestionListResponse {
  items: Question[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface QuestionCreate {
  type: 'single' | 'multiple' | 'blank' | 'short';
  stem: string;
  options?: Record<string, string>;
  answer: unknown;
  explanation?: string;
  difficulty?: number;
  score?: number;
  course_id?: number;
  knowledge_point_id?: number;
  status?: 'draft' | 'approved' | 'needs_review' | 'rejected';
}

export interface QuestionBatchCreate {
  questions: QuestionCreate[];
  course_id?: number;
  knowledge_point_id?: number;
}

export interface QuestionUpdate {
  stem?: string;
  options?: Record<string, string>;
  answer?: unknown;
  explanation?: string;
  difficulty?: number;
  score?: number;
  course_id?: number;
  knowledge_point_id?: number;
  status?: 'draft' | 'approved' | 'needs_review' | 'rejected';
}

export interface QuestionExportRequest {
  question_ids?: number[];
  course_id?: number;
  question_type?: string;
  difficulty?: number;
  status?: string;
}

export interface QuestionImportRequest {
  questions: Array<{
    type: string;
    stem: string;
    options?: Record<string, string>;
    answer: unknown;
    explanation?: string;
    difficulty?: number;
    score?: number;
  }>;
  course_id?: number;
  knowledge_point_id?: number;
  status?: 'draft' | 'approved' | 'needs_review' | 'rejected';
}

export interface QuestionListParams {
  page?: number;
  page_size?: number;
  course_id?: number;
  question_type?: string;
  difficulty?: number;
  status?: string;
  keyword?: string;
}

// 配置 axios 实例
const api = axios.create({
  baseURL: '/api',
});

// 添加认证 token 到请求
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// API 服务
export const questionBankService = {
  /**
   * 获取题目列表
   */
  async list(params: QuestionListParams = {}): Promise<QuestionListResponse> {
    const response = await api.get<QuestionListResponse>('/question-bank', {
      params,
    });
    return response.data;
  },

  /**
   * 获取题目详情
   */
  async get(id: number): Promise<Question> {
    const response = await api.get<Question>(`/question-bank/${id}`);
    return response.data;
  },

  /**
   * 创建单个题目
   */
  async create(data: QuestionCreate): Promise<Question> {
    const response = await api.post<Question>('/question-bank', data);
    return response.data;
  },

  /**
   * 批量保存题目
   */
  async batchCreate(data: QuestionBatchCreate): Promise<{
    created_count: number;
    question_ids: number[];
    message: string;
  }> {
    const response = await api.post('/question-bank/batch', data);
    return response.data;
  },

  /**
   * 更新题目
   */
  async update(id: number, data: QuestionUpdate): Promise<Question> {
    const response = await api.put<Question>(`/question-bank/${id}`, data);
    return response.data;
  },

  /**
   * 删除题目
   */
  async delete(id: number): Promise<{ message: string; id: number }> {
    const response = await api.delete(`/question-bank/${id}`);
    return response.data;
  },

  /**
   * 导出题目
   */
  async export(data: QuestionExportRequest): Promise<{
    questions: Array<Record<string, unknown>>;
    count: number;
    exported_at: string;
  }> {
    const response = await api.post('/question-bank/export', data);
    return response.data;
  },

  /**
   * 导入题目
   */
  async import(data: QuestionImportRequest): Promise<{
    imported_count: number;
    skipped_count: number;
    errors: string[];
    question_ids: number[];
  }> {
    const response = await api.post('/question-bank/import', data);
    return response.data;
  },
};

// 辅助函数
export const questionTypeLabels: Record<string, string> = {
  single: '单选题',
  multiple: '多选题',
  blank: '填空题',
  short: '简答题',
};

export const questionStatusLabels: Record<string, string> = {
  draft: '草稿',
  approved: '已审核',
  needs_review: '待审核',
  rejected: '已拒绝',
};

export const difficultyLabels: Record<number, string> = {
  1: '非常简单',
  2: '简单',
  3: '中等',
  4: '困难',
  5: '非常困难',
};

export const getQuestionTypeLabel = (type: string): string => {
  return questionTypeLabels[type] || type;
};

export const getQuestionStatusLabel = (status: string): string => {
  return questionStatusLabels[status] || status;
};

export const getDifficultyLabel = (level: number): string => {
  return difficultyLabels[level] || `难度 ${level}`;
};
