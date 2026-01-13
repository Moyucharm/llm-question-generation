/**
 * 考试详情页面
 * 支持查看/编辑考试信息、添加题目、发布考试
 */

import React, { useEffect, useState, useCallback } from 'react';
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
  Users,
  ChevronRight,
  GripVertical,
  Save,
} from 'lucide-react';
import { useExamStore } from '@/stores/useExamStore';
import type { ExamQuestion, UpdateExamRequest, Attempt } from '@/types/exam';
import {
  questionBankService,
  getQuestionTypeLabel,
} from '@/services/questionBankService';
import {
  getExamAttempts,
  removeQuestionFromExam,
  updateQuestionScore,
  reorderExamQuestions,
} from '@/services/examService';
import type { Question } from '@/services/questionBankService';

interface ExamDetailPageProps {
  examId: number;
  onNavigate?: (page: string, examId?: number, attemptId?: number) => void;
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

  // 答卷列表状态
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [attemptsLoading, setAttemptsLoading] = useState(false);
  const [showAttempts, setShowAttempts] = useState(false);

  useEffect(() => {
    fetchExam(examId);
  }, [examId, fetchExam]);

  // 加载答卷列表
  const loadAttempts = async () => {
    if (attemptsLoading) return;
    setAttemptsLoading(true);
    try {
      const data = await getExamAttempts(examId);
      setAttempts(data.items);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : '获取答卷列表失败');
    } finally {
      setAttemptsLoading(false);
    }
  };

  // 切换答卷列表显示
  const toggleAttempts = () => {
    if (!showAttempts && attempts.length === 0) {
      loadAttempts();
    }
    setShowAttempts(!showAttempts);
  };

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
      <QuestionList
        examId={examId}
        questions={currentExam.questions || []}
        canEdit={isDraft}
        onAddQuestion={() => setShowAddQuestion(true)}
        onRefresh={() => fetchExam(examId)}
      />

      {/* 答卷管理区域（教师功能） */}
      {(isPublished || currentExam.status === 'closed') && (
        <div className='bg-white rounded-lg shadow-sm border border-gray-200 mt-6'>
          <div
            className='p-4 border-b border-gray-200 flex items-center justify-between cursor-pointer hover:bg-gray-50'
            onClick={toggleAttempts}
          >
            <div className='flex items-center gap-2'>
              <Users className='w-5 h-5 text-blue-600' />
              <h2 className='text-lg font-semibold text-gray-900'>
                答卷管理
              </h2>
              <span className='px-2 py-0.5 bg-blue-100 text-blue-600 text-xs rounded-full'>
                {currentExam.attempt_count || 0} 份
              </span>
            </div>
            <ChevronRight
              className={`w-5 h-5 text-gray-400 transition-transform ${
                showAttempts ? 'rotate-90' : ''
              }`}
            />
          </div>

          {showAttempts && (
            <div className='p-4'>
              {attemptsLoading ? (
                <div className='text-center py-8'>
                  <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto'></div>
                  <p className='text-gray-500 mt-2'>加载中...</p>
                </div>
              ) : attempts.length === 0 ? (
                <div className='text-center py-8 text-gray-500'>
                  <Users className='w-12 h-12 mx-auto mb-2 text-gray-300' />
                  <p>暂无答卷</p>
                </div>
              ) : (
                <div className='divide-y divide-gray-100'>
                  {attempts.map(attempt => (
                    <div
                      key={attempt.id}
                      className='py-3 flex items-center justify-between hover:bg-gray-50 px-2 rounded cursor-pointer'
                      onClick={() => onNavigate?.('exam-grade', examId, attempt.id)}
                    >
                      <div className='flex items-center gap-3'>
                        <div className='w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium'>
                          {attempt.student_name?.[0] || '?'}
                        </div>
                        <div>
                          <p className='font-medium text-gray-900'>
                            {attempt.student_name || '未知学生'}
                          </p>
                          <p className='text-xs text-gray-500'>
                            提交时间:{' '}
                            {attempt.submitted_at
                              ? new Date(attempt.submitted_at).toLocaleString()
                              : '未提交'}
                          </p>
                        </div>
                      </div>
                      <div className='flex items-center gap-3'>
                        <div className='text-right'>
                          <p className='font-bold text-lg text-blue-600'>
                            {attempt.total_score ?? '--'}
                          </p>
                          <p className='text-xs text-gray-400'>
                            {attempt.is_graded_by_teacher ? (
                              <span className='text-green-600'>已批改</span>
                            ) : attempt.status === 'submitted' || attempt.status === 'ai_graded' || attempt.status === 'graded' ? (
                              <span className='text-yellow-600'>待批改</span>
                            ) : (
                              <span className='text-gray-400'>进行中</span>
                            )}
                          </p>
                        </div>
                        <ChevronRight className='w-5 h-5 text-gray-300' />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

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

// 题目列表组件（支持拖动排序和编辑分值）
interface QuestionListProps {
  examId: number;
  questions: ExamQuestion[];
  canEdit: boolean;
  onAddQuestion: () => void;
  onRefresh: () => void;
}

const QuestionList: React.FC<QuestionListProps> = ({
  examId,
  questions,
  canEdit,
  onAddQuestion,
  onRefresh,
}) => {
  const [localQuestions, setLocalQuestions] = useState<ExamQuestion[]>(questions);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editScore, setEditScore] = useState<number>(0);
  const [isDeleting, setIsDeleting] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasOrderChanged, setHasOrderChanged] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 同步外部数据
  useEffect(() => {
    setLocalQuestions(questions);
    setHasOrderChanged(false);
  }, [questions]);

  const typeLabels: Record<string, string> = {
    single: '单选题',
    multiple: '多选题',
    blank: '填空题',
    short: '简答题',
  };

  // 开始编辑分值
  const handleStartEdit = (question: ExamQuestion) => {
    setEditingId(question.id);
    setEditScore(question.score);
  };

  // 保存分值
  const handleSaveScore = async (questionId: number) => {
    try {
      setIsSaving(true);
      await updateQuestionScore(examId, questionId, editScore);
      setEditingId(null);
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setIsSaving(false);
    }
  };

  // 删除题目
  const handleDelete = async (questionId: number) => {
    try {
      setIsDeleting(questionId);
      await removeQuestionFromExam(examId, questionId);
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败');
    } finally {
      setIsDeleting(null);
    }
  };

  // 拖动开始
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  // 拖动经过
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index);
    }
  };

  // 拖动离开
  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  // 拖动结束
  const handleDrop = (targetIndex: number) => {
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const newQuestions = [...localQuestions];
    const [draggedItem] = newQuestions.splice(draggedIndex, 1);
    newQuestions.splice(targetIndex, 0, draggedItem);
    setLocalQuestions(newQuestions);
    setHasOrderChanged(true);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // 保存排序
  const handleSaveOrder = async () => {
    try {
      setIsSaving(true);
      const orders = localQuestions.map((q, index) => ({
        question_id: q.id,
        order: index + 1,
      }));
      await reorderExamQuestions(examId, orders);
      setHasOrderChanged(false);
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存排序失败');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className='bg-white rounded-lg shadow-sm border border-gray-200'>
      <div className='p-4 border-b border-gray-200 flex items-center justify-between'>
        <h2 className='text-lg font-semibold text-gray-900'>题目列表</h2>
        <div className='flex items-center gap-2'>
          {hasOrderChanged && canEdit && (
            <button
              onClick={handleSaveOrder}
              disabled={isSaving}
              className='flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50'
            >
              <Save className='w-4 h-4' />
              {isSaving ? '保存中...' : '保存排序'}
            </button>
          )}
          {canEdit && (
            <button
              onClick={onAddQuestion}
              className='flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700'
            >
              <Plus className='w-4 h-4' />
              添加题目
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className='mx-4 mt-4 bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded-lg text-sm flex justify-between items-center'>
          <span>{error}</span>
          <button onClick={() => setError(null)} className='text-red-400 hover:text-red-600'>✕</button>
        </div>
      )}

      {localQuestions.length > 0 ? (
        <div className='divide-y divide-gray-100'>
          {localQuestions.map((question, index) => (
            <div
              key={question.id}
              draggable={canEdit}
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragLeave={handleDragLeave}
              onDrop={() => handleDrop(index)}
              onDragEnd={() => { setDraggedIndex(null); setDragOverIndex(null); }}
              className={`p-4 transition-colors ${
                draggedIndex === index ? 'opacity-50 bg-blue-50' : ''
              } ${
                dragOverIndex === index ? 'bg-blue-100 border-t-2 border-blue-500' : ''
              } ${canEdit ? 'hover:bg-gray-50' : ''}`}
            >
              <div className='flex items-start gap-3'>
                {/* 拖动手柄 */}
                {canEdit && (
                  <div className='flex-shrink-0 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 pt-1'>
                    <GripVertical className='w-5 h-5' />
                  </div>
                )}

                {/* 序号 */}
                <span className='flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium'>
                  {index + 1}
                </span>

                {/* 题目内容 */}
                <div className='flex-1 min-w-0'>
                  <div className='flex items-center gap-2 mb-1'>
                    <span className='px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded'>
                      {typeLabels[question.type] || question.type}
                    </span>
                    {editingId === question.id ? (
                      <div className='flex items-center gap-1'>
                        <input
                          type='number'
                          value={editScore}
                          onChange={(e) => setEditScore(parseInt(e.target.value) || 0)}
                          min={0}
                          max={100}
                          className='w-16 px-2 py-0.5 border border-gray-300 rounded text-sm'
                          autoFocus
                        />
                        <span className='text-sm text-gray-400'>分</span>
                        <button
                          onClick={() => handleSaveScore(question.id)}
                          disabled={isSaving}
                          className='p-1 text-green-600 hover:bg-green-50 rounded'
                        >
                          <Check className='w-4 h-4' />
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className='p-1 text-gray-400 hover:bg-gray-100 rounded'
                        >
                          <X className='w-4 h-4' />
                        </button>
                      </div>
                    ) : (
                      <span
                        className={`text-sm text-gray-400 ${canEdit ? 'cursor-pointer hover:text-blue-600' : ''}`}
                        onClick={() => canEdit && handleStartEdit(question)}
                        title={canEdit ? '点击编辑分值' : undefined}
                      >
                        {question.score} 分
                      </span>
                    )}
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

                {/* 操作按钮 */}
                {canEdit && (
                  <div className='flex items-center gap-1'>
                    <button
                      onClick={() => handleStartEdit(question)}
                      className='p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg'
                      title='编辑分值'
                    >
                      <Edit2 className='w-4 h-4' />
                    </button>
                    <button
                      onClick={() => handleDelete(question.id)}
                      disabled={isDeleting === question.id}
                      className='p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50'
                      title='删除题目'
                    >
                      <Trash2 className='w-4 h-4' />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className='p-12 text-center text-gray-500'>
          <FileText className='w-12 h-12 mx-auto mb-4 text-gray-300' />
          <p>暂无题目</p>
          {canEdit && (
            <button
              onClick={onAddQuestion}
              className='mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700'
            >
              添加第一道题目
            </button>
          )}
        </div>
      )}

      {canEdit && localQuestions.length > 0 && (
        <div className='p-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-500 text-center'>
          💡 拖动题目可调整顺序，点击分值可编辑
        </div>
      )}
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
