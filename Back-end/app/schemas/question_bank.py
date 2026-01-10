"""
Question Bank Schemas

Pydantic models for question bank management
"""

from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


class QuestionStatus(str, Enum):
    """题目状态枚举"""
    DRAFT = "draft"
    APPROVED = "approved"
    NEEDS_REVIEW = "needs_review"
    REJECTED = "rejected"


class QuestionType(str, Enum):
    """题目类型枚举"""
    SINGLE_CHOICE = "single"
    MULTIPLE_CHOICE = "multiple"
    FILL_BLANK = "blank"
    SHORT_ANSWER = "short"


# ===================================
# 请求模型
# ===================================

class QuestionCreate(BaseModel):
    """创建题目请求"""
    type: QuestionType = Field(..., description="题目类型")
    stem: str = Field(..., min_length=5, description="题干")
    options: Optional[Dict[str, str]] = Field(None, description="选项")
    answer: Any = Field(..., description="答案")
    explanation: Optional[str] = Field(None, description="解析")
    difficulty: int = Field(3, ge=1, le=5, description="难度 1-5")
    score: int = Field(10, ge=1, description="分值")
    course_id: Optional[int] = Field(None, description="课程ID")
    knowledge_point_id: Optional[int] = Field(None, description="知识点ID")
    status: QuestionStatus = Field(QuestionStatus.DRAFT, description="状态")


class QuestionUpdate(BaseModel):
    """更新题目请求"""
    stem: Optional[str] = Field(None, min_length=5, description="题干")
    options: Optional[Dict[str, str]] = Field(None, description="选项")
    answer: Optional[Any] = Field(None, description="答案")
    explanation: Optional[str] = Field(None, description="解析")
    difficulty: Optional[int] = Field(None, ge=1, le=5, description="难度")
    score: Optional[int] = Field(None, ge=1, description="分值")
    course_id: Optional[int] = Field(None, description="课程ID")
    knowledge_point_id: Optional[int] = Field(None, description="知识点ID")
    status: Optional[QuestionStatus] = Field(None, description="状态")


class QuestionBatchCreate(BaseModel):
    """批量保存 AI 生成的题目"""
    questions: List[QuestionCreate] = Field(..., min_length=1, description="题目列表")
    course_id: Optional[int] = Field(None, description="统一关联的课程ID")
    knowledge_point_id: Optional[int] = Field(None, description="统一关联的知识点ID")


class QuestionExportRequest(BaseModel):
    """导出题目请求"""
    question_ids: Optional[List[int]] = Field(None, description="指定题目ID，为空则按筛选条件导出")
    course_id: Optional[int] = Field(None, description="按课程筛选")
    question_type: Optional[QuestionType] = Field(None, description="按题型筛选")
    difficulty: Optional[int] = Field(None, description="按难度筛选")
    status: Optional[QuestionStatus] = Field(None, description="按状态筛选")


class QuestionImportItem(BaseModel):
    """导入的单个题目"""
    type: QuestionType
    stem: str
    options: Optional[Dict[str, str]] = None
    answer: Any
    explanation: Optional[str] = None
    difficulty: int = 3
    score: int = 10


class QuestionImportRequest(BaseModel):
    """导入题目请求"""
    questions: List[QuestionImportItem] = Field(..., min_length=1)
    course_id: Optional[int] = Field(None, description="统一关联的课程ID")
    knowledge_point_id: Optional[int] = Field(None, description="统一关联的知识点ID")
    status: QuestionStatus = Field(QuestionStatus.DRAFT, description="导入后的状态")


# ===================================
# 响应模型
# ===================================

class QuestionResponse(BaseModel):
    """题目响应"""
    id: int
    type: QuestionType
    stem: str
    options: Optional[Dict[str, str]] = None
    answer: Any
    explanation: Optional[str] = None
    difficulty: int
    score: int
    course_id: Optional[int] = None
    course_name: Optional[str] = None
    knowledge_point_id: Optional[int] = None
    knowledge_point_name: Optional[str] = None
    created_by: int
    creator_name: Optional[str] = None
    status: QuestionStatus
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class QuestionListResponse(BaseModel):
    """题目列表响应（分页）"""
    items: List[QuestionResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class QuestionBatchCreateResponse(BaseModel):
    """批量创建响应"""
    created_count: int
    question_ids: List[int]
    message: str


class QuestionExportResponse(BaseModel):
    """导出响应"""
    questions: List[Dict[str, Any]]
    count: int
    exported_at: datetime


class QuestionImportResponse(BaseModel):
    """导入响应"""
    imported_count: int
    skipped_count: int
    errors: List[str]
    question_ids: List[int]
