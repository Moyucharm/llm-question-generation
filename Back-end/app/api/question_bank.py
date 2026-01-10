"""
Question Bank API

题库管理 API 端点
"""

from typing import Optional
from datetime import datetime
from urllib.parse import quote
import math

from fastapi import APIRouter, Depends, HTTPException, Query

from app.api.deps import CurrentActiveUser, DbSession, require_teacher
from app.services.question_bank_service import QuestionBankService, question_to_response
from app.schemas.question_bank import (
    QuestionCreate,
    QuestionUpdate,
    QuestionBatchCreate,
    QuestionExportRequest,
    QuestionImportRequest,
    QuestionResponse,
    QuestionListResponse,
    QuestionBatchCreateResponse,
    QuestionExportResponse,
    QuestionImportResponse,
)

router = APIRouter(prefix="/question-bank", tags=["题库管理"])


@router.get(
    "",
    response_model=QuestionListResponse,
    summary="获取题目列表",
)
async def list_questions(
    db: DbSession,
    current_user: CurrentActiveUser,
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    course_id: Optional[int] = Query(None, description="课程ID"),
    question_type: Optional[str] = Query(None, description="题型"),
    difficulty: Optional[int] = Query(None, ge=1, le=5, description="难度"),
    status: Optional[str] = Query(None, description="状态"),
    keyword: Optional[str] = Query(None, description="关键词搜索"),
):
    """获取题目列表，支持分页和筛选"""
    service = QuestionBankService(db)
    
    # 非管理员只能看自己的题目，管理员可以看全部
    created_by = None
    if current_user.role != "admin":
        created_by = current_user.id

    questions, total = await service.list_questions(
        page=page,
        page_size=page_size,
        course_id=course_id,
        question_type=question_type,
        difficulty=difficulty,
        status=status,
        created_by=created_by,
        keyword=keyword,
    )

    return {
        "items": [question_to_response(q) for q in questions],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": math.ceil(total / page_size) if total > 0 else 0,
    }


@router.post(
    "",
    response_model=QuestionResponse,
    summary="创建单个题目",
)
async def create_question(
    data: QuestionCreate,
    db: DbSession,
    current_user: CurrentActiveUser,
):
    """创建单个题目"""
    service = QuestionBankService(db)
    question = await service.create_question(
        question_type=data.type.value,
        stem=data.stem,
        answer=data.answer,
        created_by=current_user.id,
        options=data.options,
        explanation=data.explanation,
        difficulty=data.difficulty,
        score=data.score,
        course_id=data.course_id,
        knowledge_point_id=data.knowledge_point_id,
        status=data.status.value,
    )
    # 重新加载关联数据
    question = await service.get_question(question.id)
    return question_to_response(question)


@router.post(
    "/batch",
    response_model=QuestionBatchCreateResponse,
    summary="批量保存题目",
)
async def batch_create_questions(
    data: QuestionBatchCreate,
    db: DbSession,
    current_user: CurrentActiveUser,
):
    """批量保存 AI 生成的题目到题库"""
    service = QuestionBankService(db)
    
    questions_data = [
        {
            "type": q.type.value,
            "stem": q.stem,
            "options": q.options,
            "answer": q.answer,
            "explanation": q.explanation,
            "difficulty": q.difficulty,
            "score": q.score,
            "course_id": q.course_id,
            "knowledge_point_id": q.knowledge_point_id,
            "status": q.status.value,
        }
        for q in data.questions
    ]

    count, ids = await service.batch_create_questions(
        questions_data=questions_data,
        created_by=current_user.id,
        course_id=data.course_id,
        knowledge_point_id=data.knowledge_point_id,
    )

    return {
        "created_count": count,
        "question_ids": ids,
        "message": f"成功保存 {count} 道题目到题库",
    }


@router.get(
    "/{question_id}",
    response_model=QuestionResponse,
    summary="获取题目详情",
)
async def get_question(
    question_id: int,
    db: DbSession,
    current_user: CurrentActiveUser,
):
    """获取单个题目的详细信息"""
    service = QuestionBankService(db)
    question = await service.get_question(question_id)
    
    if not question:
        raise HTTPException(status_code=404, detail="题目不存在")

    # 非管理员只能查看自己创建的题目
    if current_user.role != "admin" and question.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="无权查看此题目")

    return question_to_response(question)


@router.put(
    "/{question_id}",
    response_model=QuestionResponse,
    summary="更新题目",
)
async def update_question(
    question_id: int,
    data: QuestionUpdate,
    db: DbSession,
    current_user: CurrentActiveUser,
):
    """更新题目信息"""
    service = QuestionBankService(db)
    
    # 先检查题目是否存在和权限
    existing = await service.get_question(question_id)
    if not existing:
        raise HTTPException(status_code=404, detail="题目不存在")
    
    # 非管理员只能修改自己创建的题目
    if current_user.role != "admin" and existing.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="无权修改此题目")

    # 构建更新数据
    update_data = {}
    if data.stem is not None:
        update_data["stem"] = data.stem
    if data.options is not None:
        update_data["options"] = data.options
    if data.answer is not None:
        update_data["answer"] = data.answer
    if data.explanation is not None:
        update_data["explanation"] = data.explanation
    if data.difficulty is not None:
        update_data["difficulty"] = data.difficulty
    if data.score is not None:
        update_data["score"] = data.score
    if data.course_id is not None:
        update_data["course_id"] = data.course_id
    if data.knowledge_point_id is not None:
        update_data["knowledge_point_id"] = data.knowledge_point_id
    if data.status is not None:
        update_data["status"] = data.status.value

    question = await service.update_question(question_id, **update_data)
    return question_to_response(question)


@router.delete(
    "/{question_id}",
    summary="删除题目",
)
async def delete_question(
    question_id: int,
    db: DbSession,
    current_user: CurrentActiveUser,
):
    """删除题目"""
    service = QuestionBankService(db)
    
    # 检查权限
    existing = await service.get_question(question_id)
    if not existing:
        raise HTTPException(status_code=404, detail="题目不存在")
    
    # 非管理员只能删除自己创建的题目
    if current_user.role != "admin" and existing.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="无权删除此题目")

    await service.delete_question(question_id)
    return {"message": "题目已删除", "id": question_id}


@router.post(
    "/export",
    summary="导出题目",
)
async def export_questions(
    data: QuestionExportRequest,
    db: DbSession,
    current_user: CurrentActiveUser,
):
    """导出题目为 JSON 文件下载"""
    from fastapi.responses import Response
    import json
    
    service = QuestionBankService(db)
    
    # 非管理员只能导出自己创建的题目
    created_by = None
    if current_user.role != "admin":
        created_by = current_user.id
    
    questions = await service.export_questions(
        question_ids=data.question_ids,
        course_id=data.course_id,
        question_type=data.question_type.value if data.question_type else None,
        difficulty=data.difficulty,
        status=data.status.value if data.status else None,
        created_by=created_by,
    )

    # 生成文件名
    filename = f"questions_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    encoded_filename = quote(filename)
    
    # 返回文件下载响应
    json_content = json.dumps(questions, ensure_ascii=False, indent=2)
    
    return Response(
        content=json_content,
        media_type="application/json",
        headers={
            "Content-Disposition": (
                f'attachment; filename="{filename}"; filename*=UTF-8\'\'{encoded_filename}'
            ),
            "Content-Type": "application/json; charset=utf-8",
        }
    )


@router.post(
    "/import",
    response_model=QuestionImportResponse,
    summary="导入题目",
)
async def import_questions(
    data: QuestionImportRequest,
    db: DbSession,
    current_user: CurrentActiveUser,
):
    """从 JSON 导入题目"""
    service = QuestionBankService(db)
    
    questions_data = [
        {
            "type": q.type.value,
            "stem": q.stem,
            "options": q.options,
            "answer": q.answer,
            "explanation": q.explanation,
            "difficulty": q.difficulty,
            "score": q.score,
        }
        for q in data.questions
    ]

    imported, skipped, errors, ids = await service.import_questions(
        questions_data=questions_data,
        created_by=current_user.id,
        course_id=data.course_id,
        knowledge_point_id=data.knowledge_point_id,
        status=data.status.value,
    )

    return {
        "imported_count": imported,
        "skipped_count": skipped,
        "errors": errors,
        "question_ids": ids,
    }
