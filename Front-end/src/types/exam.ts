/**
 * 考试类型定义
 */

// 考试状态
export type ExamStatus = 'draft' | 'published' | 'closed';

// 答题状态
export type AttemptStatus = 'in_progress' | 'submitted' | 'ai_graded' | 'graded';

// 考试基本信息
export interface Exam {
  id: number;
  title: string;
  duration_minutes: number;
  start_time?: string;
  end_time?: string;
  paper_id?: number;
  status: ExamStatus;
  published_by: number;
  publisher_name?: string;
  question_count: number;
  total_score: number;
  attempt_count: number;
  attempt_status?: AttemptStatus; // 学生: 答题状态
  can_start?: boolean; // 学生: 是否可开始
  created_at: string;
  updated_at: string;
}

// 考试详情（包含题目）
export interface ExamDetail extends Exam {
  questions: ExamQuestion[];
}

// 考试题目（学生视角，不含答案）
export interface ExamQuestion {
  id: number;
  type: string;
  stem: string;
  options?: Record<string, string>;
  score: number;
  // 学生答案
  student_answer?: unknown;
}

// 创建考试请求
export interface CreateExamRequest {
  title: string;
  duration_minutes: number;
  start_time?: string;
  end_time?: string;
  paper_id?: number;
  course_id?: number;
}

// 更新考试请求
export interface UpdateExamRequest {
  title?: string;
  duration_minutes?: number;
  start_time?: string;
  end_time?: string;
}

// 考试列表响应
export interface ExamListResponse {
  items: Exam[];
  total: number;
}

// 单题答案
export interface AttemptAnswer {
  question_id: number;
  student_answer?: unknown;
  is_correct?: boolean;
  score?: number;
  ai_score?: number;
  teacher_score?: number;
  feedback?: string;
  ai_feedback?: string;
  teacher_feedback?: string;
}

// 答题记录
export interface Attempt {
  id: number;
  exam_id: number;
  student_id: number;
  student_name?: string;
  started_at: string;
  submitted_at?: string;
  total_score?: number;
  final_score?: number;
  is_graded_by_teacher: boolean;
  graded_at?: string;
  graded_by?: number;
  grader_name?: string;
  status: AttemptStatus;
  answers: AttemptAnswer[];
  remaining_seconds?: number;
}

// 提交答案请求
export interface SubmitAnswerRequest {
  question_id: number;
  answer: unknown;
  time_spent_seconds?: number;
}

// 答题记录列表响应
export interface AttemptListResponse {
  items: Attempt[];
  total: number;
}

// ===================================
// 成绩管理类型
// ===================================

// 答案详情（包含题目信息，供教师批改）
export interface AnswerDetail {
  id: number;
  question_id: number;
  question_type: string;
  question_stem: string;
  question_options?: Record<string, string>;
  correct_answer?: unknown;
  explanation?: string;
  max_score: number;
  // 学生答案
  student_answer?: unknown;
  is_correct?: boolean;
  // 评分
  score?: number;
  ai_score?: number;
  teacher_score?: number;
  // 反馈
  feedback?: string;
  ai_feedback?: string;
  teacher_feedback?: string;
}

// 答卷详情（教师批改用）
export interface AttemptDetail {
  id: number;
  exam_id: number;
  exam_title: string;
  student_id: number;
  student_name: string;
  student_email?: string;
  started_at: string;
  submitted_at?: string;
  total_score?: number;
  final_score?: number;
  max_score: number;
  is_graded_by_teacher: boolean;
  graded_at?: string;
  graded_by?: number;
  grader_name?: string;
  status: AttemptStatus;
  answers: AnswerDetail[];
}

// 更新单题评分请求
export interface UpdateAnswerScoreRequest {
  question_id: number;
  teacher_score: number;
  teacher_feedback?: string;
}

// 批量更新评分请求
export interface UpdateAttemptScoresRequest {
  scores: UpdateAnswerScoreRequest[];
}

// 确认成绩请求
export interface ConfirmGradeRequest {
  final_score?: number;
  comment?: string;
}

// 成绩统计
export interface GradeStatistics {
  exam_id: number;
  total_attempts: number;
  submitted_count: number;
  graded_count: number;
  average_score?: number;
  highest_score?: number;
  lowest_score?: number;
  pass_rate?: number;
}

// 学生考试结果
export interface StudentExamResult {
  exam_id: number;
  exam_title: string;
  attempt_id: number;
  status: AttemptStatus;
  started_at: string;
  submitted_at?: string;
  score?: number;
  max_score: number;
  is_final: boolean;
  graded_at?: string;
  answers: {
    question_id: number;
    question_type: string;
    question_stem: string;
    question_options?: Record<string, string>;
    correct_answer?: unknown;
    explanation?: string;
    max_score: number;
    student_answer?: unknown;
    is_correct?: boolean;
    score?: number;
    feedback?: string;
  }[];
}
