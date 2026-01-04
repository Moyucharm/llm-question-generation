import React from 'react';
import { useAppStore } from '@/stores/useAppStore';
import { useGradingStatus } from './hooks';
import { RotateCcw, Printer, Trophy, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import {
  GradingStats,
  QuestionResult,
  LearningAdvice,
  GradingLoading,
  EmptyResultState,
} from './components';

/**
 * 批改结果页面
 * 显示AI批改结果和详细解析
 */
export const ResultPage: React.FC = () => {
  // 全局状态
  const { generation, grading, resetApp } = useAppStore();
  const quiz = generation.currentQuiz;
  const result = grading.result;

  // 批改状态
  const {
    scorePercentage,
    scoreLevel,
    scoreColor,
    correctCount,
    partialCount,
    wrongCount,
  } = useGradingStatus(result);

  // 处理打印结果
  const handlePrint = () => {
    window.print();
  };

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
