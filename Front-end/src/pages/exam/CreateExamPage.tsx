/**
 * 创建考试页面
 */

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save, Calendar, Clock, BookOpen } from 'lucide-react';
import { useExamStore } from '@/stores/useExamStore';
import { useCourseStore } from '@/stores/useCourseStore';
import type { CreateExamRequest } from '@/types/exam';

interface CreateExamPageProps {
  onNavigate?: (page: string) => void;
}

export const CreateExamPage: React.FC<CreateExamPageProps> = ({
  onNavigate,
}) => {
  const { createExam, error, clearError } = useExamStore();
  const { courses, fetchCourses } = useCourseStore();

  const [formData, setFormData] = useState<CreateExamRequest>({
    title: '',
    duration_minutes: 60,
    start_time: undefined,
    end_time: undefined,
    course_id: undefined,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  // 处理表单提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      alert('请输入考试标题');
      return;
    }

    setIsSubmitting(true);
    try {
      await createExam(formData);
      // 创建成功后返回列表
      onNavigate?.('exams');
    } catch {
      // 错误由 store 处理
    } finally {
      setIsSubmitting(false);
    }
  };

  // 处理输入变化
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseInt(value) || 0 : value || undefined,
    }));
  };

  return (
    <div className='max-w-3xl mx-auto'>
      {/* 页面头部 */}
      <div className='bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6'>
        <div className='flex items-center gap-4'>
          <button
            onClick={() => onNavigate?.('exams')}
            className='p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors'
          >
            <ArrowLeft className='w-5 h-5' />
          </button>
          <div>
            <h1 className='text-2xl font-bold text-gray-900'>创建考试</h1>
            <p className='text-gray-500'>设置考试基本信息</p>
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

      {/* 创建表单 */}
      <form onSubmit={handleSubmit}>
        <div className='bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-6'>
          {/* 考试标题 */}
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-2'>
              考试标题 *
            </label>
            <input
              type='text'
              name='title'
              value={formData.title}
              onChange={handleChange}
              placeholder='例如：Python 期中考试'
              className='w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all'
              required
            />
          </div>

          {/* 关联课程 */}
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-2'>
              <BookOpen className='w-4 h-4 inline mr-1' />
              关联课程（可选）
            </label>
            <select
              name='course_id'
              value={formData.course_id || ''}
              onChange={handleChange}
              className='w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all'
            >
              <option value=''>不关联课程</option>
              {courses.map(course => (
                <option key={course.id} value={course.id}>
                  {course.name}
                </option>
              ))}
            </select>
          </div>

          {/* 考试时长 */}
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-2'>
              <Clock className='w-4 h-4 inline mr-1' />
              考试时长（分钟）
            </label>
            <input
              type='number'
              name='duration_minutes'
              value={formData.duration_minutes}
              onChange={handleChange}
              min={1}
              max={480}
              className='w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all'
            />
          </div>

          {/* 开始时间 */}
          <div className='grid grid-cols-2 gap-4'>
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>
                <Calendar className='w-4 h-4 inline mr-1' />
                开始时间（可选）
              </label>
              <input
                type='datetime-local'
                name='start_time'
                value={formData.start_time?.slice(0, 16) || ''}
                onChange={handleChange}
                className='w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all'
              />
            </div>

            {/* 结束时间 */}
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>
                <Calendar className='w-4 h-4 inline mr-1' />
                结束时间（可选）
              </label>
              <input
                type='datetime-local'
                name='end_time'
                value={formData.end_time?.slice(0, 16) || ''}
                onChange={handleChange}
                className='w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all'
              />
            </div>
          </div>

          {/* 提示信息 */}
          <div className='bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-700'>
            <p className='font-medium mb-1'>💡 提示</p>
            <p>
              创建考试后，您需要先在题库中准备试卷，然后关联到考试并发布。
              目前考试系统为基础版本，后续将支持更多功能。
            </p>
          </div>
        </div>

        {/* 提交按钮 */}
        <div className='mt-6 flex justify-end gap-4'>
          <button
            type='button'
            onClick={() => onNavigate?.('exams')}
            className='px-6 py-3 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors'
          >
            取消
          </button>
          <button
            type='submit'
            disabled={isSubmitting}
            className='flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
          >
            <Save className='w-5 h-5' />
            {isSubmitting ? '创建中...' : '创建考试'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateExamPage;
