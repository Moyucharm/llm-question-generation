/**
 * 题目审阅页面
 * 教师在此页面审阅、编辑AI生成的题目，并保存到题库
 */

import React, { useState, useMemo } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import {
  RotateCcw,
  Save,
  Trash2,
  CheckSquare,
  Square,
  FileText,
} from 'lucide-react';
import { ReviewQuestionCard, SaveToQuestionBankModal } from './components';

/**
 * 审阅页面主组件
 */
export const ReviewPage: React.FC = () => {
  // 全局状态
  const {
    generation,
    resetGeneration,
    updateReviewQuestion,
    deleteReviewQuestion,
    toggleQuestionSelection,
    selectAllQuestions,
    deselectAllQuestions,
    setQuestionEditing,
  } = useAppStore();

  const { reviewQuestions } = generation;

  // 本地状态
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // 计算选中数量
  const selectedCount = useMemo(
    () => reviewQuestions.filter(q => q.isSelected).length,
    [reviewQuestions]
  );

  // 计算是否全选
  const isAllSelected = useMemo(
    () => reviewQuestions.length > 0 && selectedCount === reviewQuestions.length,
    [reviewQuestions.length, selectedCount]
  );

  // 获取选中的题目
  const selectedQuestions = useMemo(
    () => reviewQuestions.filter(q => q.isSelected),
    [reviewQuestions]
  );

  // 切换全选
  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      deselectAllQuestions();
    } else {
      selectAllQuestions();
    }
  };

  // 批量删除
  const handleBatchDelete = () => {
    if (selectedCount === 0) return;
    setShowDeleteConfirm(true);
  };

  // 确认删除
  const confirmDelete = () => {
    // 从后往前删除，避免索引问题
    const indicesToDelete = reviewQuestions
      .map((q, i) => (q.isSelected ? i : -1))
      .filter(i => i !== -1)
      .reverse();

    indicesToDelete.forEach(index => deleteReviewQuestion(index));
    setShowDeleteConfirm(false);
  };

  // 保存成功回调
  const handleSaveSuccess = () => {
    // 可以在这里添加保存成功后的逻辑
    // 比如清除已保存的题目或者显示提示
  };

  // 如果没有题目，显示空状态
  if (reviewQuestions.length === 0) {
    return (
      <div className='max-w-4xl mx-auto'>
        <div className='bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center'>
          <FileText className='w-16 h-16 text-gray-300 mx-auto mb-4' />
          <h2 className='text-xl font-semibold text-gray-700 mb-2'>
            暂无可审阅的题目
          </h2>
          <p className='text-gray-500 mb-6'>
            请先生成题目，然后在此页面进行审阅和编辑
          </p>
          <button
            onClick={resetGeneration}
            className='px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors'
          >
            返回生成页面
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className='max-w-4xl mx-auto'>
      {/* 页面头部 */}
      <div className='bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6'>
        <div className='flex items-center justify-between mb-4'>
          <div>
            <h2 className='text-xl font-semibold text-gray-900 flex items-center gap-2'>
              📝 题目审阅
            </h2>
            <p className='text-sm text-gray-500 mt-1'>
              共生成 {reviewQuestions.length} 道题目，已选中{' '}
              <span className='text-blue-600 font-medium'>{selectedCount}</span>{' '}
              道
            </p>
          </div>
          <button
            onClick={resetGeneration}
            className='flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors'
          >
            <RotateCcw className='w-4 h-4' />
            返回生成
          </button>
        </div>

        {/* 操作栏 */}
        <div className='flex items-center gap-3 pt-4 border-t border-gray-200'>
          {/* 全选按钮 */}
          <button
            onClick={handleToggleSelectAll}
            className='flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors'
          >
            {isAllSelected ? (
              <CheckSquare className='w-4 h-4 text-blue-600' />
            ) : (
              <Square className='w-4 h-4' />
            )}
            {isAllSelected ? '取消全选' : '全选'}
          </button>

          <div className='h-5 w-px bg-gray-300' />

          {/* 批量删除 */}
          <button
            onClick={handleBatchDelete}
            disabled={selectedCount === 0}
            className='flex items-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
          >
            <Trash2 className='w-4 h-4' />
            删除选中
            {selectedCount > 0 && (
              <span className='text-xs'>({selectedCount})</span>
            )}
          </button>

          <div className='flex-1' />

          {/* 保存到题库 */}
          <button
            onClick={() => setShowSaveModal(true)}
            disabled={selectedCount === 0}
            className='flex items-center gap-2 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
          >
            <Save className='w-4 h-4' />
            保存到题库
            {selectedCount > 0 && (
              <span className='text-xs'>({selectedCount})</span>
            )}
          </button>
        </div>
      </div>

      {/* 题目列表 */}
      <div className='space-y-4'>
        {reviewQuestions.map((question, index) => (
          <ReviewQuestionCard
            key={question.id}
            question={question}
            index={index}
            onUpdate={updateReviewQuestion}
            onDelete={deleteReviewQuestion}
            onToggleSelect={toggleQuestionSelection}
            onSetEditing={setQuestionEditing}
          />
        ))}
      </div>

      {/* 底部操作栏 */}
      <div className='bg-white rounded-lg shadow-sm border border-gray-200 p-4 mt-6 sticky bottom-4'>
        <div className='flex items-center justify-between'>
          <p className='text-gray-600'>
            已选中{' '}
            <span className='text-blue-600 font-semibold'>{selectedCount}</span>{' '}
            / {reviewQuestions.length} 道题目
          </p>
          <div className='flex items-center gap-3'>
            <button
              onClick={resetGeneration}
              className='px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors'
            >
              返回生成
            </button>
            <button
              onClick={() => setShowSaveModal(true)}
              disabled={selectedCount === 0}
              className='px-6 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2'
            >
              <Save className='w-4 h-4' />
              保存选中题目到题库
            </button>
          </div>
        </div>
      </div>

      {/* 保存到题库弹窗 */}
      <SaveToQuestionBankModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        questions={selectedQuestions}
        onSaveSuccess={handleSaveSuccess}
      />

      {/* 删除确认弹窗 */}
      {showDeleteConfirm && (
        <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50'>
          <div className='bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4'>
            <h3 className='text-lg font-semibold text-gray-900 mb-2'>
              确认删除
            </h3>
            <p className='text-gray-600 mb-6'>
              确定要删除选中的 {selectedCount} 道题目吗？此操作无法撤销。
            </p>
            <div className='flex justify-end gap-3'>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className='px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors'
              >
                取消
              </button>
              <button
                onClick={confirmDelete}
                className='px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg transition-colors'
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
