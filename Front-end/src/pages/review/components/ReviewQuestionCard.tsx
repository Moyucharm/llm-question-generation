/**
 * 审阅题目卡片组件
 * 支持查看、编辑、删除题目
 */

import React, { useState, useCallback } from 'react';
import {
  CheckSquare,
  Square,
  Edit3,
  Trash2,
  ChevronDown,
  ChevronUp,
  Save,
  X,
} from 'lucide-react';
import type { Question } from '@/types';
import { QuestionType } from '@/types';
import type { ReviewQuestion } from '@/stores/generation';

interface ReviewQuestionCardProps {
  question: ReviewQuestion;
  index: number;
  onToggleSelect: (index: number) => void;
  onUpdate: (index: number, data: Partial<Question>) => void;
  onDelete: (index: number) => void;
  onSetEditing: (index: number, isEditing: boolean) => void;
}

/**
 * 获取题目类型的中文标签
 */
const getQuestionTypeLabel = (type: QuestionType): string => {
  const labels: Record<QuestionType, string> = {
    [QuestionType.SINGLE_CHOICE]: '单选题',
    [QuestionType.MULTIPLE_CHOICE]: '多选题',
    [QuestionType.FILL_BLANK]: '填空题',
    [QuestionType.SHORT_ANSWER]: '简答题',
  };
  return labels[type] || '未知题型';
};

/**
 * 获取题目类型的背景色
 */
const getTypeColor = (type: QuestionType): string => {
  const colors: Record<QuestionType, string> = {
    [QuestionType.SINGLE_CHOICE]: 'bg-blue-100 text-blue-800',
    [QuestionType.MULTIPLE_CHOICE]: 'bg-purple-100 text-purple-800',
    [QuestionType.FILL_BLANK]: 'bg-green-100 text-green-800',
    [QuestionType.SHORT_ANSWER]: 'bg-orange-100 text-orange-800',
  };
  return colors[type] || 'bg-gray-100 text-gray-800';
};

export const ReviewQuestionCard: React.FC<ReviewQuestionCardProps> = ({
  question,
  index,
  onToggleSelect,
  onUpdate,
  onDelete,
  onSetEditing,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [editData, setEditData] = useState<Partial<Question>>({});

  // 开始编辑
  const handleStartEdit = useCallback(() => {
    setEditData({ ...question });
    onSetEditing(index, true);
    setIsExpanded(true);
  }, [question, index, onSetEditing]);

  // 取消编辑
  const handleCancelEdit = useCallback(() => {
    setEditData({});
    onSetEditing(index, false);
  }, [index, onSetEditing]);

  // 保存编辑
  const handleSaveEdit = useCallback(() => {
    onUpdate(index, editData);
    onSetEditing(index, false);
    setEditData({});
  }, [index, editData, onUpdate, onSetEditing]);

  // 更新编辑数据
  const updateEditField = useCallback(
    (field: string, value: unknown) => {
      setEditData(prev => ({ ...prev, [field]: value }));
    },
    []
  );

  // 渲染选项编辑器（单选/多选题）
  const renderOptionsEditor = () => {
    if (
      question.type !== QuestionType.SINGLE_CHOICE &&
      question.type !== QuestionType.MULTIPLE_CHOICE
    ) {
      return null;
    }

    const options =
      (editData as { options?: string[] }).options || question.options || [];

    return (
      <div className='space-y-2'>
        <label className='block text-sm font-medium text-gray-700'>选项</label>
        {options.map((option, optIndex) => (
          <div key={optIndex} className='flex items-center gap-2'>
            <span className='text-gray-500 text-sm w-6'>
              {String.fromCharCode(65 + optIndex)}.
            </span>
            <input
              type='text'
              value={option}
              onChange={e => {
                const newOptions = [...options];
                newOptions[optIndex] = e.target.value;
                updateEditField('options', newOptions);
              }}
              className='flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
            />
          </div>
        ))}
      </div>
    );
  };

  // 渲染答案编辑器
  const renderAnswerEditor = () => {
    switch (question.type) {
      case QuestionType.SINGLE_CHOICE: {
        const options =
          (editData as { options?: string[] }).options || question.options || [];
        const correctAnswer =
          (editData as { correctAnswer?: number }).correctAnswer ??
          question.correctAnswer;

        return (
          <div className='space-y-2'>
            <label className='block text-sm font-medium text-gray-700'>
              正确答案
            </label>
            <div className='flex flex-wrap gap-2'>
              {options.map((_, optIndex) => (
                <button
                  key={optIndex}
                  onClick={() => updateEditField('correctAnswer', optIndex)}
                  className={`px-4 py-2 rounded-lg border transition-colors ${
                    correctAnswer === optIndex
                      ? 'bg-blue-500 text-white border-blue-500'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {String.fromCharCode(65 + optIndex)}
                </button>
              ))}
            </div>
          </div>
        );
      }

      case QuestionType.MULTIPLE_CHOICE: {
        const options =
          (editData as { options?: string[] }).options || question.options || [];
        const correctAnswers =
          (editData as { correctAnswers?: number[] }).correctAnswers ??
          question.correctAnswers ??
          [];

        return (
          <div className='space-y-2'>
            <label className='block text-sm font-medium text-gray-700'>
              正确答案（多选）
            </label>
            <div className='flex flex-wrap gap-2'>
              {options.map((_, optIndex) => {
                const isSelected = correctAnswers.includes(optIndex);
                return (
                  <button
                    key={optIndex}
                    onClick={() => {
                      const newAnswers = isSelected
                        ? correctAnswers.filter(i => i !== optIndex)
                        : [...correctAnswers, optIndex].sort((a, b) => a - b);
                      updateEditField('correctAnswers', newAnswers);
                    }}
                    className={`px-4 py-2 rounded-lg border transition-colors ${
                      isSelected
                        ? 'bg-purple-500 text-white border-purple-500'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {String.fromCharCode(65 + optIndex)}
                  </button>
                );
              })}
            </div>
          </div>
        );
      }

      case QuestionType.FILL_BLANK: {
        const correctAnswers =
          (editData as { correctAnswers?: string[] }).correctAnswers ??
          question.correctAnswers ??
          [];

        return (
          <div className='space-y-2'>
            <label className='block text-sm font-medium text-gray-700'>
              填空答案
            </label>
            {correctAnswers.map((answer, ansIndex) => (
              <div key={ansIndex} className='flex items-center gap-2'>
                <span className='text-gray-500 text-sm w-16'>
                  空格 {ansIndex + 1}:
                </span>
                <input
                  type='text'
                  value={answer}
                  onChange={e => {
                    const newAnswers = [...correctAnswers];
                    newAnswers[ansIndex] = e.target.value;
                    updateEditField('correctAnswers', newAnswers);
                  }}
                  className='flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                />
              </div>
            ))}
          </div>
        );
      }

      case QuestionType.SHORT_ANSWER: {
        const referenceAnswer =
          (editData as { referenceAnswer?: string }).referenceAnswer ??
          question.referenceAnswer ??
          '';

        return (
          <div className='space-y-2'>
            <label className='block text-sm font-medium text-gray-700'>
              参考答案
            </label>
            <textarea
              value={referenceAnswer}
              onChange={e => updateEditField('referenceAnswer', e.target.value)}
              rows={4}
              className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
            />
          </div>
        );
      }

      default:
        return null;
    }
  };

  // 渲染题目预览（折叠状态）
  const renderPreview = () => {
    let answerText = '';

    switch (question.type) {
      case QuestionType.SINGLE_CHOICE:
        answerText = `答案: ${String.fromCharCode(65 + question.correctAnswer)}`;
        break;
      case QuestionType.MULTIPLE_CHOICE:
        answerText = `答案: ${question.correctAnswers.map(i => String.fromCharCode(65 + i)).join(', ')}`;
        break;
      case QuestionType.FILL_BLANK:
        answerText = `答案: ${question.correctAnswers.join(', ')}`;
        break;
      case QuestionType.SHORT_ANSWER:
        answerText = `参考答案: ${question.referenceAnswer.substring(0, 50)}...`;
        break;
    }

    return (
      <div className='flex-1 min-w-0'>
        <p className='text-gray-900 line-clamp-2'>{question.question}</p>
        <p className='text-gray-500 text-sm mt-1 truncate'>{answerText}</p>
      </div>
    );
  };

  // 渲染展开的编辑表单
  const renderEditForm = () => {
    const questionText =
      (editData as { question?: string }).question ?? question.question;

    return (
      <div className='mt-4 space-y-4 border-t border-gray-200 pt-4'>
        {/* 题干编辑 */}
        <div className='space-y-2'>
          <label className='block text-sm font-medium text-gray-700'>
            题干
          </label>
          <textarea
            value={questionText}
            onChange={e => updateEditField('question', e.target.value)}
            rows={3}
            className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
          />
        </div>

        {/* 选项编辑（如适用） */}
        {renderOptionsEditor()}

        {/* 答案编辑 */}
        {renderAnswerEditor()}

        {/* 操作按钮 */}
        <div className='flex justify-end gap-2 pt-2'>
          <button
            onClick={handleCancelEdit}
            className='px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2'
          >
            <X className='w-4 h-4' />
            取消
          </button>
          <button
            onClick={handleSaveEdit}
            className='px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2'
          >
            <Save className='w-4 h-4' />
            保存修改
          </button>
        </div>
      </div>
    );
  };

  return (
    <div
      className={`bg-white rounded-lg border ${
        question.isSelected ? 'border-blue-300 ring-2 ring-blue-100' : 'border-gray-200'
      } shadow-sm transition-all`}
    >
      <div className='p-4'>
        {/* 卡片头部 */}
        <div className='flex items-start gap-3'>
          {/* 选择框 */}
          <button
            onClick={() => onToggleSelect(index)}
            className='flex-shrink-0 mt-1 text-gray-400 hover:text-blue-600 transition-colors'
          >
            {question.isSelected ? (
              <CheckSquare className='w-5 h-5 text-blue-600' />
            ) : (
              <Square className='w-5 h-5' />
            )}
          </button>

          {/* 题号和类型 */}
          <div className='flex items-center gap-2 flex-shrink-0'>
            <span className='text-gray-900 font-medium'>{index + 1}.</span>
            <span
              className={`px-2 py-0.5 rounded text-xs font-medium ${getTypeColor(question.type)}`}
            >
              {getQuestionTypeLabel(question.type)}
            </span>
            {question.hasChanges && (
              <span className='px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800'>
                已修改
              </span>
            )}
          </div>

          {/* 题目预览 */}
          {renderPreview()}

          {/* 操作按钮 */}
          <div className='flex items-center gap-1 flex-shrink-0'>
            <button
              onClick={handleStartEdit}
              disabled={question.isEditing}
              className='p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50'
              title='编辑'
            >
              <Edit3 className='w-4 h-4' />
            </button>
            <button
              onClick={() => onDelete(index)}
              className='p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors'
              title='删除'
            >
              <Trash2 className='w-4 h-4' />
            </button>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className='p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors'
              title={isExpanded ? '收起' : '展开'}
            >
              {isExpanded ? (
                <ChevronUp className='w-4 h-4' />
              ) : (
                <ChevronDown className='w-4 h-4' />
              )}
            </button>
          </div>
        </div>

        {/* 编辑表单 */}
        {question.isEditing && renderEditForm()}

        {/* 展开的详细信息（非编辑模式） */}
        {isExpanded && !question.isEditing && (
          <div className='mt-4 border-t border-gray-200 pt-4 space-y-3'>
            <div>
              <h4 className='text-sm font-medium text-gray-700 mb-1'>题干</h4>
              <p className='text-gray-900'>{question.question}</p>
            </div>

            {(question.type === QuestionType.SINGLE_CHOICE ||
              question.type === QuestionType.MULTIPLE_CHOICE) && (
              <div>
                <h4 className='text-sm font-medium text-gray-700 mb-1'>选项</h4>
                <div className='space-y-1'>
                  {question.options.map((opt, i) => (
                    <p key={i} className='text-gray-700'>
                      {String.fromCharCode(65 + i)}. {opt}
                    </p>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h4 className='text-sm font-medium text-gray-700 mb-1'>答案</h4>
              <p className='text-green-700 font-medium'>
                {question.type === QuestionType.SINGLE_CHOICE &&
                  `${String.fromCharCode(65 + question.correctAnswer)}. ${question.options[question.correctAnswer]}`}
                {question.type === QuestionType.MULTIPLE_CHOICE &&
                  question.correctAnswers
                    .map(
                      i =>
                        `${String.fromCharCode(65 + i)}. ${question.options[i]}`
                    )
                    .join(', ')}
                {question.type === QuestionType.FILL_BLANK &&
                  question.correctAnswers.join(', ')}
                {question.type === QuestionType.SHORT_ANSWER &&
                  question.referenceAnswer}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
