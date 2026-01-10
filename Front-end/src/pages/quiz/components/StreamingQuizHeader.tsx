import React, { memo } from 'react';
import { OptimizedFloatingTimeRecorder } from '@/components/TimeRecorder';

interface StreamingQuizHeaderProps {
  onGoBack: () => void;
  status: 'generating' | 'complete' | 'error' | 'idle';
  completedQuestionCount: number;
  progress?: number;
  title?: string;
  subtitle?: string;
  onSaveToBank?: () => void; // 保存到题库回调
  isSavingToBank?: boolean;  // 是否正在保存
}

/**
 * 流式答题页面专用头部组件
 * 统一流式页面的头部导航和进度显示
 */
export const StreamingQuizHeader: React.FC<StreamingQuizHeaderProps> = memo(
  ({
    onGoBack,
    status,
    completedQuestionCount,
    progress,
    title = '流式试卷生成',
    subtitle,
    onSaveToBank,
    isSavingToBank = false,
  }) => {
    // 根据状态生成副标题
    const getSubtitle = () => {
      if (subtitle) return subtitle;

      switch (status) {
        case 'generating':
          return '正在生成中...';
        case 'complete':
          return '生成完成';
        case 'error':
          return '生成失败';
        case 'idle':
          return '等待开始';
        default:
          return '';
      }
    };

    return (
      <>
        {/* 固定头部导航栏 */}
        <div className='bg-white shadow-sm border-b fixed top-0 left-0 right-0 z-30'>
          <div className='max-w-6xl mx-auto px-4 py-4'>
            <div className='flex items-center justify-between'>
              {/* 左侧：返回按钮和标题 */}
              <div className='flex items-center gap-4'>
                <button
                  onClick={onGoBack}
                  className='px-3 py-1 text-sm text-gray-600 hover:text-gray-900 transition-colors'
                >
                  ← 返回
                </button>
                <div>
                  <h1 className='text-xl font-semibold text-gray-900'>
                    {title}
                  </h1>
                  <p className='text-sm text-gray-600'>{getSubtitle()}</p>
                </div>
              </div>

              {/* 右侧：保存按钮和进度信息 */}
              <div className='flex items-center gap-4'>
                {/* 保存到题库按钮 - 只在生成完成且有回调时显示 */}
                {status === 'complete' && onSaveToBank && (
                  <button
                    onClick={onSaveToBank}
                    disabled={isSavingToBank}
                    className='px-4 py-2 text-sm text-white bg-green-600 hover:bg-green-700 disabled:bg-green-400 rounded-lg transition-colors flex items-center gap-2'
                  >
                    {isSavingToBank ? (
                      <>
                        <span className='animate-spin'>⏳</span>
                        保存中...
                      </>
                    ) : (
                      <>
                        📥 保存到题库
                      </>
                    )}
                  </button>
                )}
                <div className='text-sm text-gray-600'>
                  已完成: {completedQuestionCount} 题
                </div>
              </div>
            </div>

            {/* 进度条 */}
            {progress !== undefined && (
              <div className='mt-3'>
                <div className='bg-gray-200 rounded-full h-2'>
                  <div
                    className='bg-blue-600 h-2 rounded-full transition-all duration-300'
                    style={{
                      width: `${Math.min(100, Math.max(0, progress))}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 浮动时间记录组件 */}
        <OptimizedFloatingTimeRecorder />
      </>
    );
  }
);

StreamingQuizHeader.displayName = 'StreamingQuizHeader';
