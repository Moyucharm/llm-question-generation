/**
 * Course List Component
 */

import React from 'react';
import { Plus, Edit2, Trash2, BookOpen } from 'lucide-react';
import type { Course } from '../../types/course';
import { Button } from '../UI/Button';
import { Card } from '../UI/Card';

interface CourseListProps {
  courses: Course[];
  onSelectCourse: (course: Course) => void;
  onCreateCourse: () => void;
  onEditCourse: (course: Course) => void;
  onDeleteCourse: (course: Course) => void;
}

export const CourseList: React.FC<CourseListProps> = ({
  courses,
  onSelectCourse,
  onCreateCourse,
  onEditCourse,
  onDeleteCourse,
}) => {
  return (
    <div className='space-y-6'>
      <div className='flex justify-between items-center'>
        <h2 className='text-xl font-semibold text-gray-800'>课程列表</h2>
        <Button onClick={onCreateCourse} icon={<Plus className='w-4 h-4' />}>
          新建课程
        </Button>
      </div>

      {courses.length === 0 ? (
        <div className='text-center py-12 bg-white rounded-lg border border-dashed border-gray-300'>
          <BookOpen className='w-12 h-12 text-gray-400 mx-auto mb-4' />
          <p className='text-gray-500 mb-4'>暂无课程</p>
          <Button onClick={onCreateCourse} variant='outline'>
            创建第一个课程
          </Button>
        </div>
      ) : (
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
          {courses.map(course => (
            <Card
              key={course.id}
              className='hover:shadow-md transition-shadow cursor-pointer group relative'
              onClick={() => onSelectCourse(course)}
            >
              <div className='p-6'>
                <div className='flex justify-between items-start mb-4'>
                  <div className='w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600'>
                    <BookOpen className='w-6 h-6' />
                  </div>
                  <div className='flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity'>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        onEditCourse(course);
                      }}
                      className='p-1 text-gray-400 hover:text-blue-600 rounded'
                    >
                      <Edit2 className='w-4 h-4' />
                    </button>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        onDeleteCourse(course);
                      }}
                      className='p-1 text-gray-400 hover:text-red-600 rounded'
                    >
                      <Trash2 className='w-4 h-4' />
                    </button>
                  </div>
                </div>
                <h3 className='text-lg font-bold text-gray-900 mb-2'>
                  {course.name}
                </h3>
                <p className='text-gray-500 text-sm line-clamp-2 mb-4'>
                  {course.description || '暂无描述'}
                </p>
                <div className='text-xs text-gray-400'>
                  更新于: {new Date(course.updated_at).toLocaleDateString()}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
