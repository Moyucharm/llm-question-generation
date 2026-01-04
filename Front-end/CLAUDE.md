# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

QuAIz is a modern AI-driven online quiz generation and grading system built with React 19, TypeScript, and Vite. The application allows users to generate personalized quizzes through AI, take the quizzes online, and receive automated grading with detailed feedback.

Key features include:
- AI-powered quiz generation with multiple question types
- Online quiz-taking with responsive design
- Automated AI grading with detailed feedback
- Streaming generation and grading for real-time user experience
- Real-time logging system with virtualized rendering for performance
- Time tracking functionality

## Technology Stack

- React 19 with TypeScript
- Vite 7 for build tooling
- Zustand 5 for state management
- TailwindCSS 4 for styling
- React Window for virtualized rendering
- Lucide React for icons
- ESLint 9 and Prettier for code quality

## Project Structure

```
src/
├── components/
│   ├── Layout/        # 仪表板布局组件
│   │   ├── DashboardLayout.tsx   # 主布局
│   │   ├── Sidebar.tsx           # 左侧导航栏
│   │   ├── TopBar.tsx            # 顶部导航栏
│   │   ├── UserDropdown.tsx      # 用户下拉菜单
│   │   └── PageContainer.tsx     # 内容区容器
│   ├── UI/            # 基础UI组件
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Avatar.tsx
│   │   └── Spinner.tsx
│   ├── Question/      # 题目相关组件
│   ├── LogPanel/      # 日志面板
│   ├── TimeRecorder/  # 时间记录
│   └── FloatingButton/
├── pages/
│   ├── auth/          # 认证页面
│   │   ├── LoginPage.tsx
│   │   ├── RegisterPage.tsx
│   │   └── components/
│   ├── generation/    # 题目生成
│   ├── quiz/          # 答题
│   └── result/        # 结果
├── stores/            # Zustand状态管理
│   ├── useAppStore.ts
│   └── useAuthStore.ts
├── services/          # API服务层
│   ├── authService.ts
│   └── types.ts
├── llm/               # LLM集成层
├── types/             # TypeScript类型定义
├── hooks/             # 自定义Hooks
├── utils/             # 工具函数
├── config/            # 配置
└── router/            # 路由
```

## Common Development Commands

- `pnpm dev` - Start the development server
- `pnpm build` - Build for production
- `pnpm check` - Run ESLint and TypeScript type checking
- `pnpm format` - Format code with Prettier
- `pnpm lint:fix` - Auto-fix ESLint issues

## Architecture Overview

### State Management
The application uses Zustand for state management with a modular approach:
- Main store in `src/stores/useAppStore.ts`
- **Authentication store** in `src/stores/useAuthStore.ts` - 用户登录状态、Token管理
- Modular actions in separate files (`generationActions.ts`, `answeringActions.ts`, `gradingActions.ts`)
- Time tracking in `timeRecorderStore.ts`
- Logging system in `logStore/`

### Authentication System (认证系统)
应用使用JWT进行用户认证:
- `useAuthStore` - 管理用户状态 (user, token, isLoggedIn)
- `authService` - 封装后端认证API调用
- Token存储在localStorage
- 未登录用户显示登录页面

### Dashboard Layout (仪表板布局)
应用采用现代仪表板布局设计:
- `DashboardLayout` - 主布局容器
- `Sidebar` - 左侧固定导航栏 (w-64, 深色主题)
- `TopBar` - 顶部导航栏 (h-16) + 用户下拉菜单
- `PageContainer` - 内容区容器 (浅灰背景)

设计风格:
- 浅灰背景 (`bg-gray-100`) + 白色卡片
- 蓝色主题色 (`blue-600`)
- 圆角卡片 + 轻阴影

### Routing
The application uses a state-based routing system in `src/router/AppRouter.tsx` that automatically switches pages based on the application state:
1. Generation page (default)
2. Quiz page (when quiz is generated)
3. Streaming quiz page (during generation)
4. Result page (after submission)

### Component Organization
Components are organized into feature-based modules:
- Questions: `src/components/Question/`
- Logging: `src/components/LogPanel/`
- Time tracking: `src/components/TimeRecorder/`
- Floating UI: `src/components/FloatingButton/`

### LLM Integration (通过后端API)
The LLM integration is abstracted in the `src/llm/` directory:
- **API clients** in `src/llm/api/` - 已改造为调用后端API而非直连LLM厂商
- **Business services** in `src/llm/services/`
- **Prompt templates** in `src/llm/prompt/`

**重要改造说明** (2026-01-04):
- 所有LLM请求通过后端 `/api/llm/*` 端点转发
- API密钥由后端管理，前端不再存储敏感信息
- 使用JWT Token进行身份认证
- SSE流式响应格式适配后端格式 `{"content": "...", "done": false/true}`

### 后端API集成
开发环境配置:
- Vite开发服务器代理 `/api` 请求到 `http://localhost:8000`
- 需要先启动后端服务器: `cd ../Back-end && uvicorn app.main:app --reload`
- 用户需要登录后才能使用LLM功能

## Development Guidelines

### Code Quality
- TypeScript is used throughout with strict type checking
- ESLint and Prettier are configured for consistent code style
- Husky is used for git hooks to enforce code quality

### Performance Considerations
- Virtualized rendering with React Window for large data sets
- React.memo, useMemo, and useCallback for optimization
- Streaming data handling for real-time user experience