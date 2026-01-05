/**
 * Course Management Store
 */

import { create } from 'zustand';
import type {
    Course,
    CreateCourseData,
    UpdateCourseData,
    CreateKnowledgePointData,
    UpdateKnowledgePointData,
} from '../types/course';
import { courseService } from '../services/courseService';

interface CourseState {
    // Data
    courses: Course[];
    currentCourse: Course | null;
    isLoading: boolean;
    error: string | null;

    // Actions
    fetchCourses: () => Promise<void>;
    fetchCourse: (id: number) => Promise<void>;
    createCourse: (data: CreateCourseData) => Promise<void>;
    updateCourse: (id: number, data: UpdateCourseData) => Promise<void>;
    deleteCourse: (id: number) => Promise<void>;

    // Knowledge Point Actions
    createKnowledgePoint: (courseId: number, data: CreateKnowledgePointData) => Promise<void>;
    updateKnowledgePoint: (courseId: number, kpId: number, data: UpdateKnowledgePointData) => Promise<void>;
    deleteKnowledgePoint: (courseId: number, kpId: number) => Promise<void>;

    // UI State
    clearCurrentCourse: () => void;
    clearError: () => void;
}

export const useCourseStore = create<CourseState>((set, get) => ({
    courses: [],
    currentCourse: null,
    isLoading: false,
    error: null,

    fetchCourses: async () => {
        set({ isLoading: true, error: null });
        try {
            const courses = await courseService.getCourses();
            set({ courses, isLoading: false });
        } catch (error: any) {
            set({
                error: error.response?.data?.detail || 'Failed to fetch courses',
                isLoading: false
            });
        }
    },

    fetchCourse: async (id: number) => {
        set({ isLoading: true, error: null });
        try {
            const course = await courseService.getCourse(id);
            set({ currentCourse: course, isLoading: false });
        } catch (error: any) {
            set({
                error: error.response?.data?.detail || 'Failed to fetch course details',
                isLoading: false
            });
        }
    },

    createCourse: async (data: CreateCourseData) => {
        set({ isLoading: true, error: null });
        try {
            await courseService.createCourse(data);
            // Refresh list
            await get().fetchCourses();
        } catch (error: any) {
            set({
                error: error.response?.data?.detail || 'Failed to create course',
                isLoading: false
            });
            throw error;
        }
    },

    updateCourse: async (id: number, data: UpdateCourseData) => {
        set({ isLoading: true, error: null });
        try {
            await courseService.updateCourse(id, data);
            // Refresh list or current course
            if (get().currentCourse?.id === id) {
                await get().fetchCourse(id);
            }
            await get().fetchCourses();
        } catch (error: any) {
            set({
                error: error.response?.data?.detail || 'Failed to update course',
                isLoading: false
            });
            throw error;
        }
    },

    deleteCourse: async (id: number) => {
        set({ isLoading: true, error: null });
        try {
            await courseService.deleteCourse(id);
            // Refresh list
            await get().fetchCourses();
            if (get().currentCourse?.id === id) {
                set({ currentCourse: null });
            }
        } catch (error: any) {
            set({
                error: error.response?.data?.detail || 'Failed to delete course',
                isLoading: false
            });
            throw error;
        }
    },

    createKnowledgePoint: async (courseId: number, data: CreateKnowledgePointData) => {
        set({ isLoading: true, error: null });
        try {
            await courseService.createKnowledgePoint(courseId, data);
            // Refresh current course to get updated tree
            await get().fetchCourse(courseId);
        } catch (error: any) {
            set({
                error: error.response?.data?.detail || 'Failed to create knowledge point',
                isLoading: false
            });
            throw error;
        }
    },

    updateKnowledgePoint: async (courseId: number, kpId: number, data: UpdateKnowledgePointData) => {
        set({ isLoading: true, error: null });
        try {
            await courseService.updateKnowledgePoint(courseId, kpId, data);
            // Refresh current course
            await get().fetchCourse(courseId);
        } catch (error: any) {
            set({
                error: error.response?.data?.detail || 'Failed to update knowledge point',
                isLoading: false
            });
            throw error;
        }
    },

    deleteKnowledgePoint: async (courseId: number, kpId: number) => {
        set({ isLoading: true, error: null });
        try {
            await courseService.deleteKnowledgePoint(courseId, kpId);
            // Refresh current course
            await get().fetchCourse(courseId);
        } catch (error: any) {
            set({
                error: error.response?.data?.detail || 'Failed to delete knowledge point',
                isLoading: false
            });
            throw error;
        }
    },

    clearCurrentCourse: () => set({ currentCourse: null }),
    clearError: () => set({ error: null }),
}));
