/**
 * 试卷生成状态管理模块
 */

import type {
  GenerationState,
  GenerationMode,
  ReviewQuestion,
  StreamingQuestion,
  StateUpdater,
} from './types';
import type { Quiz, Question } from '@/types';

/**
 * 应用状态接口
 */
interface AppState {
  generation: GenerationState;
  answering?: {
    currentQuestionIndex: number;
    isSubmitted: boolean;
  };
  [key: string]: unknown;
}

/**
 * 创建初始生成状态
 */
export const createInitialGenerationState = (): GenerationState => ({
  status: 'idle',
  currentQuiz: null,
  error: null,
  mode: 'review',           // 默认审阅模式
  reviewQuestions: [],      // 可编辑的题目列表
});

/**
 * 状态更新工具类
 */
export class GenerationStateManager {
  constructor(private set: StateUpdater<AppState>) {}

  /**
   * 设置生成中状态
   */
  setGenerating(): void {
    const startTime = Date.now();
    this.set((state: AppState) => ({
      ...state,
      generation: {
        ...state.generation,
        status: 'generating',
        currentQuiz: null,
        error: null,
        progress: 0,
        streamingQuestions: [],
        completedQuestionCount: 0,
        startTime,
        endTime: undefined,
        duration: undefined,
        reviewQuestions: [],  // 重置审阅题目
      },
    }));
  }

  /**
   * 设置错误状态
   */
  setError(error: string): void {
    const endTime = Date.now();
    this.set((state: AppState) => {
      const startTime = state.generation.startTime;
      const duration = startTime ? endTime - startTime : undefined;

      return {
        ...state,
        generation: {
          ...state.generation,
          status: 'error',
          error,
          endTime,
          duration,
        },
      };
    });
  }

  /**
   * 重置生成状态
   */
  reset(): void {
    this.set((state: AppState) => ({
      ...state,
      generation: createInitialGenerationState(),
    }));
  }

  /**
   * 更新进度
   */
  updateProgress(progress: number, currentQuiz?: Quiz): void {
    this.set((state: AppState) => ({
      ...state,
      generation: {
        ...state.generation,
        currentQuiz: currentQuiz || state.generation.currentQuiz,
        progress,
      },
    }));
  }

  /**
   * 添加流式问题
   */
  addStreamingQuestion(question: StreamingQuestion): void {
    this.set((state: AppState) => ({
      ...state,
      generation: {
        ...state.generation,
        streamingQuestions: [
          ...(state.generation.streamingQuestions || []),
          question,
        ],
      },
    }));
  }

  /**
   * 更新流式问题
   */
  updateStreamingQuestion(index: number, question: StreamingQuestion): void {
    this.set((state: AppState) => {
      const currentQuestions = state.generation.streamingQuestions || [];
      const newStreamingQuestions = [...currentQuestions];
      newStreamingQuestions[index] = question;

      return {
        ...state,
        generation: {
          ...state.generation,
          streamingQuestions: newStreamingQuestions,
        },
      };
    });
  }

  /**
   * 更新完成的问题数量
   */
  updateCompletedQuestionCount(count: number): void {
    this.set((state: AppState) => ({
      ...state,
      generation: {
        ...state.generation,
        completedQuestionCount: count,
      },
    }));
  }

  /**
   * 设置完成状态
   */
  setComplete(quiz: Quiz): void {
    const endTime = Date.now();
    this.set((state: AppState) => {
      const startTime = state.generation.startTime;
      const duration = startTime ? endTime - startTime : undefined;

      // 将生成的题目转换为可编辑的审阅题目
      const reviewQuestions: ReviewQuestion[] = quiz.questions.map(q => ({
        ...q,
        isEditing: false,
        isSelected: true,  // 默认全选
        hasChanges: false,
      }));

      return {
        ...state,
        generation: {
          ...state.generation,
          status: 'complete',
          currentQuiz: quiz,
          progress: 100,
          endTime,
          duration,
          reviewQuestions,
        },
        answering: {
          currentQuestionIndex: 0,
          isSubmitted: false,
        },
      };
    });
  }

  /**
   * 设置生成模式
   */
  setMode(mode: GenerationMode): void {
    this.set((state: AppState) => ({
      ...state,
      generation: {
        ...state.generation,
        mode,
      },
    }));
  }

  /**
   * 更新审阅题目
   */
  updateReviewQuestion(index: number, data: Partial<Question>): void {
    this.set((state: AppState) => {
      const reviewQuestions = [...state.generation.reviewQuestions];
      if (reviewQuestions[index]) {
        reviewQuestions[index] = {
          ...reviewQuestions[index],
          ...data,
          hasChanges: true,
        };
      }
      return {
        ...state,
        generation: {
          ...state.generation,
          reviewQuestions,
        },
      };
    });
  }

  /**
   * 删除审阅题目
   */
  deleteReviewQuestion(index: number): void {
    this.set((state: AppState) => ({
      ...state,
      generation: {
        ...state.generation,
        reviewQuestions: state.generation.reviewQuestions.filter(
          (_, i) => i !== index
        ),
      },
    }));
  }

  /**
   * 切换题目选中状态
   */
  toggleQuestionSelection(index: number): void {
    this.set((state: AppState) => {
      const reviewQuestions = [...state.generation.reviewQuestions];
      if (reviewQuestions[index]) {
        reviewQuestions[index] = {
          ...reviewQuestions[index],
          isSelected: !reviewQuestions[index].isSelected,
        };
      }
      return {
        ...state,
        generation: {
          ...state.generation,
          reviewQuestions,
        },
      };
    });
  }

  /**
   * 全选题目
   */
  selectAllQuestions(): void {
    this.set((state: AppState) => ({
      ...state,
      generation: {
        ...state.generation,
        reviewQuestions: state.generation.reviewQuestions.map(q => ({
          ...q,
          isSelected: true,
        })),
      },
    }));
  }

  /**
   * 取消全选
   */
  deselectAllQuestions(): void {
    this.set((state: AppState) => ({
      ...state,
      generation: {
        ...state.generation,
        reviewQuestions: state.generation.reviewQuestions.map(q => ({
          ...q,
          isSelected: false,
        })),
      },
    }));
  }

  /**
   * 设置题目编辑状态
   */
  setQuestionEditing(index: number, isEditing: boolean): void {
    this.set((state: AppState) => {
      const reviewQuestions = [...state.generation.reviewQuestions];
      if (reviewQuestions[index]) {
        reviewQuestions[index] = {
          ...reviewQuestions[index],
          isEditing,
        };
      }
      return {
        ...state,
        generation: {
          ...state.generation,
          reviewQuestions,
        },
      };
    });
  }
}
