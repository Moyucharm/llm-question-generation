/**
 * Course Management API Service
 */

import axios, { type InternalAxiosRequestConfig } from 'axios';
import type {
  Course,
  CreateCourseData,
  UpdateCourseData,
  KnowledgePoint,
  CreateKnowledgePointData,
  UpdateKnowledgePointData,
} from '../types/course';

// 重新导出类型供其他模块使用
export type {
  Course,
  KnowledgePoint,
  CreateCourseData,
  UpdateCourseData,
  CreateKnowledgePointData,
  UpdateKnowledgePointData,
};

// Configure axios instance
const api = axios.create({
  baseURL: '/api',
});

// Add auth token to requests
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const courseService = {
  // ==========================================
  // Course Operations
  // ==========================================

  /**
   * Get all courses
   */
  async getCourses(): Promise<Course[]> {
    const response = await api.get<Course[]>('/courses/');
    return response.data;
  },

  /**
   * Get course details (including knowledge point tree)
   */
  async getCourse(id: number): Promise<Course> {
    const response = await api.get<Course>(`/courses/${id}`);
    return response.data;
  },

  /**
   * Create a new course
   */
  async createCourse(data: CreateCourseData): Promise<Course> {
    const response = await api.post<Course>('/courses/', data);
    return response.data;
  },

  /**
   * Update a course
   */
  async updateCourse(id: number, data: UpdateCourseData): Promise<Course> {
    const response = await api.put<Course>(`/courses/${id}`, data);
    return response.data;
  },

  /**
   * Delete a course
   */
  async deleteCourse(id: number): Promise<void> {
    await api.delete(`/courses/${id}`);
  },

  // ==========================================
  // Knowledge Point Operations
  // ==========================================

  /**
   * Get knowledge point tree for a course
   */
  async getKnowledgePoints(courseId: number): Promise<KnowledgePoint[]> {
    const response = await api.get<KnowledgePoint[]>(
      `/courses/${courseId}/knowledge-points`
    );
    return response.data;
  },

  /**
   * Create a knowledge point
   */
  async createKnowledgePoint(
    courseId: number,
    data: CreateKnowledgePointData
  ): Promise<KnowledgePoint> {
    const response = await api.post<KnowledgePoint>(
      `/courses/${courseId}/knowledge-points`,
      data
    );
    return response.data;
  },

  /**
   * Update a knowledge point
   */
  async updateKnowledgePoint(
    courseId: number,
    kpId: number,
    data: UpdateKnowledgePointData
  ): Promise<KnowledgePoint> {
    const response = await api.put<KnowledgePoint>(
      `/courses/${courseId}/knowledge-points/${kpId}`,
      data
    );
    return response.data;
  },

  /**
   * Delete a knowledge point
   */
  async deleteKnowledgePoint(courseId: number, kpId: number): Promise<void> {
    await api.delete(`/courses/${courseId}/knowledge-points/${kpId}`);
  },

  // 别名方法
  list: async function (): Promise<Course[]> {
    return this.getCourses();
  },

  listKnowledgePoints: async function (
    courseId: number
  ): Promise<KnowledgePoint[]> {
    return this.getKnowledgePoints(courseId);
  },
};
