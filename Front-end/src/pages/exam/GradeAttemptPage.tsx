/**
 * 教师批改答卷页面
 * 查看学生答案、AI评分参考、修改评分、确认成绩
 */

import { useState, useEffect } from 'react';
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
  Save,
  Check,
  User,
  Mail,
  Sparkles,
  Copy,
  ChevronDown,
  ChevronUp,
  Lightbulb,
} from 'lucide-react';
import { Card, Button, Spinner, Modal } from '@/components/UI';
import {
  getAttemptDetail,
  updateAttemptScores,
  confirmGrade,
} from '@/services/examService';
import type { AttemptDetail, UpdateAnswerScoreRequest } from '@/types/exam';

interface GradeAttemptPageProps {
  examId: number;
  attemptId: number;
  onNavigate: (page: string, examId?: number) => void;
}

export function GradeAttemptPage({
  examId,
  attemptId,
  onNavigate,
}: GradeAttemptPageProps) {
  const [attempt, setAttempt] = useState<AttemptDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [expandedExplanations, setExpandedExplanations] = useState<Set<number>>(new Set());

  // 存储修改过的评分
  const [modifiedScores, setModifiedScores] = useState<
    Record<number, { score: number; feedback: string }>
  >({});

  useEffect(() => {
    const fetchAttempt = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getAttemptDetail(examId, attemptId);
        setAttempt(data);
        // 初始化修改记录
        const initial: Record<number, { score: number; feedback: string }> = {};
        data.answers.forEach(a => {
          initial[a.question_id] = {
            score: a.teacher_score ?? a.ai_score ?? a.score ?? 0,
            feedback: a.teacher_feedback ?? a.ai_feedback ?? '',
          };
        });
        setModifiedScores(initial);
      } catch (err) {
        setError(err instanceof Error ? err.message : '获取答卷失败');
      } finally {
        setLoading(false);
      }
    };

    fetchAttempt();
  }, [examId, attemptId]);

  // 更新单题评分
  const handleScoreChange = (questionId: number, score: number) => {
    setModifiedScores(prev => ({
      ...prev,
      [questionId]: { ...prev[questionId], score },
    }));
  };

  // 更新单题反馈
  const handleFeedbackChange = (questionId: number, feedback: string) => {
    setModifiedScores(prev => ({
      ...prev,
      [questionId]: { ...prev[questionId], feedback },
    }));
  };

  // 采纳AI评分（单题）
  const handleAdoptAIScore = (questionId: number, aiScore: number, aiFeedback: string) => {
    setModifiedScores(prev => ({
      ...prev,
      [questionId]: {
        score: aiScore,
        feedback: aiFeedback || prev[questionId]?.feedback || '',
      },
    }));
  };

  // 一键采纳所有AI评分
  const handleAdoptAllAIScores = () => {
    if (!attempt) return;
    const newScores: Record<number, { score: number; feedback: string }> = {};
    attempt.answers.forEach(a => {
      newScores[a.question_id] = {
        score: a.ai_score ?? a.score ?? 0,
        feedback: a.ai_feedback ?? '',
      };
    });
    setModifiedScores(newScores);
  };

  // 切换解析展开状态
  const toggleExplanation = (questionId: number) => {
    setExpandedExplanations(prev => {
      const next = new Set(prev);
      if (next.has(questionId)) {
        next.delete(questionId);
      } else {
        next.add(questionId);
      }
      return next;
    });
  };

  // 保存所有评分
  const handleSaveScores = async () => {
    if (!attempt) return;

    try {
      setSaving(true);
      const scores: UpdateAnswerScoreRequest[] = Object.entries(
        modifiedScores
      ).map(([questionId, data]) => ({
        question_id: Number(questionId),
        teacher_score: data.score,
        teacher_feedback: data.feedback || undefined,
      }));

      await updateAttemptScores(examId, attemptId, { scores });

      // 刷新数据
      const updated = await getAttemptDetail(examId, attemptId);
      setAttempt(updated);

      alert('评分已保存');
    } catch (err) {
      alert(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  // 确认最终成绩
  const handleConfirmGrade = async () => {
    if (!attempt) return;

    try {
      setConfirming(true);
      // 先保存评分
      const scores: UpdateAnswerScoreRequest[] = Object.entries(
        modifiedScores
      ).map(([questionId, data]) => ({
        question_id: Number(questionId),
        teacher_score: data.score,
        teacher_feedback: data.feedback || undefined,
      }));

      await updateAttemptScores(examId, attemptId, { scores });

      // 确认成绩
      await confirmGrade(examId, attemptId, {});

      // 刷新数据
      const updated = await getAttemptDetail(examId, attemptId);
      setAttempt(updated);

      setShowConfirmModal(false);
      alert('成绩已确认');
    } catch (err) {
      alert(err instanceof Error ? err.message : '确认失败');
    } finally {
      setConfirming(false);
    }
  };

  // 计算当前总分
  const calculateTotalScore = () => {
    return Object.values(modifiedScores).reduce(
      (sum, data) => sum + data.score,
      0
    );
  };

  // 获取题型显示名称
  const getQuestionTypeName = (type: string) => {
    const typeMap: Record<string, string> = {
      single: '单选题',
      multiple: '多选题',
      blank: '填空题',
      short: '简答题',
    };
    return typeMap[type] || type;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !attempt) {
    return (
      <Card className="p-6">
        <div className="text-center text-red-500">
          <p>{error || '未找到答卷'}</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => onNavigate('exam-detail', examId)}
          >
            返回考试详情
          </Button>
        </div>
      </Card>
    );
  }

  // 检查是否有AI评分
  const hasAIScores = attempt.answers.some(a => a.ai_score !== null && a.ai_score !== undefined);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* 返回按钮 */}
      <Button
        variant="ghost"
        onClick={() => onNavigate('exam-detail', examId)}
        className="flex items-center gap-2"
      >
        <ArrowLeft className="w-4 h-4" />
        返回考试详情
      </Button>

      {/* 学生信息和总分 */}
      <Card className="p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">
              {attempt.exam_title}
            </h1>
            <div className="flex items-center gap-4 text-gray-600">
              <div className="flex items-center gap-1">
                <User className="w-4 h-4" />
                <span>{attempt.student_name}</span>
              </div>
              {attempt.student_email && (
                <div className="flex items-center gap-1">
                  <Mail className="w-4 h-4" />
                  <span>{attempt.student_email}</span>
                </div>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-2">
              提交时间:{' '}
              {attempt.submitted_at
                ? new Date(attempt.submitted_at).toLocaleString()
                : '未提交'}
            </p>
          </div>

          <div className="text-right">
            <div className="text-3xl font-bold text-blue-600">
              {calculateTotalScore()} / {attempt.max_score}
            </div>
            <p className="text-sm text-gray-500 mt-1">
              {attempt.is_graded_by_teacher ? (
                <span className="text-green-600 flex items-center justify-end gap-1">
                  <CheckCircle className="w-4 h-4" />
                  已确认成绩
                </span>
              ) : attempt.status === 'ai_graded' ? (
                <span className="text-purple-600 flex items-center justify-end gap-1">
                  <Sparkles className="w-4 h-4" />
                  AI已评分，待教师确认
                </span>
              ) : (
                <span className="text-yellow-600 flex items-center justify-end gap-1">
                  <Clock className="w-4 h-4" />
                  待批改
                </span>
              )}
            </p>
          </div>
        </div>

        {/* 快捷操作栏 */}
        {!attempt.is_graded_by_teacher && hasAIScores && (
          <div className="mt-4 pt-4 border-t flex items-center justify-between">
            <div className="flex items-center gap-2 text-purple-600">
              <Sparkles className="w-5 h-5" />
              <span className="font-medium">AI已完成评分</span>
            </div>
            <Button
              variant="outline"
              onClick={handleAdoptAllAIScores}
              className="flex items-center gap-2 text-purple-600 border-purple-300 hover:bg-purple-50"
            >
              <Copy className="w-4 h-4" />
              一键采纳全部AI评分
            </Button>
          </div>
        )}
      </Card>

      {/* 答题详情 */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">答题详情</h2>
        <div className="space-y-6">
          {attempt.answers.map((answer, index) => {
            const modified = modifiedScores[answer.question_id] || {
              score: 0,
              feedback: '',
            };
            const hasAI = answer.ai_score !== null && answer.ai_score !== undefined;
            const isExpanded = expandedExplanations.has(answer.question_id);

            return (
              <div
                key={answer.question_id}
                className="border rounded-lg overflow-hidden bg-white"
              >
                {/* 题目头部 */}
                <div className="p-4 bg-gray-50 border-b">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="bg-blue-600 text-white text-sm font-medium px-3 py-1 rounded-full">
                        {index + 1}
                      </span>
                      <span className="text-sm font-medium text-gray-600 bg-gray-200 px-2 py-1 rounded">
                        {getQuestionTypeName(answer.question_type)}
                      </span>
                      <span className="text-sm text-gray-400">
                        满分 {answer.max_score} 分
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      {answer.is_correct === true && (
                        <span className="flex items-center gap-1 text-green-600 text-sm">
                          <CheckCircle className="w-4 h-4" /> 正确
                        </span>
                      )}
                      {answer.is_correct === false && (
                        <span className="flex items-center gap-1 text-red-600 text-sm">
                          <XCircle className="w-4 h-4" /> 错误
                        </span>
                      )}
                      {answer.is_correct === null && (
                        <span className="flex items-center gap-1 text-yellow-600 text-sm">
                          <Clock className="w-4 h-4" /> 待批
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-4">
                  {/* 题干 */}
                  <p className="text-gray-900 mb-4 font-medium leading-relaxed">
                    {answer.question_stem}
                  </p>

                  {/* 选项（选择题） */}
                  {answer.question_options && (
                    <div className="space-y-2 mb-4">
                      {Object.entries(answer.question_options).map(
                        ([key, value]) => {
                          const isSelected =
                            answer.question_type === 'single'
                              ? answer.student_answer === key
                              : Array.isArray(answer.student_answer) &&
                                answer.student_answer.includes(key);
                          const isCorrect =
                            answer.correct_answer &&
                            (answer.question_type === 'single'
                              ? (answer.correct_answer as { correct: string })
                                  .correct === key
                              : Array.isArray(
                                  (answer.correct_answer as { correct: string[] })
                                    .correct
                                ) &&
                                (
                                  answer.correct_answer as { correct: string[] }
                                ).correct.includes(key));

                          return (
                            <div
                              key={key}
                              className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                                isCorrect
                                  ? 'bg-green-50 border-2 border-green-300'
                                  : isSelected && !isCorrect
                                  ? 'bg-red-50 border-2 border-red-300'
                                  : 'bg-gray-50 border border-gray-200'
                              }`}
                            >
                              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium ${
                                isCorrect
                                  ? 'bg-green-500 text-white'
                                  : isSelected
                                  ? 'bg-red-500 text-white'
                                  : 'bg-gray-300 text-gray-600'
                              }`}>
                                {key}
                              </span>
                              <span className="flex-1">{value}</span>
                              {isSelected && (
                                <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700">
                                  学生选择
                                </span>
                              )}
                              {isCorrect && (
                                <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-700">
                                  正确答案
                                </span>
                              )}
                            </div>
                          );
                        }
                      )}
                    </div>
                  )}

                  {/* 填空/简答题答案对比 */}
                  {(answer.question_type === 'blank' ||
                    answer.question_type === 'short') && (
                    <div className="grid md:grid-cols-2 gap-4 mb-4">
                      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-sm font-medium text-blue-700 mb-2 flex items-center gap-1">
                          <User className="w-4 h-4" /> 学生答案
                        </p>
                        <p className="text-gray-900 whitespace-pre-wrap">
                          {Array.isArray(answer.student_answer)
                            ? answer.student_answer.map((s, i) => (
                                <span key={i} className="inline-block bg-blue-100 px-2 py-1 rounded mr-2 mb-1">
                                  {s || '(空)'}
                                </span>
                              ))
                            : String(answer.student_answer || '未作答')}
                        </p>
                      </div>
                      {answer.correct_answer && (
                        <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                          <p className="text-sm font-medium text-green-700 mb-2 flex items-center gap-1">
                            <CheckCircle className="w-4 h-4" /> 参考答案
                          </p>
                          <p className="text-gray-900 whitespace-pre-wrap">
                            {answer.question_type === 'blank'
                              ? (() => {
                                  // 兼容多种答案格式: { blanks: [...] } 或 { correct: [...] } 或直接数组
                                  const ans = answer.correct_answer as Record<string, unknown>;
                                  const blanks = ans.blanks || ans.correct || (Array.isArray(answer.correct_answer) ? answer.correct_answer : null);
                                  if (Array.isArray(blanks)) {
                                    return blanks.map((b, i) => (
                                      <span key={i} className="inline-block bg-green-100 px-2 py-1 rounded mr-2 mb-1">
                                        {String(b)}
                                      </span>
                                    ));
                                  }
                                  return String(blanks || '无参考答案');
                                })()
                              : (() => {
                                  // 兼容多种答案格式: { reference: "..." } 或 { correct: "..." } 或直接字符串
                                  const ans = answer.correct_answer as Record<string, unknown>;
                                  const reference = ans.reference || ans.correct || (typeof answer.correct_answer === 'string' ? answer.correct_answer : null);
                                  return String(reference || '无参考答案');
                                })()}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 题目解析（可折叠） */}
                  {answer.explanation && (
                    <div className="mb-4">
                      <button
                        onClick={() => toggleExplanation(answer.question_id)}
                        className="flex items-center gap-2 text-sm text-amber-600 hover:text-amber-700"
                      >
                        <Lightbulb className="w-4 h-4" />
                        <span>题目解析</span>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                      {isExpanded && (
                        <div className="mt-2 p-3 bg-amber-50 rounded-lg border border-amber-200 text-sm text-gray-700">
                          {answer.explanation}
                        </div>
                      )}
                    </div>
                  )}

                  {/* AI 评分信息 */}
                  {hasAI && (
                    <div className="mb-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium text-purple-700 flex items-center gap-1">
                          <Sparkles className="w-4 h-4" /> AI 评分
                        </p>
                        {!attempt.is_graded_by_teacher && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              handleAdoptAIScore(
                                answer.question_id,
                                answer.ai_score ?? 0,
                                answer.ai_feedback ?? ''
                              )
                            }
                            className="text-purple-600 hover:bg-purple-100"
                          >
                            <Copy className="w-3 h-3 mr-1" />
                            采纳
                          </Button>
                        )}
                      </div>
                      <div className="flex items-start gap-4">
                        <div className="text-2xl font-bold text-purple-600">
                          {answer.ai_score ?? '--'}
                          <span className="text-sm text-purple-400 font-normal">
                            /{answer.max_score}
                          </span>
                        </div>
                        {answer.ai_feedback && (
                          <p className="flex-1 text-sm text-gray-600 bg-white/50 p-2 rounded">
                            {answer.ai_feedback}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 教师评分输入 */}
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-sm font-medium text-gray-700 mb-3">
                      教师评分
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4">
                      <div className="flex items-center gap-2">
                        <label className="text-sm text-gray-600 whitespace-nowrap">得分:</label>
                        <input
                          type="number"
                          min={0}
                          max={answer.max_score}
                          step={0.5}
                          value={modified.score}
                          onChange={e =>
                            handleScoreChange(
                              answer.question_id,
                              Math.min(
                                answer.max_score,
                                Math.max(0, Number(e.target.value) || 0)
                              )
                            )
                          }
                          className="w-24 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center font-medium"
                          disabled={attempt.is_graded_by_teacher}
                        />
                        <span className="text-gray-400">
                          / {answer.max_score}
                        </span>
                      </div>
                      <div className="flex-1">
                        <input
                          type="text"
                          placeholder="评语（可选）"
                          value={modified.feedback}
                          onChange={e =>
                            handleFeedbackChange(
                              answer.question_id,
                              e.target.value
                            )
                          }
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          disabled={attempt.is_graded_by_teacher}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* 操作按钮 */}
      {!attempt.is_graded_by_teacher && (
        <Card className="p-4 sticky bottom-4 shadow-lg border-2">
          <div className="flex items-center justify-between">
            <div className="text-gray-600">
              当前总分:{' '}
              <span className="text-2xl font-bold text-blue-600">
                {calculateTotalScore()}
              </span>{' '}
              / {attempt.max_score}
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleSaveScores}
                disabled={saving}
                className="flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {saving ? '保存中...' : '保存评分'}
              </Button>
              <Button
                onClick={() => setShowConfirmModal(true)}
                disabled={saving}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
              >
                <Check className="w-4 h-4" />
                确认成绩
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* 确认成绩弹窗 */}
      <Modal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        title="确认成绩"
      >
        <div className="p-4">
          <p className="text-gray-600 mb-4">
            确认后，学生将看到最终成绩、正确答案和解析。确定要提交吗？
          </p>
          <div className="text-center mb-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-gray-500 mb-1">最终成绩</p>
            <span className="text-4xl font-bold text-blue-600">
              {calculateTotalScore()}
            </span>
            <span className="text-gray-400 text-xl">
              {' '}
              / {attempt.max_score}
            </span>
          </div>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setShowConfirmModal(false)}
              disabled={confirming}
            >
              取消
            </Button>
            <Button
              onClick={handleConfirmGrade}
              disabled={confirming}
              className="bg-green-600 hover:bg-green-700"
            >
              {confirming ? '提交中...' : '确认提交'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
