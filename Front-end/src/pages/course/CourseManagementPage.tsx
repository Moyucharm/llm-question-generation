/**
 * Course Management Page
 */

import React, { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useCourseStore } from '../../stores/useCourseStore';
import { CourseList } from '../../components/Course/CourseList';
import { KnowledgePointTree } from '../../components/Course/KnowledgePointTree';
import { Button } from '../../components/UI/Button';
import { Spinner } from '../../components/UI/Spinner';
import { InputModal } from '../../components/UI/InputModal';
import { ConfirmModal } from '../../components/UI/ConfirmModal';
import type { Course, KnowledgePoint } from '../../types/course';

// Modal 状态类型
type ModalType =
  | 'createCourse'
  | 'editCourse'
  | 'addPoint'
  | 'editPoint'
  | 'deleteCourse'
  | 'deletePoint'
  | null;

export const CourseManagementPage: React.FC = () => {
  const {
    courses,
    currentCourse,
    isLoading,
    fetchCourses,
    fetchCourse,
    createCourse,
    updateCourse,
    deleteCourse,
    createKnowledgePoint,
    updateKnowledgePoint,
    deleteKnowledgePoint,
    clearCurrentCourse,
  } = useCourseStore();

  // Modal 状态
  const [modalType, setModalType] = useState<ModalType>(null);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<KnowledgePoint | null>(
    null
  );
  const [parentPointId, setParentPointId] = useState<number | undefined>(
    undefined
  );

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  // ==========================================
  // Course Handlers
  // ==========================================

  const handleCreateCourse = () => {
    setModalType('createCourse');
  };

  const handleEditCourse = (course: Course) => {
    setSelectedCourse(course);
    setModalType('editCourse');
  };

  const handleDeleteCourse = (course: Course) => {
    setSelectedCourse(course);
    setModalType('deleteCourse');
  };

  const handleSelectCourse = (course: Course) => {
    fetchCourse(course.id);
  };

  // ==========================================
  // Knowledge Point Handlers
  // ==========================================

  const handleAddPoint = (parentId?: number) => {
    if (!currentCourse) return;
    setParentPointId(parentId);
    setModalType('addPoint');
  };

  const handleEditPoint = (point: KnowledgePoint) => {
    if (!currentCourse) return;
    setSelectedPoint(point);
    setModalType('editPoint');
  };

  const handleDeletePoint = (point: KnowledgePoint) => {
    if (!currentCourse) return;
    setSelectedPoint(point);
    setModalType('deletePoint');
  };

  // ==========================================
  // Modal Confirm Handlers
  // ==========================================

  const handleCreateCourseConfirm = async (name: string) => {
    try {
      await createCourse({ name });
    } catch (e) {
      console.error('创建课程失败:', e);
    }
    setModalType(null);
  };

  const handleEditCourseConfirm = async (name: string) => {
    if (!selectedCourse) return;
    try {
      await updateCourse(selectedCourse.id, { name });
    } catch (e) {
      console.error('更新课程失败:', e);
    }
    setModalType(null);
    setSelectedCourse(null);
  };

  const handleDeleteCourseConfirm = async () => {
    if (!selectedCourse) return;
    try {
      await deleteCourse(selectedCourse.id);
    } catch (e) {
      console.error('删除课程失败:', e);
    }
    setModalType(null);
    setSelectedCourse(null);
  };

  const handleAddPointConfirm = async (name: string) => {
    if (!currentCourse) return;
    try {
      await createKnowledgePoint(currentCourse.id, {
        name,
        parent_id: parentPointId,
      });
    } catch (e) {
      console.error('添加知识点失败:', e);
    }
    setModalType(null);
    setParentPointId(undefined);
  };

  const handleEditPointConfirm = async (name: string) => {
    if (!currentCourse || !selectedPoint) return;
    try {
      await updateKnowledgePoint(currentCourse.id, selectedPoint.id, { name });
    } catch (e) {
      console.error('更新知识点失败:', e);
    }
    setModalType(null);
    setSelectedPoint(null);
  };

  const handleDeletePointConfirm = async () => {
    if (!currentCourse || !selectedPoint) return;
    try {
      await deleteKnowledgePoint(currentCourse.id, selectedPoint.id);
    } catch (e) {
      console.error('删除知识点失败:', e);
    }
    setModalType(null);
    setSelectedPoint(null);
  };

  const closeModal = () => {
    setModalType(null);
    setSelectedCourse(null);
    setSelectedPoint(null);
    setParentPointId(undefined);
  };

  // ==========================================
  // Render
  // ==========================================

  if (isLoading && !courses.length && !currentCourse) {
    return (
      <div className='flex justify-center items-center h-64'>
        <Spinner size='lg' />
      </div>
    );
  }

  const renderModals = () => (
    <>
      {/* 创建课程 Modal */}
      <InputModal
        isOpen={modalType === 'createCourse'}
        onClose={closeModal}
        onConfirm={handleCreateCourseConfirm}
        title='新建课程'
        label='课程名称'
        placeholder='请输入课程名称'
      />

      {/* 编辑课程 Modal */}
      <InputModal
        isOpen={modalType === 'editCourse'}
        onClose={closeModal}
        onConfirm={handleEditCourseConfirm}
        title='编辑课程'
        label='课程名称'
        placeholder='请输入课程名称'
        defaultValue={selectedCourse?.name || ''}
      />

      {/* 添加知识点 Modal */}
      <InputModal
        isOpen={modalType === 'addPoint'}
        onClose={closeModal}
        onConfirm={handleAddPointConfirm}
        title={parentPointId ? '添加子知识点' : '添加根知识点'}
        label='知识点名称'
        placeholder='请输入知识点名称'
      />

      {/* 编辑知识点 Modal */}
      <InputModal
        isOpen={modalType === 'editPoint'}
        onClose={closeModal}
        onConfirm={handleEditPointConfirm}
        title='编辑知识点'
        label='知识点名称'
        placeholder='请输入知识点名称'
        defaultValue={selectedPoint?.name || ''}
      />

      {/* 删除课程确认 */}
      <ConfirmModal
        isOpen={modalType === 'deleteCourse'}
        onClose={closeModal}
        onConfirm={handleDeleteCourseConfirm}
        title='删除课程'
        message={`确定要删除课程 "${selectedCourse?.name}" 吗？此操作不可恢复！`}
        variant='danger'
        confirmText='删除'
      />

      {/* 删除知识点确认 */}
      <ConfirmModal
        isOpen={modalType === 'deletePoint'}
        onClose={closeModal}
        onConfirm={handleDeletePointConfirm}
        title='删除知识点'
        message={`确定要删除知识点 "${selectedPoint?.name}" 吗？`}
        variant='danger'
        confirmText='删除'
      />
    </>
  );

  if (currentCourse) {
    // Detail View (Knowledge Points)
    return (
      <div className='space-y-6'>
        {renderModals()}
        <div className='flex items-center gap-4'>
          <Button
            variant='ghost'
            onClick={clearCurrentCourse}
            icon={<ArrowLeft className='w-4 h-4' />}
          >
            返回列表
          </Button>
          <div>
            <h2 className='text-xl font-bold text-gray-900'>
              {currentCourse.name}
            </h2>
            <p className='text-gray-500 text-sm'>{currentCourse.description}</p>
          </div>
        </div>

        <KnowledgePointTree
          points={currentCourse.knowledge_points || []}
          onAddPoint={handleAddPoint}
          onEditPoint={handleEditPoint}
          onDeletePoint={handleDeletePoint}
        />
      </div>
    );
  }

  // List View
  return (
    <>
      {renderModals()}
      <CourseList
        courses={courses}
        onSelectCourse={handleSelectCourse}
        onCreateCourse={handleCreateCourse}
        onEditCourse={handleEditCourse}
        onDeleteCourse={handleDeleteCourse}
      />
    </>
  );
};
