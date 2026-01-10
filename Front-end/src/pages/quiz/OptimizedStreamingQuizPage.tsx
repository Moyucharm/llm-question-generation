import React, { useMemo, useCallback, useState } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import {
  QuizStatusPage,
  StreamingQuizHeader,
  QuizPageLayout,
  VirtualizedQuestionList,
} from './components';
import { questionBankService } from '@/services/questionBankService';

/**
 * 优化后的流式试卷页面组件
 * 集成性能优化和虚拟化渲染
 */
export const OptimizedStreamingQuizPage: React.FC = () => {
  const { generation, resetApp } = useAppStore();

  const {
    status,
    error,
    streamingQuestions,
    completedQuestionCount,
    progress,
  } = generation;

  // 保存到题库状态
  const [isSavingToBank, setIsSavingToBank] = useState(false);
  const [savedToBank, setSavedToBank] = useState(false);

  // 缓存事件处理函数
  const handleGoBack = useCallback(() => {
    resetApp();
  }, [resetApp]);

  const handleRestart = useCallback(() => {
    resetApp();
  }, [resetApp]);

  // 保存到题库
  const handleSaveToBank = useCallback(async () => {
    if (!streamingQuestions || streamingQuestions.length === 0) return;

    setIsSavingToBank(true);
    try {
      // 转换题目格式 - 将流式题目转换为题库格式
      const typeMap: Record<string, 'single' | 'multiple' | 'blank' | 'short'> = {
        'single_choice': 'single',
        'multiple_choice': 'multiple',
        'fill_blank': 'blank',
        'short_answer': 'short',
        'single': 'single',
        'multiple': 'multiple',
        'blank': 'blank',
        'short': 'short',
      };

      const questionsToSave = streamingQuestions.map((q) => ({
        type: typeMap[q.type as string] || 'short',
        stem: String(q.stem || q.content || ''),
        options: q.options as Record<string, string> | undefined,
        answer: q.answer,
        explanation: String(q.explanation || ''),
        difficulty: Number(q.difficulty) || 3,
        score: 10,
        status: 'draft' as const,
      }));

      await questionBankService.batchCreate({ questions: questionsToSave });
      setSavedToBank(true);
      alert(`成功保存 ${questionsToSave.length} 道题目到题库！`);
    } catch (err) {
      console.error('保存到题库失败:', err);
      alert(err instanceof Error ? err.message : '保存失败');
    } finally {
      setIsSavingToBank(false);
    }
  }, [streamingQuestions]);

  const handleAnswerChange = useCallback(() => {
    // 答题逻辑
  }, []);

  // 缓存题目数据
  const memoizedQuestions = useMemo(
    () => streamingQuestions || [],
    [streamingQuestions]
  );

  // 缓存状态判断
  const isGenerating = useMemo(() => status === 'generating', [status]);

  // 空闲状态
  if (status === 'idle') {
    return <QuizStatusPage type='idle' onGoBack={handleGoBack} />;
  }

  // 错误状态
  if (status === 'error') {
    return (
      <QuizStatusPage
        type='error'
        error={error || undefined}
        onGoBack={handleGoBack}
        onRestart={handleRestart}
      />
    );
  }

  return (
    <QuizPageLayout>
      <StreamingQuizHeader
        title='流式试卷生成'
        subtitle={isGenerating ? '正在生成中...' : (savedToBank ? '已保存到题库' : '生成完成')}
        status={isGenerating ? 'generating' : 'complete'}
        completedQuestionCount={completedQuestionCount || 0}
        progress={progress}
        onGoBack={handleGoBack}
        onSaveToBank={savedToBank ? undefined : handleSaveToBank}
        isSavingToBank={isSavingToBank}
      />

      {/* 主内容区域 */}
      <div className='max-w-4xl mx-auto px-4 py-8 pt-32'>
        {memoizedQuestions.length > 0 ? (
          <VirtualizedQuestionList
            questions={memoizedQuestions}
            onAnswerChange={handleAnswerChange}
            disabled={isGenerating}
          />
        ) : (
          <div className='text-center py-12'>
            <div className='w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4'>
              <span className='text-gray-400 text-xl'>⏰</span>
            </div>
            <h3 className='text-lg font-medium text-gray-900 mb-2'>
              等待题目生成
            </h3>
            <p className='text-gray-600'>AI正在为您生成个性化试卷...</p>
          </div>
        )}
      </div>
    </QuizPageLayout>
  );
};
