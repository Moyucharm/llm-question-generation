/**
 * 考试列表页面
 * 教师：显示自己创建的考试，可管理
 * 学生：显示已发布的考试，可参加
 */

import React, { useEffect } from 'react';
import {
    Plus,
    Clock,
    Users,
    FileText,
    Play,
    Pause,
    Trash2,
    CheckCircle,
} from 'lucide-react';
import { useExamStore } from '@/stores/useExamStore';
import { useAuthStore } from '@/stores/useAuthStore';
import type { Exam, ExamStatus } from '@/types/exam';

// 状态标签颜色
const statusColors: Record<ExamStatus, string> = {
    draft: 'bg-gray-100 text-gray-600',
    published: 'bg-green-100 text-green-600',
    closed: 'bg-red-100 text-red-600',
};

const statusLabels: Record<ExamStatus, string> = {
    draft: '草稿',
    published: '进行中',
    closed: '已结束',
};

interface ExamListPageProps {
    onNavigate?: (page: string) => void;
}

export const ExamListPage: React.FC<ExamListPageProps> = ({ onNavigate }) => {
    const { user } = useAuthStore();
    const {
        exams,
        totalExams,
        isLoadingExams,
        error,
        fetchExams,
        publishExam,
        closeExam,
        deleteExam,
        clearError,
    } = useExamStore();

    const isTeacher = user?.role === 'teacher';

    useEffect(() => {
        fetchExams();
    }, [fetchExams]);

    // 处理发布考试
    const handlePublish = async (examId: number) => {
        if (!confirm('确定要发布此考试吗？发布后学生将可以参加。')) return;
        try {
            await publishExam(examId);
        } catch (e) {
            // 错误由 store 处理
        }
    };

    // 处理关闭考试
    const handleClose = async (examId: number) => {
        if (!confirm('确定要关闭此考试吗？关闭后学生将无法继续答题。')) return;
        try {
            await closeExam(examId);
        } catch (e) {
            // 错误由 store 处理
        }
    };

    // 处理删除考试
    const handleDelete = async (examId: number) => {
        if (!confirm('确定要删除此考试吗？此操作不可恢复。')) return;
        try {
            await deleteExam(examId);
        } catch (e) {
            // 错误由 store 处理
        }
    };

    // 格式化时间
    const formatTime = (dateStr?: string) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleString('zh-CN', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <div className="max-w-6xl mx-auto">
            {/* 页面头部 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">
                            {isTeacher ? '考试管理' : '我的考试'}
                        </h1>
                        <p className="text-gray-500 mt-1">
                            {isTeacher
                                ? `共 ${totalExams} 场考试`
                                : `共 ${totalExams} 场可参加的考试`}
                        </p>
                    </div>
                    {isTeacher && (
                        <button
                            onClick={() => onNavigate?.('exam-create')}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            <Plus className="w-5 h-5" />
                            创建考试
                        </button>
                    )}
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

            {/* 加载状态 */}
            {isLoadingExams ? (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="text-gray-500 mt-4">加载中...</p>
                </div>
            ) : exams.length === 0 ? (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                    <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">
                        {isTeacher ? '还没有创建任何考试' : '暂无可参加的考试'}
                    </p>
                    {isTeacher && (
                        <button
                            onClick={() => onNavigate?.('exam-create')}
                            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                            创建第一场考试
                        </button>
                    )}
                </div>
            ) : (
                <div className="space-y-4">
                    {exams.map(exam => (
                        <ExamCard
                            key={exam.id}
                            exam={exam}
                            isTeacher={isTeacher}
                            onPublish={() => handlePublish(exam.id)}
                            onClose={() => handleClose(exam.id)}
                            onDelete={() => handleDelete(exam.id)}
                            formatTime={formatTime}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

// 考试卡片组件
interface ExamCardProps {
    exam: Exam;
    isTeacher: boolean;
    onPublish: () => void;
    onClose: () => void;
    onDelete: () => void;
    formatTime: (dateStr?: string) => string;
}

const ExamCard: React.FC<ExamCardProps> = ({
    exam,
    isTeacher,
    onPublish,
    onClose,
    onDelete,
    formatTime,
}) => {
    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    {/* 标题和状态 */}
                    <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{exam.title}</h3>
                        <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[exam.status]}`}
                        >
                            {statusLabels[exam.status]}
                        </span>
                    </div>

                    {/* 考试信息 */}
                    <div className="flex items-center gap-6 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {exam.duration_minutes} 分钟
                        </span>
                        <span className="flex items-center gap-1">
                            <FileText className="w-4 h-4" />
                            {exam.question_count} 题
                        </span>
                        {isTeacher && (
                            <span className="flex items-center gap-1">
                                <Users className="w-4 h-4" />
                                {exam.attempt_count} 人参加
                            </span>
                        )}
                    </div>

                    {/* 时间信息 */}
                    {(exam.start_time || exam.end_time) && (
                        <div className="mt-2 text-sm text-gray-400">
                            {exam.start_time && <span>开始: {formatTime(exam.start_time)}</span>}
                            {exam.start_time && exam.end_time && <span className="mx-2">~</span>}
                            {exam.end_time && <span>结束: {formatTime(exam.end_time)}</span>}
                        </div>
                    )}

                    {/* 学生：显示得分 */}
                    {!isTeacher && exam.attempt_count > 0 && exam.total_score > 0 && (
                        <div className="mt-2 flex items-center gap-2 text-green-600">
                            <CheckCircle className="w-4 h-4" />
                            <span className="font-medium">得分: {exam.total_score}</span>
                        </div>
                    )}
                </div>

                {/* 操作按钮 */}
                <div className="flex items-center gap-2">
                    {isTeacher ? (
                        // 教师操作
                        <>
                            {exam.status === 'draft' && (
                                <>
                                    <button
                                        onClick={onPublish}
                                        className="flex items-center gap-1 px-3 py-1.5 text-green-600 bg-green-50 rounded-lg hover:bg-green-100 transition-colors text-sm"
                                        title="发布"
                                    >
                                        <Play className="w-4 h-4" />
                                        发布
                                    </button>
                                    <button
                                        onClick={onDelete}
                                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        title="删除"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </>
                            )}

                            {exam.status === 'published' && (
                                <button
                                    onClick={onClose}
                                    className="flex items-center gap-1 px-3 py-1.5 text-orange-600 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors text-sm"
                                    title="关闭"
                                >
                                    <Pause className="w-4 h-4" />
                                    关闭
                                </button>
                            )}

                            {exam.status === 'closed' && (
                                <span className="text-sm text-gray-400">已结束</span>
                            )}
                        </>
                    ) : (
                        // 学生操作
                        <>
                            {exam.status === 'published' && exam.attempt_count === 0 && (
                                <button className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                                    <Play className="w-4 h-4" />
                                    开始考试
                                </button>
                            )}
                            {exam.attempt_count > 0 && (
                                <span className="text-sm text-green-600 font-medium">已完成</span>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ExamListPage;
