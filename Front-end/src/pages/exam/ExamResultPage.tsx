/**
 * 学生考试结果页面
 * 显示考试成绩和答题详情
 */

import { useState, useEffect } from 'react';
import { ArrowLeft, CheckCircle, XCircle, Clock, Award, AlertCircle, AlertTriangle } from 'lucide-react';
import { Card, Button, Spinner } from '@/components/UI';
import { getExamResult } from '@/services/examService';
import type { StudentExamResult } from '@/types/exam';

interface ExamResultPageProps {
  examId: number;
  onNavigate: (page: string, examId?: number) => void;
}

export function ExamResultPage({ examId, onNavigate }: ExamResultPageProps) {
  const [result, setResult] = useState<StudentExamResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchResult = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getExamResult(examId);
        setResult(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : '获取考试结果失败');
      } finally {
        setLoading(false);
      }
    };

    fetchResult();
  }, [examId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !result) {
    return (
      <Card className="p-6">
        <div className="text-center text-red-500">
          <AlertCircle className="w-12 h-12 mx-auto mb-4" />
          <p>{error || '未找到考试结果'}</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => onNavigate('exams')}
          >
            返回考试列表
          </Button>
        </div>
      </Card>
    );
  }

  const scorePercentage = result.max_score > 0
    ? ((result.score || 0) / result.max_score * 100).toFixed(1)
    : 0;

  // 判断单题状态的辅助函数
  const isAnswerCorrect = (answer: typeof result.answers[0]) => {
    // 如果有分数，根据分数判断
    if (answer.score !== null && answer.score !== undefined) {
      return answer.score === answer.max_score;
    }
    // 否则看 is_correct 字段
    return answer.is_correct === true;
  };

  const isAnswerWrong = (answer: typeof result.answers[0]) => {
    // 如果有分数，根据分数判断
    if (answer.score !== null && answer.score !== undefined) {
      return answer.score === 0;
    }
    // 否则看 is_correct 字段
    return answer.is_correct === false;
  };

  const isAnswerPartial = (answer: typeof result.answers[0]) => {
    // 部分正确：有分数，且分数大于0但小于满分
    if (answer.score !== null && answer.score !== undefined) {
      return answer.score > 0 && answer.score < answer.max_score;
    }
    return false;
  };

  const isAnswerPending = (answer: typeof result.answers[0]) => {
    // 待批改：没有分数且 is_correct 为 null
    return (answer.is_correct === null || answer.is_correct === undefined) &&
           (answer.score === null || answer.score === undefined);
  };

  // 统计各状态数量
  const correctCount = result.answers.filter(a => isAnswerCorrect(a)).length;
  const wrongCount = result.answers.filter(a => isAnswerWrong(a)).length;
  const partialCount = result.answers.filter(a => isAnswerPartial(a)).length;
  const pendingCount = result.answers.filter(a => isAnswerPending(a)).length;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 返回按钮 */}
      <Button
        variant="ghost"
        onClick={() => onNavigate('exams')}
        className="flex items-center gap-2"
      >
        <ArrowLeft className="w-4 h-4" />
        返回考试列表
      </Button>

      {/* 成绩概览卡片 */}
      <Card className="p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{result.exam_title}</h1>
          <p className="text-gray-500 mb-6">
            {result.is_final ? '最终成绩' : '初步成绩（待教师确认）'}
          </p>

          {/* 分数显示 */}
          <div className="flex items-center justify-center gap-2 mb-4">
            <Award className="w-8 h-8 text-yellow-500" />
            <span className="text-5xl font-bold text-blue-600">
              {result.score ?? '--'}
            </span>
            <span className="text-2xl text-gray-400">/ {result.max_score}</span>
          </div>

          <div className="text-lg text-gray-600 mb-6">
            得分率: {scorePercentage}%
          </div>

          {/* 统计信息 */}
          <div className="grid grid-cols-4 gap-3 max-w-lg mx-auto">
            <div className="bg-green-50 rounded-lg p-3">
              <div className="flex items-center justify-center gap-1 text-green-600">
                <CheckCircle className="w-5 h-5" />
                <span className="font-semibold">{correctCount}</span>
              </div>
              <p className="text-sm text-green-600">正确</p>
            </div>
            <div className="bg-orange-50 rounded-lg p-3">
              <div className="flex items-center justify-center gap-1 text-orange-600">
                <AlertTriangle className="w-5 h-5" />
                <span className="font-semibold">{partialCount}</span>
              </div>
              <p className="text-sm text-orange-600">部分对</p>
            </div>
            <div className="bg-red-50 rounded-lg p-3">
              <div className="flex items-center justify-center gap-1 text-red-600">
                <XCircle className="w-5 h-5" />
                <span className="font-semibold">{wrongCount}</span>
              </div>
              <p className="text-sm text-red-600">错误</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center justify-center gap-1 text-gray-600">
                <Clock className="w-5 h-5" />
                <span className="font-semibold">{pendingCount}</span>
              </div>
              <p className="text-sm text-gray-600">待批改</p>
            </div>
          </div>

          {/* 时间信息 */}
          <div className="mt-6 text-sm text-gray-500">
            <p>提交时间: {result.submitted_at ? new Date(result.submitted_at).toLocaleString() : '--'}</p>
            {result.is_final && result.graded_at && (
              <p>批改时间: {new Date(result.graded_at).toLocaleString()}</p>
            )}
          </div>
        </div>
      </Card>

      {/* 答题详情 */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">答题详情</h2>
        <div className="space-y-6">
          {result.answers.map((answer, index) => (
            <div
              key={answer.question_id}
              className={`border rounded-lg p-4 ${
                isAnswerCorrect(answer)
                  ? 'border-green-200 bg-green-50'
                  : isAnswerPartial(answer)
                  ? 'border-orange-200 bg-orange-50'
                  : isAnswerWrong(answer)
                  ? 'border-red-200 bg-red-50'
                  : 'border-gray-200 bg-gray-50'
              }`}
            >
              {/* 题目头部 */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="bg-gray-200 text-gray-700 text-sm font-medium px-2 py-1 rounded">
                    第 {index + 1} 题
                  </span>
                  <span className="text-sm text-gray-500">
                    ({answer.question_type === 'single' ? '单选' :
                      answer.question_type === 'multiple' ? '多选' :
                      answer.question_type === 'blank' ? '填空' : '简答'})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {isAnswerCorrect(answer) ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : isAnswerPartial(answer) ? (
                    <AlertTriangle className="w-5 h-5 text-orange-500" />
                  ) : isAnswerWrong(answer) ? (
                    <XCircle className="w-5 h-5 text-red-500" />
                  ) : (
                    <Clock className="w-5 h-5 text-gray-400" />
                  )}
                  <span className="font-medium">
                    {answer.score ?? '--'} / {answer.max_score}
                  </span>
                </div>
              </div>

              {/* 题干 */}
              <p className="text-gray-900 mb-3">{answer.question_stem}</p>

              {/* 选项（选择题） */}
              {answer.question_options && (
                <div className="space-y-2 mb-3">
                  {Object.entries(answer.question_options).map(([key, value]) => {
                    const isSelected = answer.question_type === 'single'
                      ? answer.student_answer === key
                      : Array.isArray(answer.student_answer) && answer.student_answer.includes(key);
                    const isCorrect = answer.correct_answer && (
                      answer.question_type === 'single'
                        ? (answer.correct_answer as { correct: string }).correct === key
                        : Array.isArray((answer.correct_answer as { correct: string[] }).correct) &&
                          (answer.correct_answer as { correct: string[] }).correct.includes(key)
                    );

                    return (
                      <div
                        key={key}
                        className={`flex items-center gap-2 p-2 rounded ${
                          isSelected && isCorrect
                            ? 'bg-green-100'
                            : isSelected && !isCorrect
                            ? 'bg-red-100'
                            : isCorrect
                            ? 'bg-green-100'
                            : ''
                        }`}
                      >
                        <span className="font-medium text-gray-600">{key}.</span>
                        <span>{value}</span>
                        {isSelected && (
                          <span className="text-sm text-blue-600 ml-auto">你的选择</span>
                        )}
                        {isCorrect && result.is_final && (
                          <span className="text-sm text-green-600 ml-2">正确答案</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* 填空/简答题答案 */}
              {(answer.question_type === 'blank' || answer.question_type === 'short') && (
                <div className="space-y-2 mb-3">
                  <div className="p-2 bg-white rounded border">
                    <p className="text-sm text-gray-500">你的答案:</p>
                    <p className="text-gray-900">
                      {Array.isArray(answer.student_answer)
                        ? answer.student_answer.join(', ')
                        : String(answer.student_answer || '未作答')}
                    </p>
                  </div>
                  {result.is_final && answer.correct_answer && (
                    <div className="p-2 bg-green-50 rounded border border-green-200">
                      <p className="text-sm text-green-600">参考答案:</p>
                      <p className="text-green-900">
                        {answer.question_type === 'blank'
                          ? (() => {
                              // 兼容多种答案格式: { blanks: [...] } 或 { correct: [...] } 或直接数组
                              const ans = answer.correct_answer as Record<string, unknown>;
                              const blanks = ans.blanks || ans.correct || (Array.isArray(answer.correct_answer) ? answer.correct_answer : null);
                              if (Array.isArray(blanks)) {
                                return blanks.join(', ');
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

              {/* 反馈 */}
              {answer.feedback && (
                <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm font-medium text-blue-800 mb-1">评语:</p>
                  <p className="text-blue-700">{answer.feedback}</p>
                </div>
              )}

              {/* 解析 */}
              {result.is_final && answer.explanation && (
                <div className="mt-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <p className="text-sm font-medium text-yellow-800 mb-1">题目解析:</p>
                  <p className="text-yellow-700">{answer.explanation}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
