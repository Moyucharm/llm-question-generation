/**
 * 学生答题页面
 * 显示考试题目，支持答题和提交
 */

import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import {
  ArrowLeft,
  Clock,
  ChevronLeft,
  ChevronRight,
  Check,
  AlertCircle,
  Send,
  X,
  AlertTriangle,
} from 'lucide-react';
import { useExamStore } from '@/stores/useExamStore';

interface TakeExamPageProps {
  examId: number;
  onNavigate?: (page: string, examId?: number) => void;
}

interface QuestionAnswer {
  [questionId: number]: string | string[];
}

export const TakeExamPage: React.FC<TakeExamPageProps> = ({
  examId,
  onNavigate,
}) => {
  const {
    currentExam,
    currentAttempt,
    isLoadingExam,
    error,
    fetchExam,
    startExam,
    saveAnswer,
    submitExam,
    clearError,
  } = useExamStore();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<QuestionAnswer>({});
  const [remainingTime, setRemainingTime] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [timeInitialized, setTimeInitialized] = useState(false);

  // 用于追踪输入框焦点状态
  const isInputFocused = useRef(false);

  // 初始化考试
  useEffect(() => {
    const initExam = async () => {
      setIsInitializing(true);
      await fetchExam(examId);
      try {
        await startExam(examId);
      } catch (e) {
        if (
          e instanceof Error &&
          (e.message.includes('已提交') || e.message.includes('无法重复参加'))
        ) {
          setIsCompleted(true);
        }
      }
      setIsInitializing(false);
    };
    initExam();
  }, [examId, fetchExam, startExam]);

  // 同步剩余时间（只在初始化时设置一次，避免每次保存答案后重置）
  useEffect(() => {
    if (currentAttempt?.remaining_seconds && !timeInitialized) {
      setRemainingTime(currentAttempt.remaining_seconds);
      setTimeInitialized(true);
    }
  }, [currentAttempt?.remaining_seconds, timeInitialized]);

  // 倒计时（使用 useRef 避免重复创建定时器）
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (remainingTime === null || remainingTime <= 0) return;

    // 清除之前的定时器
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    timerRef.current = setInterval(() => {
      setRemainingTime(prev => {
        if (prev === null || prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeInitialized]);

  // 格式化时间
  const formatTime = useCallback((seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
  }, []);

  // 当前题目
  const questions = currentExam?.questions || [];
  const currentQuestion = questions[currentIndex];

  // 获取填空题的空数量
  const getBlankCount = useCallback(
    (question: (typeof questions)[0] | undefined) => {
      if (!question || question.type !== 'blank') return 1;
      const answer = question.answer as { blanks?: string[] } | undefined;
      if (answer?.blanks && Array.isArray(answer.blanks)) {
        return answer.blanks.length;
      }
      const matches = question.stem.match(/_{2,}/g);
      return matches ? matches.length : 1;
    },
    []
  );

  // 已答题数
  const answeredCount = useMemo(() => {
    return Object.keys(answers).filter(id => {
      const ans = answers[parseInt(id)];
      if (Array.isArray(ans)) {
        return ans.some(a => a && a.trim() !== '');
      }
      return ans && typeof ans === 'string' && ans.trim() !== '';
    }).length;
  }, [answers]);

  // 处理答案变化（防抖保存）
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleAnswerChange = useCallback(
    (questionId: number, answer: string | string[]) => {
      setAnswers(prev => ({ ...prev, [questionId]: answer }));

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(async () => {
        try {
          await saveAnswer(examId, { question_id: questionId, answer });
        } catch (e) {
          console.error('保存答案失败:', e);
        }
      }, 500);
    },
    [examId, saveAnswer]
  );

  // 点击提交按钮
  const handleSubmit = useCallback(() => {
    if (isSubmitting) return;
    setShowConfirmModal(true);
  }, [isSubmitting]);

  // 实际执行提交
  const doSubmit = useCallback(async () => {
    setShowConfirmModal(false);
    setIsSubmitting(true);
    try {
      await submitExam(examId);
      setSubmitMessage('考试已提交！正在跳转到成绩页面...');
      setTimeout(() => {
        onNavigate?.('exam-result', examId);
      }, 1500);
    } catch {
      setSubmitMessage('提交失败，请重试');
      setIsSubmitting(false);
    }
  }, [examId, onNavigate, submitExam]);

  // 自动提交（时间到）
  useEffect(() => {
    if (remainingTime === 0 && !isSubmitting) {
      void doSubmit();
    }
  }, [doSubmit, remainingTime, isSubmitting]);

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isInputFocused.current) return;
      if (showConfirmModal || submitMessage) return;

      switch (e.key) {
        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault();
          setCurrentIndex(i => Math.max(0, i - 1));
          break;
        case 'ArrowRight':
        case 'ArrowDown':
          e.preventDefault();
          setCurrentIndex(i => Math.min(questions.length - 1, i + 1));
          break;
        case 'Enter':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            handleSubmit();
          }
          break;
        default:
          if (e.key >= '1' && e.key <= '9') {
            const num = parseInt(e.key);
            if (num <= questions.length) {
              e.preventDefault();
              setCurrentIndex(num - 1);
            }
          }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [questions.length, showConfirmModal, submitMessage, handleSubmit]);

  if (isLoadingExam || isInitializing) {
    return (
      <div className='max-w-4xl mx-auto'>
        <div className='bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center'>
          <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto'></div>
          <p className='text-gray-500 mt-4'>正在加载考试...</p>
        </div>
      </div>
    );
  }

  if (isCompleted) {
    return (
      <div className='max-w-4xl mx-auto'>
        <div className='bg-green-50 border border-green-200 rounded-lg p-12 text-center'>
          <Check className='w-12 h-12 text-green-600 mx-auto mb-4' />
          <h2 className='text-xl font-semibold text-gray-900 mb-2'>
            已完成该考试
          </h2>
          <p className='text-gray-500 mb-6'>
            您已经提交过这场考试，不能重复参加。
          </p>
          <div className='flex gap-3 justify-center'>
            <button
              onClick={() => onNavigate?.('exam-result', examId)}
              className='px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700'
            >
              查看成绩
            </button>
            <button
              onClick={() => onNavigate?.('exams')}
              className='px-6 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200'
            >
              返回考试列表
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (error && !isCompleted) {
    return (
      <div className='max-w-4xl mx-auto'>
        <div className='bg-red-50 border border-red-200 text-red-600 px-6 py-4 rounded-lg flex items-center gap-3'>
          <AlertCircle className='w-5 h-5' />
          <span>{error}</span>
          <button
            onClick={clearError}
            className='ml-auto text-red-400 hover:text-red-600'
          >
            ✕
          </button>
        </div>
        <button
          onClick={() => onNavigate?.('exams')}
          className='mt-4 px-4 py-2 bg-gray-100 text-gray-600 rounded-lg'
        >
          返回考试列表
        </button>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className='max-w-4xl mx-auto'>
        <div className='bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center'>
          <p className='text-gray-500'>考试没有题目</p>
          <button
            onClick={() => onNavigate?.('exams')}
            className='mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg'
          >
            返回列表
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className='max-w-4xl mx-auto'>
      <div className='bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-4'>
            <button
              onClick={() => onNavigate?.('exams')}
              className='p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg'
            >
              <ArrowLeft className='w-5 h-5' />
            </button>
            <div>
              <h1 className='text-lg font-semibold text-gray-900'>
                {currentExam?.title}
              </h1>
              <p className='text-sm text-gray-500'>
                {answeredCount}/{questions.length} 题已作答
                <span className='ml-2 text-xs text-gray-400'>
                  (← → 切换题目)
                </span>
              </p>
            </div>
          </div>
          {remainingTime !== null && (
            <div
              className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                remainingTime < 300
                  ? 'bg-red-100 text-red-600'
                  : 'bg-blue-100 text-blue-600'
              }`}
            >
              <Clock className='w-5 h-5' />
              <span className='font-mono text-lg font-semibold'>
                {formatTime(remainingTime)}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className='bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-4'>
        <div className='flex items-center gap-3 mb-4'>
          <span className='flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-full text-sm font-medium'>
            {currentIndex + 1}
          </span>
          <span className='px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded'>
            {currentQuestion.type === 'single'
              ? '单选题'
              : currentQuestion.type === 'multiple'
                ? '多选题'
                : currentQuestion.type === 'blank'
                  ? '填空题'
                  : '简答题'}
          </span>
          <span className='text-sm text-gray-400'>
            {currentQuestion.score} 分
          </span>
        </div>
        <div className='text-gray-900 mb-6 whitespace-pre-wrap'>
          {currentQuestion.stem}
        </div>
        <QuestionInput
          question={currentQuestion}
          value={answers[currentQuestion.id]}
          onChange={val => handleAnswerChange(currentQuestion.id, val)}
          blankCount={getBlankCount(currentQuestion)}
          onFocusChange={focused => {
            isInputFocused.current = focused;
          }}
        />
      </div>

      <div className='bg-white rounded-lg shadow-sm border border-gray-200 p-4'>
        <div className='flex items-center justify-between'>
          <button
            onClick={() => setCurrentIndex(i => Math.max(0, i - 1))}
            disabled={currentIndex === 0}
            className='flex items-center gap-1 px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed'
          >
            <ChevronLeft className='w-4 h-4' />
            上一题
          </button>

          <div className='flex gap-1 flex-wrap justify-center max-w-lg'>
            {questions.map((q, i) => (
              <button
                key={q.id}
                onClick={() => setCurrentIndex(i)}
                className={`w-8 h-8 text-sm rounded ${
                  i === currentIndex
                    ? 'bg-blue-600 text-white'
                    : answers[q.id]
                      ? 'bg-green-100 text-green-600'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>

          {currentIndex < questions.length - 1 ? (
            <button
              onClick={() =>
                setCurrentIndex(i => Math.min(questions.length - 1, i + 1))
              }
              className='flex items-center gap-1 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700'
            >
              下一题
              <ChevronRight className='w-4 h-4' />
            </button>
          ) : (
            <div className='w-20'></div>
          )}
        </div>

        <div className='mt-4 flex justify-center'>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className='flex items-center gap-2 px-6 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50'
          >
            <Send className='w-4 h-4' />
            {isSubmitting ? '提交中...' : '提交考试'}
          </button>
        </div>
      </div>

      {showConfirmModal && (
        <div className='fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50'>
          <div className='bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4'>
            <div className='flex items-center gap-3 mb-4'>
              <AlertTriangle className='w-6 h-6 text-yellow-500' />
              <h3 className='text-lg font-semibold text-gray-900'>确认提交</h3>
            </div>
            <p className='text-gray-600 mb-2'>
              {questions.length - answeredCount > 0
                ? `还有 ${questions.length - answeredCount} 道题未作答。`
                : '您已完成所有题目。'}
            </p>
            <p className='text-gray-600 mb-6'>
              确定要提交考试吗？提交后无法修改答案。
            </p>
            <div className='flex gap-3 justify-end'>
              <button
                onClick={() => setShowConfirmModal(false)}
                className='px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200'
              >
                取消
              </button>
              <button
                onClick={doSubmit}
                className='px-4 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700'
              >
                确认提交
              </button>
            </div>
          </div>
        </div>
      )}

      {submitMessage && (
        <div className='fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50'>
          <div className='bg-white rounded-lg shadow-xl p-8 max-w-sm w-full mx-4 text-center'>
            {submitMessage.includes('成功') ||
            submitMessage.includes('已提交') ? (
              <Check className='w-12 h-12 text-green-600 mx-auto mb-4' />
            ) : (
              <X className='w-12 h-12 text-red-600 mx-auto mb-4' />
            )}
            <p className='text-lg font-medium text-gray-900'>{submitMessage}</p>
            {submitMessage.includes('失败') && (
              <button
                onClick={() => setSubmitMessage(null)}
                className='mt-4 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200'
              >
                关闭
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// 题目输入组件
interface QuestionInputProps {
  question: {
    id: number;
    type: string;
    stem: string;
    options?: Record<string, string>;
    answer?: unknown;
  };
  value?: string | string[];
  onChange: (value: string | string[]) => void;
  blankCount?: number;
  onFocusChange?: (focused: boolean) => void;
}

const QuestionInput: React.FC<QuestionInputProps> = ({
  question,
  value,
  onChange,
  blankCount = 1,
  onFocusChange,
}) => {
  // 单选题
  if (question.type === 'single' && question.options) {
    return (
      <div className='space-y-2'>
        {Object.entries(question.options).map(([key, text]) => (
          <label
            key={key}
            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
              value === key
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:bg-gray-50'
            }`}
          >
            <input
              type='radio'
              name={`q-${question.id}`}
              checked={value === key}
              onChange={() => onChange(key)}
              className='w-4 h-4 text-blue-600'
            />
            <span className='font-medium text-gray-700'>{key}.</span>
            <span className='text-gray-600'>{text}</span>
            {value === key && (
              <Check className='w-4 h-4 text-blue-600 ml-auto' />
            )}
          </label>
        ))}
      </div>
    );
  }

  // 多选题
  if (question.type === 'multiple' && question.options) {
    const selectedArr = Array.isArray(value) ? value : [];
    return (
      <div className='space-y-2'>
        {Object.entries(question.options).map(([key, text]) => (
          <label
            key={key}
            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
              selectedArr.includes(key)
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:bg-gray-50'
            }`}
          >
            <input
              type='checkbox'
              checked={selectedArr.includes(key)}
              onChange={() => {
                const newVal = selectedArr.includes(key)
                  ? selectedArr.filter(v => v !== key)
                  : [...selectedArr, key];
                onChange(newVal);
              }}
              className='w-4 h-4 text-blue-600 rounded'
            />
            <span className='font-medium text-gray-700'>{key}.</span>
            <span className='text-gray-600'>{text}</span>
            {selectedArr.includes(key) && (
              <Check className='w-4 h-4 text-blue-600 ml-auto' />
            )}
          </label>
        ))}
      </div>
    );
  }

  // 填空题（支持多个空）
  if (question.type === 'blank') {
    const blanksValue = Array.isArray(value)
      ? value
      : typeof value === 'string' && value
        ? [value]
        : Array(blankCount).fill('');

    while (blanksValue.length < blankCount) {
      blanksValue.push('');
    }

    const handleBlankChange = (index: number, newValue: string) => {
      const newBlanks = [...blanksValue];
      newBlanks[index] = newValue;
      onChange(newBlanks);
    };

    if (blankCount === 1) {
      return (
        <input
          type='text'
          value={blanksValue[0] || ''}
          onChange={e => onChange([e.target.value])}
          onFocus={() => onFocusChange?.(true)}
          onBlur={() => onFocusChange?.(false)}
          placeholder='请输入答案...'
          className='w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
        />
      );
    }

    return (
      <div className='space-y-3'>
        {Array.from({ length: blankCount }).map((_, index) => (
          <div key={index} className='flex items-center gap-3'>
            <span className='flex-shrink-0 w-8 h-8 bg-gray-100 text-gray-600 rounded-full flex items-center justify-center text-sm font-medium'>
              {index + 1}
            </span>
            <input
              type='text'
              value={blanksValue[index] || ''}
              onChange={e => handleBlankChange(index, e.target.value)}
              onFocus={() => onFocusChange?.(true)}
              onBlur={() => onFocusChange?.(false)}
              placeholder={`请输入第 ${index + 1} 空的答案...`}
              className='flex-1 px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
            />
          </div>
        ))}
      </div>
    );
  }

  // 简答题
  return (
    <textarea
      value={typeof value === 'string' ? value : ''}
      onChange={e => onChange(e.target.value)}
      onFocus={() => onFocusChange?.(true)}
      onBlur={() => onFocusChange?.(false)}
      placeholder='请输入答案...'
      rows={6}
      className='w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
    />
  );
};

export default TakeExamPage;
