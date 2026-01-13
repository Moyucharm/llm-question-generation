# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

QGen 是一个基于AI的智能出题与在线考试系统前端，使用 React 19、TypeScript 和 Vite 构建。

核心功能：
- AI驱动的题目生成（三阶段质量控制流水线）
- 题库管理（CRUD、导入导出）
- 在线考试系统（创建、发布、参加、自动评分）
- 课程与知识点管理（树形结构）
- 流式生成与批改（SSE实时反馈）
- 虚拟化渲染日志面板

## Technology Stack

| 技术 | 版本 | 用途 |
|------|------|------|
| React | 19.1 | UI框架 |
| TypeScript | 5.8 | 类型系统 |
| Vite | 7.0 | 构建工具 |
| Zustand | 5.0 | 状态管理 |
| TailwindCSS | 4.x | 样式框架 |
| React Window | 1.8 | 虚拟化渲染 |
| Axios | 1.13 | HTTP客户端 |
| Lucide React | 0.532 | 图标库 |

## Project Structure

```
src/
├── components/                      # 可复用UI组件
│   ├── Layout/                      # 仪表板布局
│   │   ├── DashboardLayout.tsx     # 主布局容器
│   │   ├── Sidebar.tsx             # 左侧导航栏
│   │   ├── TopBar.tsx              # 顶部导航栏
│   │   ├── UserDropdown.tsx        # 用户下拉菜单
│   │   └── PageContainer.tsx       # 内容区容器
│   ├── UI/                          # 基础UI组件
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Avatar.tsx
│   │   ├── Spinner.tsx
│   │   ├── Modal.tsx
│   │   ├── ConfirmModal.tsx
│   │   └── InputModal.tsx
│   ├── Course/                      # 课程相关
│   │   ├── CourseList.tsx
│   │   └── KnowledgePointTree.tsx
│   ├── Question/                    # 题目渲染
│   │   ├── QuestionRenderer.tsx
│   │   ├── StreamingQuestionRenderer.tsx
│   │   └── questions/              # 各题型组件
│   ├── LogPanel/                    # 日志面板系统
│   │   ├── LogPanelProvider.tsx
│   │   ├── components/
│   │   ├── optimized/              # 虚拟化优化版
│   │   └── hooks/
│   └── TimeRecorder/                # 计时功能
│
├── pages/                           # 页面模块
│   ├── auth/                        # 认证页面
│   │   ├── LoginPage.tsx
│   │   ├── RegisterPage.tsx
│   │   └── components/
│   ├── generation/                  # AI出题页
│   │   ├── index.tsx
│   │   └── components/
│   │       ├── GenerationForm.tsx
│   │       ├── CourseKnowledgeSelector.tsx
│   │       └── PresetModal.tsx
│   ├── course/                      # 课程管理
│   │   └── CourseManagementPage.tsx
│   ├── question-bank/               # 题库管理
│   │   ├── QuestionBankPage.tsx
│   │   ├── QuestionEditModal.tsx
│   │   └── QuestionImportModal.tsx
│   ├── exam/                        # 考试系统
│   │   ├── ExamListPage.tsx        # 考试列表
│   │   ├── CreateExamPage.tsx      # 创建考试
│   │   ├── ExamDetailPage.tsx      # 考试详情
│   │   └── TakeExamPage.tsx        # 学生答题
│   ├── quiz/                        # 答题页
│   │   ├── index.tsx
│   │   ├── streaming.tsx
│   │   └── components/
│   └── result/                      # 结果页
│       ├── index.tsx
│       └── components/
│
├── stores/                          # Zustand状态管理
│   ├── useAppStore.ts              # 主应用状态
│   ├── useAuthStore.ts             # 认证状态
│   ├── useCourseStore.ts           # 课程状态
│   ├── useExamStore.ts             # 考试状态
│   ├── useLogStore.ts              # 日志状态
│   ├── timeRecorderStore.ts        # 计时器状态
│   ├── generationActions.ts        # 生成相关actions
│   ├── answeringActions.ts         # 答题相关actions
│   └── gradingActions.ts           # 批改相关actions
│
├── services/                        # API服务层
│   ├── authService.ts              # 认证API
│   ├── courseService.ts            # 课程API
│   ├── examService.ts              # 考试API
│   ├── questionBankService.ts      # 题库API
│   └── types.ts                    # 类型定义
│
├── llm/                             # LLM集成层
│   ├── api/                        # API客户端
│   │   ├── client.ts
│   │   ├── config.ts
│   │   └── streamProcessor.ts
│   ├── services/                   # 业务服务
│   │   ├── quizGenerationService.ts
│   │   └── quizGradingService.ts
│   ├── prompt/                     # Prompt模板
│   └── utils/                      # 工具函数
│       ├── json/                   # JSON解析
│       └── stream/                 # 流处理
│
├── types/                           # TypeScript类型
│   ├── index.ts                    # 题目、答题等类型
│   ├── course.ts                   # 课程类型
│   └── exam.ts                     # 考试类型
│
├── router/
│   └── AppRouter.tsx               # 状态驱动路由
│
├── hooks/                           # 自定义Hooks
├── utils/                           # 工具函数
└── config/                          # 配置
```

## Common Development Commands

```bash
pnpm dev          # 启动开发服务器 (端口5173)
pnpm build        # 构建生产版本
pnpm check        # 代码检查 (ESLint + TypeScript)
pnpm format       # 格式化代码 (Prettier)
pnpm lint:fix     # 自动修复ESLint问题
```

## Architecture Overview

### State Management (状态管理)

使用 Zustand 进行模块化状态管理：

| Store | 说明 |
|-------|------|
| `useAppStore` | 主应用状态 (页面、题目、答案) |
| `useAuthStore` | 认证状态 (用户、Token) |
| `useCourseStore` | 课程与知识点 |
| `useExamStore` | 考试状态 |
| `useLogStore` | 日志系统 |

### Authentication (认证系统)

- JWT Token 认证
- Token 存储在 localStorage
- 未登录自动跳转登录页
- API请求自动携带 Authorization header

### Routing (路由)

状态驱动路由，根据 `currentPage` 自动切换：

| 页面状态 | 页面 |
|----------|------|
| `dashboard` | 仪表板首页 |
| `generation` | AI出题 |
| `courses` | 课程管理 |
| `question-bank` | 题库管理 |
| `exams` | 考试列表 |
| `exam-create` | 创建考试 |
| `exam-detail` | 考试详情 |
| `take-exam` | 参加考试 |
| `quiz` / `streaming-quiz` | 答题页 |
| `result` | 结果页 |

### LLM Integration (LLM集成)

所有LLM调用通过后端API转发：

- `/api/llm/chat` - 通用对话
- `/api/llm/chat/stream` - 流式对话 (SSE)
- `/api/questions/generate/stream` - 流式生成题目

SSE响应格式：
```json
{"content": "部分内容", "done": false}
{"content": "", "done": true}
```

### Dashboard Layout (仪表板布局)

- `DashboardLayout` - 主容器
- `Sidebar` - 左侧导航 (w-64, 深色)
- `TopBar` - 顶部栏 (h-16)
- `PageContainer` - 内容区 (浅灰背景)

设计风格：
- 浅灰背景 (`bg-gray-100`) + 白色卡片
- 蓝色主题色 (`blue-600`)
- 圆角卡片 + 轻阴影

## 功能模块

### 题库管理 (Question Bank)

| 文件 | 说明 |
|------|------|
| `pages/question-bank/QuestionBankPage.tsx` | 题目列表，支持搜索筛选 |
| `pages/question-bank/QuestionEditModal.tsx` | 编辑题目弹窗 |
| `pages/question-bank/QuestionImportModal.tsx` | 导入JSON弹窗 |
| `services/questionBankService.ts` | API封装 |

功能：
- 题目CRUD操作
- 按类型/课程/知识点筛选
- JSON格式导入导出
- AI生成题目自动保存

### 考试系统 (Exam)

| 文件 | 说明 |
|------|------|
| `pages/exam/ExamListPage.tsx` | 考试列表 (教师/学生视图) |
| `pages/exam/CreateExamPage.tsx` | 创建考试表单 |
| `pages/exam/ExamDetailPage.tsx` | 考试详情与管理 |
| `pages/exam/TakeExamPage.tsx` | 学生答题界面 |
| `stores/useExamStore.ts` | 考试状态 |
| `services/examService.ts` | API封装 |
| `types/exam.ts` | 类型定义 |

考试状态流转：
```
draft (草稿) → published (已发布) → closed (已关闭)
```

答题状态流转：
```
in_progress (进行中) → submitted (已提交) → graded (已批改)
```

### 课程管理 (Course)

| 文件 | 说明 |
|------|------|
| `pages/course/CourseManagementPage.tsx` | 课程管理页 |
| `components/Course/CourseList.tsx` | 课程列表 |
| `components/Course/KnowledgePointTree.tsx` | 知识点树 |
| `stores/useCourseStore.ts` | 课程状态 |
| `services/courseService.ts` | API封装 |

知识点支持树形结构：
- 父子层级关系
- 拖拽排序
- 批量操作

### AI出题 (Generation)

| 文件 | 说明 |
|------|------|
| `pages/generation/index.tsx` | 出题主页 |
| `pages/generation/components/GenerationForm.tsx` | 出题表单 |
| `pages/generation/components/CourseKnowledgeSelector.tsx` | 课程/知识点选择器 |
| `pages/generation/components/PresetModal.tsx` | 预设管理 |
| `stores/generationActions.ts` | 生成逻辑 |

支持题型：
- 单选题 (single)
- 多选题 (multiple)
- 填空题 (blank)
- 简答题 (short)

## Development Guidelines

### Code Quality

- TypeScript 严格模式
- ESLint + Prettier 代码规范
- Husky git hooks

### Performance

- React Window 虚拟化长列表
- React.memo / useMemo / useCallback 优化
- 流式渲染减少等待
- 代码分割按需加载

### 后端集成

开发环境：
- Vite 代理 `/api` 到 `http://localhost:8000`
- 需先启动后端服务

```bash
# 终端1: 启动后端
cd ../Back-end && venv\Scripts\activate && uvicorn app.main:app --reload

# 终端2: 启动前端
pnpm dev
```

### API密钥安全

- **禁止** 在前端代码中存储API密钥
- 所有LLM调用通过后端转发
- 使用JWT Token认证

## 快捷键

| 快捷键 | 功能 |
|--------|------|
| `J` / `K` | 上下切换题目 |
| `Shift + ?` | 显示快捷键帮助 |
| `Ctrl + L` | 切换日志面板 |
