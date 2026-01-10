/**
 * 题库管理页面
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  questionBankService,
  getQuestionTypeLabel,
  getQuestionStatusLabel,
  getDifficultyLabel,
} from '@/services/questionBankService';
import type {
  Question,
  QuestionListParams,
} from '@/services/questionBankService';
import { courseService } from '@/services/courseService';
import type { Course } from '@/services/courseService';
import { QuestionEditModal } from './QuestionEditModal';
import { QuestionImportModal } from './QuestionImportModal';
import { ConfirmModal } from '@/components/UI/ConfirmModal';

// 难度星级显示
const DifficultyStars: React.FC<{ level: number }> = ({ level }) => (
  <div className='flex gap-0.5'>
    {[1, 2, 3, 4, 5].map(i => (
      <span
        key={i}
        className={`text-sm ${i <= level ? 'text-yellow-500' : 'text-gray-300'}`}
      >
        ★
      </span>
    ))}
  </div>
);

// 状态标签颜色
const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  approved: 'bg-green-100 text-green-700',
  needs_review: 'bg-yellow-100 text-yellow-700',
  rejected: 'bg-red-100 text-red-700',
};

// 题型标签颜色
const typeColors: Record<string, string> = {
  single: 'bg-blue-100 text-blue-700',
  multiple: 'bg-purple-100 text-purple-700',
  blank: 'bg-orange-100 text-orange-700',
  short: 'bg-teal-100 text-teal-700',
};

const extractFilename = (contentDisposition: string | null): string | null => {
  if (!contentDisposition) {
    return null;
  }

  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match && utf8Match[1]) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch {
      return utf8Match[1];
    }
  }

  const asciiMatch = contentDisposition.match(/filename="?([^";]+)"?/i);
  return asciiMatch ? asciiMatch[1] : null;
};

const normalizeFilename = (filename: string): string => {
  const invalidChars = '<>:"/\\|?*';
  const sanitized = Array.from(filename)
    .map(char => {
      const code = char.codePointAt(0) ?? 0;
      if (code <= 31 || invalidChars.includes(char)) {
        return '_';
      }
      return char;
    })
    .join('')
    .trim();
  if (!sanitized) {
    return `questions_export_${Date.now()}.json`;
  }
  return sanitized.toLowerCase().endsWith('.json')
    ? sanitized
    : `${sanitized}.json`;
};

const saveBlobAsFile = (blob: Blob, filename: string) => {
  const msSaveOrOpenBlob = (
    navigator as Navigator & {
      msSaveOrOpenBlob?: (blob: Blob, defaultName?: string) => boolean;
    }
  ).msSaveOrOpenBlob;

  if (msSaveOrOpenBlob) {
    msSaveOrOpenBlob(blob, filename);
    return;
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export const QuestionBankPage: React.FC = () => {
  // 列表数据
  const [questions, setQuestions] = useState<Question[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 筛选条件
  const [params, setParams] = useState<QuestionListParams>({
    page: 1,
    page_size: 20,
  });

  // 课程列表
  const [courses, setCourses] = useState<Course[]>([]);

  // 选择状态
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // 弹窗状态
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  // 加载题目列表
  const loadQuestions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await questionBankService.list(params);
      setQuestions(response.items);
      setTotal(response.total);
      setTotalPages(response.total_pages);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, [params]);

  // 加载课程列表
  const loadCourses = useCallback(async () => {
    try {
      const response = await courseService.list();
      setCourses(response);
    } catch (err) {
      console.error('加载课程失败:', err);
    }
  }, []);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  // 全选/取消全选
  const handleSelectAll = () => {
    if (selectedIds.length === questions.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(questions.map(q => q.id));
    }
  };

  // 单选
  const handleSelect = (id: number) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  // 删除题目
  const handleDelete = async (id: number) => {
    try {
      await questionBankService.delete(id);
      await loadQuestions();
      setDeleteConfirm(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : '删除失败');
    }
  };

  // 导出选中题目
  const handleExport = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('/api/question-bank/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          question_ids: selectedIds.length > 0 ? selectedIds : undefined,
          course_id: params.course_id,
          question_type: params.question_type,
          difficulty: params.difficulty,
          status: params.status,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || '导出失败');
      }

      // 从响应头获取文件名
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename =
        extractFilename(contentDisposition) ||
        `questions_export_${Date.now()}.json`;
      filename = normalizeFilename(filename);

      // 获取 Blob 并下载
      const blob = await response.blob();
      const finalBlob =
        blob.type && blob.type !== 'application/octet-stream'
          ? blob
          : new Blob([blob], { type: 'application/json' });
      saveBlobAsFile(finalBlob, filename);

      alert(`成功导出题目！文件名: ${filename}`);
    } catch (err) {
      console.error('导出失败:', err);
      alert(err instanceof Error ? err.message : '导出失败');
    }
  };

  // 导入成功回调
  const handleImportSuccess = () => {
    setShowImportModal(false);
    loadQuestions();
  };

  // 编辑成功回调
  const handleEditSuccess = () => {
    setShowEditModal(false);
    setEditingQuestion(null);
    loadQuestions();
  };

  return (
    <div className='max-w-7xl mx-auto'>
      <div className='bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden'>
        {/* 页面头部 */}
        <div className='px-6 py-4 border-b border-gray-200 flex justify-between items-center'>
          <div>
            <h1 className='text-xl font-bold text-gray-900'>题库管理</h1>
            <p className='text-sm text-gray-500 mt-1'>共 {total} 道题目</p>
          </div>
          <div className='flex gap-3'>
            <button
              onClick={() => setShowImportModal(true)}
              className='px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors'
            >
              📥 导入
            </button>
            <button
              onClick={handleExport}
              className='px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors'
            >
              📤 导出 {selectedIds.length > 0 && `(${selectedIds.length})`}
            </button>
          </div>
        </div>

        {/* 筛选栏 */}
        <div className='px-6 py-3 border-b border-gray-200 bg-gray-50 flex flex-wrap gap-3'>
          {/* 课程筛选 */}
          <select
            className='px-3 py-1.5 border border-gray-300 rounded-lg text-sm'
            value={params.course_id || ''}
            onChange={e =>
              setParams(p => ({
                ...p,
                course_id: e.target.value ? Number(e.target.value) : undefined,
                page: 1,
              }))
            }
          >
            <option value=''>全部课程</option>
            {courses.map(c => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* 题型筛选 */}
          <select
            className='px-3 py-1.5 border border-gray-300 rounded-lg text-sm'
            value={params.question_type || ''}
            onChange={e =>
              setParams(p => ({
                ...p,
                question_type: e.target.value || undefined,
                page: 1,
              }))
            }
          >
            <option value=''>全部题型</option>
            <option value='single'>单选题</option>
            <option value='multiple'>多选题</option>
            <option value='blank'>填空题</option>
            <option value='short'>简答题</option>
          </select>

          {/* 难度筛选 */}
          <select
            className='px-3 py-1.5 border border-gray-300 rounded-lg text-sm'
            value={params.difficulty || ''}
            onChange={e =>
              setParams(p => ({
                ...p,
                difficulty: e.target.value ? Number(e.target.value) : undefined,
                page: 1,
              }))
            }
          >
            <option value=''>全部难度</option>
            {[1, 2, 3, 4, 5].map(d => (
              <option key={d} value={d}>
                {getDifficultyLabel(d)}
              </option>
            ))}
          </select>

          {/* 状态筛选 */}
          <select
            className='px-3 py-1.5 border border-gray-300 rounded-lg text-sm'
            value={params.status || ''}
            onChange={e =>
              setParams(p => ({
                ...p,
                status: e.target.value || undefined,
                page: 1,
              }))
            }
          >
            <option value=''>全部状态</option>
            <option value='draft'>草稿</option>
            <option value='approved'>已审核</option>
            <option value='needs_review'>待审核</option>
            <option value='rejected'>已拒绝</option>
          </select>

          {/* 关键词搜索 */}
          <input
            type='text'
            placeholder='搜索题目...'
            className='px-3 py-1.5 border border-gray-300 rounded-lg text-sm w-48'
            value={params.keyword || ''}
            onChange={e =>
              setParams(p => ({
                ...p,
                keyword: e.target.value || undefined,
                page: 1,
              }))
            }
          />
        </div>

        {/* 错误提示 */}
        {error && (
          <div className='px-6 py-3 bg-red-50 text-red-600 text-sm'>
            {error}
          </div>
        )}

        {/* 题目列表 */}
        <div className='overflow-x-auto'>
          <table className='w-full'>
            <thead className='bg-gray-50'>
              <tr>
                <th className='px-4 py-3 text-left'>
                  <input
                    type='checkbox'
                    checked={
                      selectedIds.length === questions.length &&
                      questions.length > 0
                    }
                    onChange={handleSelectAll}
                    className='rounded'
                  />
                </th>
                <th className='px-4 py-3 text-left text-sm font-medium text-gray-600'>
                  题型
                </th>
                <th className='px-4 py-3 text-left text-sm font-medium text-gray-600 min-w-[300px]'>
                  题干
                </th>
                <th className='px-4 py-3 text-left text-sm font-medium text-gray-600'>
                  课程
                </th>
                <th className='px-4 py-3 text-left text-sm font-medium text-gray-600'>
                  难度
                </th>
                <th className='px-4 py-3 text-left text-sm font-medium text-gray-600'>
                  状态
                </th>
                <th className='px-4 py-3 text-left text-sm font-medium text-gray-600'>
                  操作
                </th>
              </tr>
            </thead>
            <tbody className='divide-y divide-gray-100'>
              {loading ? (
                <tr>
                  <td
                    colSpan={7}
                    className='px-4 py-12 text-center text-gray-500'
                  >
                    加载中...
                  </td>
                </tr>
              ) : questions.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className='px-4 py-12 text-center text-gray-500'
                  >
                    暂无题目，快去 AI 出题吧！
                  </td>
                </tr>
              ) : (
                questions.map(q => (
                  <tr key={q.id} className='hover:bg-gray-50'>
                    <td className='px-4 py-3'>
                      <input
                        type='checkbox'
                        checked={selectedIds.includes(q.id)}
                        onChange={() => handleSelect(q.id)}
                        className='rounded'
                      />
                    </td>
                    <td className='px-4 py-3'>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${typeColors[q.type]}`}
                      >
                        {getQuestionTypeLabel(q.type)}
                      </span>
                    </td>
                    <td className='px-4 py-3'>
                      <p className='text-sm text-gray-800 line-clamp-2'>
                        {q.stem}
                      </p>
                    </td>
                    <td className='px-4 py-3 text-sm text-gray-600'>
                      {q.course_name || '-'}
                    </td>
                    <td className='px-4 py-3'>
                      <DifficultyStars level={q.difficulty} />
                    </td>
                    <td className='px-4 py-3'>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${statusColors[q.status]}`}
                      >
                        {getQuestionStatusLabel(q.status)}
                      </span>
                    </td>
                    <td className='px-4 py-3'>
                      <div className='flex gap-2'>
                        <button
                          onClick={() => {
                            setEditingQuestion(q);
                            setShowEditModal(true);
                          }}
                          className='text-blue-600 hover:text-blue-800 text-sm'
                        >
                          编辑
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(q.id)}
                          className='text-red-600 hover:text-red-800 text-sm'
                        >
                          删除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 分页 */}
        {totalPages > 1 && (
          <div className='px-6 py-4 border-t border-gray-200 flex justify-between items-center'>
            <p className='text-sm text-gray-500'>
              第 {params.page} 页，共 {totalPages} 页
            </p>
            <div className='flex gap-2'>
              <button
                onClick={() =>
                  setParams(p => ({ ...p, page: (p.page || 1) - 1 }))
                }
                disabled={params.page === 1}
                className='px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50'
              >
                上一页
              </button>
              <button
                onClick={() =>
                  setParams(p => ({ ...p, page: (p.page || 1) + 1 }))
                }
                disabled={params.page === totalPages}
                className='px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50'
              >
                下一页
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 编辑弹窗 */}
      {showEditModal && (
        <QuestionEditModal
          question={editingQuestion}
          courses={courses}
          onClose={() => {
            setShowEditModal(false);
            setEditingQuestion(null);
          }}
          onSuccess={handleEditSuccess}
        />
      )}

      {/* 导入弹窗 */}
      {showImportModal && (
        <QuestionImportModal
          courses={courses}
          onClose={() => setShowImportModal(false)}
          onSuccess={handleImportSuccess}
        />
      )}

      {/* 删除确认 */}
      <ConfirmModal
        isOpen={deleteConfirm !== null}
        title='确认删除'
        message='确定要删除这道题目吗？此操作无法撤销。'
        confirmText='删除'
        variant='danger'
        onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)}
        onClose={() => setDeleteConfirm(null)}
      />
    </div>
  );
};
