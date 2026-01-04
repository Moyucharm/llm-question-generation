"""
Question Generation API

Endpoints for generating questions using the quality control pipeline
"""

from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
import json

from app.api.deps import CurrentActiveUser, require_teacher
from app.services import get_llm_service, GenerationPipeline
from app.schemas.question import (
    QuestionType,
    GenerationRequest,
    GeneratedQuestion,
)

router = APIRouter(prefix="/questions", tags=["题目生成"])


# Request/Response models
class GenerateRequest(BaseModel):
    """Request for question generation"""
    course_name: str = Field(..., description="课程/科目名称", min_length=1)
    knowledge_point: Optional[str] = Field(None, description="知识点")
    question_type: QuestionType = Field(..., description="题型")
    difficulty: int = Field(3, ge=1, le=5, description="难度等级 1-5")
    count: int = Field(1, ge=1, le=10, description="生成数量 1-10")
    language: str = Field("zh", description="语言 zh/en")
    additional_requirements: Optional[str] = Field(None, description="额外要求")


class QuestionResponse(BaseModel):
    """Single question in response"""
    type: str
    stem: str
    options: Optional[dict] = None
    answer: object
    explanation: str
    difficulty: int
    knowledge_point: Optional[str] = None


class GenerateResponse(BaseModel):
    """Response for full pipeline generation"""
    summary: dict
    approved_questions: List[dict]
    needs_review_questions: List[dict]
    rejected_questions: List[dict]


class QuickGenerateResponse(BaseModel):
    """Response for quick generation (no review)"""
    questions: List[dict]
    count: int


# Endpoints
@router.post(
    "/generate",
    response_model=GenerateResponse,
    summary="生成题目（完整流水线）",
    description="通过三阶段质量控制流水线生成题目：Generator → Validator → Reviewer",
)
async def generate_questions(
    request: GenerateRequest,
    current_user: CurrentActiveUser,
):
    """
    Generate questions with full quality control pipeline

    This endpoint:
    1. Generates questions using LLM
    2. Validates format and structure
    3. Reviews for factual correctness and quality
    4. Returns categorized results (approved, needs_review, rejected)

    Requires teacher role or above.
    """
    # Check permission (only teachers can generate)
    if current_user.role not in ["teacher", "admin"]:
        raise HTTPException(
            status_code=403,
            detail="只有教师才能生成题目哦，笨蛋！(￣へ￣)"
        )

    # Convert to internal request
    gen_request = GenerationRequest(
        course_name=request.course_name,
        knowledge_point=request.knowledge_point,
        question_type=request.question_type,
        difficulty=request.difficulty,
        count=request.count,
        language=request.language,
        additional_requirements=request.additional_requirements,
    )

    # Run pipeline
    llm_service = get_llm_service()
    pipeline = GenerationPipeline(llm_service)

    try:
        result = await pipeline.generate(gen_request, user_id=current_user.id)
        return result.to_dict()
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"题目生成失败了...本小姐也很无奈呢 (￣_￣;) 错误: {str(e)}"
        )


@router.post(
    "/generate/quick",
    response_model=QuickGenerateResponse,
    summary="快速生成题目（跳过AI审核）",
    description="快速生成题目，仅进行规则校验，跳过AI审核阶段",
)
async def generate_questions_quick(
    request: GenerateRequest,
    current_user: CurrentActiveUser,
):
    """
    Quick question generation without AI review

    Faster but less thorough quality control.
    Only performs rule-based validation.

    Requires teacher role or above.
    """
    if current_user.role not in ["teacher", "admin"]:
        raise HTTPException(
            status_code=403,
            detail="只有教师才能生成题目哦，笨蛋！(￣へ￣)"
        )

    gen_request = GenerationRequest(
        course_name=request.course_name,
        knowledge_point=request.knowledge_point,
        question_type=request.question_type,
        difficulty=request.difficulty,
        count=request.count,
        language=request.language,
        additional_requirements=request.additional_requirements,
    )

    llm_service = get_llm_service()
    pipeline = GenerationPipeline(llm_service)

    try:
        questions = await pipeline.generate_quick(gen_request, user_id=current_user.id)
        return {
            "questions": questions,
            "count": len(questions),
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"题目生成失败: {str(e)}"
        )


@router.post(
    "/generate/stream",
    summary="流式生成题目",
    description="使用SSE流式输出生成过程",
)
async def generate_questions_stream(
    request: GenerateRequest,
    current_user: CurrentActiveUser,
):
    """
    Stream question generation process

    Returns Server-Sent Events (SSE) stream with:
    - Progress updates
    - Generated content as it's produced
    - Final questions

    Requires teacher role or above.
    """
    if current_user.role not in ["teacher", "admin"]:
        raise HTTPException(
            status_code=403,
            detail="只有教师才能生成题目哦！"
        )

    gen_request = GenerationRequest(
        course_name=request.course_name,
        knowledge_point=request.knowledge_point,
        question_type=request.question_type,
        difficulty=request.difficulty,
        count=request.count,
        language=request.language,
        additional_requirements=request.additional_requirements,
    )

    async def event_generator():
        llm_service = get_llm_service()
        pipeline = GenerationPipeline(llm_service)

        # Send start event
        yield f"data: {json.dumps({'event': 'start', 'message': '开始生成题目...'})}\n\n"

        try:
            # Generate questions (full pipeline)
            result = await pipeline.generate(gen_request, user_id=current_user.id)

            # Send progress
            yield f"data: {json.dumps({'event': 'progress', 'message': '题目生成完成，正在处理结果...'})}\n\n"

            # Send result
            yield f"data: {json.dumps({'event': 'complete', 'data': result.to_dict()})}\n\n"

        except Exception as e:
            yield f"data: {json.dumps({'event': 'error', 'message': str(e)})}\n\n"

        yield "data: [DONE]\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )


@router.get(
    "/types",
    summary="获取支持的题型",
    description="返回系统支持的所有题型及其说明",
)
async def get_question_types():
    """Get all supported question types"""
    return {
        "types": [
            {
                "value": QuestionType.SINGLE_CHOICE.value,
                "label": "单选题",
                "description": "四选一，只有一个正确答案",
            },
            {
                "value": QuestionType.MULTIPLE_CHOICE.value,
                "label": "多选题",
                "description": "四选多，有2-3个正确答案",
            },
            {
                "value": QuestionType.FILL_BLANK.value,
                "label": "填空题",
                "description": "在题干空白处填入正确答案",
            },
            {
                "value": QuestionType.SHORT_ANSWER.value,
                "label": "简答题",
                "description": "需要详细回答的主观题",
            },
        ]
    }


@router.get(
    "/difficulties",
    summary="获取难度等级",
    description="返回系统支持的难度等级及其说明",
)
async def get_difficulty_levels():
    """Get all difficulty levels"""
    return {
        "levels": [
            {"value": 1, "label": "非常简单", "description": "基础概念，直接考查"},
            {"value": 2, "label": "简单", "description": "基础应用，略有变化"},
            {"value": 3, "label": "中等", "description": "综合应用，需要一定思考"},
            {"value": 4, "label": "困难", "description": "复杂综合，需要分析推理"},
            {"value": 5, "label": "非常困难", "description": "高难度综合，挑战性强"},
        ]
    }
