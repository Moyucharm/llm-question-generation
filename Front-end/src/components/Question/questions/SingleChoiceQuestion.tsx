import React, { useCallback, useEffect } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import type { SingleChoiceQuestion as SingleChoiceQuestionType } from '@/types';

interface Props {
  question: SingleChoiceQuestionType;
  onAnswerChange: (answer: number) => void;
  disabled?: boolean;
  showCorrectAnswer?: boolean;
}

/**
 * 单选题组件
 * 渲染单选题并处理用户选择
 */
export const SingleChoiceQuestion: React.FC<Props> = ({
  question,
  onAnswerChange,
  disabled = false,
  showCorrectAnswer = false,
}) => {
  const { nextQuestion } = useAppStore();
  const handleOptionChange = useCallback(
    (optionIndex: number) => {
      if (!disabled) {
        onAnswerChange(optionIndex);
      }
    },
    [disabled, onAnswerChange]
  );

  // 键盘快捷键：1-4 选择 A-D，Enter 下一题
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (disabled) return;
      // 仅对当前题目生效
      const { generation, answering } = useAppStore.getState();
      const activeId =
        generation.currentQuiz?.questions[answering.currentQuestionIndex]?.id;
      if (activeId !== question.id) return;
      // 数字键 1-9 选择对应选项
      if (e.key >= '1' && e.key <= '9') {
        const index = Number(e.key) - 1;
        if (index < (question.options?.length || 0)) {
          e.preventDefault();
          handleOptionChange(index);
        }
        return;
      }
      // Enter 到下一题（已作答时），并结算当前题用时在 switchQuestion 中完成
      if (e.key === 'Enter') {
        if (question.userAnswer !== undefined && question.userAnswer !== null) {
          e.preventDefault();
          nextQuestion();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    disabled,
    handleOptionChange,
    nextQuestion,
    question.id,
    question.options,
    question.userAnswer,
  ]);

  return (
    <div className='space-y-4'>
      <h3 className='text-lg font-medium text-gray-900'>{question.question}</h3>

      <div className='space-y-2'>
        {question.options.map((option, index) => {
          const isSelected = question.userAnswer === index;
          const isCorrect =
            showCorrectAnswer && index === question.correctAnswer;
          const isWrong =
            showCorrectAnswer && isSelected && index !== question.correctAnswer;

          return (
            <label
              key={index}
              className={`
                flex items-center p-3 rounded-lg border cursor-pointer transition-colors
                ${disabled ? 'cursor-not-allowed' : 'hover:bg-gray-50'}
                ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}
                ${isCorrect ? 'border-green-500 bg-green-50' : ''}
                ${isWrong ? 'border-red-500 bg-red-50' : ''}
              `}
            >
              <input
                type='radio'
                name={`question-${question.id}`}
                value={index}
                checked={isSelected}
                onChange={() => handleOptionChange(index)}
                disabled={disabled}
                className='mr-3 text-blue-600 focus:ring-blue-500'
              />
              <span className='flex-1'>
                {String.fromCharCode(65 + index)}. {option}
              </span>
              {showCorrectAnswer && isCorrect && (
                <span className='text-green-600 font-medium'>✓ 正确答案</span>
              )}
              {showCorrectAnswer && isWrong && (
                <span className='text-red-600 font-medium'>✗ 错误</span>
              )}
            </label>
          );
        })}
      </div>
    </div>
  );
};
