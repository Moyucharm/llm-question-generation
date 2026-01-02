import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

/**
 * 时间记录状态接口
 */
interface TimeRecorderState {
  /** 开始时间 */
  startTime: number | null;
  /** 结束时间 */
  endTime: number | null;
  /** 总耗时 */
  duration: number | null;
  /** 当前状态 */
  status: 'idle' | 'generating' | 'completed' | 'error';
  /** 实时耗时（用于生成中状态） */
  currentDuration: number;
  /** 是否展开详细面板 */
  isExpanded: boolean;

  /** 计时模式：生成 或 答题 */
  mode: 'generation' | 'answering';
  /** 答题阶段 - 每题用时累计(ms) */
  questionDurations: Record<string, number>;
  /** 当前题目ID（答题阶段） */
  activeQuestionId: string | null;
  /** 当前题目起始时间戳 */
  activeQuestionStart: number | null;
  /** 答题总耗时（累加） */
  totalAnsweringDuration: number;
}

/**
 * 时间记录操作接口
 */
interface TimeRecorderActions {
  /** 开始计时 */
  startTiming: () => void;
  /** 结束计时 */
  endTiming: () => void;
  /** 设置错误状态 */
  setError: () => void;
  /** 重置状态 */
  reset: () => void;
  /** 更新实时耗时 */
  updateCurrentDuration: (duration: number) => void;
  /** 切换展开状态 */
  toggleExpanded: () => void;
  /** 设置展开状态 */
  setExpanded: (expanded: boolean) => void;

  /** 启动答题阶段计时 */
  startAnswering: (initialQuestionId: string | null) => void;
  /** 切换到新题目（结束上一题的计时） */
  switchQuestion: (newQuestionId: string | null) => void;
  /** 结束答题阶段（提交时调用） */
  endAnswering: () => void;
}

/**
 * 时间记录Store类型
 */
type TimeRecorderStore = TimeRecorderState & TimeRecorderActions;

/**
 * 全局时间记录状态管理
 * 独立于其他状态，避免重新渲染导致的状态丢失
 */
export const useTimeRecorderStore = create<TimeRecorderStore>()(
  subscribeWithSelector((set, get) => ({
    // 初始状态
    startTime: null,
    endTime: null,
    duration: null,
    status: 'idle',
    currentDuration: 0,
    isExpanded: false,
    mode: 'generation',
    questionDurations: {},
    activeQuestionId: null,
    activeQuestionStart: null,
    totalAnsweringDuration: 0,

    // 操作方法
    startTiming: () => {
      const now = Date.now();
      set({
        startTime: now,
        endTime: null,
        duration: null,
        status: 'generating',
        currentDuration: 0,
        mode: 'generation',
      });
    },

    endTiming: () => {
      const { startTime } = get();
      if (!startTime) return;

      const now = Date.now();
      const duration = now - startTime;

      set({
        endTime: now,
        duration,
        status: 'completed',
        currentDuration: duration,
      });
    },

    setError: () => {
      set({
        status: 'error',
      });
    },

    reset: () => {
      set({
        startTime: null,
        endTime: null,
        duration: null,
        status: 'idle',
        currentDuration: 0,
        isExpanded: false,
        mode: 'generation',
        questionDurations: {},
        activeQuestionId: null,
        activeQuestionStart: null,
        totalAnsweringDuration: 0,
      });
    },

    updateCurrentDuration: (duration: number) => {
      // 避免过于频繁的状态更新，减少性能开销
      const currentState = get();
      if (Math.abs(duration - currentState.currentDuration) > 50) {
        set({ currentDuration: duration });
      }
    },

    toggleExpanded: () => {
      set(state => ({ isExpanded: !state.isExpanded }));
    },

    setExpanded: (expanded: boolean) => {
      set({ isExpanded: expanded });
    },

    // ===== 答题阶段 API =====
    startAnswering: (initialQuestionId: string | null) => {
      const now = Date.now();
      set({
        mode: 'answering',
        status: 'generating',
        startTime: now,
        endTime: null,
        duration: null,
        currentDuration: 0,
        questionDurations: {},
        activeQuestionId: initialQuestionId,
        activeQuestionStart: initialQuestionId ? now : null,
        totalAnsweringDuration: 0,
      });
    },
    switchQuestion: (newQuestionId: string | null) => {
      const state = get();
      const now = Date.now();
      // 结算上一题
      if (state.activeQuestionId && state.activeQuestionStart) {
        const spent = now - state.activeQuestionStart;
        const prev = state.questionDurations[state.activeQuestionId] || 0;
        state.questionDurations[state.activeQuestionId] = prev + spent;
      }
      // 开始新题
      set({
        activeQuestionId: newQuestionId,
        activeQuestionStart: newQuestionId ? now : null,
        totalAnsweringDuration: Object.values(get().questionDurations).reduce(
          (sum, v) => sum + v,
          0
        ),
      });
    },
    endAnswering: () => {
      const state = get();
      const now = Date.now();
      let questionDurations = { ...state.questionDurations };
      if (state.activeQuestionId && state.activeQuestionStart) {
        const spent = now - state.activeQuestionStart;
        const prev = questionDurations[state.activeQuestionId] || 0;
        questionDurations[state.activeQuestionId] = prev + spent;
      }
      const total = Object.values(questionDurations).reduce((s, v) => s + v, 0);
      set({
        mode: 'answering',
        status: 'completed',
        endTime: now,
        duration: total,
        currentDuration: total,
        questionDurations,
        activeQuestionStart: null,
        totalAnsweringDuration: total,
      });
    },
  }))
);

/**
 * 同步主应用状态到时间记录状态
 * 避免重复同步和状态冲突，优化性能
 */
export const syncTimeRecorderWithAppState = (generationState: {
  status: string;
  startTime?: number;
  endTime?: number;
  duration?: number;
}) => {
  const { startTiming, endTiming, setError, reset } =
    useTimeRecorderStore.getState();
  const currentTimeState = useTimeRecorderStore.getState();

  // 如果时间记录已经完成，不再同步（保护已完成的记录）
  if (currentTimeState.status === 'completed' && currentTimeState.startTime) {
    return;
  }

  // 避免相同状态的重复同步
  if (currentTimeState.status === generationState.status) {
    return;
  }

  switch (generationState.status) {
    case 'generating':
      if (generationState.startTime) {
        useTimeRecorderStore.setState({
          startTime: generationState.startTime,
          endTime: null,
          duration: null,
          status: 'generating',
          currentDuration: Date.now() - generationState.startTime,
        });
      } else {
        startTiming();
      }
      break;
    case 'complete':
    case 'completed':
      if (
        generationState.startTime &&
        generationState.endTime &&
        generationState.duration
      ) {
        useTimeRecorderStore.setState({
          startTime: generationState.startTime,
          endTime: generationState.endTime,
          duration: generationState.duration,
          status: 'completed',
          currentDuration: generationState.duration,
        });
      } else {
        endTiming();
      }
      break;
    case 'error':
      setError();
      break;
    case 'idle':
    default: {
      // 只有在没有任何时间记录时才重置
      if (!currentTimeState.startTime) {
        reset();
      }
      break;
    }
  }
};
