# QGen - 智能出题与在线考试系统

基于 LLM 的智能出题与在线考试系统，本科毕业设计项目。

## 核心特性

- **AI 智能出题** - 基于大语言模型自动生成高质量题目
- **三阶段质量控制** - Generator → Validator → Reviewer 流水线
- **多题型支持** - 单选、多选、填空、简答
- **AI 智能批改** - 自动批改 + 详细反馈
- **流式体验** - 实时流式生成，提升用户体验

## 技术栈

| 模块 | 技术 |
|------|------|
| 前端 | React 19 + TypeScript + Vite + Zustand + TailwindCSS |
| 后端 | FastAPI + SQLAlchemy + SQLite + JWT |
| LLM | DeepSeek / Qwen / GLM (多模型支持) |

## 快速开始

### 后端

```bash
cd Back-end
python -m venv venv
venv\Scripts\activate          # Windows
pip install -r requirements.txt
cp .env.example .env           # 配置 API 密钥
uvicorn app.main:app --reload  # 启动服务 (端口 8000)
```

### 前端

```bash
cd Front-end
pnpm install
pnpm dev                       # 启动服务 (端口 3000)
```

访问 http://localhost:3000 即可使用。

## 项目结构

```
bishe/
├── Front-end/          # React 前端
├── Back-end/           # FastAPI 后端
├── docs/               # 项目文档
└── CLAUDE.md           # AI 开发指南
```

## 文档

- [前端开发文档](Front-end/CLAUDE.md)
- [后端 API 文档](Back-end/README.md)
- [数据库设计](docs/DATABASE_DESIGN.md)

## 开发状态

- ✅ 用户认证系统
- ✅ LLM 调用封装
- ✅ 题目生成流水线
- ✅ 前端仪表板 UI
- ✅ 课程与知识点管理
- ✅ 出题集成知识点选择
- ✅ 考试系统（完整版）
  - 教师端：创建/编辑/添加题目/发布/关闭
  - 学生端：开始考试/答题/提交/查看结果
  - 自定义确认弹窗、状态追踪、倒计时
- ✅ 题库管理
  - AI 生成题目保存到题库
  - 题目 CRUD（查看、编辑、删除）
  - 题目导入导出（JSON 格式）
  - 权限控制：用户只能查看自己创建的题目
- 📋 学习分析

## License

MIT
