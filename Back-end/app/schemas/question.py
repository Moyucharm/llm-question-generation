"""
Question Schemas

Pydantic models for question generation and validation
"""

from typing import Optional, List, Union, Dict, Any
from enum import Enum

from pydantic import BaseModel, Field, field_validator, model_validator


class QuestionType(str, Enum):
    """Question type enumeration"""
    SINGLE_CHOICE = "single"      # Single choice
    MULTIPLE_CHOICE = "multiple"  # Multiple choice
    FILL_BLANK = "blank"          # Fill in the blank
    SHORT_ANSWER = "short"        # Short answer


class DifficultyLevel(int, Enum):
    """Difficulty level enumeration"""
    VERY_EASY = 1
    EASY = 2
    MEDIUM = 3
    HARD = 4
    VERY_HARD = 5


# ===================================
# Generated Question Schemas
# ===================================

class GeneratedQuestion(BaseModel):
    """Base schema for a generated question"""
    type: QuestionType
    stem: str = Field(..., min_length=5, description="Question stem/content")
    options: Optional[Dict[str, str]] = Field(None, description="Options for choice questions")
    answer: Any = Field(..., description="Correct answer")
    explanation: str = Field(..., min_length=10, description="Answer explanation")
    difficulty: int = Field(..., ge=1, le=5, description="Difficulty level 1-5")
    knowledge_point: Optional[str] = Field(None, description="Related knowledge point")

    @field_validator('difficulty')
    @classmethod
    def validate_difficulty(cls, v):
        if v < 1 or v > 5:
            raise ValueError('Difficulty must be between 1 and 5')
        return v


class SingleChoiceQuestion(GeneratedQuestion):
    """Single choice question schema"""
    type: QuestionType = QuestionType.SINGLE_CHOICE
    options: Dict[str, str] = Field(..., description="Options A, B, C, D")
    answer: str = Field(..., pattern=r'^[A-D]$', description="Correct option (A/B/C/D)")

    @model_validator(mode='after')
    def validate_answer_in_options(self):
        if self.answer not in self.options:
            raise ValueError(f'Answer {self.answer} must be one of the options')
        if len(self.options) < 2:
            raise ValueError('Must have at least 2 options')
        return self


class MultipleChoiceQuestion(GeneratedQuestion):
    """Multiple choice question schema"""
    type: QuestionType = QuestionType.MULTIPLE_CHOICE
    options: Dict[str, str] = Field(..., description="Options A, B, C, D")
    answer: List[str] = Field(..., min_length=2, description="Correct options list")

    @model_validator(mode='after')
    def validate_answers_in_options(self):
        for ans in self.answer:
            if ans not in self.options:
                raise ValueError(f'Answer {ans} must be one of the options')
        if len(self.answer) < 2:
            raise ValueError('Multiple choice must have at least 2 correct answers')
        if len(self.answer) >= len(self.options):
            raise ValueError('Cannot have all options as correct answers')
        return self


class FillBlankQuestion(GeneratedQuestion):
    """Fill in the blank question schema"""
    type: QuestionType = QuestionType.FILL_BLANK
    options: None = None
    answer: List[str] = Field(..., min_length=1, description="Answers for each blank")

    @model_validator(mode='after')
    def validate_blanks_match(self):
        # Count blanks in stem (marked as ___ or {})
        blank_count = self.stem.count('___') + self.stem.count('{}') + self.stem.count('____')
        if blank_count == 0:
            # Try counting underscores patterns
            import re
            blank_count = len(re.findall(r'_{2,}', self.stem))

        if blank_count > 0 and blank_count != len(self.answer):
            raise ValueError(f'Number of blanks ({blank_count}) must match answers ({len(self.answer)})')
        return self


class ShortAnswerQuestion(GeneratedQuestion):
    """Short answer question schema"""
    type: QuestionType = QuestionType.SHORT_ANSWER
    options: None = None
    answer: str = Field(..., min_length=10, description="Reference answer")
    keywords: Optional[List[str]] = Field(None, description="Key points for grading")
    rubric: Optional[str] = Field(None, description="Grading rubric")


# ===================================
# Generation Request/Response Schemas
# ===================================

class GenerationRequest(BaseModel):
    """Request schema for question generation"""
    course_name: str = Field(..., description="Course/subject name")
    knowledge_point: Optional[str] = Field(None, description="Specific knowledge point")
    question_type: QuestionType = Field(..., description="Type of question to generate")
    difficulty: int = Field(3, ge=1, le=5, description="Target difficulty level")
    count: int = Field(1, ge=1, le=10, description="Number of questions to generate")
    language: str = Field("zh", description="Language (zh/en)")
    additional_requirements: Optional[str] = Field(None, description="Additional requirements")


class ValidationResult(BaseModel):
    """Result of question validation"""
    is_valid: bool
    errors: List[str] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)
    question: Optional[Dict[str, Any]] = None


class ReviewResult(BaseModel):
    """Result of AI review"""
    is_approved: bool
    issues: List[str] = Field(default_factory=list)
    suggestions: List[str] = Field(default_factory=list)
    fixed_question: Optional[Dict[str, Any]] = None
    confidence: float = Field(0.0, ge=0, le=1, description="Confidence score")


class GeneratedQuestionResult(BaseModel):
    """Final result for a generated question"""
    question: Dict[str, Any]
    validation: ValidationResult
    review: Optional[ReviewResult] = None
    status: str = Field("pending", description="pending/approved/needs_review/rejected")


class GenerationResponse(BaseModel):
    """Response schema for question generation"""
    success: bool
    questions: List[GeneratedQuestionResult] = Field(default_factory=list)
    total_generated: int = 0
    total_approved: int = 0
    total_needs_review: int = 0
    total_rejected: int = 0
    message: Optional[str] = None
