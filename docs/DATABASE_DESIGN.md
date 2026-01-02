# 数据库设计文档

> LLM智能出题考试系统 - 数据库架构设计
>
> 版本: 1.0.0 | 更新日期: 2026-01-02

---

## 1. 概述

本系统采用 **SQLite** 作为数据库（通过 aiosqlite 实现异步访问），使用 **SQLAlchemy 2.0** ORM 框架进行数据操作。数据库共包含 **11 张数据表**，涵盖用户管理、课程管理、题库管理、考试管理和系统日志五大模块。

### 1.1 技术栈

| 组件 | 版本 | 说明 |
|------|------|------|
| SQLite | 3.x | 轻量级关系型数据库 |
| SQLAlchemy | 2.0.36 | 异步ORM框架 |
| aiosqlite | 0.20.0 | SQLite异步驱动 |
| greenlet | 3.1.1 | 异步上下文支持 |

### 1.2 数据库配置

```python
DATABASE_URL = "sqlite+aiosqlite:///./app.db"
```

---

## 2. ER 关系图

```
┌─────────────┐       ┌─────────────┐       ┌─────────────────┐
│   users     │───1:N─│   courses   │───1:N─│ knowledge_points│
└─────────────┘       └─────────────┘       └─────────────────┘
      │                     │                       │
      │                     │                       │
     1:N                   1:N                     1:N
      │                     │                       │
      ▼                     ▼                       ▼
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│   exams     │       │   papers    │◄──────│  questions  │
└─────────────┘       └─────────────┘       └─────────────┘
      │                     │                       │
     1:N                    │                       │
      │              ┌──────┴──────┐                │
      ▼              ▼             ▼                │
┌─────────────┐  ┌─────────────────┐               │
│  attempts   │  │ paper_questions │◄──────────────┘
└─────────────┘  └─────────────────┘
      │
     1:N
      │
      ▼
┌─────────────────┐
│ attempt_answers │
└─────────────────┘

┌─────────────┐
│  llm_logs   │ (独立日志表)
└─────────────┘
```

---

## 3. 数据表详细设计

### 3.1 用户表 (users)

用户认证与授权的核心表。

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | INTEGER | PK, AUTO_INCREMENT | 主键 |
| email | VARCHAR(255) | UNIQUE, NOT NULL, INDEX | 邮箱地址 |
| name | VARCHAR(100) | NOT NULL | 显示名称 |
| password_hash | VARCHAR(255) | NOT NULL | 密码哈希值 (bcrypt) |
| role | ENUM | NOT NULL, DEFAULT 'student' | 用户角色 |
| is_active | BOOLEAN | NOT NULL, DEFAULT TRUE | 是否激活 |
| avatar | VARCHAR(500) | NULL | 头像URL |
| bio | TEXT | NULL | 个人简介 |
| created_at | DATETIME | NOT NULL, DEFAULT NOW | 创建时间 |
| updated_at | DATETIME | NOT NULL, AUTO_UPDATE | 更新时间 |

**角色枚举 (UserRole):**
- `student` - 学生
- `teacher` - 教师
- `admin` - 管理员

---

### 3.2 课程表 (courses)

存储课程/科目信息。

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | INTEGER | PK, AUTO_INCREMENT | 主键 |
| name | VARCHAR(200) | NOT NULL, INDEX | 课程名称 |
| description | TEXT | NULL | 课程描述 |
| teacher_id | INTEGER | FK → users.id, NOT NULL | 创建教师 |
| created_at | DATETIME | NOT NULL | 创建时间 |
| updated_at | DATETIME | NOT NULL | 更新时间 |

**外键约束:**
- `teacher_id` → `users.id` (ON DELETE CASCADE)

---

### 3.3 知识点表 (knowledge_points)

存储课程下的知识点，支持层级结构。

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | INTEGER | PK, AUTO_INCREMENT | 主键 |
| name | VARCHAR(200) | NOT NULL, INDEX | 知识点名称 |
| description | TEXT | NULL | 详细描述 |
| chapter | VARCHAR(100) | NULL | 章节名/编号 |
| course_id | INTEGER | FK → courses.id, NOT NULL | 所属课程 |
| parent_id | INTEGER | FK → knowledge_points.id, NULL | 父知识点(层级) |
| order | INTEGER | NOT NULL, DEFAULT 0 | 显示顺序 |
| created_at | DATETIME | NOT NULL | 创建时间 |
| updated_at | DATETIME | NOT NULL | 更新时间 |

**外键约束:**
- `course_id` → `courses.id` (ON DELETE CASCADE)
- `parent_id` → `knowledge_points.id` (ON DELETE SET NULL)

---

### 3.4 题目表 (questions)

题库核心表，存储所有题目。

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | INTEGER | PK, AUTO_INCREMENT | 主键 |
| type | ENUM | NOT NULL, INDEX | 题目类型 |
| stem | TEXT | NOT NULL | 题干内容 |
| options | JSON | NULL | 选项 (选择题) |
| answer | JSON | NOT NULL | 正确答案 |
| explanation | TEXT | NULL | 答案解析 |
| difficulty | INTEGER | NOT NULL, DEFAULT 3 | 难度 (1-5) |
| score | INTEGER | NOT NULL, DEFAULT 10 | 默认分值 |
| course_id | INTEGER | FK → courses.id, NOT NULL | 所属课程 |
| knowledge_point_id | INTEGER | FK → knowledge_points.id, NULL | 关联知识点 |
| created_by | INTEGER | FK → users.id, NOT NULL | 创建者 |
| status | ENUM | NOT NULL, INDEX, DEFAULT 'draft' | 题目状态 |
| created_at | DATETIME | NOT NULL | 创建时间 |
| updated_at | DATETIME | NOT NULL | 更新时间 |

**题目类型枚举 (QuestionType):**
- `single` - 单选题
- `multiple` - 多选题
- `blank` - 填空题
- `short` - 简答题

**题目状态枚举 (QuestionStatus):**
- `draft` - 草稿
- `approved` - 已审核
- `needs_review` - 待审核
- `rejected` - 已拒绝

**JSON 字段格式示例:**

```json
// options (选择题)
{
  "A": "选项A内容",
  "B": "选项B内容",
  "C": "选项C内容",
  "D": "选项D内容"
}

// answer (单选)
{ "correct": "A" }

// answer (多选)
{ "correct": ["A", "C"] }

// answer (填空)
{ "blanks": ["答案1", "答案2"] }

// answer (简答)
{ "reference": "参考答案内容", "keywords": ["关键词1", "关键词2"] }
```

---

### 3.5 试卷表 (papers)

试卷模板，组织题目的容器。

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | INTEGER | PK, AUTO_INCREMENT | 主键 |
| title | VARCHAR(500) | NOT NULL | 试卷标题 |
| description | TEXT | NULL | 试卷描述 |
| total_score | INTEGER | NOT NULL, DEFAULT 100 | 总分 |
| course_id | INTEGER | FK → courses.id, NOT NULL | 所属课程 |
| created_by | INTEGER | FK → users.id, NOT NULL | 创建者 |
| created_at | DATETIME | NOT NULL | 创建时间 |
| updated_at | DATETIME | NOT NULL | 更新时间 |

---

### 3.6 试卷题目关联表 (paper_questions)

试卷与题目的多对多关联表。

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | INTEGER | PK, AUTO_INCREMENT | 主键 |
| paper_id | INTEGER | FK → papers.id, NOT NULL | 试卷ID |
| question_id | INTEGER | FK → questions.id, NOT NULL | 题目ID |
| score | INTEGER | NOT NULL | 本题分值 |
| order | INTEGER | NOT NULL, DEFAULT 0 | 题目顺序 |

**外键约束:**
- `paper_id` → `papers.id` (ON DELETE CASCADE)
- `question_id` → `questions.id` (ON DELETE CASCADE)

---

### 3.7 考试表 (exams)

发布的考试实例。

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | INTEGER | PK, AUTO_INCREMENT | 主键 |
| title | VARCHAR(500) | NOT NULL | 考试标题 |
| paper_id | INTEGER | FK → papers.id, NOT NULL | 使用的试卷 |
| start_time | DATETIME | NULL | 开始时间 |
| end_time | DATETIME | NULL | 结束时间 |
| duration_minutes | INTEGER | NOT NULL, DEFAULT 60 | 考试时长(分钟) |
| published_by | INTEGER | FK → users.id, NOT NULL | 发布者 |
| status | ENUM | NOT NULL, INDEX, DEFAULT 'draft' | 考试状态 |
| created_at | DATETIME | NOT NULL | 创建时间 |
| updated_at | DATETIME | NOT NULL | 更新时间 |

**考试状态枚举 (ExamStatus):**
- `draft` - 草稿
- `published` - 已发布
- `closed` - 已关闭

---

### 3.8 答题记录表 (attempts)

学生的考试答题记录。

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | INTEGER | PK, AUTO_INCREMENT | 主键 |
| exam_id | INTEGER | FK → exams.id, NOT NULL | 考试ID |
| student_id | INTEGER | FK → users.id, NOT NULL | 学生ID |
| started_at | DATETIME | NOT NULL | 开始答题时间 |
| submitted_at | DATETIME | NULL | 提交时间 |
| total_score | INTEGER | NULL | 总得分 |
| status | ENUM | NOT NULL, INDEX, DEFAULT 'in_progress' | 答题状态 |
| created_at | DATETIME | NOT NULL | 创建时间 |
| updated_at | DATETIME | NOT NULL | 更新时间 |

**答题状态枚举 (AttemptStatus):**
- `in_progress` - 答题中
- `submitted` - 已提交
- `graded` - 已评分

---

### 3.9 答案详情表 (attempt_answers)

学生每道题的答案和评分。

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | INTEGER | PK, AUTO_INCREMENT | 主键 |
| attempt_id | INTEGER | FK → attempts.id, NOT NULL | 答题记录ID |
| question_id | INTEGER | FK → questions.id, NOT NULL | 题目ID |
| student_answer | JSON | NULL | 学生答案 |
| is_correct | BOOLEAN | NULL | 是否正确 |
| score | INTEGER | NULL | 得分 |
| feedback | TEXT | NULL | AI评语/反馈 |
| time_spent_seconds | INTEGER | NULL | 答题耗时(秒) |
| created_at | DATETIME | NOT NULL | 创建时间 |
| updated_at | DATETIME | NOT NULL | 更新时间 |

---

### 3.10 LLM调用日志表 (llm_logs)

记录所有LLM API调用，用于监控和调试。

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | INTEGER | PK, AUTO_INCREMENT | 主键 |
| user_id | INTEGER | FK → users.id, NULL | 调用用户 |
| scene | ENUM | NOT NULL, INDEX | 使用场景 |
| model | VARCHAR(100) | NOT NULL | 模型名称 |
| provider | VARCHAR(50) | NOT NULL | 服务商 |
| prompt_tokens | INTEGER | NULL | 提示词Token数 |
| completion_tokens | INTEGER | NULL | 生成Token数 |
| latency_ms | INTEGER | NULL | 响应延迟(毫秒) |
| status | ENUM | NOT NULL, INDEX | 调用状态 |
| error_message | TEXT | NULL | 错误信息 |
| request_summary | VARCHAR(500) | NULL | 请求摘要 |
| created_at | DATETIME | NOT NULL | 创建时间 |
| updated_at | DATETIME | NOT NULL | 更新时间 |

**场景枚举 (LLMScene):**
- `generate` - 题目生成
- `review` - 题目审核
- `grade` - 答案评分
- `other` - 其他

**状态枚举 (LLMStatus):**
- `success` - 成功
- `failed` - 失败
- `timeout` - 超时

---

## 4. 索引设计

| 表名 | 索引字段 | 索引类型 | 说明 |
|------|----------|----------|------|
| users | email | UNIQUE | 邮箱唯一索引 |
| courses | name | NORMAL | 课程名称检索 |
| knowledge_points | name | NORMAL | 知识点名称检索 |
| questions | type | NORMAL | 按题型筛选 |
| questions | status | NORMAL | 按状态筛选 |
| exams | status | NORMAL | 按状态筛选 |
| attempts | status | NORMAL | 按状态筛选 |
| llm_logs | scene | NORMAL | 按场景筛选 |
| llm_logs | status | NORMAL | 按状态筛选 |

---

## 5. 通用字段说明

所有表都包含以下时间戳字段（通过 `TimestampMixin` 混入）:

| 字段名 | 类型 | 说明 |
|--------|------|------|
| created_at | DATETIME | 记录创建时间，自动填充 |
| updated_at | DATETIME | 记录更新时间，自动更新 |

---

## 6. 数据完整性约束

### 6.1 级联删除规则

| 父表 | 子表 | 删除行为 |
|------|------|----------|
| users | courses | CASCADE |
| users | attempts | CASCADE |
| users | llm_logs | SET NULL |
| courses | knowledge_points | CASCADE |
| courses | questions | CASCADE |
| knowledge_points | questions | SET NULL |
| knowledge_points | knowledge_points (children) | CASCADE |
| papers | paper_questions | CASCADE |
| papers | exams | CASCADE |
| questions | paper_questions | CASCADE |
| exams | attempts | CASCADE |
| attempts | attempt_answers | CASCADE |

### 6.2 业务约束

1. 用户邮箱必须唯一
2. 题目难度范围: 1-5
3. 试卷总分默认: 100
4. 考试时长默认: 60分钟
5. Token过期时间: 7天 (10080分钟)

---

## 7. 附录

### 7.1 数据库初始化

```python
from app.db import init_db

async def startup():
    await init_db()  # 自动创建所有表
```

### 7.2 模型文件位置

```
Back-end/app/models/
├── __init__.py       # 模型导出
├── user.py           # 用户模型
├── course.py         # 课程和知识点模型
├── question.py       # 题目、试卷模型
├── exam.py           # 考试、答题记录模型
└── llm_log.py        # LLM日志模型
```

---

*文档由本小姐精心整理，笨蛋们要好好看懂哦！(￣▽￣)／*
