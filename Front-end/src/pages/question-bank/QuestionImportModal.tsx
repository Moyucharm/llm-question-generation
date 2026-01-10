/**
 * 题目导入弹窗
 */

import React, { useState, useRef } from 'react';
import { questionBankService } from '@/services/questionBankService';
import type { QuestionImportRequest } from '@/services/questionBankService';
import type { Course } from '@/services/courseService';

interface Props {
    courses: Course[];
    onClose: () => void;
    onSuccess: () => void;
}

export const QuestionImportModal: React.FC<Props> = ({
    courses,
    onClose,
    onSuccess,
}) => {
    const [jsonContent, setJsonContent] = useState('');
    const [courseId, setCourseId] = useState<number | undefined>();
    const [status, setStatus] = useState<'draft' | 'approved'>('draft');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<{
        imported_count: number;
        skipped_count: number;
        errors: string[];
    } | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // 处理文件选择
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result as string;
            setJsonContent(content);
            setError(null);
        };
        reader.onerror = () => {
            setError('文件读取失败');
        };
        reader.readAsText(file);
    };

    // 验证 JSON 格式
    const validateJson = (): unknown[] | null => {
        try {
            const data = JSON.parse(jsonContent);
            if (!Array.isArray(data)) {
                setError('JSON 必须是数组格式');
                return null;
            }
            if (data.length === 0) {
                setError('题目列表不能为空');
                return null;
            }
            // 验证每个题目的必填字段
            for (let i = 0; i < data.length; i++) {
                const q = data[i];
                if (!q.type || !q.stem || q.answer === undefined) {
                    setError(`第 ${i + 1} 道题缺少必填字段 (type, stem, answer)`);
                    return null;
                }
            }
            return data;
        } catch {
            setError('JSON 格式错误');
            return null;
        }
    };

    // 提交导入
    const handleSubmit = async () => {
        setError(null);
        const questions = validateJson();
        if (!questions) return;

        setLoading(true);

        try {
            const request: QuestionImportRequest = {
                questions: questions.map((q: unknown) => {
                    const question = q as Record<string, unknown>;
                    return {
                        type: question.type as string,
                        stem: question.stem as string,
                        options: question.options as Record<string, string> | undefined,
                        answer: question.answer,
                        explanation: question.explanation as string | undefined,
                        difficulty: (question.difficulty as number) || 3,
                        score: (question.score as number) || 10,
                    };
                }),
                course_id: courseId,
                status: status,
            };

            const response = await questionBankService.import(request);
            setResult(response);

            if (response.imported_count > 0) {
                setTimeout(() => {
                    onSuccess();
                }, 1500);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : '导入失败');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                {/* 头部 */}
                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-gray-900">导入题目</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        ✕
                    </button>
                </div>

                {/* 内容 */}
                <div className="p-6 space-y-4">
                    {/* 导入结果 */}
                    {result && (
                        <div
                            className={`p-4 rounded-lg ${result.imported_count > 0
                                ? 'bg-green-50 text-green-700'
                                : 'bg-yellow-50 text-yellow-700'
                                }`}
                        >
                            <p className="font-medium">
                                导入完成：成功 {result.imported_count} 道，跳过 {result.skipped_count} 道
                            </p>
                            {result.errors.length > 0 && (
                                <ul className="mt-2 text-sm list-disc list-inside">
                                    {result.errors.map((err, i) => (
                                        <li key={i}>{err}</li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    )}

                    {/* 错误提示 */}
                    {error && (
                        <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    {/* 文件选择 */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            选择 JSON 文件
                        </label>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".json"
                            onChange={handleFileSelect}
                            className="hidden"
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
                        >
                            📁 选择文件
                        </button>
                    </div>

                    {/* JSON 预览/编辑 */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            JSON 内容（可直接粘贴）
                        </label>
                        <textarea
                            rows={10}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                            placeholder={`[
  {
    "type": "single",
    "stem": "题目内容",
    "options": {"A": "选项A", "B": "选项B", "C": "选项C", "D": "选项D"},
    "answer": "A",
    "explanation": "解析",
    "difficulty": 3,
    "score": 10
  }
]`}
                            value={jsonContent}
                            onChange={(e) => {
                                setJsonContent(e.target.value);
                                setError(null);
                            }}
                        />
                    </div>

                    {/* 选项 */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                关联课程（可选）
                            </label>
                            <select
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                value={courseId || ''}
                                onChange={(e) =>
                                    setCourseId(e.target.value ? Number(e.target.value) : undefined)
                                }
                            >
                                <option value="">不关联</option>
                                {courses.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                导入后状态
                            </label>
                            <select
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                value={status}
                                onChange={(e) => setStatus(e.target.value as 'draft' | 'approved')}
                            >
                                <option value="draft">草稿</option>
                                <option value="approved">已审核</option>
                            </select>
                        </div>
                    </div>

                    {/* 格式说明 */}
                    <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
                        <p className="font-medium mb-1">JSON 格式说明：</p>
                        <ul className="list-disc list-inside space-y-0.5">
                            <li>type: 题型 (single/multiple/blank/short)</li>
                            <li>stem: 题干内容 (必填)</li>
                            <li>options: 选项 (选择题必填)</li>
                            <li>answer: 答案 (必填)</li>
                            <li>explanation: 解析 (可选)</li>
                            <li>difficulty: 难度 1-5 (默认 3)</li>
                            <li>score: 分值 (默认 10)</li>
                        </ul>
                    </div>
                </div>

                {/* 底部 */}
                <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                    >
                        {result ? '关闭' : '取消'}
                    </button>
                    {!result && (
                        <button
                            onClick={handleSubmit}
                            disabled={loading || !jsonContent.trim()}
                            className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                        >
                            {loading ? '导入中...' : '导入'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
