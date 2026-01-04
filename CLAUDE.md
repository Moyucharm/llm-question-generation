# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

**基于LLM的智能出题与在线考试系统** - 本科毕业设计项目

核心创新：**三阶段题目质量控制流水线** (Generator → Validator → Reviewer)

| 模块 | 功能 |
|------|------|
| 教师端 | AI智能出题、题目审核、考试发布、成绩统计 |
| 学生端 | 在线答题、AI智能批改、错题本、薄弱点分析 |
| 系统侧 | 用户鉴权、数据持久化、LLM多模型封装 |

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 19 + TypeScript 5.8 + Vite 7 + Zustand 5 + TailwindCSS 4 |
| 后端 | FastAPI + SQLAlchemy 2.0 + SQLite (WAL) + JWT |
| LLM | DeepSeek / Qwen / GLM (Provider抽象) |

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
├── Front-end/              # React前端 (QuAIz)
│   ├── src/
│   │   ├── components/     # UI组件 (Question/, LogPanel/, TimeRecorder/)
│   │   ├── pages/          # 页面 (生成、答题、结果)
│   │   ├── stores/         # Zustand状态 (useAppStore, logStore/)
│   │   ├── llm/            # LLM集成层 (api/, services/, prompt/)
│   │   └── router/         # 基于状态的路由
│   └── CLAUDE.md           # 前端详细文档
│
├── Back-end/               # FastAPI后端
│   ├── app/
│   │   ├── main.py         # 应用入口
│   │   ├── api/            # 路由 (auth, llm, questions)
│   │   ├── models/         # 数据库模型 (11张表)
│   │   ├── services/       # 业务逻辑 (生成流水线、LLM服务)
│   │   └── core/llm/       # Provider抽象 (DeepSeek/Qwen/GLM)
│   └── README.md           # 后端API文档
│
└── docs/
    └── DATABASE_DESIGN.md  # 数据库设计文档
```

## 核心架构概念

### 前端状态路由

应用基于 `appState` 自动切换页面：
- `generation` → 题目生成页
- `streaming-quiz` → 流式生成中
- `quiz` → 答题页
- `result` → 结果页

### 后端三阶段流水线

```
Generator (LLM生成) → Validator (规则校验) → Reviewer (AI自审)
                            ↓                      ↓
                       REJECTED              APPROVED / NEEDS_REVIEW
```

- **Generator**: 调用LLM生成题目JSON
- **Validator**: 代码校验格式、答案、去重
- **Reviewer**: LLM审核事实正确性、歧义，可尝试修复一次

### LLM Provider抽象

```python
class BaseLLMProvider(ABC):
    async def chat(self, messages, **kwargs) -> str
    async def chat_stream(self, messages, **kwargs) -> AsyncGenerator
```

支持 DeepSeek/Qwen/GLM，通过 `.env` 配置 `LLM_PROVIDER` 切换。

## API端点概览

| 模块 | 端点前缀 | 状态 |
|------|----------|------|
| 认证 | `/api/auth` | ✅ 注册/登录/用户信息 |
| LLM | `/api/llm` | ✅ 通用对话/流式对话 |
| 题目生成 | `/api/questions` | ✅ 完整流水线/快速生成/流式 |
| 课程管理 | `/api/courses` | 🚧 待实现 |
| 考试管理 | `/api/exams` | 🚧 待实现 |
| AI批改 | `/api/grading` | 🚧 待实现 |

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

- ✅ 后端: 认证 + LLM封装 + 题目生成流水线
- ✅ 前端LLM层: 已改造为调用后端API
- 🚧 当前任务: 前端认证系统 (登录/注册页面)
- 📋 后续: 课程管理、考试系统、AI批改、学习分析

## 下一步任务：前端认证系统

为前端添加完整的用户认证系统，使用户能够登录后使用LLM功能。

### 需要实现

| 文件 | 说明 |
|------|------|
| `src/pages/LoginPage.tsx` | 登录页面 |
| `src/pages/RegisterPage.tsx` | 注册页面 (可选合并) |
| `src/stores/useAuthStore.ts` | 认证状态 (user, token, isLoggedIn) |
| `src/services/authService.ts` | 封装后端认证API调用 |
| `src/router/AppRouter.tsx` | 路由改造：未登录显示登录页 |

### 后端API参考

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/auth/register` | POST | 用户注册 |
| `/api/auth/login` | POST | 用户登录 (返回JWT) |
| `/api/auth/me` | GET | 获取当前用户信息 |

### 验收标准

- [ ] 用户可以注册新账号
- [ ] 用户可以登录并获取Token
- [ ] Token存储在localStorage
- [ ] 登录后可以正常生成题目 (调用真实LLM)
- [ ] 未登录时显示登录提示
