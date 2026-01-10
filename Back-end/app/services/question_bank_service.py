"""
Question Bank Service

业务逻辑层：题库管理
"""

from typing import Optional, List, Dict, Any, Tuple
from datetime import datetime
import json

from sqlalchemy import select, func, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.question import Question, QuestionType, QuestionStatus
from app.models.course import Course, KnowledgePoint
from app.models.user import User


class QuestionBankService:
    """题库管理服务"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_question(
        self,
        question_type: str,
        stem: str,
        answer: Any,
        created_by: int,
        options: Optional[Dict[str, str]] = None,
        explanation: Optional[str] = None,
        difficulty: int = 3,
        score: int = 10,
        course_id: Optional[int] = None,
        knowledge_point_id: Optional[int] = None,
        status: str = "draft",
    ) -> Question:
        """创建单个题目"""
        question = Question(
            type=QuestionType(question_type),
            stem=stem,
            options=options,
            answer=answer if isinstance(answer, dict) else {"correct": answer},
            explanation=explanation,
            difficulty=difficulty,
            score=score,
            course_id=course_id,
            knowledge_point_id=knowledge_point_id,
            created_by=created_by,
            status=QuestionStatus(status),
        )
        self.db.add(question)
        await self.db.commit()
        await self.db.refresh(question)
        return question

    async def batch_create_questions(
        self,
        questions_data: List[Dict[str, Any]],
        created_by: int,
        course_id: Optional[int] = None,
        knowledge_point_id: Optional[int] = None,
    ) -> Tuple[int, List[int]]:
        """批量创建题目"""
        created_ids = []
        for q_data in questions_data:
            # 使用传入的 course_id/knowledge_point_id，如果单个题目有指定则优先使用
            q_course_id = q_data.get("course_id") or course_id
            q_kp_id = q_data.get("knowledge_point_id") or knowledge_point_id
            
            # 处理答案格式
            answer = q_data.get("answer")
            if not isinstance(answer, dict):
                if isinstance(answer, list):
                    answer = {"correct": answer}
                else:
                    answer = {"correct": answer}
            
            question = Question(
                type=QuestionType(q_data["type"]),
                stem=q_data["stem"],
                options=q_data.get("options"),
                answer=answer,
                explanation=q_data.get("explanation"),
                difficulty=q_data.get("difficulty", 3),
                score=q_data.get("score", 10),
                course_id=q_course_id,
                knowledge_point_id=q_kp_id,
                created_by=created_by,
                status=QuestionStatus(q_data.get("status", "draft")),
            )
            self.db.add(question)
            await self.db.flush()
            created_ids.append(question.id)
        
        await self.db.commit()
        return len(created_ids), created_ids

    async def get_question(self, question_id: int) -> Optional[Question]:
        """获取题目详情"""
        result = await self.db.execute(
            select(Question)
            .options(
                selectinload(Question.course),
                selectinload(Question.knowledge_point),
                selectinload(Question.creator),
            )
            .where(Question.id == question_id)
        )
        return result.scalar_one_or_none()

    async def list_questions(
        self,
        page: int = 1,
        page_size: int = 20,
        course_id: Optional[int] = None,
        question_type: Optional[str] = None,
        difficulty: Optional[int] = None,
        status: Optional[str] = None,
        created_by: Optional[int] = None,
        keyword: Optional[str] = None,
    ) -> Tuple[List[Question], int]:
        """分页查询题目列表"""
        # 构建查询条件
        conditions = []
        if course_id is not None:
            conditions.append(Question.course_id == course_id)
        if question_type is not None:
            conditions.append(Question.type == QuestionType(question_type))
        if difficulty is not None:
            conditions.append(Question.difficulty == difficulty)
        if status is not None:
            conditions.append(Question.status == QuestionStatus(status))
        if created_by is not None:
            conditions.append(Question.created_by == created_by)
        if keyword:
            conditions.append(Question.stem.contains(keyword))

        # 查询总数
        count_query = select(func.count(Question.id))
        if conditions:
            count_query = count_query.where(and_(*conditions))
        total_result = await self.db.execute(count_query)
        total = total_result.scalar() or 0

        # 分页查询
        query = (
            select(Question)
            .options(
                selectinload(Question.course),
                selectinload(Question.knowledge_point),
                selectinload(Question.creator),
            )
        )
        if conditions:
            query = query.where(and_(*conditions))
        query = query.order_by(Question.created_at.desc())
        query = query.offset((page - 1) * page_size).limit(page_size)

        result = await self.db.execute(query)
        questions = list(result.scalars().all())

        return questions, total

    async def update_question(
        self,
        question_id: int,
        **update_data,
    ) -> Optional[Question]:
        """更新题目"""
        question = await self.get_question(question_id)
        if not question:
            return None

        for key, value in update_data.items():
            if value is not None:
                if key == "type":
                    value = QuestionType(value)
                elif key == "status":
                    value = QuestionStatus(value)
                elif key == "answer" and not isinstance(value, dict):
                    value = {"correct": value}
                setattr(question, key, value)

        await self.db.commit()
        await self.db.refresh(question)
        return question

    async def delete_question(self, question_id: int) -> bool:
        """删除题目"""
        question = await self.get_question(question_id)
        if not question:
            return False
        await self.db.delete(question)
        await self.db.commit()
        return True

    async def export_questions(
        self,
        question_ids: Optional[List[int]] = None,
        course_id: Optional[int] = None,
        question_type: Optional[str] = None,
        difficulty: Optional[int] = None,
        status: Optional[str] = None,
        created_by: Optional[int] = None,
    ) -> List[Dict[str, Any]]:
        """导出题目为 JSON 格式"""
        conditions = []
        if question_ids:
            conditions.append(Question.id.in_(question_ids))
        if course_id is not None:
            conditions.append(Question.course_id == course_id)
        if question_type is not None:
            conditions.append(Question.type == QuestionType(question_type))
        if difficulty is not None:
            conditions.append(Question.difficulty == difficulty)
        if status is not None:
            conditions.append(Question.status == QuestionStatus(status))
        if created_by is not None:
            conditions.append(Question.created_by == created_by)

        query = select(Question).options(
            selectinload(Question.course),
            selectinload(Question.knowledge_point),
        )
        if conditions:
            query = query.where(and_(*conditions))
        query = query.order_by(Question.id)

        result = await self.db.execute(query)
        questions = result.scalars().all()

        # 转换为导出格式
        export_data = []
        for q in questions:
            export_data.append({
                "type": q.type.value,
                "stem": q.stem,
                "options": q.options,
                "answer": q.answer,
                "explanation": q.explanation,
                "difficulty": q.difficulty,
                "score": q.score,
                "course_name": q.course.name if q.course else None,
                "knowledge_point_name": q.knowledge_point.name if q.knowledge_point else None,
            })
        return export_data

    async def import_questions(
        self,
        questions_data: List[Dict[str, Any]],
        created_by: int,
        course_id: Optional[int] = None,
        knowledge_point_id: Optional[int] = None,
        status: str = "draft",
    ) -> Tuple[int, int, List[str], List[int]]:
        """
        导入题目
        返回：(成功数, 跳过数, 错误列表, 创建的ID列表)
        """
        imported_ids = []
        errors = []
        skipped = 0

        for idx, q_data in enumerate(questions_data):
            try:
                # 验证必填字段
                if not q_data.get("type") or not q_data.get("stem") or q_data.get("answer") is None:
                    errors.append(f"第 {idx + 1} 题缺少必填字段")
                    skipped += 1
                    continue

                # 处理答案格式
                answer = q_data.get("answer")
                if not isinstance(answer, dict):
                    if isinstance(answer, list):
                        answer = {"correct": answer}
                    else:
                        answer = {"correct": answer}

                question = Question(
                    type=QuestionType(q_data["type"]),
                    stem=q_data["stem"],
                    options=q_data.get("options"),
                    answer=answer,
                    explanation=q_data.get("explanation"),
                    difficulty=q_data.get("difficulty", 3),
                    score=q_data.get("score", 10),
                    course_id=course_id,
                    knowledge_point_id=knowledge_point_id,
                    created_by=created_by,
                    status=QuestionStatus(status),
                )
                self.db.add(question)
                await self.db.flush()
                imported_ids.append(question.id)

            except Exception as e:
                errors.append(f"第 {idx + 1} 题导入失败: {str(e)}")
                skipped += 1

        await self.db.commit()
        return len(imported_ids), skipped, errors, imported_ids


def question_to_response(question: Question) -> Dict[str, Any]:
    """将 Question 模型转换为响应格式"""
    return {
        "id": question.id,
        "type": question.type.value,
        "stem": question.stem,
        "options": question.options,
        "answer": question.answer,
        "explanation": question.explanation,
        "difficulty": question.difficulty,
        "score": question.score,
        "course_id": question.course_id,
        "course_name": question.course.name if question.course else None,
        "knowledge_point_id": question.knowledge_point_id,
        "knowledge_point_name": question.knowledge_point.name if question.knowledge_point else None,
        "created_by": question.created_by,
        "creator_name": question.creator.name if question.creator else None,
        "status": question.status.value,
        "created_at": question.created_at,
        "updated_at": question.updated_at,
    }
