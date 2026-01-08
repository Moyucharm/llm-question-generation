"""
Exam API Routes

Endpoints for exam management
"""

from typing import Optional
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.api.deps import get_current_user, require_teacher
from app.models.user import User
from app.models.exam import ExamStatus, AttemptStatus
from app.services.exam_service import ExamService
from app.schemas.exam import (
    ExamCreate, ExamUpdate, ExamResponse, ExamDetail, ExamListResponse,
    AttemptResponse, AttemptListResponse, AnswerSubmit,
    StudentExamView
)

router = APIRouter(prefix="/exams", tags=["exams"])


# ===================================
# Exam CRUD (Teacher)
# ===================================

@router.post("", response_model=ExamResponse, status_code=status.HTTP_201_CREATED)
async def create_exam(
    data: ExamCreate,
    current_user: User = Depends(require_teacher),
    db: AsyncSession = Depends(get_db),
):
    """创建考试（教师）"""
    service = ExamService(db)
    exam = await service.create_exam(data, current_user.id)

    # 获取附加信息
    question_count = await service.get_exam_question_count(exam.id)

    return ExamResponse(
        id=exam.id,
        title=exam.title,
        duration_minutes=exam.duration_minutes,
        start_time=exam.start_time,
        end_time=exam.end_time,
        paper_id=exam.paper_id,
        status=ExamStatus(exam.status.value),
        published_by=exam.published_by,
        publisher_name=current_user.name,
        question_count=question_count,
        total_score=0,
        attempt_count=0,
        created_at=exam.created_at,
        updated_at=exam.updated_at,
    )


@router.get("", response_model=ExamListResponse)
async def get_exams(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取考试列表"""
    service = ExamService(db)

    if current_user.role.value == "teacher":
        # 教师看自己创建的考试
        exams, total = await service.get_exams_for_teacher(
            current_user.id, skip, limit
        )
        items = []
        for exam in exams:
            question_count = await service.get_exam_question_count(exam.id)
            attempt_count = await service.get_exam_attempt_count(exam.id)
            items.append(ExamResponse(
                id=exam.id,
                title=exam.title,
                duration_minutes=exam.duration_minutes,
                start_time=exam.start_time,
                end_time=exam.end_time,
                paper_id=exam.paper_id,
                status=ExamStatus(exam.status.value),
                published_by=exam.published_by,
                question_count=question_count,
                total_score=0,
                attempt_count=attempt_count,
                created_at=exam.created_at,
                updated_at=exam.updated_at,
            ))
        return ExamListResponse(items=items, total=total)
    else:
        # 学生看已发布的考试
        exam_views, total = await service.get_exams_for_student(
            current_user.id, skip, limit
        )
        items = []
        for ev in exam_views:
            exam = ev["exam"]
            attempt = ev["attempt"]
            question_count = await service.get_exam_question_count(exam.id)

            items.append(ExamResponse(
                id=exam.id,
                title=exam.title,
                duration_minutes=exam.duration_minutes,
                start_time=exam.start_time,
                end_time=exam.end_time,
                paper_id=exam.paper_id,
                status=ExamStatus(exam.status.value),
                published_by=exam.published_by,
                question_count=question_count,
                total_score=attempt.total_score if attempt else 0,
                attempt_count=1 if attempt else 0,
                created_at=exam.created_at,
                updated_at=exam.updated_at,
            ))
        return ExamListResponse(items=items, total=total)


@router.get("/{exam_id}", response_model=ExamDetail)
async def get_exam(
    exam_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取考试详情"""
    service = ExamService(db)
    exam_data = await service.get_exam_with_questions(exam_id)

    if not exam_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="考试不存在"
        )

    exam = exam_data["exam"]
    questions = exam_data["questions"]

    # 学生不能看到答案
    if current_user.role.value != "teacher":
        for q in questions:
            q.pop("answer", None)
            q.pop("explanation", None)

    question_count = len(questions)
    total_score = exam_data.get("total_score", 0)
    attempt_count = await service.get_exam_attempt_count(exam_id)

    return ExamDetail(
        id=exam.id,
        title=exam.title,
        duration_minutes=exam.duration_minutes,
        start_time=exam.start_time,
        end_time=exam.end_time,
        paper_id=exam.paper_id,
        status=ExamStatus(exam.status.value),
        published_by=exam.published_by,
        question_count=question_count,
        total_score=total_score,
        attempt_count=attempt_count,
        created_at=exam.created_at,
        updated_at=exam.updated_at,
        questions=questions,
    )


@router.put("/{exam_id}", response_model=ExamResponse)
async def update_exam(
    exam_id: int,
    data: ExamUpdate,
    current_user: User = Depends(require_teacher),
    db: AsyncSession = Depends(get_db),
):
    """更新考试（教师）"""
    service = ExamService(db)
    exam = await service.update_exam(exam_id, data, current_user.id)

    if not exam:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="考试不存在或无权限修改"
        )

    question_count = await service.get_exam_question_count(exam.id)

    return ExamResponse(
        id=exam.id,
        title=exam.title,
        duration_minutes=exam.duration_minutes,
        start_time=exam.start_time,
        end_time=exam.end_time,
        paper_id=exam.paper_id,
        status=ExamStatus(exam.status.value),
        published_by=exam.published_by,
        question_count=question_count,
        total_score=0,
        attempt_count=0,
        created_at=exam.created_at,
        updated_at=exam.updated_at,
    )


@router.delete("/{exam_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_exam(
    exam_id: int,
    current_user: User = Depends(require_teacher),
    db: AsyncSession = Depends(get_db),
):
    """删除考试（教师）"""
    service = ExamService(db)
    success = await service.delete_exam(exam_id, current_user.id)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="考试不存在或无权限删除"
        )


@router.post("/{exam_id}/publish", response_model=ExamResponse)
async def publish_exam(
    exam_id: int,
    current_user: User = Depends(require_teacher),
    db: AsyncSession = Depends(get_db),
):
    """发布考试（教师）"""
    service = ExamService(db)
    exam = await service.publish_exam(exam_id, current_user.id)

    if not exam:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="无法发布考试"
        )

    question_count = await service.get_exam_question_count(exam.id)

    return ExamResponse(
        id=exam.id,
        title=exam.title,
        duration_minutes=exam.duration_minutes,
        start_time=exam.start_time,
        end_time=exam.end_time,
        paper_id=exam.paper_id,
        status=ExamStatus(exam.status.value),
        published_by=exam.published_by,
        question_count=question_count,
        total_score=0,
        attempt_count=0,
        created_at=exam.created_at,
        updated_at=exam.updated_at,
    )


@router.post("/{exam_id}/close", response_model=ExamResponse)
async def close_exam(
    exam_id: int,
    current_user: User = Depends(require_teacher),
    db: AsyncSession = Depends(get_db),
):
    """关闭考试（教师）"""
    service = ExamService(db)
    exam = await service.close_exam(exam_id, current_user.id)

    if not exam:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="无法关闭考试"
        )

    question_count = await service.get_exam_question_count(exam.id)
    attempt_count = await service.get_exam_attempt_count(exam.id)

    return ExamResponse(
        id=exam.id,
        title=exam.title,
        duration_minutes=exam.duration_minutes,
        start_time=exam.start_time,
        end_time=exam.end_time,
        paper_id=exam.paper_id,
        status=ExamStatus(exam.status.value),
        published_by=exam.published_by,
        question_count=question_count,
        total_score=0,
        attempt_count=attempt_count,
        created_at=exam.created_at,
        updated_at=exam.updated_at,
    )


# ===================================
# Attempt Management (Student)
# ===================================

@router.post("/{exam_id}/start", response_model=AttemptResponse)
async def start_exam(
    exam_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """开始考试（学生）"""
    service = ExamService(db)
    attempt = await service.start_attempt(exam_id, current_user.id)

    if not attempt:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="无法开始考试"
        )

    # 计算剩余时间
    exam = await service.get_exam(exam_id)
    remaining = None
    if exam and attempt.status == AttemptStatus.IN_PROGRESS:
        elapsed = (datetime.now(timezone.utc) - attempt.started_at).total_seconds()
        remaining = max(0, exam.duration_minutes * 60 - int(elapsed))

    return AttemptResponse(
        id=attempt.id,
        exam_id=attempt.exam_id,
        student_id=attempt.student_id,
        student_name=current_user.name,
        started_at=attempt.started_at,
        submitted_at=attempt.submitted_at,
        total_score=attempt.total_score,
        status=AttemptStatus(attempt.status.value),
        answers=[],
        remaining_seconds=remaining,
    )


@router.get("/{exam_id}/attempt", response_model=AttemptResponse)
async def get_current_attempt(
    exam_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取当前答题记录（学生）"""
    service = ExamService(db)
    attempt = await service.get_attempt(exam_id, current_user.id)

    if not attempt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="未找到答题记录"
        )

    # 计算剩余时间
    exam = await service.get_exam(exam_id)
    remaining = None
    if exam and attempt.status == AttemptStatus.IN_PROGRESS:
        elapsed = (datetime.now(timezone.utc) - attempt.started_at).total_seconds()
        remaining = max(0, exam.duration_minutes * 60 - int(elapsed))

    answers = [
        {
            "question_id": a.question_id,
            "student_answer": a.student_answer,
            "is_correct": a.is_correct,
            "score": a.score,
            "feedback": a.feedback,
        }
        for a in attempt.answers
    ]

    return AttemptResponse(
        id=attempt.id,
        exam_id=attempt.exam_id,
        student_id=attempt.student_id,
        student_name=current_user.name,
        started_at=attempt.started_at,
        submitted_at=attempt.submitted_at,
        total_score=attempt.total_score,
        status=AttemptStatus(attempt.status.value),
        answers=answers,
        remaining_seconds=remaining,
    )


@router.post("/{exam_id}/answer")
async def save_answer(
    exam_id: int,
    data: AnswerSubmit,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """保存单个答案（学生）"""
    service = ExamService(db)
    attempt = await service.get_attempt(exam_id, current_user.id)

    if not attempt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="未找到答题记录"
        )

    answer = await service.save_answer(attempt.id, data)
    if not answer:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="无法保存答案"
        )

    return {"message": "答案已保存", "question_id": data.question_id}


@router.post("/{exam_id}/submit", response_model=AttemptResponse)
async def submit_exam(
    exam_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """提交考试（学生）"""
    service = ExamService(db)
    attempt = await service.submit_attempt(exam_id, current_user.id)

    if not attempt:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="无法提交考试"
        )

    # 重新获取带答案的记录
    attempt = await service.get_attempt(exam_id, current_user.id)

    answers = [
        {
            "question_id": a.question_id,
            "student_answer": a.student_answer,
            "is_correct": a.is_correct,
            "score": a.score,
            "feedback": a.feedback,
        }
        for a in attempt.answers
    ]

    return AttemptResponse(
        id=attempt.id,
        exam_id=attempt.exam_id,
        student_id=attempt.student_id,
        student_name=current_user.name,
        started_at=attempt.started_at,
        submitted_at=attempt.submitted_at,
        total_score=attempt.total_score,
        status=AttemptStatus(attempt.status.value),
        answers=answers,
        remaining_seconds=0,
    )


# ===================================
# Attempts List (Teacher)
# ===================================

@router.get("/{exam_id}/attempts", response_model=AttemptListResponse)
async def get_exam_attempts(
    exam_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(require_teacher),
    db: AsyncSession = Depends(get_db),
):
    """获取考试的所有答题记录（教师）"""
    service = ExamService(db)
    attempts, total = await service.get_exam_attempts(
        exam_id, current_user.id, skip, limit
    )

    items = [
        AttemptResponse(
            id=a.id,
            exam_id=a.exam_id,
            student_id=a.student_id,
            student_name=a.student.name if a.student else None,
            started_at=a.started_at,
            submitted_at=a.submitted_at,
            total_score=a.total_score,
            status=AttemptStatus(a.status.value),
            answers=[],
        )
        for a in attempts
    ]

    return AttemptListResponse(items=items, total=total)
