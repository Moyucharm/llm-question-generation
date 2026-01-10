import React, { useRef, useEffect, useState } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import { QuestionRenderer } from '@/components/Question/QuestionRenderer';
import { Menu, RotateCcw, CheckCircle2 } from 'lucide-react';
import { QuizNavigation, EmptyQuizState } from './components';
import { useQuizNavigation, useQuizSubmission, useQuizStatus } from './hooks';
import { FloatingButton } from '@/components/FloatingButton';
import { FloatingPanel } from '@/components/FloatingButton/FloatingPanel';
import { useTimeRecorderStore } from '@/stores/timeRecorderStore';

/**
 * 答题页面
 * 用户在此页面进行答题操作
 */
export const QuizPage: React.FC = () => {
  // 全局状态
  const { generation, resetApp } = useAppStore();
  const quiz = generation.currentQuiz;

  // 导航显示状态
  const [isNavigationVisible, setIsNavigationVisible] = useState(false);

  // 题目导航
  const { currentQuestionIndex, goToQuestion } = useQuizNavigation();
  const { startAnswering, switchQuestion } = useTimeRecorderStore();

  // 题目引用数组，用于滚动定位
  const questionRefs = useRef<(HTMLDivElement | null)[]>([]);

  // 答题提交
  const { handleAnswerChange, handleSubmitQuiz, isSubmitted } =
    useQuizSubmission();

  // 答题状态
  const { answeredCount, isQuestionAnswered } = useQuizStatus(quiz);

  /**
   * 滚动到指定题目
   * @param index 题目索引
   */
  const scrollToQuestion = (index: number) => {
    const questionElement = questionRefs.current[index];
    if (questionElement) {
      questionElement.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  };

  /**
   * 处理题目选择，包含滚动定位
   * @param index 题目索引
   */
  const handleQuestionSelect = (index: number) => {
    goToQuestion(index);
    scrollToQuestion(index);
  };

  // 当currentQuestionIndex变化时，自动滚动到对应题目
  useEffect(() => {
    scrollToQuestion(currentQuestionIndex);
    if (quiz && quiz.questions.length > 0) {
      const qid = quiz.questions[currentQuestionIndex]?.id ?? null;
      switchQuestion(qid);
    }
  }, [currentQuestionIndex, quiz, switchQuestion]);

  // 首次进入答题页时，启动答题计时
  useEffect(() => {
    if (quiz && quiz.questions.length > 0) {
      const qid = quiz.questions[currentQuestionIndex]?.id ?? null;
      startAnswering(qid);
    }
    // 仅在试卷变更时触发
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quiz?.id]);

  // 如果没有试卷，显示空状态
  if (!quiz) {
    return <EmptyQuizState onReset={resetApp} />;
  }

  return (
    <div className='max-w-4xl mx-auto'>
      {/* 页面头部卡片 */}
      <div className='bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6'>
        <div className='flex items-center justify-between mb-4'>
          <div>
            <h2 className='text-xl font-semibold text-gray-900'>
              {quiz.title || '在线答题'}
            </h2>
            <p className='text-sm text-gray-500 mt-1'>
              共 {quiz.questions.length} 题 · 已答 {answeredCount} 题
            </p>
          </div>
          <button
            onClick={resetApp}
            className='flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors'
          >
            <RotateCcw className='w-4 h-4' />
            重新开始
          </button>
        </div>

        {/* 答题进度条 */}
        <div className='w-full bg-gray-200 rounded-full h-2'>
          <div
            className='bg-blue-600 h-2 rounded-full transition-all duration-300'
            style={{
              width: `${(answeredCount / quiz.questions.length) * 100}%`,
            }}
          />
        </div>
      </div>

      {/* 题目导航按钮 */}
      <FloatingButton
        icon={Menu}
        onClick={() => setIsNavigationVisible(!isNavigationVisible)}
        position='right'
        color='bg-blue-600'
        hoverColor='hover:bg-blue-700'
        title='题目导航'
        top='top-40'
      />

      {/* 题目导航面板 */}
      <FloatingPanel
        isVisible={isNavigationVisible}
        onClose={() => setIsNavigationVisible(false)}
        title='题目导航'
        position='right'
        top='top-72'
        width='w-64'
      >
        <QuizNavigation
          quiz={quiz}
          currentQuestionIndex={currentQuestionIndex}
          onQuestionSelect={index => {
            handleQuestionSelect(index);
            setIsNavigationVisible(false);
          }}
          isQuestionAnswered={isQuestionAnswered}
        />
      </FloatingPanel>

      {/* 题目列表 */}
      <div className='space-y-6'>
        {quiz.questions.map((question, index) => (
          <div
            key={question.id}
            ref={el => {
              questionRefs.current[index] = el;
            }}
            onClick={() => goToQuestion(index)}
            style={{ scrollMarginTop: '100px', cursor: 'pointer' }}
            className='bg-white rounded-lg shadow-sm border border-gray-200 p-6 transition-all hover:shadow-md'
          >
            <QuestionRenderer
              question={question}
              onAnswerChange={handleAnswerChange}
              disabled={isSubmitted}
              questionNumber={index + 1}
            />
          </div>
        ))}

        {/* 提交按钮卡片 */}
        <div className='bg-white rounded-lg shadow-sm border border-gray-200 p-6'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-3 text-gray-600'>
              <CheckCircle2 className='w-5 h-5' />
              <span>
                已完成 {answeredCount}/{quiz.questions.length} 题
              </span>
            </div>
            <button
              onClick={() => handleSubmitQuiz(quiz)}
              disabled={isSubmitted}
              className='px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors'
            >
              {isSubmitted ? '已提交' : '提交试卷'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
