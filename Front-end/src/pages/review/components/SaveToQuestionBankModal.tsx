/**
 * 保存到题库弹窗组件
 * 支持选择课程、知识点，批量保存题目到题库
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Save, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { Modal } from '@/components/UI/Modal';
import { courseService, type Course, type KnowledgePoint } from '@/services/courseService';
import { questionBankService, type QuestionCreate } from '@/services/questionBankService';
import type { ReviewQuestion } from '@/stores/generation';
import { QuestionType } from '@/types';

interface SaveToQuestionBankModalProps {
  isOpen: boolean;
  onClose: () => void;
  questions: ReviewQuestion[];
  onSaveSuccess: () => void;
}

type SaveStatus = 'idle' | 'saving' | 'success' | 'error';

/**
 * 将前端题目类型转换为后端 API 格式
 */
const convertQuestionType = (
  type: QuestionType
): 'single' | 'multiple' | 'blank' | 'short' => {
  const typeMap: Record<QuestionType, 'single' | 'multiple' | 'blank' | 'short'> = {
    [QuestionType.SINGLE_CHOICE]: 'single',
    [QuestionType.MULTIPLE_CHOICE]: 'multiple',
    [QuestionType.FILL_BLANK]: 'blank',
    [QuestionType.SHORT_ANSWER]: 'short',
  };
  return typeMap[type];
};

/**
 * 将前端题目转换为后端 API 格式
 */
const convertQuestion = (question: ReviewQuestion): QuestionCreate => {
  const base = {
    type: convertQuestionType(question.type),
    stem: question.question,
    difficulty: 3,
    score: 10,
  };

  switch (question.type) {
    case QuestionType.SINGLE_CHOICE:
      return {
        ...base,
        options: question.options.reduce(
          (acc, opt, i) => ({ ...acc, [String.fromCharCode(65 + i)]: opt }),
          {}
        ),
        answer: String.fromCharCode(65 + question.correctAnswer),
      };

    case QuestionType.MULTIPLE_CHOICE:
      return {
        ...base,
        options: question.options.reduce(
          (acc, opt, i) => ({ ...acc, [String.fromCharCode(65 + i)]: opt }),
          {}
        ),
        answer: question.correctAnswers.map(i => String.fromCharCode(65 + i)),
      };

    case QuestionType.FILL_BLANK:
      return {
        ...base,
        answer: question.correctAnswers,
      };

    case QuestionType.SHORT_ANSWER:
      return {
        ...base,
        answer: question.referenceAnswer,
      };

    default:
      return base as QuestionCreate;
  }
};

export const SaveToQuestionBankModal: React.FC<SaveToQuestionBankModalProps> = ({
  isOpen,
  onClose,
  questions,
  onSaveSuccess,
}) => {
  // 状态
  const [courses, setCourses] = useState<Course[]>([]);
  const [knowledgePoints, setKnowledgePoints] = useState<KnowledgePoint[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [selectedKnowledgePointId, setSelectedKnowledgePointId] = useState<
    number | null
  >(null);
  const [status, setStatus] = useState<
    'draft' | 'approved' | 'needs_review' | 'rejected'
  >('draft');
  const [overrideSettings, setOverrideSettings] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [savedCount, setSavedCount] = useState(0);

  // 加载课程列表
  useEffect(() => {
    const loadCourses = async () => {
      try {
        const data = await courseService.getCourses();
        setCourses(data);
      } catch (err) {
        console.error('加载课程列表失败:', err);
      }
    };

    if (isOpen) {
      loadCourses();
    }
  }, [isOpen]);

  // 加载知识点列表
  useEffect(() => {
    const loadKnowledgePoints = async () => {
      if (!selectedCourseId) {
        setKnowledgePoints([]);
        setSelectedKnowledgePointId(null);
        return;
      }

      try {
        const data = await courseService.getKnowledgePoints(selectedCourseId);
        setKnowledgePoints(data);
      } catch (err) {
        console.error('加载知识点列表失败:', err);
        setKnowledgePoints([]);
      }
    };

    loadKnowledgePoints();
  }, [selectedCourseId]);

  // 扁平化知识点树
  const flattenKnowledgePoints = useCallback(
    (points: KnowledgePoint[], level = 0): { point: KnowledgePoint; level: number }[] => {
      const result: { point: KnowledgePoint; level: number }[] = [];
      for (const point of points) {
        result.push({ point, level });
        if (point.children && point.children.length > 0) {
          result.push(...flattenKnowledgePoints(point.children, level + 1));
        }
      }
      return result;
    },
    []
  );

  // 保存到题库
  const handleSave = async () => {
    if (questions.length === 0) {
      setError('没有选中的题目');
      return;
    }

    setSaveStatus('saving');
    setError(null);

    try {
      const questionsToSave = questions.map(q => ({
        ...convertQuestion(q),
        status,
        ...(overrideSettings && selectedCourseId
          ? { course_id: selectedCourseId }
          : {}),
        ...(overrideSettings && selectedKnowledgePointId
          ? { knowledge_point_id: selectedKnowledgePointId }
          : {}),
      }));

      const result = await questionBankService.batchCreate({
        questions: questionsToSave,
        ...(overrideSettings && selectedCourseId
          ? { course_id: selectedCourseId }
          : {}),
        ...(overrideSettings && selectedKnowledgePointId
          ? { knowledge_point_id: selectedKnowledgePointId }
          : {}),
      });

      setSavedCount(result.created_count);
      setSaveStatus('success');

      // 2秒后关闭弹窗
      setTimeout(() => {
        onSaveSuccess();
        onClose();
        // 重置状态
        setSaveStatus('idle');
        setSavedCount(0);
      }, 2000);
    } catch (err) {
      console.error('保存题目失败:', err);
      setError(err instanceof Error ? err.message : '保存失败，请重试');
      setSaveStatus('error');
    }
  };

  // 渲染状态指示器
  const renderStatusIndicator = () => {
    switch (saveStatus) {
      case 'saving':
        return (
          <div className='flex items-center justify-center py-8'>
            <Loader2 className='w-8 h-8 animate-spin text-blue-600' />
            <span className='ml-3 text-gray-600'>正在保存题目...</span>
          </div>
        );

      case 'success':
        return (
          <div className='flex flex-col items-center justify-center py-8'>
            <CheckCircle className='w-12 h-12 text-green-500 mb-3' />
            <p className='text-green-700 font-medium'>
              成功保存 {savedCount} 道题目到题库！
            </p>
          </div>
        );

      case 'error':
        return (
          <div className='flex items-center p-4 bg-red-50 rounded-lg mb-4'>
            <AlertCircle className='w-5 h-5 text-red-500 mr-2' />
            <span className='text-red-700'>{error}</span>
          </div>
        );

      default:
        return null;
    }
  };

  const flatKnowledgePoints = flattenKnowledgePoints(knowledgePoints);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title='💾 保存到题库' size='md'>
      {saveStatus === 'saving' || saveStatus === 'success' ? (
        renderStatusIndicator()
      ) : (
        <div className='space-y-4'>
          {/* 错误提示 */}
          {saveStatus === 'error' && renderStatusIndicator()}

          {/* 题目统计 */}
          <div className='p-3 bg-blue-50 rounded-lg'>
            <p className='text-blue-700'>
              将保存 <span className='font-bold'>{questions.length}</span> 道题目到题库
            </p>
          </div>

          {/* 课程选择 */}
          <div className='space-y-2'>
            <label className='block text-sm font-medium text-gray-700'>
              课程
            </label>
            <select
              value={selectedCourseId || ''}
              onChange={e =>
                setSelectedCourseId(e.target.value ? Number(e.target.value) : null)
              }
              className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
            >
              <option value=''>选择课程（可选）</option>
              {courses.map(course => (
                <option key={course.id} value={course.id}>
                  {course.name}
                </option>
              ))}
            </select>
          </div>

          {/* 知识点选择 */}
          <div className='space-y-2'>
            <label className='block text-sm font-medium text-gray-700'>
              知识点
            </label>
            <select
              value={selectedKnowledgePointId || ''}
              onChange={e =>
                setSelectedKnowledgePointId(
                  e.target.value ? Number(e.target.value) : null
                )
              }
              disabled={!selectedCourseId}
              className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed'
            >
              <option value=''>选择知识点（可选）</option>
              {flatKnowledgePoints.map(({ point, level }) => (
                <option key={point.id} value={point.id}>
                  {'　'.repeat(level)}
                  {level > 0 ? '└ ' : ''}
                  {point.name}
                </option>
              ))}
            </select>
          </div>

          {/* 状态选择 */}
          <div className='space-y-2'>
            <label className='block text-sm font-medium text-gray-700'>
              题目状态
            </label>
            <select
              value={status}
              onChange={e =>
                setStatus(
                  e.target.value as 'draft' | 'approved' | 'needs_review' | 'rejected'
                )
              }
              className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
            >
              <option value='draft'>草稿</option>
              <option value='approved'>已审核</option>
              <option value='needs_review'>待审核</option>
            </select>
          </div>

          {/* 覆盖选项 */}
          <div className='flex items-center'>
            <input
              type='checkbox'
              id='overrideSettings'
              checked={overrideSettings}
              onChange={e => setOverrideSettings(e.target.checked)}
              className='w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500'
            />
            <label
              htmlFor='overrideSettings'
              className='ml-2 text-sm text-gray-700'
            >
              覆盖题目中的课程/知识点设置
            </label>
          </div>

          {/* 操作按钮 */}
          <div className='flex justify-end gap-3 pt-4 border-t border-gray-200'>
            <button
              onClick={onClose}
              className='px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors'
            >
              取消
            </button>
            <button
              onClick={handleSave}
              disabled={questions.length === 0}
              className='px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed'
            >
              <Save className='w-4 h-4' />
              确认保存
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
};
