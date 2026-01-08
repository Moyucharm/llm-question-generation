/**
 * 考试类型定义
 */

// 考试状态
export type ExamStatus = 'draft' | 'published' | 'closed';

// 答题状态
export type AttemptStatus = 'in_progress' | 'submitted' | 'graded';

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
    student_answer?: any;
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

// 答题记录
export interface Attempt {
    id: number;
    exam_id: number;
    student_id: number;
    student_name?: string;
    started_at: string;
    submitted_at?: string;
    total_score?: number;
    status: AttemptStatus;
    answers: AttemptAnswer[];
    remaining_seconds?: number;
}

// 单题答案
export interface AttemptAnswer {
    question_id: number;
    student_answer?: any;
    is_correct?: boolean;
    score?: number;
    feedback?: string;
}

// 提交答案请求
export interface SubmitAnswerRequest {
    question_id: number;
    answer: any;
    time_spent_seconds?: number;
}

// 答题记录列表响应
export interface AttemptListResponse {
    items: Attempt[];
    total: number;
}
