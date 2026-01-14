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
        now_utc = datetime.now(timezone.utc)
        now_naive = datetime.now()

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
            start_time = exam.start_time
            end_time = exam.end_time

            if start_time:
                if start_time.tzinfo is None:
                    if now_naive < start_time:
                        can_start = False
                else:
                    if now_utc.astimezone(start_time.tzinfo) < start_time:
                        can_start = False

            if end_time:
                if end_time.tzinfo is None:
                    if now_naive > end_time:
                        can_start = False
                else:
                    if now_utc.astimezone(end_time.tzinfo) > end_time:
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
        if not exam:
            return None

        # 如果没有试卷，返回空题目列表
        if not exam.paper_id:
            return {
                "exam": exam,
                "questions": [],
                "total_score": 0,
            }

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
    ) -> tuple[Optional[Attempt], Optional[str]]:
        """学生开始考试"""
        exam = await self.get_exam(exam_id)
        if not exam:
            return None, "考试不存在"
        if exam.status != ExamStatus.PUBLISHED:
            return None, "考试未发布"

        now_utc = datetime.now(timezone.utc)
        now_naive = datetime.now()
        start_time = exam.start_time
        end_time = exam.end_time

        if start_time:
            if start_time.tzinfo is None:
                if now_naive < start_time:
                    return None, "考试尚未开始"
            else:
                if now_utc.astimezone(start_time.tzinfo) < start_time:
                    return None, "考试尚未开始"

        if end_time:
            if end_time.tzinfo is None:
                if now_naive > end_time:
                    return None, "考试已结束"
            else:
                if now_utc.astimezone(end_time.tzinfo) > end_time:
                    return None, "考试已结束"

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
                return existing, None  # 返回进行中的答题
            return None, "考试已提交，无法重复参加"  # 已提交，不能重新开始

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
        return attempt, None

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

    async def submit_attempt_immediate(
        self,
        exam_id: int,
        student_id: int
    ) -> Optional[Attempt]:
        """立即提交考试（不等待批改，返回SUBMITTED状态）"""
        attempt = await self.get_attempt(exam_id, student_id)
        if not attempt or attempt.status != AttemptStatus.IN_PROGRESS:
            return None

        attempt.submitted_at = datetime.now(timezone.utc)
        attempt.status = AttemptStatus.SUBMITTED

        await self.db.commit()
        await self.db.refresh(attempt)
        return attempt

    async def submit_attempt(
        self,
        exam_id: int,
        student_id: int
    ) -> Optional[Attempt]:
        """提交考试并执行批改（完整流程，用于后台任务）"""
        attempt = await self.get_attempt(exam_id, student_id)
        if not attempt or attempt.status != AttemptStatus.IN_PROGRESS:
            return None

        attempt.submitted_at = datetime.now(timezone.utc)
        attempt.status = AttemptStatus.SUBMITTED

        # 自动评分客观题和主观题
        await self._auto_grade_attempt(attempt)

        await self.db.commit()
        await self.db.refresh(attempt)
        return attempt

    async def grade_submitted_attempt(
        self,
        exam_id: int,
        student_id: int
    ) -> Optional[Attempt]:
        """后台批改已提交的考试（不检查状态，直接批改）"""
        attempt = await self.get_attempt(exam_id, student_id)
        if not attempt:
            return None

        # 直接执行批改，不检查状态
        await self._auto_grade_attempt(attempt)

        await self.db.commit()
        await self.db.refresh(attempt)
        return attempt

    async def _auto_grade_attempt(self, attempt: Attempt):
        """自动评分（客观题直接判分，主观题调用AI）"""
        from app.services.grading_service import create_grading_service

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

        # 创建AI批改服务
        grading_service = None
        try:
            grading_service = await create_grading_service()
        except Exception as e:
            print(f"[批改] AI服务不可用: {e}")
            # AI服务不可用时跳过主观题批改

        total_score = 0
        has_subjective = False

        for answer in answers:
            pq = paper_questions.get(answer.question_id)
            if not pq:
                continue

            question = pq.question
            correct_answer = question.answer
            question_type = question.type.value

            # 根据题型评分
            if question_type in ('single', 'multiple'):
                # 选择题：直接判断对错
                is_correct = self._check_answer(
                    question_type,
                    answer.student_answer,
                    correct_answer
                )
                answer.is_correct = is_correct
                answer.score = pq.score if is_correct else 0
                answer.ai_score = answer.score
                total_score += answer.score

            elif question_type == 'blank':
                # 填空题：按空独立评分，每个空单独判断
                blanks = correct_answer.get('blanks') or correct_answer.get('correct', [])
                student_blanks = answer.student_answer if isinstance(answer.student_answer, list) else []

                # 确保学生答案数量与正确答案数量一致
                while len(student_blanks) < len(blanks):
                    student_blanks.append("")

                if not blanks:
                    # 没有正确答案，跳过
                    answer.is_correct = None
                    answer.score = 0
                    answer.ai_score = 0
                    answer.ai_feedback = "题目缺少正确答案"
                else:
                    # 每个空的分值
                    score_per_blank = pq.score / len(blanks)
                    blank_scores = []
                    blank_feedbacks = []

                    for i, (student_ans, correct_ans) in enumerate(zip(student_blanks, blanks)):
                        student_str = str(student_ans).strip().lower() if student_ans else ""
                        correct_str = str(correct_ans).strip().lower()

                        # 精确匹配（忽略大小写和首尾空格）
                        if student_str == correct_str:
                            blank_scores.append(score_per_blank)
                            blank_feedbacks.append(f"第{i+1}空正确")
                        else:
                            # 不匹配，尝试AI评分
                            if grading_service:
                                try:
                                    # 对单个空进行AI评分
                                    ai_result = await grading_service.grade_fill_blank(
                                        question_stem=f"第{i+1}空: {question.stem}",
                                        correct_blanks=[correct_ans],
                                        student_blanks=[student_ans or ""],
                                        max_score=score_per_blank
                                    )
                                    blank_scores.append(ai_result["score"])
                                    blank_feedbacks.append(ai_result.get("feedback", f"第{i+1}空AI评分"))
                                except Exception as e:
                                    blank_scores.append(0)
                                    blank_feedbacks.append(f"第{i+1}空错误")
                            else:
                                # 无AI服务，直接判错
                                blank_scores.append(0)
                                blank_feedbacks.append(f"第{i+1}空错误")

                    # 计算总分
                    total_blank_score = sum(blank_scores)
                    answer.score = int(total_blank_score)
                    answer.ai_score = total_blank_score
                    answer.ai_feedback = "; ".join(blank_feedbacks)

                    # 判断正确性：满分为完全正确，0分为完全错误，其他为部分正确
                    if total_blank_score >= pq.score:
                        answer.is_correct = True
                    elif total_blank_score <= 0:
                        answer.is_correct = False
                    else:
                        # 部分正确：is_correct 设为 None，让前端显示"部分正确"
                        answer.is_correct = None

                    # 如果有不匹配的空且使用了AI，标记为主观题
                    if any(s < score_per_blank for s in blank_scores) and grading_service:
                        has_subjective = True

                total_score += answer.score or 0

            elif question_type == 'short':
                # 简答题：AI评分
                has_subjective = True
                if grading_service and correct_answer:
                    reference = correct_answer.get('reference') or correct_answer.get('correct', '')
                    student_text = str(answer.student_answer) if answer.student_answer else ''
                    try:
                        ai_result = await grading_service.grade_short_answer(
                            question_stem=question.stem,
                            reference_answer=reference,
                            student_answer=student_text,
                            max_score=pq.score,
                            explanation=question.explanation
                        )
                        answer.ai_score = ai_result["score"]
                        answer.ai_feedback = ai_result["feedback"]
                        answer.score = int(ai_result["score"])
                        # 简答题不设置is_correct，留给教师判断
                        answer.is_correct = None
                    except Exception as e:
                        answer.ai_feedback = f"AI评分失败: {str(e)}"
                        answer.score = None
                        answer.is_correct = None
                else:
                    # 无AI服务，等待教师批改
                    answer.is_correct = None
                    answer.score = None
                total_score += answer.score or 0

        attempt.total_score = total_score
        # 如果有主观题，状态设为AI_GRADED等待教师确认；否则直接GRADED
        if has_subjective:
            attempt.status = AttemptStatus.AI_GRADED
        else:
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
            correct = correct_answer.get('blanks') or correct_answer.get('correct', [])
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

    # ===================================
    # Question Management (Simplified)
    # ===================================

    async def add_question_to_exam(
        self,
        exam_id: int,
        question_data: dict,
        teacher_id: int
    ) -> Optional[Question]:
        """
        直接向考试添加题目
        如果考试没有关联试卷，自动创建一个
        """
        from app.models.question import QuestionType

        exam = await self.get_exam(exam_id)
        if not exam or exam.published_by != teacher_id:
            return None

        if exam.status != ExamStatus.DRAFT:
            return None  # 只能在草稿状态添加题目

        # 如果没有试卷，创建一个
        if not exam.paper_id:
            paper = Paper(
                title=f"{exam.title} - 试卷",
                description="自动创建的试卷",
                created_by=teacher_id,
            )
            self.db.add(paper)
            await self.db.flush()  # 获取 paper.id

            exam.paper_id = paper.id
            await self.db.flush()

        question_id = question_data.get("question_id")
        if question_id:
            question_query = select(Question).where(Question.id == question_id)
            question_result = await self.db.execute(question_query)
            question = question_result.scalar_one_or_none()
            if not question:
                return None
        else:
            # 创建题目
            question_type = question_data.get("type", "single")
            try:
                q_type = QuestionType(question_type)
            except ValueError:
                q_type = QuestionType.SINGLE

            question = Question(
                type=q_type,
                stem=question_data.get("stem", ""),
                options=question_data.get("options"),
                answer=question_data.get("answer"),
                explanation=question_data.get("explanation"),
                difficulty=question_data.get("difficulty", 3),
                knowledge_point=question_data.get("knowledge_point"),
                created_by=teacher_id,
            )
            self.db.add(question)
            await self.db.flush()

        # 获取当前题目数量确定顺序
        count_query = (
            select(func.count(PaperQuestion.id))
            .where(PaperQuestion.paper_id == exam.paper_id)
        )
        count_result = await self.db.execute(count_query)
        order = (count_result.scalar() or 0) + 1

        # 关联到试卷
        score = question_data.get("score")
        if score is None:
            score = question.score if question.score is not None else 10

        paper_question = PaperQuestion(
            paper_id=exam.paper_id,
            question_id=question.id,
            order=order,
            score=score,
        )
        self.db.add(paper_question)

        await self.db.commit()
        await self.db.refresh(question)

        return question

    async def remove_question_from_exam(
        self,
        exam_id: int,
        question_id: int,
        teacher_id: int
    ) -> bool:
        """从考试中移除题目"""
        exam = await self.get_exam(exam_id)
        if not exam or exam.published_by != teacher_id:
            return False

        if exam.status != ExamStatus.DRAFT:
            return False

        if not exam.paper_id:
            return False

        # 删除试卷题目关联
        query = (
            select(PaperQuestion)
            .where(
                PaperQuestion.paper_id == exam.paper_id,
                PaperQuestion.question_id == question_id
            )
        )
        result = await self.db.execute(query)
        pq = result.scalar_one_or_none()

        if not pq:
            return False

        await self.db.delete(pq)
        await self.db.commit()
        return True

    async def get_exam_questions(self, exam_id: int) -> List[dict]:
        """获取考试的所有题目"""
        exam = await self.get_exam(exam_id)
        if not exam or not exam.paper_id:
            return []

        query = (
            select(PaperQuestion)
            .options(selectinload(PaperQuestion.question))
            .where(PaperQuestion.paper_id == exam.paper_id)
            .order_by(PaperQuestion.order)
        )
        result = await self.db.execute(query)
        paper_questions = list(result.scalars().all())

        questions = []
        for pq in paper_questions:
            q = pq.question
            questions.append({
                "id": q.id,
                "type": q.type.value if hasattr(q.type, 'value') else q.type,
                "stem": q.stem,
                "options": q.options,
                "answer": q.answer,
                "explanation": q.explanation,
                "score": pq.score,
                "difficulty": q.difficulty,
                "knowledge_point": q.knowledge_point,
            })

        return questions

    async def update_question_score(
        self,
        exam_id: int,
        question_id: int,
        score: int,
        teacher_id: int
    ) -> bool:
        """更新考试中题目的分值"""
        exam = await self.get_exam(exam_id)
        if not exam or exam.published_by != teacher_id:
            return False

        if exam.status != ExamStatus.DRAFT:
            return False  # 只能在草稿状态修改

        if not exam.paper_id:
            return False

        # 更新分值
        query = (
            select(PaperQuestion)
            .where(
                PaperQuestion.paper_id == exam.paper_id,
                PaperQuestion.question_id == question_id
            )
        )
        result = await self.db.execute(query)
        pq = result.scalar_one_or_none()

        if not pq:
            return False

        pq.score = score
        await self.db.commit()
        return True

    async def reorder_questions(
        self,
        exam_id: int,
        question_orders: list[dict],
        teacher_id: int
    ) -> bool:
        """重新排序考试中的题目

        Args:
            exam_id: 考试ID
            question_orders: [{"question_id": 1, "order": 1}, ...]
            teacher_id: 教师ID
        """
        exam = await self.get_exam(exam_id)
        if not exam or exam.published_by != teacher_id:
            return False

        if exam.status != ExamStatus.DRAFT:
            return False  # 只能在草稿状态修改

        if not exam.paper_id:
            return False

        # 批量更新顺序
        for item in question_orders:
            query = (
                select(PaperQuestion)
                .where(
                    PaperQuestion.paper_id == exam.paper_id,
                    PaperQuestion.question_id == item["question_id"]
                )
            )
            result = await self.db.execute(query)
            pq = result.scalar_one_or_none()
            if pq:
                pq.order = item["order"]

        await self.db.commit()
        return True

    # ===================================
    # Grade Management
    # ===================================

    async def get_attempt_by_id(self, attempt_id: int) -> Optional[Attempt]:
        """通过ID获取答题记录"""
        query = (
            select(Attempt)
            .options(
                selectinload(Attempt.answers),
                selectinload(Attempt.student),
                selectinload(Attempt.exam),
                selectinload(Attempt.grader),
            )
            .where(Attempt.id == attempt_id)
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_attempt_detail(
        self,
        exam_id: int,
        attempt_id: int,
        teacher_id: int
    ) -> Optional[dict]:
        """获取答卷详情（带完整题目信息，供教师批改）"""
        # 验证权限
        exam = await self.get_exam(exam_id)
        if not exam or exam.published_by != teacher_id:
            return None

        # 获取答题记录
        attempt = await self.get_attempt_by_id(attempt_id)
        if not attempt or attempt.exam_id != exam_id:
            return None

        # 获取题目信息
        questions = await self.get_exam_questions(exam_id)
        question_map = {q["id"]: q for q in questions}

        # 构建答案详情
        answers_detail = []
        max_score = 0
        for answer in attempt.answers:
            q = question_map.get(answer.question_id, {})
            max_score += q.get("score", 10)
            answers_detail.append({
                "id": answer.id,
                "question_id": answer.question_id,
                "question_type": q.get("type", "unknown"),
                "question_stem": q.get("stem", ""),
                "question_options": q.get("options"),
                "correct_answer": q.get("answer"),
                "explanation": q.get("explanation"),
                "max_score": q.get("score", 10),
                "student_answer": answer.student_answer,
                "is_correct": answer.is_correct,
                "score": answer.score,
                "ai_score": answer.ai_score,
                "teacher_score": answer.teacher_score,
                "feedback": answer.feedback,
                "ai_feedback": answer.ai_feedback,
                "teacher_feedback": answer.teacher_feedback,
            })

        return {
            "id": attempt.id,
            "exam_id": attempt.exam_id,
            "exam_title": exam.title,
            "student_id": attempt.student_id,
            "student_name": attempt.student.name if attempt.student else "Unknown",
            "student_email": attempt.student.email if attempt.student else None,
            "started_at": attempt.started_at,
            "submitted_at": attempt.submitted_at,
            "total_score": attempt.total_score,
            "final_score": attempt.final_score,
            "max_score": max_score,
            "is_graded_by_teacher": attempt.is_graded_by_teacher,
            "graded_at": attempt.graded_at,
            "graded_by": attempt.graded_by,
            "grader_name": attempt.grader.name if attempt.grader else None,
            "status": attempt.status.value,
            "answers": answers_detail,
        }

    async def update_answer_score(
        self,
        exam_id: int,
        attempt_id: int,
        question_id: int,
        teacher_score: float,
        teacher_feedback: Optional[str],
        teacher_id: int
    ) -> Optional[AttemptAnswer]:
        """更新单题评分"""
        # 验证权限
        exam = await self.get_exam(exam_id)
        if not exam or exam.published_by != teacher_id:
            return None

        # 获取答案记录
        query = (
            select(AttemptAnswer)
            .where(
                AttemptAnswer.attempt_id == attempt_id,
                AttemptAnswer.question_id == question_id,
            )
        )
        result = await self.db.execute(query)
        answer = result.scalar_one_or_none()

        if not answer:
            return None

        # 更新教师评分
        answer.teacher_score = teacher_score
        if teacher_feedback is not None:
            answer.teacher_feedback = teacher_feedback

        # 更新最终得分（教师评分优先）
        answer.score = int(teacher_score)

        await self.db.commit()
        await self.db.refresh(answer)
        return answer

    async def update_attempt_scores(
        self,
        exam_id: int,
        attempt_id: int,
        scores: List[dict],
        teacher_id: int
    ) -> Optional[Attempt]:
        """批量更新答题评分"""
        # 验证权限
        exam = await self.get_exam(exam_id)
        if not exam or exam.published_by != teacher_id:
            return None

        attempt = await self.get_attempt_by_id(attempt_id)
        if not attempt or attempt.exam_id != exam_id:
            return None

        # 更新每道题的评分
        for score_data in scores:
            await self.update_answer_score(
                exam_id,
                attempt_id,
                score_data["question_id"],
                score_data["teacher_score"],
                score_data.get("teacher_feedback"),
                teacher_id
            )

        # 重新计算总分
        await self._recalculate_total_score(attempt_id)

        # 刷新并返回
        attempt = await self.get_attempt_by_id(attempt_id)
        return attempt

    async def _recalculate_total_score(self, attempt_id: int):
        """重新计算总分"""
        query = (
            select(AttemptAnswer)
            .where(AttemptAnswer.attempt_id == attempt_id)
        )
        result = await self.db.execute(query)
        answers = list(result.scalars().all())

        total = 0
        for answer in answers:
            # 优先使用教师评分，其次是AI评分，最后是score字段
            if answer.teacher_score is not None:
                total += answer.teacher_score
            elif answer.ai_score is not None:
                total += answer.ai_score
            elif answer.score is not None:
                total += answer.score

        # 更新attempt的total_score
        attempt_query = select(Attempt).where(Attempt.id == attempt_id)
        attempt_result = await self.db.execute(attempt_query)
        attempt = attempt_result.scalar_one_or_none()
        if attempt:
            attempt.total_score = int(total)
            await self.db.commit()

    async def confirm_grade(
        self,
        exam_id: int,
        attempt_id: int,
        teacher_id: int,
        final_score: Optional[float] = None,
        comment: Optional[str] = None
    ) -> Optional[Attempt]:
        """确认最终成绩"""
        # 验证权限
        exam = await self.get_exam(exam_id)
        if not exam or exam.published_by != teacher_id:
            return None

        attempt = await self.get_attempt_by_id(attempt_id)
        if not attempt or attempt.exam_id != exam_id:
            return None

        # 如果没有提供最终成绩，使用计算的总分
        if final_score is None:
            await self._recalculate_total_score(attempt_id)
            attempt = await self.get_attempt_by_id(attempt_id)
            final_score = float(attempt.total_score or 0)

        # 更新状态
        attempt.final_score = final_score
        attempt.is_graded_by_teacher = True
        attempt.graded_at = datetime.now(timezone.utc)
        attempt.graded_by = teacher_id
        attempt.status = AttemptStatus.GRADED

        await self.db.commit()
        await self.db.refresh(attempt)
        return attempt

    async def get_grade_statistics(
        self,
        exam_id: int,
        teacher_id: int
    ) -> Optional[dict]:
        """获取考试成绩统计"""
        exam = await self.get_exam(exam_id)
        if not exam or exam.published_by != teacher_id:
            return None

        # 获取所有答题记录
        query = (
            select(Attempt)
            .where(Attempt.exam_id == exam_id)
        )
        result = await self.db.execute(query)
        attempts = list(result.scalars().all())

        if not attempts:
            return {
                "exam_id": exam_id,
                "total_attempts": 0,
                "submitted_count": 0,
                "graded_count": 0,
                "average_score": None,
                "highest_score": None,
                "lowest_score": None,
                "pass_rate": None,
            }

        total_attempts = len(attempts)
        submitted_count = sum(1 for a in attempts if a.status != AttemptStatus.IN_PROGRESS)
        graded_count = sum(1 for a in attempts if a.is_graded_by_teacher)

        # 计算成绩统计（使用final_score或total_score）
        scores = []
        for a in attempts:
            score = a.final_score if a.final_score is not None else a.total_score
            if score is not None:
                scores.append(score)

        if scores:
            average_score = sum(scores) / len(scores)
            highest_score = max(scores)
            lowest_score = min(scores)
            # 假设60%为及格线
            pass_count = sum(1 for s in scores if s >= 60)
            pass_rate = pass_count / len(scores) * 100
        else:
            average_score = None
            highest_score = None
            lowest_score = None
            pass_rate = None

        return {
            "exam_id": exam_id,
            "total_attempts": total_attempts,
            "submitted_count": submitted_count,
            "graded_count": graded_count,
            "average_score": round(average_score, 2) if average_score else None,
            "highest_score": highest_score,
            "lowest_score": lowest_score,
            "pass_rate": round(pass_rate, 2) if pass_rate else None,
        }

    async def get_student_result(
        self,
        exam_id: int,
        student_id: int
    ) -> Optional[dict]:
        """获取学生的考试结果（学生视角）"""
        attempt = await self.get_attempt(exam_id, student_id)
        if not attempt:
            return None

        # 获取考试信息
        exam = await self.get_exam(exam_id)
        if not exam:
            return None

        # 获取题目信息
        questions = await self.get_exam_questions(exam_id)
        question_map = {q["id"]: q for q in questions}

        # 构建答案详情（学生视角：只显示分数和反馈，不显示正确答案）
        answers_detail = []
        max_score = 0
        for answer in attempt.answers:
            q = question_map.get(answer.question_id, {})
            max_score += q.get("score", 10)

            # 决定是否显示正确答案（只有在教师批改后才显示）
            show_answer = attempt.is_graded_by_teacher

            answers_detail.append({
                "question_id": answer.question_id,
                "question_type": q.get("type", "unknown"),
                "question_stem": q.get("stem", ""),
                "question_options": q.get("options"),
                "correct_answer": q.get("answer") if show_answer else None,
                "explanation": q.get("explanation") if show_answer else None,
                "max_score": q.get("score", 10),
                "student_answer": answer.student_answer,
                "is_correct": answer.is_correct,
                "score": answer.score,
                "feedback": answer.teacher_feedback or answer.ai_feedback or answer.feedback,
            })

        # 决定显示的分数
        display_score = attempt.final_score if attempt.is_graded_by_teacher else attempt.total_score

        return {
            "exam_id": exam_id,
            "exam_title": exam.title,
            "attempt_id": attempt.id,
            "status": attempt.status.value,
            "started_at": attempt.started_at,
            "submitted_at": attempt.submitted_at,
            "score": display_score,
            "max_score": max_score,
            "is_final": attempt.is_graded_by_teacher,
            "graded_at": attempt.graded_at if attempt.is_graded_by_teacher else None,
            "answers": answers_detail,
        }

