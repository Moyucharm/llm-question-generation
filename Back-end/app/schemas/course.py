"""
Course and KnowledgePoint Schemas

Pydantic models for course and knowledge point related API requests and responses
"""

from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel, Field, ConfigDict


# ==========================================
# Knowledge Point Schemas
# ==========================================

class KnowledgePointBase(BaseModel):
    """Base schema for KnowledgePoint"""
    name: str = Field(..., min_length=1, max_length=200, description="知识点名称")
    description: Optional[str] = Field(None, description="详细描述")
    chapter: Optional[str] = Field(None, max_length=100, description="章节")
    order: int = Field(0, description="显示顺序")


class KnowledgePointCreate(KnowledgePointBase):
    """Schema for creating a knowledge point"""
    parent_id: Optional[int] = Field(None, description="父知识点ID")


class KnowledgePointUpdate(BaseModel):
    """Schema for updating a knowledge point"""
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    chapter: Optional[str] = None
    parent_id: Optional[int] = None
    order: Optional[int] = None


class KnowledgePointResponse(KnowledgePointBase):
    """Schema for knowledge point response"""
    model_config = ConfigDict(from_attributes=True)

    id: int
    course_id: int
    parent_id: Optional[int]
    created_at: datetime
    updated_at: datetime


class KnowledgePointTree(KnowledgePointResponse):
    """Schema for knowledge point tree structure"""
    children: List["KnowledgePointTree"] = []


# ==========================================
# Course Schemas
# ==========================================

class CourseBase(BaseModel):
    """Base schema for Course"""
    name: str = Field(..., min_length=1, max_length=200, description="课程名称")
    description: Optional[str] = Field(None, description="课程描述")


class CourseCreate(CourseBase):
    """Schema for creating a course"""
    pass


class CourseUpdate(BaseModel):
    """Schema for updating a course"""
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None


class CourseResponse(CourseBase):
    """Schema for course response"""
    model_config = ConfigDict(from_attributes=True)

    id: int
    teacher_id: int
    created_at: datetime
    updated_at: datetime


class CourseDetail(CourseResponse):
    """Schema for detailed course response including knowledge points"""
    knowledge_points: List[KnowledgePointTree] = []
