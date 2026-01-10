/**
 * 考试详情页面
 * 支持查看/编辑考试信息、添加题目、发布考试
 */

import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Play,
  Pause,
  Clock,
  FileText,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
} from 'lucide-react';
import { useExamStore } from '@/stores/useExamStore';
import type { ExamQuestion, UpdateExamRequest } from '@/types/exam';
import {
  questionBankService,
  getQuestionTypeLabel,
} from '@/services/questionBankService';
import type { Question } from '@/services/questionBankService';

interface ExamDetailPageProps {
  examId: number;
  onNavigate?: (page: string) => void;
}

export const ExamDetailPage: React.FC<ExamDetailPageProps> = ({
  examId,
  onNavigate,
}) => {
  const {
    currentExam,
    isLoadingExam,
    error,
    fetchExam,
    updateExam,
    publishExam,
    closeExam,
    clearError,
  } = useExamStore();

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<UpdateExamRequest>({});
  const [showAddQuestion, setShowAddQuestion] = useState(false);
  const [confirmAction, setConfirmAction] = useState<
    'publish' | 'close' | null
  >(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchExam(examId);
  }, [examId, fetchExam]);

  // 初始化编辑表单
  useEffect(() => {
    if (currentExam) {
      setEditForm({
        title: currentExam.title,
        duration_minutes: currentExam.duration_minutes,
      });
    }
  }, [currentExam]);

  // 保存编辑
  const handleSave = async () => {
    try {
      await updateExam(examId, editForm);
      setIsEditing(false);
    } catch {
      // 错误由 store 处理
    }
  };

  // 发布考试
  const handlePublish = async () => {
    if (!currentExam?.questions?.length) {
      setErrorMessage('请先添加题目再发布考试');
      return;
    }
    setConfirmAction('publish');
  };

  const doPublish = async () => {
    setConfirmAction(null);
    try {
      await publishExam(examId);
      await fetchExam(examId);
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : '发布失败');
    }
  };

  // 关闭考试
  const handleClose = async () => {
    setConfirmAction('close');
  };

  const doClose = async () => {
    setConfirmAction(null);
    try {
      await closeExam(examId);
      await fetchExam(examId);
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : '关闭失败');
    }
  };

  if (isLoadingExam) {
    return (
      <div className='max-w-4xl mx-auto'>
        <div className='bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center'>
          <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto'></div>
          <p className='text-gray-500 mt-4'>加载中...</p>
        </div>
      </div>
    );
  }

  if (!currentExam) {
    return (
      <div className='max-w-4xl mx-auto'>
        <div className='bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center'>
          <p className='text-gray-500'>考试不存在</p>
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

  const isDraft = currentExam.status === 'draft';
  const isPublished = currentExam.status === 'published';

  return (
    <div className='max-w-4xl mx-auto'>
      {/* 页面头部 */}
      <div className='bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-4'>
            <button
              onClick={() => onNavigate?.('exams')}
              className='p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg'
            >
              <ArrowLeft className='w-5 h-5' />
            </button>
            <div>
              {isEditing ? (
                <input
                  type='text'
                  value={editForm.title || ''}
                  onChange={e =>
                    setEditForm({ ...editForm, title: e.target.value })
                  }
                  className='text-2xl font-bold text-gray-900 border-b-2 border-blue-500 focus:outline-none'
                />
              ) : (
                <h1 className='text-2xl font-bold text-gray-900'>
                  {currentExam.title}
                </h1>
              )}
              <div className='flex items-center gap-4 mt-1 text-sm text-gray-500'>
                <span className='flex items-center gap-1'>
                  <Clock className='w-4 h-4' />
                  {isEditing ? (
                    <input
                      type='number'
                      value={editForm.duration_minutes || 60}
                      onChange={e =>
                        setEditForm({
                          ...editForm,
                          duration_minutes: parseInt(e.target.value),
                        })
                      }
                      className='w-16 border rounded px-2 py-0.5'
                    />
                  ) : (
                    currentExam.duration_minutes
                  )}{' '}
                  分钟
                </span>
                <span className='flex items-center gap-1'>
                  <FileText className='w-4 h-4' />
                  {currentExam.questions?.length || 0} 题
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    isDraft
                      ? 'bg-gray-100 text-gray-600'
                      : isPublished
                        ? 'bg-green-100 text-green-600'
                        : 'bg-red-100 text-red-600'
                  }`}
                >
                  {isDraft ? '草稿' : isPublished ? '进行中' : '已结束'}
                </span>
              </div>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className='flex items-center gap-2'>
            {isDraft && (
              <>
                {isEditing ? (
                  <>
                    <button
                      onClick={handleSave}
                      className='flex items-center gap-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700'
                    >
                      <Check className='w-4 h-4' />
                      保存
                    </button>
                    <button
                      onClick={() => setIsEditing(false)}
                      className='flex items-center gap-1 px-3 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200'
                    >
                      <X className='w-4 h-4' />
                      取消
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setIsEditing(true)}
                      className='flex items-center gap-1 px-3 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200'
                    >
                      <Edit2 className='w-4 h-4' />
                      编辑
                    </button>
                    <button
                      onClick={handlePublish}
                      className='flex items-center gap-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700'
                    >
                      <Play className='w-4 h-4' />
                      发布
                    </button>
                  </>
                )}
              </>
            )}
            {isPublished && (
              <button
                onClick={handleClose}
                className='flex items-center gap-1 px-3 py-2 bg-orange-100 text-orange-600 rounded-lg hover:bg-orange-200'
              >
                <Pause className='w-4 h-4' />
                关闭
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className='bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-6 flex justify-between items-center'>
          <span>{error}</span>
          <button
            onClick={clearError}
            className='text-red-400 hover:text-red-600'
          >
            ✕
          </button>
        </div>
      )}

      {/* 题目列表 */}
      <div className='bg-white rounded-lg shadow-sm border border-gray-200'>
        <div className='p-4 border-b border-gray-200 flex items-center justify-between'>
          <h2 className='text-lg font-semibold text-gray-900'>题目列表</h2>
          {isDraft && (
            <button
              onClick={() => setShowAddQuestion(true)}
              className='flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700'
            >
              <Plus className='w-4 h-4' />
              添加题目
            </button>
          )}
        </div>

        {currentExam.questions && currentExam.questions.length > 0 ? (
          <div className='divide-y divide-gray-100'>
            {currentExam.questions.map((question, index) => (
              <QuestionItem
                key={question.id}
                question={question}
                index={index}
                canEdit={isDraft}
              />
            ))}
          </div>
        ) : (
          <div className='p-12 text-center text-gray-500'>
            <FileText className='w-12 h-12 mx-auto mb-4 text-gray-300' />
            <p>暂无题目</p>
            {isDraft && (
              <button
                onClick={() => setShowAddQuestion(true)}
                className='mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700'
              >
                添加第一道题目
              </button>
            )}
          </div>
        )}
      </div>

      {/* 添加题目弹窗 */}
      {showAddQuestion && (
        <AddQuestionModal
          examId={examId}
          onClose={() => setShowAddQuestion(false)}
          onSuccess={() => {
            setShowAddQuestion(false);
            fetchExam(examId);
          }}
        />
      )}

      {/* 确认弹窗 */}
      {confirmAction && (
        <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50'>
          <div className='bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4'>
            <h3 className='text-lg font-semibold text-gray-900 mb-4'>
              {confirmAction === 'publish' ? '确认发布' : '确认关闭'}
            </h3>
            <p className='text-gray-600 mb-6'>
              {confirmAction === 'publish'
                ? '发布后学生将可以参加考试。确定要发布吗？'
                : '关闭后学生将无法继续答题。确定要关闭吗？'}
            </p>
            <div className='flex gap-3 justify-end'>
              <button
                onClick={() => setConfirmAction(null)}
                className='px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200'
              >
                取消
              </button>
              <button
                onClick={confirmAction === 'publish' ? doPublish : doClose}
                className={`px-4 py-2 text-white rounded-lg ${
                  confirmAction === 'publish'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                确认
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 错误提示 */}
      {errorMessage && (
        <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50'>
          <div className='bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4 text-center'>
            <X className='w-12 h-12 text-red-600 mx-auto mb-4' />
            <p className='text-lg font-medium text-gray-900 mb-4'>
              {errorMessage}
            </p>
            <button
              onClick={() => setErrorMessage(null)}
              className='px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200'
            >
              关闭
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// 题目项组件
interface QuestionItemProps {
  question: ExamQuestion;
  index: number;
  canEdit: boolean;
}

const QuestionItem: React.FC<QuestionItemProps> = ({
  question,
  index,
  canEdit,
}) => {
  const typeLabels: Record<string, string> = {
    single: '单选题',
    multiple: '多选题',
    blank: '填空题',
    short: '简答题',
  };

  return (
    <div className='p-4 hover:bg-gray-50'>
      <div className='flex items-start gap-4'>
        <span className='flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium'>
          {index + 1}
        </span>
        <div className='flex-1 min-w-0'>
          <div className='flex items-center gap-2 mb-1'>
            <span className='px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded'>
              {typeLabels[question.type] || question.type}
            </span>
            <span className='text-sm text-gray-400'>{question.score} 分</span>
          </div>
          <p className='text-gray-900 line-clamp-2'>{question.stem}</p>
          {question.options && (
            <div className='mt-2 text-sm text-gray-500'>
              {Object.entries(question.options).map(([key, value]) => (
                <div key={key} className='ml-4'>
                  {key}. {value}
                </div>
              ))}
            </div>
          )}
        </div>
        {canEdit && (
          <button className='p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg'>
            <Trash2 className='w-4 h-4' />
          </button>
        )}
      </div>
    </div>
  );
};

// 添加题目弹窗
interface AddQuestionModalProps {
  examId: number;
  onClose: () => void;
  onSuccess: () => void;
}

const AddQuestionModal: React.FC<AddQuestionModalProps> = ({
  examId,
  onClose,
  onSuccess,
}) => {
  const [mode, setMode] = useState<'manual' | 'bank'>('bank');
  const [bankQuestions, setBankQuestions] = useState<Question[]>([]);
  const [bankLoading, setBankLoading] = useState(false);
  const [bankError, setBankError] = useState('');
  const [bankPage, setBankPage] = useState(1);
  const [bankTotalPages, setBankTotalPages] = useState(1);
  const [bankKeyword, setBankKeyword] = useState('');
  const [bankType, setBankType] = useState('');
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<number[]>([]);
  const [useDefaultBankScore, setUseDefaultBankScore] = useState(true);
  const [questionType, setQuestionType] = useState<
    'single' | 'multiple' | 'blank' | 'short'
  >('single');
  const [stem, setStem] = useState('');
  const [options, setOptions] = useState({ A: '', B: '', C: '', D: '' });
  const [answer, setAnswer] = useState('A');
  const [explanation, setExplanation] = useState('');
  const [score, setScore] = useState(10);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setError('');
    if (mode !== 'bank') {
      setBankError('');
      return;
    }

    let isActive = true;
    const loadBankQuestions = async () => {
      setBankLoading(true);
      setBankError('');
      setSelectedQuestionIds([]);
      try {
        const response = await questionBankService.list({
          page: bankPage,
          page_size: 10,
          keyword: bankKeyword || undefined,
          question_type: bankType || undefined,
        });
        if (!isActive) return;
        setBankQuestions(response.items);
        setBankTotalPages(response.total_pages || 1);
      } catch (err) {
        if (!isActive) return;
        setBankError(err instanceof Error ? err.message : '加载题库失败');
        setBankQuestions([]);
        setBankTotalPages(1);
      } finally {
        if (isActive) {
          setBankLoading(false);
        }
      }
    };

    loadBankQuestions();
    return () => {
      isActive = false;
    };
  }, [mode, bankPage, bankKeyword, bankType]);

  const handleSubmit = async () => {
    if (mode === 'bank') {
      if (selectedQuestionIds.length === 0) {
        setError('请选择题库中的题目');
        return;
      }

      setIsSubmitting(true);
      setError('');

      try {
        const { addQuestionToExam } = await import('@/services/examService');
        for (const questionId of selectedQuestionIds) {
          await addQuestionToExam(examId, {
            question_id: questionId,
            score: useDefaultBankScore ? undefined : score,
          });
        }
        onSuccess();
      } catch (err) {
        setError(err instanceof Error ? err.message : '添加失败');
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    if (!stem.trim()) {
      setError('请输入题目内容');
      return;
    }

    // 验证选项（选择题）
    if (questionType === 'single' || questionType === 'multiple') {
      const filledOptions = Object.values(options).filter(v => v.trim());
      if (filledOptions.length < 2) {
        setError('请至少填写2个选项');
        return;
      }
    }

    setIsSubmitting(true);
    setError('');

    try {
      // 构建答案对象
      let answerData: unknown;
      if (questionType === 'single') {
        answerData = { correct: answer };
      } else if (questionType === 'multiple') {
        answerData = { correct: answer.split(',').map(a => a.trim()) };
      } else if (questionType === 'blank') {
        answerData = { blanks: answer.split('|').map(a => a.trim()) };
      } else {
        answerData = { points: explanation || answer };
      }

      // 过滤空选项
      const filteredOptions: Record<string, string> = {};
      Object.entries(options).forEach(([key, value]) => {
        if (value.trim()) {
          filteredOptions[key] = value;
        }
      });

      const { addQuestionToExam } = await import('@/services/examService');
      await addQuestionToExam(examId, {
        type: questionType,
        stem: stem,
        options:
          questionType === 'single' || questionType === 'multiple'
            ? filteredOptions
            : undefined,
        answer: answerData,
        explanation: explanation || undefined,
        score: score,
      });

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : '添加失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50'>
      <div className='bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto'>
        <div className='p-4 border-b border-gray-200 flex items-center justify-between'>
          <h3 className='text-lg font-semibold'>添加题目</h3>
          <button
            onClick={onClose}
            className='p-2 text-gray-400 hover:text-gray-600'
          >
            <X className='w-5 h-5' />
          </button>
        </div>

        <div className='p-6 space-y-4'>
          <div className='flex gap-2'>
            <button
              type='button'
              onClick={() => setMode('bank')}
              className={`px-3 py-1.5 text-sm rounded-lg border ${
                mode === 'bank'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              题库选择
            </button>
            <button
              type='button'
              onClick={() => setMode('manual')}
              className={`px-3 py-1.5 text-sm rounded-lg border ${
                mode === 'manual'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              手动输入
            </button>
          </div>

          {mode === 'bank' ? (
            <>
              <div className='flex flex-wrap gap-3'>
                <input
                  type='text'
                  value={bankKeyword}
                  onChange={e => {
                    setBankKeyword(e.target.value);
                    setBankPage(1);
                    setSelectedQuestionIds([]);
                  }}
                  className='flex-1 min-w-[200px] px-3 py-2 border border-gray-200 rounded-lg text-sm'
                  placeholder='搜索题目...'
                />
                <select
                  value={bankType}
                  onChange={e => {
                    setBankType(e.target.value);
                    setBankPage(1);
                    setSelectedQuestionIds([]);
                  }}
                  className='px-3 py-2 border border-gray-200 rounded-lg text-sm'
                >
                  <option value=''>全部题型</option>
                  <option value='single'>单选题</option>
                  <option value='multiple'>多选题</option>
                  <option value='blank'>填空题</option>
                  <option value='short'>简答题</option>
                </select>
              </div>

              <div className='border border-gray-200 rounded-lg overflow-hidden'>
                {bankLoading ? (
                  <div className='p-4 text-sm text-gray-500 text-center'>
                    加载中...
                  </div>
                ) : bankError ? (
                  <div className='p-4 text-sm text-red-600 text-center'>
                    {bankError}
                  </div>
                ) : bankQuestions.length === 0 ? (
                  <div className='p-4 text-sm text-gray-500 text-center'>
                    暂无题目
                  </div>
                ) : (
                  <div className='divide-y divide-gray-100 max-h-64 overflow-y-auto'>
                    {bankQuestions.map(question => (
                      <label
                        key={question.id}
                        className={`flex items-start gap-3 p-3 cursor-pointer ${
                          selectedQuestionIds.includes(question.id)
                            ? 'bg-blue-50'
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type='checkbox'
                          checked={selectedQuestionIds.includes(question.id)}
                          onChange={e => {
                            setSelectedQuestionIds(prev => {
                              if (e.target.checked) {
                                return prev.includes(question.id)
                                  ? prev
                                  : [...prev, question.id];
                              }
                              return prev.filter(id => id !== question.id);
                            });
                            if (useDefaultBankScore && question.score) {
                              setScore(question.score);
                            }
                          }}
                          className='mt-1'
                        />
                        <div className='flex-1 min-w-0'>
                          <p className='text-sm font-medium text-gray-900 line-clamp-2'>
                            [{getQuestionTypeLabel(question.type)}]{' '}
                            {question.stem}
                          </p>
                          <p className='text-xs text-gray-500 mt-1'>
                            {question.course_name
                              ? `课程: ${question.course_name}`
                              : '未关联课程'}
                          </p>
                        </div>
                        <span className='text-xs text-gray-500 whitespace-nowrap'>
                          {question.score ?? 10} 分
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              {bankQuestions.length > 0 && (
                <div className='flex items-center justify-between'>
                  <button
                    type='button'
                    onClick={() => setSelectedQuestionIds([])}
                    className='text-sm text-gray-600 hover:text-gray-900'
                  >
                    清空选择
                  </button>
                  <button
                    type='button'
                    onClick={() =>
                      setSelectedQuestionIds(bankQuestions.map(q => q.id))
                    }
                    className='text-sm text-blue-600 hover:text-blue-800'
                  >
                    本页全选
                  </button>
                </div>
              )}

              {bankTotalPages > 1 && (
                <div className='flex items-center justify-between text-sm text-gray-600'>
                  <button
                    type='button'
                    onClick={() => setBankPage(page => Math.max(1, page - 1))}
                    disabled={bankPage <= 1}
                    className='px-3 py-1 border border-gray-200 rounded disabled:opacity-50'
                  >
                    上一页
                  </button>
                  <span>
                    第 {bankPage} / {bankTotalPages} 页
                  </span>
                  <button
                    type='button'
                    onClick={() =>
                      setBankPage(page => Math.min(bankTotalPages, page + 1))
                    }
                    disabled={bankPage >= bankTotalPages}
                    className='px-3 py-1 border border-gray-200 rounded disabled:opacity-50'
                  >
                    下一页
                  </button>
                </div>
              )}

              <div>
                <div className='flex items-center justify-between mb-2'>
                  <label className='text-sm font-medium text-gray-700'>
                    分值
                  </label>
                  <label className='flex items-center gap-2 text-sm text-gray-600'>
                    <input
                      type='checkbox'
                      checked={useDefaultBankScore}
                      onChange={e => setUseDefaultBankScore(e.target.checked)}
                    />
                    使用题库默认分值
                  </label>
                </div>
                {!useDefaultBankScore && (
                  <input
                    type='number'
                    value={score}
                    onChange={e => setScore(parseInt(e.target.value) || 0)}
                    min={1}
                    max={100}
                    className='w-full px-3 py-2 border border-gray-200 rounded-lg'
                  />
                )}
                <p className='text-xs text-gray-500 mt-2'>
                  已选择 {selectedQuestionIds.length} 道题
                </p>
              </div>
            </>
          ) : (
            <>
              {/* 题型选择 */}
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-2'>
                  题目类型
                </label>
                <select
                  value={questionType}
                  onChange={e =>
                    setQuestionType(
                      e.target.value as
                        | 'single'
                        | 'multiple'
                        | 'blank'
                        | 'short'
                    )
                  }
                  className='w-full px-3 py-2 border border-gray-200 rounded-lg'
                >
                  <option value='single'>单选题</option>
                  <option value='multiple'>多选题</option>
                  <option value='blank'>填空题</option>
                  <option value='short'>简答题</option>
                </select>
              </div>

              {/* 题干 */}
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-2'>
                  题目内容
                </label>
                <textarea
                  value={stem}
                  onChange={e => setStem(e.target.value)}
                  rows={3}
                  className='w-full px-3 py-2 border border-gray-200 rounded-lg'
                  placeholder='请输入题目内容...'
                />
              </div>

              {/* 选项（选择题） */}
              {(questionType === 'single' || questionType === 'multiple') && (
                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-2'>
                    选项
                  </label>
                  <div className='space-y-2'>
                    {Object.entries(options).map(([key, value]) => (
                      <div key={key} className='flex items-center gap-2'>
                        <span className='w-6 text-center font-medium'>
                          {key}
                        </span>
                        <input
                          type='text'
                          value={value}
                          onChange={e =>
                            setOptions({ ...options, [key]: e.target.value })
                          }
                          className='flex-1 px-3 py-2 border border-gray-200 rounded-lg'
                          placeholder={`选项 ${key}`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 正确答案 */}
              {questionType === 'single' && (
                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-2'>
                    正确答案
                  </label>
                  <select
                    value={answer}
                    onChange={e => setAnswer(e.target.value)}
                    className='w-full px-3 py-2 border border-gray-200 rounded-lg'
                  >
                    <option value='A'>A</option>
                    <option value='B'>B</option>
                    <option value='C'>C</option>
                    <option value='D'>D</option>
                  </select>
                </div>
              )}

              {/* 分值 */}
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-2'>
                  分值
                </label>
                <input
                  type='number'
                  value={score}
                  onChange={e => setScore(parseInt(e.target.value) || 0)}
                  min={1}
                  max={100}
                  className='w-full px-3 py-2 border border-gray-200 rounded-lg'
                />
              </div>

              {/* 解析 */}
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-2'>
                  解析（可选）
                </label>
                <textarea
                  value={explanation}
                  onChange={e => setExplanation(e.target.value)}
                  rows={2}
                  className='w-full px-3 py-2 border border-gray-200 rounded-lg'
                  placeholder='题目解析...'
                />
              </div>
            </>
          )}

          {/* 错误提示 */}
          {error && (
            <div className='bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded-lg text-sm'>
              {error}
            </div>
          )}
        </div>

        <div className='p-4 border-t border-gray-200 flex justify-end gap-3'>
          <button
            onClick={onClose}
            className='px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200'
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className='px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50'
          >
            {isSubmitting ? '添加中...' : '添加题目'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExamDetailPage;
