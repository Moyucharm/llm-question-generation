"""
Exam Service

Business logic for exam management
"""

from typing import Optional, List
from datetime import datetime, timezone

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.exam import Exam, Attempt, AttemptAnswer, ExamStatus, AttemptStatus
from app.models.question import Paper, PaperQuestion, Question
from app.models.user import User
from app.schemas.exam import (
    ExamCreate, ExamUpdate, ExamResponse, ExamDetail,
    AttemptResponse, AnswerSubmit, AnswerResponse,
    StudentExamView, ExamQuestionView
)


class ExamService:
    """Exam management service"""

    def __init__(self, db: AsyncSession):
        self.db = db

    # ===================================
    # Exam CRUD
    # ===================================

    async def create_exam(
        self,
        data: ExamCreate,
        teacher_id: int
    ) -> Exam:
        """创建考试"""
        exam = Exam(
            title=data.title,
            duration_minutes=data.duration_minutes,
            start_time=data.start_time,
            end_time=data.end_time,
            paper_id=data.paper_id,
            published_by=teacher_id,
            status=ExamStatus.DRAFT,
        )
        self.db.add(exam)
        await self.db.commit()
        await self.db.refresh(exam)
        return exam

    async def get_exams_for_teacher(
        self,
        teacher_id: int,
        skip: int = 0,
        limit: int = 20
    ) -> tuple[List[Exam], int]:
        """获取教师创建的考试列表"""
        # 查询考试
        query = (
            select(Exam)
            .where(Exam.published_by == teacher_id)
            .order_by(Exam.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await self.db.execute(query)
        exams = list(result.scalars().all())

        # 查询总数
        count_query = (
            select(func.count(Exam.id))
            .where(Exam.published_by == teacher_id)
        )
        count_result = await self.db.execute(count_query)
        total = count_result.scalar() or 0

        return exams, total

    async def get_exams_for_student(
        self,
        student_id: int,
        skip: int = 0,
        limit: int = 20
    ) -> tuple[List[dict], int]:
        """获取学生可参加的考试列表"""
        now = datetime.now(timezone.utc)

        # 查询已发布的考试
        query = (
            select(Exam)
            .where(Exam.status == ExamStatus.PUBLISHED)
            .order_by(Exam.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await self.db.execute(query)
        exams = list(result.scalars().all())

        # 查询学生的答题记录
        attempt_query = (
            select(Attempt)
            .where(
                Attempt.student_id == student_id,
                Attempt.exam_id.in_([e.id for e in exams])
            )
        )
        attempt_result = await self.db.execute(attempt_query)
        attempts = {a.exam_id: a for a in attempt_result.scalars().all()}

        # 构建响应
        exam_views = []
        for exam in exams:
            attempt = attempts.get(exam.id)
            can_start = True

            # 检查时间限制
            if exam.start_time and now < exam.start_time:
                can_start = False
            if exam.end_time and now > exam.end_time:
                can_start = False

            exam_views.append({
                "exam": exam,
                "attempt": attempt,
                "can_start": can_start,
            })

        # 查询总数
        count_query = (
            select(func.count(Exam.id))
            .where(Exam.status == ExamStatus.PUBLISHED)
        )
        count_result = await self.db.execute(count_query)
        total = count_result.scalar() or 0

        return exam_views, total

    async def get_exam(self, exam_id: int) -> Optional[Exam]:
        """获取考试详情"""
        query = (
            select(Exam)
            .options(selectinload(Exam.paper))
            .where(Exam.id == exam_id)
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_exam_with_questions(self, exam_id: int) -> Optional[dict]:
        """获取考试及其题目"""
        exam = await self.get_exam(exam_id)
        if not exam or not exam.paper_id:
            return None

        # 获取试卷题目
        query = (
            select(PaperQuestion)
            .options(selectinload(PaperQuestion.question))
            .where(PaperQuestion.paper_id == exam.paper_id)
            .order_by(PaperQuestion.order)
        )
        result = await self.db.execute(query)
        paper_questions = list(result.scalars().all())

        questions = []
        total_score = 0
        for pq in paper_questions:
            q = pq.question
            questions.append({
                "id": q.id,
                "type": q.type.value if hasattr(q.type, 'value') else q.type,
                "stem": q.stem,
                "options": q.options,
                "answer": q.answer,  # 教师可见完整答案
                "explanation": q.explanation,
                "score": pq.score,
            })
            total_score += pq.score

        return {
            "exam": exam,
            "questions": questions,
            "total_score": total_score,
        }

    async def update_exam(
        self,
        exam_id: int,
        data: ExamUpdate,
        teacher_id: int
    ) -> Optional[Exam]:
        """更新考试"""
        exam = await self.get_exam(exam_id)
        if not exam or exam.published_by != teacher_id:
            return None

        if exam.status != ExamStatus.DRAFT:
            return None  # 只能更新草稿状态的考试

        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(exam, key, value)

        await self.db.commit()
        await self.db.refresh(exam)
        return exam

    async def delete_exam(self, exam_id: int, teacher_id: int) -> bool:
        """删除考试"""
        exam = await self.get_exam(exam_id)
        if not exam or exam.published_by != teacher_id:
            return False

        await self.db.delete(exam)
        await self.db.commit()
        return True

    async def publish_exam(self, exam_id: int, teacher_id: int) -> Optional[Exam]:
        """发布考试"""
        exam = await self.get_exam(exam_id)
        if not exam or exam.published_by != teacher_id:
            return None

        if exam.status != ExamStatus.DRAFT:
            return None

        exam.status = ExamStatus.PUBLISHED
        await self.db.commit()
        await self.db.refresh(exam)
        return exam

    async def close_exam(self, exam_id: int, teacher_id: int) -> Optional[Exam]:
        """关闭考试"""
        exam = await self.get_exam(exam_id)
        if not exam or exam.published_by != teacher_id:
            return None

        if exam.status != ExamStatus.PUBLISHED:
            return None

        exam.status = ExamStatus.CLOSED
        await self.db.commit()
        await self.db.refresh(exam)
        return exam

    # ===================================
    # Attempt Management
    # ===================================

    async def start_attempt(
        self,
        exam_id: int,
        student_id: int
    ) -> Optional[Attempt]:
        """学生开始考试"""
        exam = await self.get_exam(exam_id)
        if not exam or exam.status != ExamStatus.PUBLISHED:
            return None

        # 检查是否已有进行中的答题
        existing_query = (
            select(Attempt)
            .where(
                Attempt.exam_id == exam_id,
                Attempt.student_id == student_id,
            )
        )
        result = await self.db.execute(existing_query)
        existing = result.scalar_one_or_none()

        if existing:
            if existing.status == AttemptStatus.IN_PROGRESS:
                return existing  # 返回进行中的答题
            else:
                return None  # 已提交，不能重新开始

        # 创建新答题记录
        attempt = Attempt(
            exam_id=exam_id,
            student_id=student_id,
            started_at=datetime.now(timezone.utc),
            status=AttemptStatus.IN_PROGRESS,
        )
        self.db.add(attempt)
        await self.db.commit()
        await self.db.refresh(attempt)
        return attempt

    async def get_attempt(
        self,
        exam_id: int,
        student_id: int
    ) -> Optional[Attempt]:
        """获取学生的答题记录"""
        query = (
            select(Attempt)
            .options(selectinload(Attempt.answers))
            .where(
                Attempt.exam_id == exam_id,
                Attempt.student_id == student_id,
            )
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def save_answer(
        self,
        attempt_id: int,
        data: AnswerSubmit
    ) -> Optional[AttemptAnswer]:
        """保存单个答案"""
        # 检查答题记录
        attempt_query = select(Attempt).where(Attempt.id == attempt_id)
        result = await self.db.execute(attempt_query)
        attempt = result.scalar_one_or_none()

        if not attempt or attempt.status != AttemptStatus.IN_PROGRESS:
            return None

        # 查找或创建答案记录
        answer_query = (
            select(AttemptAnswer)
            .where(
                AttemptAnswer.attempt_id == attempt_id,
                AttemptAnswer.question_id == data.question_id,
            )
        )
        answer_result = await self.db.execute(answer_query)
        answer = answer_result.scalar_one_or_none()

        if answer:
            answer.student_answer = data.answer
            if data.time_spent_seconds:
                answer.time_spent_seconds = data.time_spent_seconds
        else:
            answer = AttemptAnswer(
                attempt_id=attempt_id,
                question_id=data.question_id,
                student_answer=data.answer,
                time_spent_seconds=data.time_spent_seconds,
            )
            self.db.add(answer)

        await self.db.commit()
        await self.db.refresh(answer)
        return answer

    async def submit_attempt(
        self,
        exam_id: int,
        student_id: int
    ) -> Optional[Attempt]:
        """提交考试"""
        attempt = await self.get_attempt(exam_id, student_id)
        if not attempt or attempt.status != AttemptStatus.IN_PROGRESS:
            return None

        attempt.submitted_at = datetime.now(timezone.utc)
        attempt.status = AttemptStatus.SUBMITTED

        # 自动评分客观题
        await self._auto_grade_attempt(attempt)

        await self.db.commit()
        await self.db.refresh(attempt)
        return attempt

    async def _auto_grade_attempt(self, attempt: Attempt):
        """自动评分客观题"""
        # 获取考试和题目信息
        exam = await self.get_exam(attempt.exam_id)
        if not exam or not exam.paper_id:
            return

        # 获取题目和正确答案
        query = (
            select(PaperQuestion)
            .options(selectinload(PaperQuestion.question))
            .where(PaperQuestion.paper_id == exam.paper_id)
        )
        result = await self.db.execute(query)
        paper_questions = {pq.question_id: pq for pq in result.scalars().all()}

        # 获取学生答案
        answer_query = (
            select(AttemptAnswer)
            .where(AttemptAnswer.attempt_id == attempt.id)
        )
        answer_result = await self.db.execute(answer_query)
        answers = list(answer_result.scalars().all())

        total_score = 0
        for answer in answers:
            pq = paper_questions.get(answer.question_id)
            if not pq:
                continue

            question = pq.question
            correct_answer = question.answer

            # 根据题型评分
            if question.type.value in ('single', 'multiple', 'blank'):
                is_correct = self._check_answer(
                    question.type.value,
                    answer.student_answer,
                    correct_answer
                )
                answer.is_correct = is_correct
                answer.score = pq.score if is_correct else 0
                total_score += answer.score
            else:
                # 主观题暂不自动评分
                answer.is_correct = None
                answer.score = None

        attempt.total_score = total_score
        attempt.status = AttemptStatus.GRADED

    def _check_answer(
        self,
        question_type: str,
        student_answer: any,
        correct_answer: dict
    ) -> bool:
        """检查答案是否正确"""
        if not student_answer or not correct_answer:
            return False

        if question_type == 'single':
            correct = correct_answer.get('correct')
            return student_answer == correct

        elif question_type == 'multiple':
            correct = set(correct_answer.get('correct', []))
            student = set(student_answer) if isinstance(student_answer, list) else set()
            return correct == student

        elif question_type == 'blank':
            correct = correct_answer.get('blanks', [])
            student = student_answer if isinstance(student_answer, list) else []
            if len(correct) != len(student):
                return False
            # 简单比较（可以改进为模糊匹配）
            return all(
                str(s).strip().lower() == str(c).strip().lower()
                for s, c in zip(student, correct)
            )

        return False

    async def get_exam_attempts(
        self,
        exam_id: int,
        teacher_id: int,
        skip: int = 0,
        limit: int = 50
    ) -> tuple[List[Attempt], int]:
        """获取考试的所有答题记录（教师）"""
        exam = await self.get_exam(exam_id)
        if not exam or exam.published_by != teacher_id:
            return [], 0

        query = (
            select(Attempt)
            .options(selectinload(Attempt.student))
            .where(Attempt.exam_id == exam_id)
            .order_by(Attempt.submitted_at.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await self.db.execute(query)
        attempts = list(result.scalars().all())

        count_query = (
            select(func.count(Attempt.id))
            .where(Attempt.exam_id == exam_id)
        )
        count_result = await self.db.execute(count_query)
        total = count_result.scalar() or 0

        return attempts, total

    # ===================================
    # Helper Methods
    # ===================================

    async def get_exam_question_count(self, exam_id: int) -> int:
        """获取考试题目数量"""
        exam = await self.get_exam(exam_id)
        if not exam or not exam.paper_id:
            return 0

        query = (
            select(func.count(PaperQuestion.id))
            .where(PaperQuestion.paper_id == exam.paper_id)
        )
        result = await self.db.execute(query)
        return result.scalar() or 0

    async def get_exam_attempt_count(self, exam_id: int) -> int:
        """获取考试参与人数"""
        query = (
            select(func.count(Attempt.id))
            .where(Attempt.exam_id == exam_id)
        )
        result = await self.db.execute(query)
        return result.scalar() or 0
