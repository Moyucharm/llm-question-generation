/**
 * 考试状态管理
 */

import { create } from 'zustand';
import type {
  Exam,
  ExamDetail,
  Attempt,
  CreateExamRequest,
  UpdateExamRequest,
  SubmitAnswerRequest,
} from '@/types/exam';
import * as examService from '@/services/examService';

interface ExamState {
  // 考试列表
  exams: Exam[];
  totalExams: number;
  isLoadingExams: boolean;

  // 当前考试
  currentExam: ExamDetail | null;
  isLoadingExam: boolean;

  // 答题相关
  currentAttempt: Attempt | null;
  isSubmitting: boolean;

  // 错误
  error: string | null;
}

interface ExamActions {
  // 考试列表
  fetchExams: (skip?: number, limit?: number) => Promise<void>;

  // 考试 CRUD
  fetchExam: (examId: number) => Promise<void>;
  createExam: (data: CreateExamRequest) => Promise<Exam>;
  updateExam: (examId: number, data: UpdateExamRequest) => Promise<void>;
  deleteExam: (examId: number) => Promise<void>;
  publishExam: (examId: number) => Promise<void>;
  closeExam: (examId: number) => Promise<void>;

  // 学生答题
  startExam: (examId: number) => Promise<void>;
  fetchAttempt: (examId: number) => Promise<void>;
  saveAnswer: (examId: number, data: SubmitAnswerRequest) => Promise<void>;
  submitExam: (examId: number) => Promise<void>;

  // 工具
  clearCurrentExam: () => void;
  clearError: () => void;
}

type ExamStore = ExamState & ExamActions;

export const useExamStore = create<ExamStore>(set => ({
  // 初始状态
  exams: [],
  totalExams: 0,
  isLoadingExams: false,
  currentExam: null,
  isLoadingExam: false,
  currentAttempt: null,
  isSubmitting: false,
  error: null,

  // 获取考试列表
  fetchExams: async (skip = 0, limit = 20) => {
    set({ isLoadingExams: true, error: null });
    try {
      const response = await examService.getExams(skip, limit);
      set({
        exams: response.items,
        totalExams: response.total,
        isLoadingExams: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '获取考试列表失败',
        isLoadingExams: false,
      });
    }
  },

  // 获取考试详情
  fetchExam: async (examId: number) => {
    set({ isLoadingExam: true, error: null });
    try {
      const exam = await examService.getExam(examId);
      set({ currentExam: exam, isLoadingExam: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '获取考试详情失败',
        isLoadingExam: false,
      });
    }
  },

  // 创建考试
  createExam: async (data: CreateExamRequest) => {
    set({ error: null });
    try {
      const exam = await examService.createExam(data);
      set(state => ({ exams: [exam, ...state.exams] }));
      return exam;
    } catch (error) {
      const message = error instanceof Error ? error.message : '创建考试失败';
      set({ error: message });
      throw error;
    }
  },

  // 更新考试
  updateExam: async (examId: number, data: UpdateExamRequest) => {
    set({ error: null });
    try {
      const exam = await examService.updateExam(examId, data);
      set(state => ({
        exams: state.exams.map(e => (e.id === examId ? exam : e)),
        currentExam:
          state.currentExam?.id === examId
            ? { ...state.currentExam, ...exam }
            : state.currentExam,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '更新考试失败',
      });
      throw error;
    }
  },

  // 删除考试
  deleteExam: async (examId: number) => {
    set({ error: null });
    try {
      await examService.deleteExam(examId);
      set(state => ({
        exams: state.exams.filter(e => e.id !== examId),
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '删除考试失败',
      });
      throw error;
    }
  },

  // 发布考试
  publishExam: async (examId: number) => {
    set({ error: null });
    try {
      const exam = await examService.publishExam(examId);
      set(state => ({
        exams: state.exams.map(e => (e.id === examId ? exam : e)),
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '发布考试失败',
      });
      throw error;
    }
  },

  // 关闭考试
  closeExam: async (examId: number) => {
    set({ error: null });
    try {
      const exam = await examService.closeExam(examId);
      set(state => ({
        exams: state.exams.map(e => (e.id === examId ? exam : e)),
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '关闭考试失败',
      });
      throw error;
    }
  },

  // 开始考试
  startExam: async (examId: number) => {
    set({ error: null });
    try {
      const attempt = await examService.startExam(examId);
      set({ currentAttempt: attempt });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '开始考试失败',
      });
      throw error;
    }
  },

  // 获取答题记录
  fetchAttempt: async (examId: number) => {
    set({ error: null });
    try {
      const attempt = await examService.getAttempt(examId);
      set({ currentAttempt: attempt });
    } catch {
      // 404 表示没有答题记录，不是错误
      set({ currentAttempt: null });
    }
  },

  // 保存答案
  saveAnswer: async (examId: number, data: SubmitAnswerRequest) => {
    try {
      await examService.saveAnswer(examId, data);
      // 更新本地答案状态
      set(state => {
        if (!state.currentAttempt) return state;
        const answers = [...state.currentAttempt.answers];
        const index = answers.findIndex(
          a => a.question_id === data.question_id
        );
        if (index >= 0) {
          answers[index] = { ...answers[index], student_answer: data.answer };
        } else {
          answers.push({
            question_id: data.question_id,
            student_answer: data.answer,
          });
        }
        return {
          currentAttempt: { ...state.currentAttempt, answers },
        };
      });
    } catch (error) {
      console.error('保存答案失败:', error);
    }
  },

  // 提交考试
  submitExam: async (examId: number) => {
    set({ isSubmitting: true, error: null });
    try {
      const attempt = await examService.submitExam(examId);
      set({ currentAttempt: attempt, isSubmitting: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '提交考试失败',
        isSubmitting: false,
      });
      throw error;
    }
  },

  // 清除当前考试
  clearCurrentExam: () => {
    set({ currentExam: null, currentAttempt: null });
  },

  // 清除错误
  clearError: () => {
    set({ error: null });
  },
}));
