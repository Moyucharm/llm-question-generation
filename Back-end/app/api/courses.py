"""
Course Management API

Endpoints for managing courses and knowledge points
"""

from typing import List, Any
from fastapi import APIRouter, Depends, HTTPException, Query

from app.api.deps import (
    CurrentActiveUser,
    DbSession,
    require_teacher,
)
from app.services.course_service import CourseService
from app.schemas.course import (
    CourseCreate,
    CourseUpdate,
    CourseResponse,
    CourseDetail,
    KnowledgePointCreate,
    KnowledgePointUpdate,
    KnowledgePointResponse,
    KnowledgePointTree,
)

router = APIRouter(prefix="/courses", tags=["课程管理"])


# ==========================================
# Course Endpoints
# ==========================================

@router.get(
    "/",
    response_model=List[CourseResponse],
    summary="获取课程列表",
    description="获取所有课程列表，支持分页",
)
async def get_courses(
    db: DbSession,
    current_user: CurrentActiveUser,
    skip: int = 0,
    limit: int = 100,
):
    """Get list of courses"""
    # If teacher, only show their courses? Or all courses?
    # For now, let's show all courses, or filter by teacher if requested
    # But usually teachers want to see their own courses.
    # Let's add a filter param later if needed. For now, list all.
    # Wait, requirement says "Teacher can create/edit/delete courses".
    # Let's return all courses for now.
    return await CourseService.get_courses(db, skip=skip, limit=limit)


@router.post(
    "/",
    response_model=CourseResponse,
    summary="创建课程",
    description="创建一个新课程",
    dependencies=[Depends(require_teacher)],
)
async def create_course(
    course_in: CourseCreate,
    db: DbSession,
    current_user: CurrentActiveUser,
):
    """Create a new course"""
    return await CourseService.create_course(
        db, course_in, teacher_id=current_user.id
    )


@router.get(
    "/{course_id}",
    response_model=CourseDetail,
    summary="获取课程详情",
    description="获取单个课程的详细信息，包括知识点树",
)
async def get_course(
    course_id: int,
    db: DbSession,
    current_user: CurrentActiveUser,
):
    """Get course details"""
    course = await CourseService.get_course(db, course_id)
    if not course:
        raise HTTPException(status_code=404, detail="课程不存在")
    
    # Get knowledge points tree
    kp_tree = await CourseService.get_knowledge_point_tree(db, course_id)
    
    # Construct response
    # We need to manually construct CourseDetail because course object doesn't have knowledge_points tree populated in the way Schema expects (it has list of KPs)
    course_dict = {
        "id": course.id,
        "name": course.name,
        "description": course.description,
        "teacher_id": course.teacher_id,
        "created_at": course.created_at,
        "updated_at": course.updated_at,
        "knowledge_points": kp_tree,
    }
    return course_dict


@router.put(
    "/{course_id}",
    response_model=CourseResponse,
    summary="更新课程",
    description="更新课程信息",
    dependencies=[Depends(require_teacher)],
)
async def update_course(
    course_id: int,
    course_in: CourseUpdate,
    db: DbSession,
    current_user: CurrentActiveUser,
):
    """Update a course"""
    # Check ownership or admin
    course = await CourseService.get_course(db, course_id)
    if not course:
        raise HTTPException(status_code=404, detail="课程不存在")
    
    if current_user.role != "admin" and course.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="没有权限修改此课程")

    updated_course = await CourseService.update_course(db, course_id, course_in)
    return updated_course


@router.delete(
    "/{course_id}",
    summary="删除课程",
    description="删除课程及其所有知识点",
    dependencies=[Depends(require_teacher)],
)
async def delete_course(
    course_id: int,
    db: DbSession,
    current_user: CurrentActiveUser,
):
    """Delete a course"""
    # Check ownership or admin
    course = await CourseService.get_course(db, course_id)
    if not course:
        raise HTTPException(status_code=404, detail="课程不存在")
    
    if current_user.role != "admin" and course.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="没有权限删除此课程")

    await CourseService.delete_course(db, course_id)
    return {"message": "课程已删除"}


# ==========================================
# Knowledge Point Endpoints
# ==========================================

@router.get(
    "/{course_id}/knowledge-points",
    response_model=List[KnowledgePointTree],
    summary="获取知识点树",
    description="获取课程的知识点树形结构",
)
async def get_knowledge_points(
    course_id: int,
    db: DbSession,
    current_user: CurrentActiveUser,
):
    """Get knowledge point tree for a course"""
    course = await CourseService.get_course(db, course_id)
    if not course:
        raise HTTPException(status_code=404, detail="课程不存在")
        
    return await CourseService.get_knowledge_point_tree(db, course_id)


@router.post(
    "/{course_id}/knowledge-points",
    response_model=KnowledgePointResponse,
    summary="添加知识点",
    description="向课程添加新的知识点",
    dependencies=[Depends(require_teacher)],
)
async def create_knowledge_point(
    course_id: int,
    kp_in: KnowledgePointCreate,
    db: DbSession,
    current_user: CurrentActiveUser,
):
    """Create a knowledge point"""
    course = await CourseService.get_course(db, course_id)
    if not course:
        raise HTTPException(status_code=404, detail="课程不存在")
    
    if current_user.role != "admin" and course.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="没有权限修改此课程")

    return await CourseService.create_knowledge_point(db, course_id, kp_in)


@router.put(
    "/{course_id}/knowledge-points/{kp_id}",
    response_model=KnowledgePointResponse,
    summary="更新知识点",
    description="更新知识点信息",
    dependencies=[Depends(require_teacher)],
)
async def update_knowledge_point(
    course_id: int,
    kp_id: int,
    kp_in: KnowledgePointUpdate,
    db: DbSession,
    current_user: CurrentActiveUser,
):
    """Update a knowledge point"""
    course = await CourseService.get_course(db, course_id)
    if not course:
        raise HTTPException(status_code=404, detail="课程不存在")
    
    if current_user.role != "admin" and course.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="没有权限修改此课程")

    kp = await CourseService.update_knowledge_point(db, kp_id, kp_in)
    if not kp:
        raise HTTPException(status_code=404, detail="知识点不存在")
        
    return kp


@router.delete(
    "/{course_id}/knowledge-points/{kp_id}",
    summary="删除知识点",
    description="删除知识点（及其子知识点）",
    dependencies=[Depends(require_teacher)],
)
async def delete_knowledge_point(
    course_id: int,
    kp_id: int,
    db: DbSession,
    current_user: CurrentActiveUser,
):
    """Delete a knowledge point"""
    course = await CourseService.get_course(db, course_id)
    if not course:
        raise HTTPException(status_code=404, detail="课程不存在")
    
    if current_user.role != "admin" and course.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="没有权限修改此课程")

    success = await CourseService.delete_knowledge_point(db, kp_id)
    if not success:
        raise HTTPException(status_code=404, detail="知识点不存在")
        
    return {"message": "知识点已删除"}
