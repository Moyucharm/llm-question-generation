"""
Course Service

Business logic for managing courses and knowledge points
"""

from typing import List, Optional, Dict, Any
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.course import Course, KnowledgePoint
from app.schemas.course import (
    CourseCreate,
    CourseUpdate,
    KnowledgePointCreate,
    KnowledgePointUpdate,
)


class CourseService:
    """Service for managing courses and knowledge points"""

    @staticmethod
    async def get_courses(
        db: AsyncSession,
        skip: int = 0,
        limit: int = 100,
        teacher_id: Optional[int] = None,
    ) -> List[Course]:
        """Get list of courses"""
        query = select(Course).order_by(desc(Course.updated_at))
        
        if teacher_id:
            query = query.where(Course.teacher_id == teacher_id)
            
        query = query.offset(skip).limit(limit)
        result = await db.execute(query)
        return list(result.scalars().all())

    @staticmethod
    async def get_course(db: AsyncSession, course_id: int) -> Optional[Course]:
        """Get a single course by ID"""
        query = select(Course).where(Course.id == course_id)
        result = await db.execute(query)
        return result.scalar_one_or_none()

    @staticmethod
    async def create_course(
        db: AsyncSession, course_in: CourseCreate, teacher_id: int
    ) -> Course:
        """Create a new course"""
        course = Course(
            name=course_in.name,
            description=course_in.description,
            teacher_id=teacher_id,
        )
        db.add(course)
        await db.commit()
        await db.refresh(course)
        return course

    @staticmethod
    async def update_course(
        db: AsyncSession, course_id: int, course_in: CourseUpdate
    ) -> Optional[Course]:
        """Update a course"""
        course = await CourseService.get_course(db, course_id)
        if not course:
            return None

        update_data = course_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(course, field, value)

        await db.commit()
        await db.refresh(course)
        return course

    @staticmethod
    async def delete_course(db: AsyncSession, course_id: int) -> bool:
        """Delete a course"""
        course = await CourseService.get_course(db, course_id)
        if not course:
            return False

        await db.delete(course)
        await db.commit()
        return True

    # ==========================================
    # Knowledge Point Operations
    # ==========================================

    @staticmethod
    async def get_knowledge_points(
        db: AsyncSession, course_id: int
    ) -> List[KnowledgePoint]:
        """Get all knowledge points for a course (flat list)"""
        query = (
            select(KnowledgePoint)
            .where(KnowledgePoint.course_id == course_id)
            .order_by(KnowledgePoint.order)
        )
        result = await db.execute(query)
        return list(result.scalars().all())

    @staticmethod
    async def get_knowledge_point_tree(
        db: AsyncSession, course_id: int
    ) -> List[Dict[str, Any]]:
        """Get knowledge points as a tree structure"""
        # Get all points
        points = await CourseService.get_knowledge_points(db, course_id)
        
        # Build tree
        # 1. Create a map of id -> node
        nodes = {}
        for p in points:
            nodes[p.id] = {
                "id": p.id,
                "name": p.name,
                "description": p.description,
                "chapter": p.chapter,
                "course_id": p.course_id,
                "parent_id": p.parent_id,
                "order": p.order,
                "created_at": p.created_at,
                "updated_at": p.updated_at,
                "children": [],
            }

        # 2. Assemble tree
        tree = []
        for p in points:
            node = nodes[p.id]
            if p.parent_id and p.parent_id in nodes:
                nodes[p.parent_id]["children"].append(node)
            else:
                tree.append(node)
                
        return tree

    @staticmethod
    async def get_knowledge_point(
        db: AsyncSession, kp_id: int
    ) -> Optional[KnowledgePoint]:
        """Get a single knowledge point"""
        query = select(KnowledgePoint).where(KnowledgePoint.id == kp_id)
        result = await db.execute(query)
        return result.scalar_one_or_none()

    @staticmethod
    async def create_knowledge_point(
        db: AsyncSession, course_id: int, kp_in: KnowledgePointCreate
    ) -> KnowledgePoint:
        """Create a knowledge point"""
        kp = KnowledgePoint(
            name=kp_in.name,
            description=kp_in.description,
            chapter=kp_in.chapter,
            order=kp_in.order,
            parent_id=kp_in.parent_id,
            course_id=course_id,
        )
        db.add(kp)
        await db.commit()
        await db.refresh(kp)
        return kp

    @staticmethod
    async def update_knowledge_point(
        db: AsyncSession, kp_id: int, kp_in: KnowledgePointUpdate
    ) -> Optional[KnowledgePoint]:
        """Update a knowledge point"""
        kp = await CourseService.get_knowledge_point(db, kp_id)
        if not kp:
            return None

        update_data = kp_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(kp, field, value)

        await db.commit()
        await db.refresh(kp)
        return kp

    @staticmethod
    async def delete_knowledge_point(db: AsyncSession, kp_id: int) -> bool:
        """Delete a knowledge point"""
        kp = await CourseService.get_knowledge_point(db, kp_id)
        if not kp:
            return False

        await db.delete(kp)
        await db.commit()
        return True
