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
    StudentExamView, AttemptDetailResponse, UpdateAttemptScoresRequest,
    ConfirmGradeRequest, GradeStatistics
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
                attempt_status=attempt.status.value if attempt else None,
                can_start=ev.get("can_start"),
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
    attempt, error = await service.start_attempt(exam_id, current_user.id)

    if not attempt:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error or "无法开始考试"
        )

    # 计算剩余时间
    exam = await service.get_exam(exam_id)
    remaining = None
    if exam and attempt.status == AttemptStatus.IN_PROGRESS:
        # 确保时间都有时区信息
        started = attempt.started_at
        if started.tzinfo is None:
            started = started.replace(tzinfo=timezone.utc)
        elapsed = (datetime.now(timezone.utc) - started).total_seconds()
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
        # 确保时间都有时区信息
        started = attempt.started_at
        if started.tzinfo is None:
            started = started.replace(tzinfo=timezone.utc)
        elapsed = (datetime.now(timezone.utc) - started).total_seconds()
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


# ===================================
# Question Management (Teacher)
# ===================================

@router.post("/{exam_id}/questions", status_code=status.HTTP_201_CREATED)
async def add_question_to_exam(
    exam_id: int,
    data: dict,  # QuestionAdd schema
    current_user: User = Depends(require_teacher),
    db: AsyncSession = Depends(get_db),
):
    """添加题目到考试（教师）"""
    service = ExamService(db)
    question = await service.add_question_to_exam(
        exam_id, data, current_user.id
    )

    if not question:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="无法添加题目，考试不存在、无权限或已发布"
        )

    return {
        "id": question.id,
        "type": question.type.value if hasattr(question.type, 'value') else question.type,
        "stem": question.stem,
        "options": question.options,
        "answer": question.answer,
        "explanation": question.explanation,
        "score": data.get("score", 10),
        "message": "题目添加成功"
    }


@router.delete("/{exam_id}/questions/{question_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_question_from_exam(
    exam_id: int,
    question_id: int,
    current_user: User = Depends(require_teacher),
    db: AsyncSession = Depends(get_db),
):
    """从考试中移除题目（教师）"""
    service = ExamService(db)
    success = await service.remove_question_from_exam(
        exam_id, question_id, current_user.id
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="无法移除题目"
        )


@router.get("/{exam_id}/questions")
async def get_exam_questions(
    exam_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取考试题目列表"""
    service = ExamService(db)
    questions = await service.get_exam_questions(exam_id)

    # 学生不能看到答案
    if current_user.role.value != "teacher":
        for q in questions:
            q.pop("answer", None)
            q.pop("explanation", None)

    return {"questions": questions, "total": len(questions)}


@router.put("/{exam_id}/questions/reorder")
async def reorder_questions(
    exam_id: int,
    data: dict,
    current_user: User = Depends(require_teacher),
    db: AsyncSession = Depends(get_db),
):
    """重新排序考试中的题目（教师）"""
    orders = data.get("orders")
    if not orders or not isinstance(orders, list):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="orders必须是数组"
        )

    service = ExamService(db)
    success = await service.reorder_questions(
        exam_id, orders, current_user.id
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="无法重新排序，考试不存在、无权限或已发布"
        )

    return {"message": "排序已更新"}


@router.put("/{exam_id}/questions/{question_id}")
async def update_question_score(
    exam_id: int,
    question_id: int,
    data: dict,
    current_user: User = Depends(require_teacher),
    db: AsyncSession = Depends(get_db),
):
    """更新考试中题目的分值（教师）"""
    score = data.get("score")
    if score is None or not isinstance(score, int) or score < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="分值必须是非负整数"
        )

    service = ExamService(db)
    success = await service.update_question_score(
        exam_id, question_id, score, current_user.id
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="无法更新分值，考试不存在、无权限或已发布"
        )

    return {"message": "分值已更新", "score": score}


# ===================================
# Grade Management (Teacher)
# ===================================

@router.get("/{exam_id}/attempts/{attempt_id}", response_model=AttemptDetailResponse)
async def get_attempt_detail(
    exam_id: int,
    attempt_id: int,
    current_user: User = Depends(require_teacher),
    db: AsyncSession = Depends(get_db),
):
    """获取答卷详情（教师批改用）"""
    service = ExamService(db)
    detail = await service.get_attempt_detail(exam_id, attempt_id, current_user.id)

    if not detail:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="答卷不存在或无权限查看"
        )

    return detail


@router.put("/{exam_id}/attempts/{attempt_id}")
async def update_attempt_scores(
    exam_id: int,
    attempt_id: int,
    data: UpdateAttemptScoresRequest,
    current_user: User = Depends(require_teacher),
    db: AsyncSession = Depends(get_db),
):
    """更新答题评分（教师）"""
    service = ExamService(db)
    attempt = await service.update_attempt_scores(
        exam_id, attempt_id,
        [s.model_dump() for s in data.scores],
        current_user.id
    )

    if not attempt:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="无法更新评分"
        )

    return {"message": "评分已更新", "total_score": attempt.total_score}


@router.post("/{exam_id}/attempts/{attempt_id}/confirm")
async def confirm_grade(
    exam_id: int,
    attempt_id: int,
    data: ConfirmGradeRequest,
    current_user: User = Depends(require_teacher),
    db: AsyncSession = Depends(get_db),
):
    """确认最终成绩（教师）"""
    service = ExamService(db)
    attempt = await service.confirm_grade(
        exam_id, attempt_id, current_user.id,
        final_score=data.final_score,
        comment=data.comment
    )

    if not attempt:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="无法确认成绩"
        )

    return {
        "message": "成绩已确认",
        "final_score": attempt.final_score,
        "graded_at": attempt.graded_at
    }


@router.get("/{exam_id}/statistics", response_model=GradeStatistics)
async def get_grade_statistics(
    exam_id: int,
    current_user: User = Depends(require_teacher),
    db: AsyncSession = Depends(get_db),
):
    """获取考试成绩统计（教师）"""
    service = ExamService(db)
    stats = await service.get_grade_statistics(exam_id, current_user.id)

    if not stats:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="考试不存在或无权限查看"
        )

    return stats


# ===================================
# Student Result
# ===================================

@router.get("/{exam_id}/result")
async def get_exam_result(
    exam_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取考试结果（学生）"""
    service = ExamService(db)
    result = await service.get_student_result(exam_id, current_user.id)

    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="未找到考试记录"
        )

    return result

