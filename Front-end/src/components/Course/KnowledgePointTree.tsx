/**
 * Knowledge Point Tree Component
 */

import React, { useState } from 'react';
import {
    ChevronRight,
    ChevronDown,
    Plus,
    Edit2,
    Trash2,
    Folder,
    FileText
} from 'lucide-react';
import type { KnowledgePoint } from '../../types/course';
import { Button } from '../UI/Button';

interface KnowledgePointTreeProps {
    points: KnowledgePoint[];
    onAddPoint: (parentId?: number) => void;
    onEditPoint: (point: KnowledgePoint) => void;
    onDeletePoint: (point: KnowledgePoint) => void;
}

const TreeNode: React.FC<{
    point: KnowledgePoint;
    level: number;
    onAdd: (parentId: number) => void;
    onEdit: (point: KnowledgePoint) => void;
    onDelete: (point: KnowledgePoint) => void;
}> = ({ point, level, onAdd, onEdit, onDelete }) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const hasChildren = point.children && point.children.length > 0;

    return (
        <div className="select-none">
            <div
                className={`
          flex items-center gap-2 py-2 px-2 rounded-lg hover:bg-gray-50 group
          ${level === 0 ? 'font-medium' : 'text-sm'}
        `}
                style={{ paddingLeft: `${level * 1.5 + 0.5}rem` }}
            >
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className={`p-1 rounded hover:bg-gray-200 ${!hasChildren && 'invisible'}`}
                >
                    {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-gray-500" />
                    ) : (
                        <ChevronRight className="w-4 h-4 text-gray-500" />
                    )}
                </button>

                <div className="text-gray-500">
                    {hasChildren ? (
                        <Folder className="w-4 h-4 text-blue-500" />
                    ) : (
                        <FileText className="w-4 h-4" />
                    )}
                </div>

                <span className="flex-1 truncate">{point.name}</span>

                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={() => onAdd(point.id)}
                        className="p-1 text-gray-400 hover:text-green-600 rounded"
                        title="添加子知识点"
                    >
                        <Plus className="w-3 h-3" />
                    </button>
                    <button
                        onClick={() => onEdit(point)}
                        className="p-1 text-gray-400 hover:text-blue-600 rounded"
                        title="编辑"
                    >
                        <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                        onClick={() => onDelete(point)}
                        className="p-1 text-gray-400 hover:text-red-600 rounded"
                        title="删除"
                    >
                        <Trash2 className="w-3 h-3" />
                    </button>
                </div>
            </div>

            {isExpanded && hasChildren && (
                <div>
                    {point.children!.map((child) => (
                        <TreeNode
                            key={child.id}
                            point={child}
                            level={level + 1}
                            onAdd={onAdd}
                            onEdit={onEdit}
                            onDelete={onDelete}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export const KnowledgePointTree: React.FC<KnowledgePointTreeProps> = ({
    points,
    onAddPoint,
    onEditPoint,
    onDeletePoint,
}) => {
    return (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-100">
                <h3 className="font-semibold text-gray-800">知识点结构</h3>
                <Button size="sm" variant="outline" icon={<Plus className="w-4 h-4" />} onClick={() => onAddPoint()}>
                    添加根知识点
                </Button>
            </div>

            {points.length === 0 ? (
                <div className="text-center py-8 text-gray-500 text-sm">
                    暂无知识点，点击上方按钮添加
                </div>
            ) : (
                <div className="space-y-1">
                    {points.map((point) => (
                        <TreeNode
                            key={point.id}
                            point={point}
                            level={0}
                            onAdd={onAddPoint}
                            onEdit={onEditPoint}
                            onDelete={onDeletePoint}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};
