/**
 * 考试详情页面
 * 支持查看/编辑考试信息、添加题目、发布考试
 */

import React, { useEffect, useState } from 'react';
import {
    ArrowLeft,
    Save,
    Play,
    Pause,
    Clock,
    FileText,
    Plus,
    Trash2,
    Edit2,
    Check,
    X,
} from 'lucide-react';
import { useExamStore } from '@/stores/useExamStore';
import type { ExamQuestion, UpdateExamRequest } from '@/types/exam';

interface ExamDetailPageProps {
    examId: number;
    onNavigate?: (page: string) => void;
}

export const ExamDetailPage: React.FC<ExamDetailPageProps> = ({
    examId,
    onNavigate,
}) => {
    const {
        currentExam,
        isLoadingExam,
        error,
        fetchExam,
        updateExam,
        publishExam,
        closeExam,
        clearError,
    } = useExamStore();

    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState<UpdateExamRequest>({});
    const [showAddQuestion, setShowAddQuestion] = useState(false);

    useEffect(() => {
        fetchExam(examId);
    }, [examId, fetchExam]);

    // 初始化编辑表单
    useEffect(() => {
        if (currentExam) {
            setEditForm({
                title: currentExam.title,
                duration_minutes: currentExam.duration_minutes,
            });
        }
    }, [currentExam]);

    // 保存编辑
    const handleSave = async () => {
        try {
            await updateExam(examId, editForm);
            setIsEditing(false);
        } catch (e) {
            // 错误由 store 处理
        }
    };

    // 发布考试
    const handlePublish = async () => {
        if (!currentExam?.questions?.length) {
            alert('请先添加题目再发布考试');
            return;
        }
        if (!confirm('确定要发布此考试吗？发布后学生将可以参加。')) return;
        try {
            await publishExam(examId);
            await fetchExam(examId);
        } catch (e) {
            // 错误由 store 处理
        }
    };

    // 关闭考试
    const handleClose = async () => {
        if (!confirm('确定要关闭此考试吗？')) return;
        try {
            await closeExam(examId);
            await fetchExam(examId);
        } catch (e) {
            // 错误由 store 处理
        }
    };

    if (isLoadingExam) {
        return (
            <div className="max-w-4xl mx-auto">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="text-gray-500 mt-4">加载中...</p>
                </div>
            </div>
        );
    }

    if (!currentExam) {
        return (
            <div className="max-w-4xl mx-auto">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                    <p className="text-gray-500">考试不存在</p>
                    <button
                        onClick={() => onNavigate?.('exams')}
                        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg"
                    >
                        返回列表
                    </button>
                </div>
            </div>
        );
    }

    const isDraft = currentExam.status === 'draft';
    const isPublished = currentExam.status === 'published';

    return (
        <div className="max-w-4xl mx-auto">
            {/* 页面头部 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => onNavigate?.('exams')}
                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            {isEditing ? (
                                <input
                                    type="text"
                                    value={editForm.title || ''}
                                    onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                                    className="text-2xl font-bold text-gray-900 border-b-2 border-blue-500 focus:outline-none"
                                />
                            ) : (
                                <h1 className="text-2xl font-bold text-gray-900">{currentExam.title}</h1>
                            )}
                            <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                                <span className="flex items-center gap-1">
                                    <Clock className="w-4 h-4" />
                                    {isEditing ? (
                                        <input
                                            type="number"
                                            value={editForm.duration_minutes || 60}
                                            onChange={e =>
                                                setEditForm({ ...editForm, duration_minutes: parseInt(e.target.value) })
                                            }
                                            className="w-16 border rounded px-2 py-0.5"
                                        />
                                    ) : (
                                        currentExam.duration_minutes
                                    )}{' '}
                                    分钟
                                </span>
                                <span className="flex items-center gap-1">
                                    <FileText className="w-4 h-4" />
                                    {currentExam.questions?.length || 0} 题
                                </span>
                                <span
                                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${isDraft
                                            ? 'bg-gray-100 text-gray-600'
                                            : isPublished
                                                ? 'bg-green-100 text-green-600'
                                                : 'bg-red-100 text-red-600'
                                        }`}
                                >
                                    {isDraft ? '草稿' : isPublished ? '进行中' : '已结束'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* 操作按钮 */}
                    <div className="flex items-center gap-2">
                        {isDraft && (
                            <>
                                {isEditing ? (
                                    <>
                                        <button
                                            onClick={handleSave}
                                            className="flex items-center gap-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                                        >
                                            <Check className="w-4 h-4" />
                                            保存
                                        </button>
                                        <button
                                            onClick={() => setIsEditing(false)}
                                            className="flex items-center gap-1 px-3 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200"
                                        >
                                            <X className="w-4 h-4" />
                                            取消
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button
                                            onClick={() => setIsEditing(true)}
                                            className="flex items-center gap-1 px-3 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                            编辑
                                        </button>
                                        <button
                                            onClick={handlePublish}
                                            className="flex items-center gap-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                                        >
                                            <Play className="w-4 h-4" />
                                            发布
                                        </button>
                                    </>
                                )}
                            </>
                        )}
                        {isPublished && (
                            <button
                                onClick={handleClose}
                                className="flex items-center gap-1 px-3 py-2 bg-orange-100 text-orange-600 rounded-lg hover:bg-orange-200"
                            >
                                <Pause className="w-4 h-4" />
                                关闭
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* 错误提示 */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-6 flex justify-between items-center">
                    <span>{error}</span>
                    <button onClick={clearError} className="text-red-400 hover:text-red-600">
                        ✕
                    </button>
                </div>
            )}

            {/* 题目列表 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900">题目列表</h2>
                    {isDraft && (
                        <button
                            onClick={() => setShowAddQuestion(true)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                        >
                            <Plus className="w-4 h-4" />
                            添加题目
                        </button>
                    )}
                </div>

                {currentExam.questions && currentExam.questions.length > 0 ? (
                    <div className="divide-y divide-gray-100">
                        {currentExam.questions.map((question, index) => (
                            <QuestionItem
                                key={question.id}
                                question={question}
                                index={index}
                                canEdit={isDraft}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="p-12 text-center text-gray-500">
                        <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                        <p>暂无题目</p>
                        {isDraft && (
                            <button
                                onClick={() => setShowAddQuestion(true)}
                                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                            >
                                添加第一道题目
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* 添加题目弹窗 */}
            {showAddQuestion && (
                <AddQuestionModal
                    examId={examId}
                    onClose={() => setShowAddQuestion(false)}
                    onSuccess={() => {
                        setShowAddQuestion(false);
                        fetchExam(examId);
                    }}
                />
            )}
        </div>
    );
};

// 题目项组件
interface QuestionItemProps {
    question: ExamQuestion;
    index: number;
    canEdit: boolean;
}

const QuestionItem: React.FC<QuestionItemProps> = ({ question, index, canEdit }) => {
    const typeLabels: Record<string, string> = {
        single: '单选题',
        multiple: '多选题',
        blank: '填空题',
        short: '简答题',
    };

    return (
        <div className="p-4 hover:bg-gray-50">
            <div className="flex items-start gap-4">
                <span className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                    {index + 1}
                </span>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                            {typeLabels[question.type] || question.type}
                        </span>
                        <span className="text-sm text-gray-400">{question.score} 分</span>
                    </div>
                    <p className="text-gray-900 line-clamp-2">{question.stem}</p>
                    {question.options && (
                        <div className="mt-2 text-sm text-gray-500">
                            {Object.entries(question.options).map(([key, value]) => (
                                <div key={key} className="ml-4">
                                    {key}. {value}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                {canEdit && (
                    <button className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                        <Trash2 className="w-4 h-4" />
                    </button>
                )}
            </div>
        </div>
    );
};

// 添加题目弹窗
interface AddQuestionModalProps {
    examId: number;
    onClose: () => void;
    onSuccess: () => void;
}

const AddQuestionModal: React.FC<AddQuestionModalProps> = ({
    examId,
    onClose,
    onSuccess,
}) => {
    const [questionType, setQuestionType] = useState('single');
    const [stem, setStem] = useState('');
    const [options, setOptions] = useState({ A: '', B: '', C: '', D: '' });
    const [answer, setAnswer] = useState('A');
    const [score, setScore] = useState(10);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!stem.trim()) {
            alert('请输入题目内容');
            return;
        }

        setIsSubmitting(true);
        try {
            // TODO: 调用 API 添加题目
            // 目前后端还没有直接添加题目到考试的 API
            // 需要先创建试卷，再关联到考试
            alert('功能开发中：需要先实现题库管理功能');
            onClose();
        } catch (error) {
            console.error('添加题目失败:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                    <h3 className="text-lg font-semibold">添加题目</h3>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    {/* 题型选择 */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">题目类型</label>
                        <select
                            value={questionType}
                            onChange={e => setQuestionType(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                        >
                            <option value="single">单选题</option>
                            <option value="multiple">多选题</option>
                            <option value="blank">填空题</option>
                            <option value="short">简答题</option>
                        </select>
                    </div>

                    {/* 题干 */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">题目内容</label>
                        <textarea
                            value={stem}
                            onChange={e => setStem(e.target.value)}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                            placeholder="请输入题目内容..."
                        />
                    </div>

                    {/* 选项（选择题） */}
                    {(questionType === 'single' || questionType === 'multiple') && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">选项</label>
                            <div className="space-y-2">
                                {Object.entries(options).map(([key, value]) => (
                                    <div key={key} className="flex items-center gap-2">
                                        <span className="w-6 text-center font-medium">{key}</span>
                                        <input
                                            type="text"
                                            value={value}
                                            onChange={e => setOptions({ ...options, [key]: e.target.value })}
                                            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg"
                                            placeholder={`选项 ${key}`}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 正确答案 */}
                    {questionType === 'single' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">正确答案</label>
                            <select
                                value={answer}
                                onChange={e => setAnswer(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                            >
                                <option value="A">A</option>
                                <option value="B">B</option>
                                <option value="C">C</option>
                                <option value="D">D</option>
                            </select>
                        </div>
                    )}

                    {/* 分值 */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">分值</label>
                        <input
                            type="number"
                            value={score}
                            onChange={e => setScore(parseInt(e.target.value) || 0)}
                            min={1}
                            max={100}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                        />
                    </div>
                </div>

                <div className="p-4 border-t border-gray-200 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
                    >
                        取消
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                        {isSubmitting ? '添加中...' : '添加题目'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ExamDetailPage;
