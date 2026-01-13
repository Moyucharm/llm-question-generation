# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

**QGen - 基于LLM的智能出题与在线考试系统** - 本科毕业设计项目

核心创新：**三阶段题目质量控制流水线** (Generator → Validator → Reviewer)

| 模块 | 功能 |
|------|------|
| 教师端 | AI智能出题、题库管理、试卷组卷、考试发布、成绩统计 |
| 学生端 | 在线答题、自动评分、考试记录查看 |
| 系统侧 | 用户鉴权、数据持久化、LLM多模型封装 |

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 19.1 + TypeScript 5.8 + Vite 7.0 + Zustand 5.0 + TailwindCSS 4.1 |
| 后端 | FastAPI 0.115 + SQLAlchemy 2.0 + SQLite (aiosqlite异步) + JWT |
| LLM | DeepSeek / Qwen / GLM (Provider抽象) |
| 工具 | Husky + Commitlint + ESLint 9 + Prettier 3 + Black + Ruff |

## 常用开发命令

### 前端 (Front-end/)

```bash
cd Front-end

pnpm install          # 安装依赖
pnpm dev              # 启动开发服务器 (端口3000，自动代理/api到后端)
pnpm build            # 构建生产版本
pnpm check            # 代码检查 (ESLint + TypeScript)
pnpm format           # 格式化代码 (Prettier)
pnpm lint:fix         # 修复ESLint问题
```

### 后端 (Back-end/)

```bash
cd Back-end

# 虚拟环境
python -m venv venv
venv\Scripts\activate          # Windows
source venv/bin/activate       # Linux/Mac

pip install -r requirements.txt    # 安装依赖
cp .env.example .env               # 配置环境变量（编辑.env设置API密钥）

uvicorn app.main:app --reload      # 启动开发服务器 (端口8000)

black app/             # 代码格式化
ruff check app/        # 代码检查
pytest                 # 运行测试
```

### 同时开发前后端

```bash
# 终端1: 后端
cd Back-end && venv\Scripts\activate && uvicorn app.main:app --reload

# 终端2: 前端
cd Front-end && pnpm dev
```

前端开发服务器会自动将 `/api/*` 请求代理到 `http://localhost:8000`。

## 项目架构

```
bishe/
├── Front-end/                      # React前端 (QGen)
│   ├── src/
│   │   ├── App.tsx                 # 主应用组件（状态驱动路由）
│   │   ├── components/
│   │   │   ├── Layout/             # 仪表板布局 (7个组件)
│   │   │   │   ├── DashboardLayout.tsx   # 主容器布局
│   │   │   │   ├── Sidebar.tsx           # 左侧导航栏
│   │   │   │   ├── TopBar.tsx            # 顶部栏
│   │   │   │   └── UserDropdown.tsx      # 用户下拉菜单
│   │   │   ├── UI/                 # 基础UI组件 (10+个)
│   │   │   │   ├── Button, Card, Modal, Avatar, Spinner...
│   │   │   │   └── ConfirmModal, InputModal, LoadingScreen
│   │   │   ├── Course/             # 课程组件
│   │   │   │   ├── CourseList.tsx        # 课程列表
│   │   │   │   └── KnowledgePointTree.tsx # 知识点树
│   │   │   ├── Question/           # 题目渲染 (6个)
│   │   │   │   ├── QuestionRenderer.tsx  # 通用渲染器
│   │   │   │   ├── StreamingQuestionRenderer.tsx
│   │   │   │   └── questions/            # 各题型组件
│   │   │   ├── LogPanel/           # 日志面板 (虚拟化)
│   │   │   └── TimeRecorder/       # 计时功能
│   │   ├── pages/
│   │   │   ├── auth/               # 认证 (登录/注册)
│   │   │   ├── generation/         # AI出题 (表单/预设/预览)
│   │   │   ├── course/             # 课程管理
│   │   │   ├── question-bank/      # 题库管理 (列表/编辑/导入)
│   │   │   ├── exam/               # 考试系统 (4个页面)
│   │   │   │   ├── ExamListPage.tsx      # 考试列表 (375行)
│   │   │   │   ├── CreateExamPage.tsx    # 创建考试 (220行)
│   │   │   │   ├── ExamDetailPage.tsx    # 考试详情 (950行)
│   │   │   │   └── TakeExamPage.tsx      # 学生答题 (528行)
│   │   │   ├── quiz/               # 答题页 (流式渲染)
│   │   │   └── result/             # 结果页 (AI批改展示)
│   │   ├── stores/                 # Zustand状态管理 (20+文件)
│   │   │   ├── useAppStore.ts      # 主应用状态
│   │   │   ├── useAuthStore.ts     # 认证状态
│   │   │   ├── useCourseStore.ts   # 课程状态
│   │   │   ├── useExamStore.ts     # 考试状态
│   │   │   ├── useLogStore.ts      # 日志状态
│   │   │   └── generation/         # 生成子模块
│   │   ├── services/               # API服务层 (6个)
│   │   │   ├── authService.ts      # 认证API
│   │   │   ├── courseService.ts    # 课程API
│   │   │   ├── examService.ts      # 考试API
│   │   │   └── questionBankService.ts # 题库API
│   │   ├── llm/                    # LLM集成层
│   │   │   ├── api/                # API客户端
│   │   │   ├── services/           # 业务服务
│   │   │   └── prompt/             # Prompt模板
│   │   ├── types/                  # TypeScript类型
│   │   │   ├── index.ts            # 题目、答题类型
│   │   │   ├── course.ts           # 课程类型
│   │   │   └── exam.ts             # 考试类型
│   │   └── router/                 # 路由配置
│   └── CLAUDE.md                   # 前端详细文档
│
├── Back-end/                       # FastAPI后端
│   ├── app/
│   │   ├── main.py                 # 应用入口
│   │   ├── config.py               # Pydantic Settings配置
│   │   ├── api/                    # 路由层 (8个文件)
│   │   │   ├── deps.py             # 依赖注入（认证、权限）
│   │   │   ├── auth.py             # 认证路由
│   │   │   ├── llm.py              # LLM通用接口
│   │   │   ├── questions.py        # 题目生成
│   │   │   ├── courses.py          # 课程管理
│   │   │   ├── question_bank.py    # 题库管理
│   │   │   └── exams.py            # 考试管理
│   │   ├── models/                 # 数据库模型 (6个文件)
│   │   │   ├── user.py             # User表
│   │   │   ├── course.py           # Course + KnowledgePoint表
│   │   │   ├── question.py         # Question + Paper + PaperQuestion表
│   │   │   ├── exam.py             # Exam + Attempt + AttemptAnswer表
│   │   │   └── llm_log.py          # LLMLog表
│   │   ├── schemas/                # Pydantic请求/响应模型 (6个)
│   │   ├── services/               # 业务逻辑层 (10个)
│   │   │   ├── auth.py             # 认证服务
│   │   │   ├── llm_service.py      # LLM统一接口
│   │   │   ├── generator_service.py    # 题目生成器
│   │   │   ├── validator_service.py    # 规则校验器
│   │   │   ├── reviewer_service.py     # AI自审服务
│   │   │   ├── generation_pipeline.py  # 三阶段编排
│   │   │   ├── course_service.py       # 课程服务
│   │   │   ├── exam_service.py         # 考试服务
│   │   │   └── question_bank_service.py # 题库服务
│   │   └── core/llm/               # Provider抽象
│   │       ├── base.py             # BaseLLMProvider基类
│   │       ├── deepseek.py         # DeepSeek实现
│   │       ├── qwen.py             # Qwen实现
│   │       └── glm.py              # GLM实现
│   └── README.md                   # 后端API文档
│
└── docs/
    └── DATABASE_DESIGN.md          # 数据库设计文档
```

## 核心架构概念

### 前端页面路由

应用采用状态驱动路由，主要页面：

| 页面 | currentPage状态 | 说明 |
|------|-----------------|------|
| 仪表板 | `dashboard` | 首页，快速入口 |
| AI出题 | `generation` | 三阶段流水线出题 |
| 课程管理 | `courses` | 课程与知识点CRUD |
| 题库管理 | `question-bank` | 题目CRUD、导入导出 |
| 考试列表 | `exams` | 教师创建/学生参加 |
| 创建考试 | `exam-create` | 新建考试表单 |
| 考试详情 | `exam-detail` | 查看/编辑考试 (需要currentExamId) |
| 参加考试 | `exam-take` | 学生答题界面 (需要currentExamId) |
| 答题页 | `quiz` / `streaming-quiz` | 出题后即时答题 |
| 结果页 | `result` | AI批改结果展示 |

### 后端三阶段流水线

```
Generator (LLM生成) → Validator (规则校验) → Reviewer (AI自审)
                            ↓                      ↓
                       REJECTED              APPROVED / NEEDS_REVIEW
```

- **Generator**: 调用LLM生成题目JSON
- **Validator**: 代码校验格式、答案有效性、去重
- **Reviewer**: LLM审核事实正确性、歧义检测，可尝试修复一次

### LLM Provider抽象

```python
class BaseLLMProvider(ABC):
    async def chat(self, messages, **kwargs) -> str
    async def chat_stream(self, messages, **kwargs) -> AsyncGenerator
```

支持 DeepSeek/Qwen/GLM，通过 `.env` 配置 `LLM_PROVIDER` 切换。

### 数据库模型 (10张表)

| 表名 | 说明 |
|------|------|
| users | 用户 (student/teacher/admin角色) |
| courses | 课程 |
| knowledge_points | 知识点 (树形结构, parent_id自引用) |
| questions | 题目 (单选/多选/填空/简答, JSON存储options/answer) |
| papers | 试卷 |
| paper_questions | 试卷-题目关联 (多对多) |
| exams | 考试 (draft/published/closed状态) |
| attempts | 答题记录 (in_progress/submitted/graded状态) |
| attempt_answers | 单题答案 |
| llm_logs | LLM调用日志 |

## API端点概览

| 模块 | 端点前缀 | 状态 |
|------|----------|------|
| 认证 | `/api/auth` | ✅ 注册/登录/用户信息 |
| LLM | `/api/llm` | ✅ 通用对话/流式对话 |
| 题目生成 | `/api/questions` | ✅ 完整流水线/快速生成/流式 |
| 课程管理 | `/api/courses` | ✅ CRUD + 知识点树 |
| 题库管理 | `/api/question-bank` | ✅ CRUD + 批量导入导出 |
| 考试管理 | `/api/exams` | ✅ 完整考试生命周期 |
| AI批改 | `/api/grading` | 🚧 待实现 (主观题) |

### 考试API详情 (`/api/exams`)

| 方法 | 路径 | 角色 | 说明 |
|------|------|------|------|
| GET | `/api/exams` | 全部 | 获取考试列表 |
| POST | `/api/exams` | 教师 | 创建考试 |
| GET | `/api/exams/{id}` | 全部 | 获取考试详情 |
| PUT | `/api/exams/{id}` | 教师 | 更新考试 |
| DELETE | `/api/exams/{id}` | 教师 | 删除考试 |
| POST | `/api/exams/{id}/publish` | 教师 | 发布考试 |
| POST | `/api/exams/{id}/close` | 教师 | 关闭考试 |
| POST | `/api/exams/{id}/questions` | 教师 | 添加题目 |
| GET | `/api/exams/{id}/questions` | 全部 | 获取考试题目 |
| DELETE | `/api/exams/{id}/questions/{qid}` | 教师 | 删除题目 |
| POST | `/api/exams/{id}/start` | 学生 | 开始考试 |
| GET | `/api/exams/{id}/attempt` | 学生 | 获取答题记录 |
| POST | `/api/exams/{id}/answer` | 学生 | 保存答案 |
| POST | `/api/exams/{id}/submit` | 学生 | 提交考试 |
| GET | `/api/exams/{id}/attempts` | 教师 | 查看所有答题记录 |

API文档: http://localhost:8000/api/docs

## 重要约束

### API密钥安全 ⚠️

- **禁止**: 前端代码中出现任何API密钥
- **必须**: 所有LLM调用通过后端 `/api/llm/*` 转发
- **存储**: 密钥只能存放在后端 `.env` 文件中

### 开发原则

- **KISS**: 追求简洁，拒绝过度设计
- **YAGNI**: 只实现当前需要的功能
- **DRY**: 识别并消除重复代码

### Git操作

- 未经用户明确要求，**不要自动执行** `git commit/push`
- 遵循 Conventional Commits 规范

## 相关文档

- [Front-end/CLAUDE.md](Front-end/CLAUDE.md) - 前端详细架构与开发指南
- [Back-end/README.md](Back-end/README.md) - 后端API文档与使用说明
- [docs/DATABASE_DESIGN.md](docs/DATABASE_DESIGN.md) - 数据库设计文档

## 当前开发状态

### ✅ 已完成功能

| 模块 | 前端 | 后端 | 说明 |
|------|------|------|------|
| 用户认证 | ✅ | ✅ | JWT登录/注册/Token管理 |
| LLM封装 | ✅ | ✅ | 支持DeepSeek/Qwen/GLM切换 |
| 出题流水线 | ✅ | ✅ | 三阶段质量控制 |
| 课程管理 | ✅ | ✅ | CRUD + 知识点树形结构 |
| 题库管理 | ✅ | ✅ | 题目CRUD、导入导出JSON |
| 出题集成 | ✅ | ✅ | 选择课程/知识点出题 |
| 考试系统 | ✅ | ✅ | 创建/发布/参加/自动评分 |
| 题目渲染 | ✅ | - | 单选/多选/填空/简答 |
| 流式生成 | ✅ | ✅ | SSE实时生成和批改 |
| 日志系统 | ✅ | ✅ | 虚拟化渲染、LLM调用日志 |
| 仪表板UI | ✅ | - | 侧边栏+顶栏+卡片设计 |

### 🚧 待实现功能

| 模块 | 说明 |
|------|------|
| 试卷管理 | 试卷CRUD、从题库选题组卷 |
| AI主观题批改 | 简答题智能评分 + 反馈 |
| 学习分析 | 错题本、薄弱点分析 |
| 数据统计 | 成绩统计、学习路径可视化 |
| 数据库迁移 | Alembic迁移脚本 |
| Docker部署 | 容器化部署配置 |

## 功能模块详情

### 认证系统

| 文件 | 说明 |
|------|------|
| `Front-end/src/pages/auth/` | 登录/注册页面 |
| `Front-end/src/stores/useAuthStore.ts` | 认证状态管理 |
| `Front-end/src/services/authService.ts` | 认证API封装 |
| `Back-end/app/api/auth.py` | 认证路由 |
| `Back-end/app/services/auth.py` | 认证业务逻辑 |
| `Back-end/app/core/security.py` | JWT/密码加密 |

### 课程与知识点管理

| 文件 | 说明 |
|------|------|
| `Front-end/src/pages/course/CourseManagementPage.tsx` | 课程管理页面 |
| `Front-end/src/components/Course/CourseList.tsx` | 课程列表组件 |
| `Front-end/src/components/Course/KnowledgePointTree.tsx` | 知识点树 |
| `Front-end/src/stores/useCourseStore.ts` | 课程状态管理 |
| `Back-end/app/api/courses.py` | 课程路由 |
| `Back-end/app/models/course.py` | Course, KnowledgePoint模型 |

### 题库管理

| 文件 | 说明 |
|------|------|
| `Front-end/src/pages/question-bank/QuestionBankPage.tsx` | 题库列表 |
| `Front-end/src/pages/question-bank/QuestionEditModal.tsx` | 编辑题目 |
| `Front-end/src/pages/question-bank/QuestionImportModal.tsx` | 导入题目 |
| `Front-end/src/services/questionBankService.ts` | 题库API |
| `Back-end/app/api/question_bank.py` | 题库路由 |
| `Back-end/app/services/question_bank_service.py` | 题库业务逻辑 |

### 考试系统

| 文件 | 说明 |
|------|------|
| `Front-end/src/pages/exam/ExamListPage.tsx` | 考试列表 (教师/学生视图) |
| `Front-end/src/pages/exam/CreateExamPage.tsx` | 创建考试表单 |
| `Front-end/src/pages/exam/ExamDetailPage.tsx` | 考试详情与编辑 |
| `Front-end/src/pages/exam/TakeExamPage.tsx` | 学生答题界面 |
| `Front-end/src/stores/useExamStore.ts` | 考试状态管理 |
| `Front-end/src/services/examService.ts` | 考试API封装 |
| `Front-end/src/types/exam.ts` | 考试相关类型 |
| `Back-end/app/api/exams.py` | 考试路由 |
| `Back-end/app/models/exam.py` | Exam, Attempt, AttemptAnswer模型 |
| `Back-end/app/services/exam_service.py` | 考试业务逻辑 |
| `Back-end/app/schemas/exam.py` | 考试请求/响应模型 |

### 仪表板布局

| 文件 | 说明 |
|------|------|
| `Front-end/src/components/Layout/DashboardLayout.tsx` | 主布局容器 |
| `Front-end/src/components/Layout/Sidebar.tsx` | 左侧导航栏 |
| `Front-end/src/components/Layout/TopBar.tsx` | 顶部导航栏 |
| `Front-end/src/components/Layout/UserDropdown.tsx` | 用户下拉菜单 |
| `Front-end/src/components/Layout/PageContainer.tsx` | 内容区容器 |
| `Front-end/src/components/UI/` | Button, Card, Modal, Avatar, Spinner等 |

### 设计风格

- 浅灰背景 (`bg-gray-100`) + 白色卡片
- 左侧固定侧边栏 (w-64, 深色主题)
- 顶部导航栏 (h-16) + 用户下拉菜单
- 蓝色主题色 (`blue-600`)
- 圆角卡片 + 轻阴影
- React Window 虚拟化列表

## 前端状态管理 (Zustand)

### useAppStore - 主应用状态

管理出题 → 答题 → 批改的完整流程：
- `generation`: 题目生成状态
- `answering`: 答题状态
- `grading`: 批改状态

### useAuthStore - 认证状态

- `user`: 当前用户信息
- `isLoggedIn`: 登录状态
- `login/logout/register`: 认证操作

### useCourseStore - 课程状态

- `courses`: 课程列表
- `fetchCourses/createCourse/updateCourse/deleteCourse`
- `createKnowledgePoint/deleteKnowledgePoint`

### useExamStore - 考试状态

- `exams`: 考试列表
- `currentExam`: 当前考试详情
- `currentAttempt`: 当前答题记录
- `fetchExams/createExam/publishExam/startExam/submitExam`

### useLogStore - 日志状态

- `logs`: 日志条目 (虚拟化渲染)
- `sessions`: 流式会话
- `addLog/clearLogs/toggleVisibility`

## 技术亮点

### 前端

- **Vite 7** - 超快速构建与HMR
- **React 19** - 最新并发特性
- **TypeScript 严格模式** - 类型安全
- **Zustand** - 轻量级状态管理
- **TailwindCSS 4** - 原子化CSS
- **React Window** - 虚拟化列表渲染
- **SSE流式渲染** - 实时用户体验
- **Husky + Commitlint** - Git提交规范

### 后端

- **FastAPI异步框架** - 高性能
- **SQLAlchemy 2.0 异步ORM** - 现代数据库操作
- **JWT认证** - 安全的用户验证
- **三阶段质量流水线** - 核心创新
- **LLM Provider抽象** - 多模型支持
- **SSE流式输出** - 实时数据推送
- **CORS中间件** - 跨域请求支持

## 下一步任务：试卷管理与AI批改

### 试卷管理

| 模块 | 说明 |
|------|------|
| 后端API | `/api/papers` CRUD |
| 前端页面 | 试卷列表、组卷界面 |
| 功能 | 从题库选题组卷 |

### AI主观题批改

| 模块 | 说明 |
|------|------|
| 后端API | `/api/grading` 智能批改 |
| 前端集成 | 批改结果展示 |
| 功能 | 简答题智能评分+反馈 |

### 验收标准

- [ ] 教师可以创建/编辑/删除试卷
- [ ] 可以从题库选择题目组卷
- [ ] 简答题支持AI智能批改
- [ ] 学生可以查看批改反馈
