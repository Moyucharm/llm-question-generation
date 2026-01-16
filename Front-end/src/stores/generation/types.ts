/**
 * 试卷生成相关的类型定义
 */

import type { GenerationRequest, Question, Quiz } from '@/types';

/**
 * 生成模式类型
 * - quiz: 做题模式（学生）
 * - review: 审阅模式（教师）
 */
export type GenerationMode = 'quiz' | 'review';

/**
 * 审阅题目接口（可编辑的题目）
 */
export interface ReviewQuestion extends Question {
  isEditing: boolean;      // 是否正在编辑
  isSelected: boolean;     // 是否选中（用于批量操作）
  hasChanges: boolean;     // 是否有未保存的修改
}

/**
 * 流式题目状态接口
 */
export interface StreamingQuestion {
  id: string;
  question?: string;
  type?: Question['type'];
  isPartial?: boolean;
  [key: string]: unknown;
}

/**
 * 生成状态类型
 */
export type GenerationStatus = 'idle' | 'generating' | 'complete' | 'error';

/**
 * 生成状态接口
 */
export interface GenerationState {
  status: GenerationStatus;
  currentQuiz: Quiz | null;
  error: string | null;
  progress?: number;
  streamingQuestions?: StreamingQuestion[];
  completedQuestionCount?: number;
  // 时间记录字段
  startTime?: number;
  endTime?: number;
  duration?: number;
  // 审阅模式相关字段
  mode: GenerationMode;              // 生成模式
  reviewQuestions: ReviewQuestion[]; // 可编辑的题目列表
}

/**
 * 生成Actions的类型定义
 */
export interface GenerationActions {
  startGeneration: (request: GenerationRequest) => Promise<void>;
  setGenerationError: (error: string) => void;
  resetGeneration: () => void;
  addStreamingQuestion: (question: StreamingQuestion) => void;
  updateStreamingQuestion: (index: number, question: StreamingQuestion) => void;
  // 审阅模式相关 actions
  setGenerationMode: (mode: GenerationMode) => void;
  updateReviewQuestion: (index: number, data: Partial<Question>) => void;
  deleteReviewQuestion: (index: number) => void;
  toggleQuestionSelection: (index: number) => void;
  selectAllQuestions: () => void;
  deselectAllQuestions: () => void;
  setQuestionEditing: (index: number, isEditing: boolean) => void;
}

/**
 * 状态更新函数类型
 */
export type StateUpdater<T = unknown> = (fn: (state: T) => T) => void;
