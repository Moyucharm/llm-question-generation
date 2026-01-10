/**
 * 课程与知识点选择器组件
 * 用于在出题表单中选择课程和知识点
 */

import React, { useEffect, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  BookOpen,
  Lightbulb,
  X,
} from 'lucide-react';
import { useCourseStore } from '@/stores/useCourseStore';
import type { KnowledgePoint } from '@/types/course';

interface CourseKnowledgeSelectorProps {
  courseId?: number;
  knowledgePointId?: number;
  onCourseChange: (courseId: number | undefined, courseName?: string) => void;
  onKnowledgePointChange: (point: KnowledgePoint | undefined) => void;
}

/**
 * 知识点树节点组件
 */
interface KnowledgePointNodeProps {
  point: KnowledgePoint;
  level: number;
  selectedId?: number;
  onSelect: (point: KnowledgePoint) => void;
}

const KnowledgePointNode: React.FC<KnowledgePointNodeProps> = ({
  point,
  level,
  selectedId,
  onSelect,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = point.children && point.children.length > 0;
  const isSelected = selectedId === point.id;

  return (
    <div>
      <div
        className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
          isSelected
            ? 'bg-blue-100 text-blue-700 border border-blue-300'
            : 'hover:bg-gray-100'
        }`}
        style={{ paddingLeft: `${level * 16 + 12}px` }}
        onClick={() => onSelect(point)}
      >
        {hasChildren ? (
          <button
            type='button'
            onClick={e => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className='p-0.5 hover:bg-gray-200 rounded'
          >
            {isExpanded ? (
              <ChevronDown className='w-4 h-4 text-gray-500' />
            ) : (
              <ChevronRight className='w-4 h-4 text-gray-500' />
            )}
          </button>
        ) : (
          <span className='w-5' />
        )}
        <Lightbulb className='w-4 h-4 text-amber-500' />
        <span className='text-sm'>{point.name}</span>
        {isSelected && (
          <span className='ml-auto text-xs text-blue-600'>✓ 已选</span>
        )}
      </div>
      {hasChildren && isExpanded && (
        <div>
          {point.children!.map(child => (
            <KnowledgePointNode
              key={child.id}
              point={child}
              level={level + 1}
              selectedId={selectedId}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * 课程与知识点选择器
 */
export const CourseKnowledgeSelector: React.FC<
  CourseKnowledgeSelectorProps
> = ({
  courseId,
  knowledgePointId,
  onCourseChange,
  onKnowledgePointChange,
}) => {
  const {
    courses,
    currentCourse,
    fetchCourses,
    fetchCourse,
    clearCurrentCourse,
  } = useCourseStore();
  const [isExpanded, setIsExpanded] = useState(true);

  // 加载课程列表
  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  // 当选择课程时加载知识点
  useEffect(() => {
    if (courseId) {
      fetchCourse(courseId);
    } else {
      clearCurrentCourse();
    }
  }, [courseId, fetchCourse, clearCurrentCourse]);

  // 处理课程选择
  const handleCourseSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value === '') {
      onCourseChange(undefined);
    } else {
      const selectedCourse = courses.find(c => c.id === Number(value));
      onCourseChange(Number(value), selectedCourse?.name);
    }
  };

  // 处理知识点选择
  const handlePointSelect = (point: KnowledgePoint) => {
    if (knowledgePointId === point.id) {
      // 取消选择
      onKnowledgePointChange(undefined);
    } else {
      onKnowledgePointChange(point);
    }
  };

  // 清除选择
  const handleClear = () => {
    onCourseChange(undefined);
    onKnowledgePointChange(undefined);
  };

  // 获取选中知识点的完整路径
  const getSelectedPointPath = (): string => {
    if (!currentCourse || !knowledgePointId) return '';

    const findPath = (
      points: KnowledgePoint[],
      targetId: number,
      path: string[]
    ): string[] | null => {
      for (const point of points) {
        if (point.id === targetId) {
          return [...path, point.name];
        }
        if (point.children) {
          const result = findPath(point.children, targetId, [
            ...path,
            point.name,
          ]);
          if (result) return result;
        }
      }
      return null;
    };

    const path = findPath(
      currentCourse.knowledge_points || [],
      knowledgePointId,
      []
    );
    return path ? path.join(' > ') : '';
  };

  const selectedPath = getSelectedPointPath();

  return (
    <div className='mb-6'>
      {/* 标题栏 */}
      <div
        className='flex items-center justify-between mb-3 cursor-pointer'
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className='flex items-center gap-2'>
          <BookOpen className='w-5 h-5 text-blue-600' />
          <h3 className='text-sm font-medium text-gray-700'>
            课程与知识点（可选）
          </h3>
        </div>
        <div className='flex items-center gap-2'>
          {(courseId || knowledgePointId) && (
            <button
              type='button'
              onClick={e => {
                e.stopPropagation();
                handleClear();
              }}
              className='text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1'
            >
              <X className='w-3 h-3' />
              清除
            </button>
          )}
          {isExpanded ? (
            <ChevronDown className='w-5 h-5 text-gray-400' />
          ) : (
            <ChevronRight className='w-5 h-5 text-gray-400' />
          )}
        </div>
      </div>

      {isExpanded && (
        <div className='border border-gray-200 rounded-lg p-4 bg-gray-50'>
          {/* 课程选择 */}
          <div className='mb-4'>
            <label className='block text-sm text-gray-600 mb-2'>选择课程</label>
            <select
              value={courseId || ''}
              onChange={handleCourseSelect}
              className='w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
            >
              <option value=''>不限课程（手动输入学科）</option>
              {courses.map(course => (
                <option key={course.id} value={course.id}>
                  {course.name}
                </option>
              ))}
            </select>
          </div>

          {/* 知识点选择 */}
          {courseId && (
            <div>
              <label className='block text-sm text-gray-600 mb-2'>
                选择知识点
              </label>
              {currentCourse?.knowledge_points &&
              currentCourse.knowledge_points.length > 0 ? (
                <div className='border border-gray-200 rounded-lg bg-white max-h-64 overflow-y-auto'>
                  {currentCourse.knowledge_points.map(point => (
                    <KnowledgePointNode
                      key={point.id}
                      point={point}
                      level={0}
                      selectedId={knowledgePointId}
                      onSelect={handlePointSelect}
                    />
                  ))}
                </div>
              ) : (
                <div className='text-sm text-gray-500 italic py-4 text-center border border-dashed border-gray-300 rounded-lg'>
                  该课程暂无知识点，请先在课程管理中添加
                </div>
              )}
            </div>
          )}

          {/* 选中提示 */}
          {selectedPath && (
            <div className='mt-3 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg'>
              <span className='text-sm text-blue-700'>
                <strong>已选知识点：</strong>
                {selectedPath}
              </span>
            </div>
          )}
        </div>
      )}

      {/* 折叠时显示简要信息 */}
      {!isExpanded && (courseId || knowledgePointId) && (
        <div className='text-sm text-gray-600 mt-1'>
          {courses.find(c => c.id === courseId)?.name}
          {selectedPath && ` > ${selectedPath.split(' > ').pop()}`}
        </div>
      )}
    </div>
  );
};
