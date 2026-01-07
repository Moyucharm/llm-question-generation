import { useState, useCallback } from 'react';
import type { GenerationRequest } from '@/types';
import { QuestionType } from '@/types';
import type { KnowledgePoint } from '@/types/course';

/**
 * 表单状态管理钩子
 * 处理生成表单的状态和操作
 */
export function useGenerationForm() {
  // 表单数据状态
  const [formData, setFormData] = useState<GenerationRequest>({
    subject: '',
    description: '',
    questionConfigs: [],
    courseId: undefined,
    knowledgePointId: undefined,
    knowledgePointName: undefined,
  });

  /**
   * 更新学科/主题字段
   * @param value 新的学科/主题值
   */
  const handleSubjectChange = (value: string) => {
    setFormData(prev => ({ ...prev, subject: value }));
  };

  /**
   * 更新详细描述字段
   * @param value 新的详细描述值
   */
  const handleDescriptionChange = (value: string) => {
    setFormData(prev => ({ ...prev, description: value }));
  };

  /**
   * 更新课程选择
   * @param courseId 课程 ID
   * @param courseName 课程名称（可选，用于自动填充学科）
   */
  const handleCourseChange = useCallback((courseId: number | undefined, courseName?: string) => {
    setFormData(prev => ({
      ...prev,
      courseId,
      // 切换课程时清空知识点选择
      knowledgePointId: undefined,
      knowledgePointName: undefined,
      // 如果提供了课程名称，自动填充学科字段
      subject: courseName || prev.subject,
    }));
  }, []);

  /**
   * 更新知识点选择
   * @param point 选中的知识点
   */
  const handleKnowledgePointChange = useCallback((point: KnowledgePoint | undefined) => {
    setFormData(prev => ({
      ...prev,
      knowledgePointId: point?.id,
      knowledgePointName: point?.name,
    }));
  }, []);

  /**
   * 更新题型配置
   * @param type 题型类型
   * @param count 题目数量
   */
  const handleQuestionConfigChange = (type: QuestionType, count: number) => {
    setFormData(prev => {
      const existingIndex = prev.questionConfigs.findIndex(
        config => config.type === type
      );
      const newConfigs = [...prev.questionConfigs];

      if (count === 0) {
        // 移除该题型
        if (existingIndex !== -1) {
          newConfigs.splice(existingIndex, 1);
        }
      } else {
        // 更新或添加题型配置
        if (existingIndex !== -1) {
          newConfigs[existingIndex] = { type, count };
        } else {
          newConfigs.push({ type, count });
        }
      }

      return { ...prev, questionConfigs: newConfigs };
    });
  };

  /**
   * 计算总题目数量
   * @returns 总题目数量
   */
  const getTotalQuestions = () => {
    return formData.questionConfigs.reduce(
      (total, config) => total + config.count,
      0
    );
  };

  /**
   * 获取指定题型的数量
   * @param type 题型类型
   * @returns 题目数量
   */
  const getQuestionCount = (type: QuestionType) => {
    const config = formData.questionConfigs.find(c => c.type === type);
    return config ? config.count : 0;
  };

  return {
    formData,
    setFormData,
    handleSubjectChange,
    handleDescriptionChange,
    handleCourseChange,
    handleKnowledgePointChange,
    handleQuestionConfigChange,
    getTotalQuestions,
    getQuestionCount,
  };
}

