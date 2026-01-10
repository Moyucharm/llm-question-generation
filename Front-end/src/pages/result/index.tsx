import React, { useState, useCallback } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import { useGradingStatus } from './hooks';
import { RotateCcw, Printer, Trophy, CheckCircle, XCircle, AlertCircle, Save } from 'lucide-react';
import {
  GradingStats,
  QuestionResult,
  LearningAdvice,
  GradingLoading,
  EmptyResultState,
} from './components';
import { questionBankService } from '@/services/questionBankService';

/**
 * 批改结果页面
 * 显示AI批改结果和详细解析
 */
export const ResultPage: React.FC = () => {
  // 全局状态
  const { generation, grading, resetApp } = useAppStore();
  const quiz = generation.currentQuiz;
  const result = grading.result;

  // 保存到题库状态
  const [isSavingToBank, setIsSavingToBank] = useState(false);
  const [savedToBank, setSavedToBank] = useState(false);

  // 批改状态
  const {
    scorePercentage,
    scoreLevel,
    correctCount,
    partialCount,
    wrongCount,
  } = useGradingStatus(result);

  // 处理打印结果
  const handlePrint = () => {
    window.print();
  };

  // 保存到题库
  const handleSaveToBank = useCallback(async () => {
    console.log('handleSaveToBank 被调用', { quiz, questions: quiz?.questions });
    if (!quiz || !quiz.questions || quiz.questions.length === 0) {
      console.log('quiz 为空或没有题目，提前返回');
      alert('没有题目可保存');
      return;
    }

    setIsSavingToBank(true);
    try {
      // 类型映射 - 使用正确的 QuestionType 枚举值
      const typeMap: Record<string, 'single' | 'multiple' | 'blank' | 'short'> = {
        'single-choice': 'single',
        'multiple-choice': 'multiple',
        'fill-blank': 'blank',
        'short-answer': 'short',
        'code-output': 'short',
        'code-writing': 'short',
      };

      const questionsToSave = quiz.questions.map((q) => {
        // 使用 unknown 类型访问属性
        const qAny = q as unknown as Record<string, unknown>;
        const stem = String(qAny.question || '');

        // 获取答案和选项
        let answer: unknown = qAny.correctAnswer ?? qAny.correctAnswers ?? qAny.referenceAnswer ?? qAny.correctOutput ?? '';
        let options: Record<string, string> | undefined;

        if (q.type.includes('choice') && Array.isArray(qAny.options)) {
          options = (qAny.options as string[]).reduce((acc, opt, idx) => {
            acc[String.fromCharCode(65 + idx)] = opt;
            return acc;
          }, {} as Record<string, string>);
          // 转换数字索引为字母
          if (typeof answer === 'number') {
            answer = String.fromCharCode(65 + (answer as number));
          } else if (Array.isArray(answer)) {
            answer = (answer as number[]).map(i => String.fromCharCode(65 + i));
          }
        }

        return {
          type: typeMap[q.type] || 'short',
          stem,
          options,
          answer,
          explanation: '',
          difficulty: 3,
          score: 10,
          status: 'draft' as const,
        };
      });

      await questionBankService.batchCreate({ questions: questionsToSave });
      setSavedToBank(true);
      alert(`成功保存 ${questionsToSave.length} 道题目到题库！`);
    } catch (err) {
      console.error('保存到题库失败:', err);
      // 检查是否为权限错误
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as { response?: { status?: number } };
        if (axiosError.response?.status === 403) {
          alert('权限不足：只有教师或管理员账号才能保存题目到题库。\n\n请使用教师账号登录后再试。');
          return;
        }
      }
      alert(err instanceof Error ? err.message : '保存失败，请检查网络连接');
    } finally {
      setIsSavingToBank(false);
    }
  }, [quiz]);

  // 如果正在批改，显示加载状态
  if (grading.status === 'grading') {
    return <GradingLoading />;
  }

  // 如果没有试卷或批改结果，显示空状态
  if (!quiz || !result) {
    return <EmptyResultState onReset={resetApp} />;
  }

  // 获取成绩颜色类名
  const getScoreColorClass = () => {
    if (scorePercentage >= 90) return 'text-green-600 bg-green-50 border-green-200';
    if (scorePercentage >= 70) return 'text-blue-600 bg-blue-50 border-blue-200';
    if (scorePercentage >= 60) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* 成绩概览卡片 */}
      <div className={`bg-white rounded-lg shadow-sm border p-6 mb-6 ${getScoreColorClass()}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-white shadow-sm">
              <Trophy className="w-8 h-8" />
            </div>
            <div>
              <div className="text-3xl font-bold">
                {result.totalScore} / {result.maxScore}
              </div>
              <div className="text-sm opacity-75">
                正确率 {scorePercentage}% · {scoreLevel}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* 保存到题库按钮 */}
            {!savedToBank && (
              <button
                onClick={handleSaveToBank}
                disabled={isSavingToBank}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-green-400 transition-colors"
              >
                <Save className="w-4 h-4" />
                {isSavingToBank ? '保存中...' : '保存到题库'}
              </button>
            )}
            {savedToBank && (
              <span className="flex items-center gap-2 px-4 py-2 text-green-600">
                ✓ 已保存
              </span>
            )}
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 rounded-lg hover:bg-gray-50 transition-colors border border-gray-200"
            >
              <Printer className="w-4 h-4" />
              打印结果
            </button>
            <button
              onClick={resetApp}
              className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 rounded-lg hover:bg-gray-50 transition-colors border border-gray-200"
            >
              <RotateCcw className="w-4 h-4" />
              重新开始
            </button>
          </div>
        </div>
      </div>

      {/* 答题统计卡片 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">答题统计</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
            <CheckCircle className="w-6 h-6 text-green-600" />
            <div>
              <div className="text-2xl font-bold text-green-600">{correctCount}</div>
              <div className="text-sm text-green-600">正确</div>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 bg-yellow-50 rounded-lg">
            <AlertCircle className="w-6 h-6 text-yellow-600" />
            <div>
              <div className="text-2xl font-bold text-yellow-600">{partialCount}</div>
              <div className="text-sm text-yellow-600">部分正确</div>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 bg-red-50 rounded-lg">
            <XCircle className="w-6 h-6 text-red-600" />
            <div>
              <div className="text-2xl font-bold text-red-600">{wrongCount}</div>
              <div className="text-sm text-red-600">错误</div>
            </div>
          </div>
        </div>
      </div>

      {/* 题目详细解析 */}
      <div className="space-y-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900">题目解析</h3>
        {quiz.questions.map((question, index) => {
          const questionResult = result.results.find(
            r => r.questionId === question.id
          );
          if (!questionResult) return null;

          return (
            <div key={question.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <QuestionResult
                question={question}
                questionIndex={index}
                score={questionResult.score}
                feedback={questionResult.feedback}
              />
            </div>
          );
        })}
      </div>

      {/* 总结建议 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <LearningAdvice scorePercentage={scorePercentage} />
      </div>
    </div>
  );
};
