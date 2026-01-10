/**
 * 题目编辑弹窗
 */

import React, { useState, useEffect } from 'react';
import {
    questionBankService,
    getQuestionTypeLabel,
} from '@/services/questionBankService';
import type { Question, QuestionUpdate } from '@/services/questionBankService';
import { courseService } from '@/services/courseService';
import type { Course, KnowledgePoint } from '@/services/courseService';

interface Props {
    question: Question | null;
    courses: Course[];
    onClose: () => void;
    onSuccess: () => void;
}

export const QuestionEditModal: React.FC<Props> = ({
    question,
    courses,
    onClose,
    onSuccess,
}) => {
    const [formData, setFormData] = useState<QuestionUpdate>({});
    const [knowledgePoints, setKnowledgePoints] = useState<KnowledgePoint[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // 初始化表单数据
    useEffect(() => {
        if (question) {
            setFormData({
                stem: question.stem,
                options: question.options || undefined,
                answer: question.answer,
                explanation: question.explanation || '',
                difficulty: question.difficulty,
                score: question.score,
                course_id: question.course_id || undefined,
                knowledge_point_id: question.knowledge_point_id || undefined,
                status: question.status,
            });

            // 如果有课程，加载知识点
            if (question.course_id) {
                loadKnowledgePoints(question.course_id);
            }
        }
    }, [question]);

    // 加载知识点
    const loadKnowledgePoints = async (courseId: number) => {
        try {
            const kps = await courseService.listKnowledgePoints(courseId);
            setKnowledgePoints(kps);
        } catch (err) {
            console.error('加载知识点失败:', err);
        }
    };

    // 处理课程切换
    const handleCourseChange = (courseId: number | undefined) => {
        setFormData((prev) => ({
            ...prev,
            course_id: courseId,
            knowledge_point_id: undefined,
        }));
        if (courseId) {
            loadKnowledgePoints(courseId);
        } else {
            setKnowledgePoints([]);
        }
    };

    // 处理选项变更（选择题）
    const handleOptionChange = (key: string, value: string) => {
        setFormData((prev) => ({
            ...prev,
            options: { ...(prev.options || {}), [key]: value },
        }));
    };

    // 提交
    const handleSubmit = async () => {
        if (!question) return;

        setLoading(true);
        setError(null);

        try {
            await questionBankService.update(question.id, formData);
            onSuccess();
        } catch (err) {
            setError(err instanceof Error ? err.message : '保存失败');
        } finally {
            setLoading(false);
        }
    };

    if (!question) return null;

    const isChoiceQuestion = question.type === 'single' || question.type === 'multiple';

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                {/* 头部 */}
                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-gray-900">
                        编辑题目 - {getQuestionTypeLabel(question.type)}
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        ✕
                    </button>
                </div>

                {/* 内容 */}
                <div className="p-6 space-y-4">
                    {/* 错误提示 */}
                    {error && (
                        <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    {/* 题干 */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            题干
                        </label>
                        <textarea
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            value={formData.stem || ''}
                            onChange={(e) => setFormData((prev) => ({ ...prev, stem: e.target.value }))}
                        />
                    </div>

                    {/* 选项（选择题） */}
                    {isChoiceQuestion && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                选项
                            </label>
                            <div className="space-y-2">
                                {['A', 'B', 'C', 'D'].map((key) => (
                                    <div key={key} className="flex gap-2 items-center">
                                        <span className="w-6 text-sm font-medium text-gray-600">{key}.</span>
                                        <input
                                            type="text"
                                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                            value={formData.options?.[key] || ''}
                                            onChange={(e) => handleOptionChange(key, e.target.value)}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 答案 */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            答案
                        </label>
                        {question.type === 'single' ? (
                            <select
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                value={(formData.answer as { correct?: string })?.correct || ''}
                                onChange={(e) =>
                                    setFormData((prev) => ({
                                        ...prev,
                                        answer: { correct: e.target.value },
                                    }))
                                }
                            >
                                <option value="">请选择正确答案</option>
                                {['A', 'B', 'C', 'D'].map((key) => (
                                    <option key={key} value={key}>{key}</option>
                                ))}
                            </select>
                        ) : question.type === 'multiple' ? (
                            <div className="flex gap-4">
                                {['A', 'B', 'C', 'D'].map((key) => (
                                    <label key={key} className="flex items-center gap-1">
                                        <input
                                            type="checkbox"
                                            checked={((formData.answer as { correct?: string[] })?.correct || []).includes(key)}
                                            onChange={(e) => {
                                                const current = (formData.answer as { correct?: string[] })?.correct || [];
                                                const newAnswer = e.target.checked
                                                    ? [...current, key]
                                                    : current.filter((k) => k !== key);
                                                setFormData((prev) => ({
                                                    ...prev,
                                                    answer: { correct: newAnswer.sort() },
                                                }));
                                            }}
                                            className="rounded"
                                        />
                                        <span className="text-sm">{key}</span>
                                    </label>
                                ))}
                            </div>
                        ) : (
                            <textarea
                                rows={2}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                value={
                                    typeof formData.answer === 'string'
                                        ? formData.answer
                                        : JSON.stringify(formData.answer)
                                }
                                onChange={(e) => setFormData((prev) => ({ ...prev, answer: e.target.value }))}
                            />
                        )}
                    </div>

                    {/* 解析 */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            解析
                        </label>
                        <textarea
                            rows={2}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            value={formData.explanation || ''}
                            onChange={(e) => setFormData((prev) => ({ ...prev, explanation: e.target.value }))}
                        />
                    </div>

                    {/* 难度和分值 */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                难度
                            </label>
                            <select
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                value={formData.difficulty || 3}
                                onChange={(e) =>
                                    setFormData((prev) => ({ ...prev, difficulty: Number(e.target.value) }))
                                }
                            >
                                <option value={1}>非常简单</option>
                                <option value={2}>简单</option>
                                <option value={3}>中等</option>
                                <option value={4}>困难</option>
                                <option value={5}>非常困难</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                分值
                            </label>
                            <input
                                type="number"
                                min={1}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                value={formData.score || 10}
                                onChange={(e) =>
                                    setFormData((prev) => ({ ...prev, score: Number(e.target.value) }))
                                }
                            />
                        </div>
                    </div>

                    {/* 课程和知识点 */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                课程
                            </label>
                            <select
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                value={formData.course_id || ''}
                                onChange={(e) =>
                                    handleCourseChange(e.target.value ? Number(e.target.value) : undefined)
                                }
                            >
                                <option value="">无</option>
                                {courses.map((c) => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                知识点
                            </label>
                            <select
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                value={formData.knowledge_point_id || ''}
                                onChange={(e) =>
                                    setFormData((prev) => ({
                                        ...prev,
                                        knowledge_point_id: e.target.value ? Number(e.target.value) : undefined,
                                    }))
                                }
                                disabled={!formData.course_id}
                            >
                                <option value="">无</option>
                                {knowledgePoints.map((kp) => (
                                    <option key={kp.id} value={kp.id}>{kp.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* 状态 */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            状态
                        </label>
                        <select
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            value={formData.status || 'draft'}
                            onChange={(e) =>
                                setFormData((prev) => ({
                                    ...prev,
                                    status: e.target.value as 'draft' | 'approved' | 'needs_review' | 'rejected',
                                }))
                            }
                        >
                            <option value="draft">草稿</option>
                            <option value="approved">已审核</option>
                            <option value="needs_review">待审核</option>
                            <option value="rejected">已拒绝</option>
                        </select>
                    </div>
                </div>

                {/* 底部 */}
                <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                    >
                        取消
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                        {loading ? '保存中...' : '保存'}
                    </button>
                </div>
            </div>
        </div>
    );
};
