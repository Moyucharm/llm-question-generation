/**
 * Course and Knowledge Point Types
 */

export interface KnowledgePoint {
  id: number;
  name: string;
  description?: string;
  chapter?: string;
  course_id: number;
  parent_id?: number;
  order: number;
  created_at: string;
  updated_at: string;
  children?: KnowledgePoint[]; // For tree structure
}

export interface Course {
  id: number;
  name: string;
  description?: string;
  teacher_id: number;
  created_at: string;
  updated_at: string;
  knowledge_points?: KnowledgePoint[]; // For detail view
}

export interface CreateCourseData {
  name: string;
  description?: string;
}

export interface UpdateCourseData {
  name?: string;
  description?: string;
}

export interface CreateKnowledgePointData {
  name: string;
  description?: string;
  chapter?: string;
  parent_id?: number;
  order?: number;
}

export interface UpdateKnowledgePointData {
  name?: string;
  description?: string;
  chapter?: string;
  parent_id?: number;
  order?: number;
}
