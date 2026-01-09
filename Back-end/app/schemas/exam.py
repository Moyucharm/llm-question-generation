"""
Exam Schemas

Pydantic models for exam management
"""

from typing import Optional, List, Any
from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


class ExamStatus(str, Enum):
    """Exam status enumeration"""
    DRAFT = "draft"
    PUBLISHED = "published"
    CLOSED = "closed"


class AttemptStatus(str, Enum):
    """Attempt status enumeration"""
    IN_PROGRESS = "in_progress"
    SUBMITTED = "submitted"
    GRADED = "graded"


# ===================================
# Exam Schemas
# ===================================

class ExamBase(BaseModel):
    """Base exam schema"""
    title: str = Field(..., min_length=1, max_length=500, description="考试标题")
    duration_minutes: int = Field(60, ge=1, le=480, description="考试时长（分钟）")
    start_time: Optional[datetime] = Field(None, description="开始时间")
    end_time: Optional[datetime] = Field(None, description="结束时间")


class ExamCreate(ExamBase):
    """Create exam request"""
    paper_id: Optional[int] = Field(None, description="试卷ID（可选，不提供则创建空考试）")
    # 快速创建模式：直接传入题目
    questions: Optional[List[dict]] = Field(None, description="题目列表（快速创建模式）")
    course_id: Optional[int] = Field(None, description="课程ID")


class ExamUpdate(BaseModel):
    """Update exam request"""
    title: Optional[str] = Field(None, min_length=1, max_length=500)
    duration_minutes: Optional[int] = Field(None, ge=1, le=480)
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None


class ExamResponse(ExamBase):
    """Exam response"""
    id: int
    paper_id: Optional[int] = None
    status: ExamStatus
    published_by: int
    publisher_name: Optional[str] = None
    question_count: int = 0
    total_score: Optional[int] = 0  # 可能为 None，默认 0
    attempt_count: int = 0  # 参加人数
    attempt_status: Optional[str] = None  # 学生: in_progress, graded, submitted
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ExamDetail(ExamResponse):
    """Exam detail with questions"""
    questions: List[dict] = []  # 题目列表


class ExamListResponse(BaseModel):
    """Exam list response"""
    items: List[ExamResponse]
    total: int


# ===================================
# Attempt Schemas
# ===================================

class AttemptCreate(BaseModel):
    """Start attempt request (empty, just trigger)"""
    pass


class AnswerSubmit(BaseModel):
    """Submit single answer"""
    question_id: int = Field(..., description="题目ID")
    answer: Any = Field(..., description="学生答案")
    time_spent_seconds: Optional[int] = Field(None, description="答题耗时")


class AttemptSubmit(BaseModel):
    """Submit entire attempt"""
    answers: Optional[List[AnswerSubmit]] = Field(None, description="所有答案（可选，之前已保存则不需要）")


class AnswerResponse(BaseModel):
    """Answer response"""
    question_id: int
    student_answer: Optional[Any] = None
    is_correct: Optional[bool] = None
    score: Optional[int] = None
    feedback: Optional[str] = None

    class Config:
        from_attributes = True


class AttemptResponse(BaseModel):
    """Attempt response"""
    id: int
    exam_id: int
    student_id: int
    student_name: Optional[str] = None
    started_at: datetime
    submitted_at: Optional[datetime] = None
    total_score: Optional[int] = None
    status: AttemptStatus
    answers: List[AnswerResponse] = []
    remaining_seconds: Optional[int] = None  # 剩余时间

    class Config:
        from_attributes = True


class AttemptListResponse(BaseModel):
    """Attempt list response"""
    items: List[AttemptResponse]
    total: int


# ===================================
# Student Exam View
# ===================================

class StudentExamView(BaseModel):
    """Student view of an exam"""
    id: int
    title: str
    duration_minutes: int
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    question_count: int = 0
    total_score: int = 0
    # 学生状态
    can_start: bool = True  # 是否可以开始
    has_attempt: bool = False  # 是否已有答题记录
    attempt_status: Optional[AttemptStatus] = None
    attempt_score: Optional[int] = None

    class Config:
        from_attributes = True


class ExamQuestionView(BaseModel):
    """Question view for students (no correct answer)"""
    id: int
    type: str
    stem: str
    options: Optional[dict] = None
    score: int = 10
    # 学生答案（如果有）
    student_answer: Optional[Any] = None


# ===================================
# Question Management
# ===================================

class QuestionAdd(BaseModel):
    """Add question to exam"""
    type: str = Field(..., description="题目类型: single/multiple/blank/short")
    stem: str = Field(..., min_length=1, description="题干")
    options: Optional[dict] = Field(None, description="选项 (选择题)")
    answer: Any = Field(..., description="正确答案")
    explanation: Optional[str] = Field(None, description="解析")
    score: int = Field(10, ge=1, le=100, description="分值")
    difficulty: int = Field(3, ge=1, le=5, description="难度")
    knowledge_point: Optional[str] = Field(None, description="知识点")


class QuestionResponse(BaseModel):
    """Question response"""
    id: int
    type: str
    stem: str
    options: Optional[dict] = None
    answer: Optional[Any] = None
    explanation: Optional[str] = None
    score: int = 10
    difficulty: int = 3
    knowledge_point: Optional[str] = None

    class Config:
        from_attributes = True

