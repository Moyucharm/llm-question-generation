# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

QGen 是一个基于 LLM 的智能出题与在线考试系统（本科毕业设计项目）。

**核心特性：**
- AI 智能出题 - 三阶段质量控制流水线 (Generator → Validator → Reviewer)
- 多题型支持 - 单选、多选、填空、简答
- 在线考试 - 创建/发布/参加/自动评分
- 流式体验 - SSE 实时生成与批改

**技术栈：**
| 模块 | 技术 |
|------|------|
| 前端 | React 19 + TypeScript + Vite 7 + Zustand + TailwindCSS 4 |
| 后端 | FastAPI + SQLAlchemy 2.0 (异步) + SQLite + JWT |
| LLM | DeepSeek / Qwen / GLM (多模型 Provider 抽象) |

## 常用开发命令

### 后端 (Back-end/)
```bash
# 激活虚拟环境
source venv/bin/activate        # Linux/Mac
venv\Scripts\activate           # Windows

# 启动开发服务器 (端口 8000)
uvicorn app.main:app --reload

# 代码格式化与检查
black app/
ruff check app/

# 运行测试
pytest
```

### 前端 (Front-end/)
```bash
pnpm dev          # 启动开发服务器 (端口 5173)
pnpm build        # 构建生产版本 (tsc + vite build)
pnpm check        # 代码检查 (ESLint + TypeScript)
pnpm format       # 格式化代码 (Prettier)
pnpm lint:fix     # 自动修复 ESLint 问题
```

### 同时启动前后端
```bash
# 终端1: 后端
cd Back-end && source venv/bin/activate && uvicorn app.main:app --reload

# 终端2: 前端 (Vite 代理 /api 到 localhost:8000)
cd Front-end && pnpm dev
```

## 核心架构

### 三阶段出题流水线 (后端核心)

```
Generator (LLM生成) → Validator (规则校验) → Reviewer (AI自审)
     ↓                      ↓                      ↓
  生成题目JSON         格式/答案校验           质量/正确性审核
                           ↓                      ↓
                      rejected (格式错误)    approved / needs_review
```

关键文件：
- `Back-end/app/services/generation_pipeline.py` - 流水线编排
- `Back-end/app/services/generator_service.py` - LLM 生成器
- `Back-end/app/services/validator_service.py` - 规则校验器
- `Back-end/app/services/reviewer_service.py` - AI 自审服务

### LLM Provider 抽象 (后端)

```
LLMService (统一接口)
    ├── DeepSeekProvider
    ├── QwenProvider
    └── GLMProvider
```

关键文件：`Back-end/app/core/llm/base.py` (抽象基类)

### 状态管理 (前端)

使用 Zustand 模块化管理：
- `useAppStore` - 主应用状态 (页面、题目、答案)
- `useAuthStore` - 认证状态 (用户、Token)
- `useCourseStore` - 课程与知识点
- `useExamStore` - 考试状态

### API 路由 (后端)

| 模块 | 前缀 | 说明 |
|------|------|------|
| 认证 | `/api/auth` | 注册/登录/用户信息 |
| LLM | `/api/llm` | 通用对话/流式对话 |
| 题目生成 | `/api/questions` | 完整流水线/快速/流式生成 |
| 课程 | `/api/courses` | 课程与知识点 CRUD |
| 考试 | `/api/exams` | 考试管理/答题/评分 |
| 题库 | `/api/question-bank` | 题目 CRUD/导入导出 |

API 文档：http://localhost:8000/api/docs (Swagger UI)

---

## 开发规范

### 1. 调研优先（强制）

修改代码前必须：
1. **检索相关代码** - 使用 `mcp__ace-tool__search_context` 或 LSP/Grep/Glob
2. **识别复用机会** - 查找已有相似功能，优先复用而非重写
3. **追踪调用链** - 使用 LSP `findReferences` 分析影响范围

### 2. 修改前三问

1. 这是真问题还是臆想？（拒绝过度设计）
2. 有现成代码可复用吗？（优先复用）
3. 会破坏什么调用关系？（保护依赖链）

### 3. 红线原则

- 禁止 copy-paste 重复代码
- 禁止破坏现有功能
- 禁止对错误方案妥协
- 禁止盲目执行不加思考
- 关键路径必须有错误处理

### 4. 知识获取（强制）

遇到不熟悉的知识，必须联网搜索，严禁猜测：
- 通用搜索：`WebSearch` 或 `mcp__exa__web_search_exa`
- 库文档：`mcp__context7__resolve-library-id` → `mcp__context7__get-library-docs`
- 开源项目：`mcp__mcp-deepwiki__deepwiki_fetch`

---

## 任务分级

| 级别 | 判断标准 | 处理方式 |
|------|----------|----------|
| 简单 | 单文件、明确需求、< 20 行改动 | 直接执行 |
| 中等 | 2-5 个文件、需要调研 | 简要说明方案 → 执行 |
| 复杂 | 架构变更、多模块、不确定性高 | 完整规划流程 |

### 复杂任务流程

1. **RESEARCH** - 调研代码，不提建议
2. **PLAN** - 列出方案，等待用户确认
3. **EXECUTE** - 严格按计划执行
4. **REVIEW** - 完成后自检

触发方式：用户说 "进入 X 模式" 或任务符合复杂标准时自动启用

### 复杂问题深度思考

触发场景：多步骤推理、架构设计、疑难调试、方案对比
强制工具：`mcp__sequential-thinking__sequentialthinking`

---

## 工具使用指南

| 场景 | 推荐工具 |
|------|----------|
| 代码语义检索 | mcp__ace-tool__search_context |
| 精确字符串/正则查找 | Grep |
| 文件名模式匹配 | Glob |
| 符号定义/引用跳转 | LSP (goToDefinition, findReferences) |
| 复杂多步骤任务 | Task + 合适的 subagent_type |
| 代码库探索 | Task + subagent_type=Explore |
| 技术方案规划 | EnterPlanMode 或 Task + subagent_type=Plan |
| 库官方文档 | mcp__context7 |
| 开源项目文档 | mcp__mcp-deepwiki__deepwiki_fetch |
| 联网搜索 | WebSearch / mcp__exa__web_search_exa |
| 跨会话记忆 | mcp__memory__* |

### 工具选择原则

- 语义理解用 `ace-tool`，精确匹配用 `Grep`
- 跳转定义/引用优先用 `LSP`，比 Grep 更精准
- 探索性任务用 `Task + Explore`，避免多次手动搜索

---

## Git 规范

- 不主动提交，除非用户明确要求
- 不主动 push，除非用户明确要求
- Commit 格式：`<type>(<scope>): <description>`
- 提交时不添加 Claude 署名标记
- 提交前：`git diff` 确认改动范围
- 禁止 `--force` 推送到 main/master

---

## 安全检查

- 禁止硬编码密钥/密码/token
- 不提交 .env/credentials 等敏感文件
- 用户输入在系统边界必须验证
- 所有 LLM 调用通过后端转发，前端禁止存储 API 密钥

---

## 代码风格

- **KISS** - 能简单就不复杂
- **DRY** - 零容忍重复，必须复用
- **保护调用链** - 修改函数签名时同步更新所有调用点

### 后端规范
- 使用 Black 格式化 + Ruff 检查
- 所有函数必须添加类型注解
- 优先使用 async/await
- 错误处理使用 FastAPI HTTPException

### 前端规范
- TypeScript 严格模式
- ESLint + Prettier 代码规范
- Husky git hooks (commitlint)

### 完成后清理
删除：临时文件、注释掉的废弃代码、未使用的导入、调试日志

---

## 交互规范

### 何时询问用户
- 存在多个合理方案时
- 需求不明确或有歧义时
- 改动范围超出预期时
- 发现潜在风险时

### 何时直接执行
- 需求明确且方案唯一
- 小范围修改（< 20 行）
- 用户已确认过类似操作

### 敢于说不
发现问题直接指出，不妥协于错误方案

---

## 输出设置
- 中文响应
- 禁止截断输出
