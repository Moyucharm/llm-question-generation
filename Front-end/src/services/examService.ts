/**
 * 考试 API 服务
 */

import type {
    Exam,
    ExamDetail,
    ExamListResponse,
    CreateExamRequest,
    UpdateExamRequest,
    Attempt,
    AttemptListResponse,
    SubmitAnswerRequest,
} from '@/types/exam';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

/**
 * 获取请求头
 */
function getHeaders(): HeadersInit {
    const token = localStorage.getItem('access_token');
    return {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
    };
}

/**
 * 处理响应
 */
async function handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: '请求失败' }));
        throw new Error(error.detail || `HTTP ${response.status}`);
    }
    return response.json();
}

// ===================================
// 考试 CRUD
// ===================================

/**
 * 获取考试列表
 */
export async function getExams(skip = 0, limit = 20): Promise<ExamListResponse> {
    const response = await fetch(
        `${API_BASE}/exams?skip=${skip}&limit=${limit}`,
        { headers: getHeaders() }
    );
    return handleResponse<ExamListResponse>(response);
}

/**
 * 获取考试详情
 */
export async function getExam(examId: number): Promise<ExamDetail> {
    const response = await fetch(
        `${API_BASE}/exams/${examId}`,
        { headers: getHeaders() }
    );
    return handleResponse<ExamDetail>(response);
}

/**
 * 创建考试
 */
export async function createExam(data: CreateExamRequest): Promise<Exam> {
    const response = await fetch(`${API_BASE}/exams`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
    });
    return handleResponse<Exam>(response);
}

/**
 * 更新考试
 */
export async function updateExam(examId: number, data: UpdateExamRequest): Promise<Exam> {
    const response = await fetch(`${API_BASE}/exams/${examId}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(data),
    });
    return handleResponse<Exam>(response);
}

/**
 * 删除考试
 */
export async function deleteExam(examId: number): Promise<void> {
    const response = await fetch(`${API_BASE}/exams/${examId}`, {
        method: 'DELETE',
        headers: getHeaders(),
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: '删除失败' }));
        throw new Error(error.detail);
    }
}

/**
 * 发布考试
 */
export async function publishExam(examId: number): Promise<Exam> {
    const response = await fetch(`${API_BASE}/exams/${examId}/publish`, {
        method: 'POST',
        headers: getHeaders(),
    });
    return handleResponse<Exam>(response);
}

/**
 * 关闭考试
 */
export async function closeExam(examId: number): Promise<Exam> {
    const response = await fetch(`${API_BASE}/exams/${examId}/close`, {
        method: 'POST',
        headers: getHeaders(),
    });
    return handleResponse<Exam>(response);
}

// ===================================
// 学生答题
// ===================================

/**
 * 开始考试
 */
export async function startExam(examId: number): Promise<Attempt> {
    const response = await fetch(`${API_BASE}/exams/${examId}/start`, {
        method: 'POST',
        headers: getHeaders(),
    });
    return handleResponse<Attempt>(response);
}

/**
 * 获取当前答题记录
 */
export async function getAttempt(examId: number): Promise<Attempt> {
    const response = await fetch(
        `${API_BASE}/exams/${examId}/attempt`,
        { headers: getHeaders() }
    );
    return handleResponse<Attempt>(response);
}

/**
 * 保存单题答案
 */
export async function saveAnswer(
    examId: number,
    data: SubmitAnswerRequest
): Promise<{ message: string; question_id: number }> {
    const response = await fetch(`${API_BASE}/exams/${examId}/answer`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
    });
    return handleResponse(response);
}

/**
 * 提交考试
 */
export async function submitExam(examId: number): Promise<Attempt> {
    const response = await fetch(`${API_BASE}/exams/${examId}/submit`, {
        method: 'POST',
        headers: getHeaders(),
    });
    return handleResponse<Attempt>(response);
}

// ===================================
// 教师查看答题记录
// ===================================

/**
 * 获取考试的所有答题记录
 */
export async function getExamAttempts(
    examId: number,
    skip = 0,
    limit = 50
): Promise<AttemptListResponse> {
    const response = await fetch(
        `${API_BASE}/exams/${examId}/attempts?skip=${skip}&limit=${limit}`,
        { headers: getHeaders() }
    );
    return handleResponse<AttemptListResponse>(response);
}

// ===================================
// 题目管理
// ===================================

export interface AddQuestionRequest {
    type: 'single' | 'multiple' | 'blank' | 'short';
    stem: string;
    options?: Record<string, string>;
    answer: unknown;
    explanation?: string;
    score?: number;
    difficulty?: number;
    knowledge_point?: string;
}

/**
 * 添加题目到考试
 */
export async function addQuestionToExam(
    examId: number,
    data: AddQuestionRequest
): Promise<{ id: number; message: string }> {
    const response = await fetch(`${API_BASE}/exams/${examId}/questions`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
    });
    return handleResponse(response);
}

/**
 * 从考试中删除题目
 */
export async function removeQuestionFromExam(
    examId: number,
    questionId: number
): Promise<void> {
    const response = await fetch(
        `${API_BASE}/exams/${examId}/questions/${questionId}`,
        {
            method: 'DELETE',
            headers: getHeaders(),
        }
    );
    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: '删除失败' }));
        throw new Error(error.detail);
    }
}

/**
 * 获取考试题目列表
 */
export async function getExamQuestions(
    examId: number
): Promise<{ questions: unknown[]; total: number }> {
    const response = await fetch(`${API_BASE}/exams/${examId}/questions`, {
        headers: getHeaders(),
    });
    return handleResponse(response);
}

