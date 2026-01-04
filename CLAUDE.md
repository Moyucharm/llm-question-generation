# CLAUDE.md

本文件为Claude Code提供项目开发指导。

## 项目概述

这是一个**基于LLM的智能出题与在线考试系统**的本科毕业设计项目,旨在实现:

- **教师端**: AI智能出题、题目质量审核、考试发布、成绩统计
- **学生端**: 在线答题、AI智能批改、错题本、薄弱点分析
- **系统侧**: 用户鉴权、数据持久化、LLM调用封装、日志审计

### 核心创新点

1. **三阶段题目质量控制流水线**: Generator(生成) → Validator(规则校验) → Reviewer(AI自审)
2. **多模型协同**: 支持不同模型用于生成、审题、批改
3. **知识点驱动**: 基于知识点的薄弱点统计与学习分析
4. **流式体验**: 实时流式生成与批改,提升用户体验

## 技术栈

### 前端 (Front-end/)
- **框架**: React 19 + TypeScript 5.8
- **构建工具**: Vite 7
- **状态管理**: Zustand 5
- **样式**: TailwindCSS 4
- **虚拟化**: React Window (支持大量数据渲染)
- **图标**: Lucide React

**特点**:
- 纯前端QuAIz项目,已实现完整的AI出题、答题、批改流程
- 具备流式生成、虚拟化日志、智能时间记录等优秀体验
- **需改造**: 移除前端直连LLM,改为调用后端API

### 后端 (Back-end/)
- **框架**: FastAPI (Python)
- **数据库**: SQLite (开启WAL模式)
- **ORM**: SQLModel / SQLAlchemy
- **认证**: JWT (访问令牌)
- **密码**: bcrypt
- **异步任务**: FastAPI BackgroundTasks

**已实现** ✅:
- 用户注册/登录/角色鉴权 (教师/学生/管理员)
- 数据库模型 (11张表完整设计)
- LLM调用封装 (DeepSeek/Qwen/GLM多模型Provider)
- 题目生成质量控制流水线 (Generator → Validator → Reviewer)
- LLM调用日志记录

**待实现** 🚧:
- 课程/知识点/题库/试卷/考试管理CRUD
- AI批改与学习分析
- 错题本与薄弱点统计

### 部署
- **容器化**: Docker + docker-compose
- **反向代理**: Nginx
  - `/` → 前端静态文件
  - `/api` → 后端FastAPI
  - `/api/stream` → SSE流式接口

## 项目结构

```
bishe/
├── Front-end/              # 前端项目 (QuAIz)
│   ├── src/
│   │   ├── components/    # 可复用组件 (题目、日志、时间记录等)
│   │   ├── pages/         # 页面 (生成、答题、结果)
│   │   ├── stores/        # Zustand状态管理
│   │   ├── llm/          # LLM集成层 (需改造为调用后端API)
│   │   ├── types/        # TypeScript类型定义
│   │   └── ...
│   └── CLAUDE.md         # 前端项目上下文文档
│
├── Back-end/              # 后端项目 (FastAPI) - 待开发
│   ├── app/
│   │   ├── main.py       # FastAPI应用入口
│   │   ├── config.py     # 配置管理
│   │   ├── models/       # 数据库模型
│   │   ├── schemas/      # Pydantic schemas
│   │   ├── api/          # API路由
│   │   │   ├── auth.py   # 认证相关
│   │   │   ├── courses.py
│   │   │   ├── questions.py
│   │   │   ├── exams.py
│   │   │   └── analytics.py
│   │   ├── services/     # 业务逻辑层
│   │   │   ├── llm_service.py      # LLM调用服务
│   │   │   ├── generation_service.py  # 题目生成
│   │   │   ├── validation_service.py  # 题目校验
│   │   │   ├── review_service.py      # 题目审核
│   │   │   └── grading_service.py     # 批改服务
│   │   ├── core/         # 核心工具
│   │   │   ├── security.py   # JWT/密码
│   │   │   ├── deps.py       # 依赖注入
│   │   │   └── llm/          # LLM Provider抽象
│   │   └── db/           # 数据库相关
│   │       ├── session.py
│   │       └── init_db.py
│   ├── alembic/          # 数据库迁移
│   ├── tests/            # 测试
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
│
├── docker-compose.yml     # 部署配置
├── 要求.md               # 毕设详细需求文档
└── CLAUDE.md             # 本文件
```

## 数据库设计

### 核心表

1. **users** - 用户表
   - id, name, email, password_hash, role(student/teacher), created_at

2. **courses** - 课程表
   - id, name, description, teacher_id, created_at

3. **knowledge_points** - 知识点表
   - id, course_id, name, chapter, parent_id(可选层级), order

4. **questions** - 题目表
   - id, course_id, type, stem(题干), options(JSON), answer(JSON), explanation, difficulty(1-5), kp_id(知识点), score, created_by, status(draft/approved/needs_review), created_at

5. **papers** - 试卷模板
   - id, course_id, title, total_score, created_by, created_at

6. **paper_questions** - 试卷题目关联
   - paper_id, question_id, score, order

7. **exams** - 考试发布
   - id, paper_id, title, start_time, end_time, duration_min, published_by, created_at

8. **attempts** - 作答记录
   - id, exam_id, student_id, started_at, submitted_at, total_score, status(in_progress/submitted)

9. **attempt_answers** - 作答详情
   - id, attempt_id, question_id, student_answer(JSON), is_correct, score, feedback(AI批改), time_spent_sec

10. **llm_logs** - LLM调用日志
    - id, user_id, scene(generate/review/grade), model, prompt_tokens, completion_tokens, latency_ms, status, error_msg, created_at

## 核心功能模块

### 1. 用户与鉴权
- 注册/登录 (JWT token)
- 角色权限中间件 (教师/学生)
- 密码加密 (bcrypt)

### 2. 课程与知识点管理
- 教师端CRUD
- 知识点层级结构 (可选)
- CSV导入 (可选加分项)

### 3. AI出题流水线 (核心创新)

**三阶段质量控制**:

#### Stage 1: Generator (生成器)
- 接收: 课程、知识点、难度、题型、数量
- 调用: LLM生成题目JSON
- 约束: 强制JSON Schema输出,明确字段要求
- 返回: 题目数组

#### Stage 2: Validator (规则校验)
代码实现的规则校验:
- JSON格式校验
- 单选: 答案在选项内且唯一
- 多选: 答案集合非空且都在选项内
- 填空: 空数量匹配答案数量
- 简答: 提供评分要点(rubric)
- 去重检测: 题干哈希/完全重复

#### Stage 3: Reviewer (AI自审)
- 接收: 题目+答案+解析+知识点+难度
- 调用: Reviewer模型(可与Generator不同)
- 输出:
  - `is_correct`: true/false
  - `issues`: [事实错误/答案不唯一/表述歧义/难度不符/...]
  - `fixed_question`: 修正版(若有问题)
- 策略:
  - 不通过: 尝试修复一次
  - 仍失败: 标记`status=needs_review`,进入人工审核池

### 4. 题目Schema (Pydantic)

统一结构:
```python
class Question(BaseModel):
    type: QuestionType  # single/multiple/blank/short
    stem: str          # 题干
    options: Optional[List[str]]  # 选项(单选/多选)
    answer: Union[int, List[int], List[str], str]  # 答案(根据题型)
    explanation: str   # 解析
    knowledge_point_id: int
    difficulty: int    # 1-5
    score: int
```

### 5. 考试发布与作答
- 教师: 发布考试(时间限制、可见范围)
- 学生: 开始考试、作答、自动保存、交卷
- 计时器、题目导航、进度追踪

### 6. AI批改
- 客观题: 规则判分
- 简答题: LLM批改(输出分数+建议)
- 结果页: 逐题得分+总分+反馈

### 7. 学习分析
- 错题本: 按知识点聚合
- 薄弱点: 知识点维度统计(题数、正确率、得分率、平均用时)
- 教师端: 班级统计(分数分布、薄弱点排行)

### 8. 日志与审计
- LLM调用日志: 场景、模型、耗时、token数、状态
- 系统日志: 操作记录、错误追踪

## LLM集成策略

### Provider抽象层

```python
class ModelProvider(ABC):
    @abstractmethod
    async def chat(self, prompt: str, stream: bool = False):
        pass

    @property
    @abstractmethod
    def model_name(self) -> str:
        pass
```

### 多模型支持
- **生成**: DeepSeek / Qwen / GLM (配置选择)
- **审题**: 可切换到另一个模型(体现多模型协同)
- **批改**: 独立选择模型

### API Key安全
- ⚠️ **关键**: Key只放后端环境变量
- ⚠️ **禁止**: 前端永远不直接调用模型厂商接口
- ⚠️ **改造**: 前端需将所有LLM直连改为`/api/llm/*`

## 开发原则

### KISS (简单至上)
- 追求代码和设计的极致简洁
- 拒绝不必要的复杂性
- 优先选择最直观的解决方案

### YAGNI (精益求精)
- 仅实现当前明确所需的功能
- 抵制过度设计和未来特性预留
- 删除未使用的代码和依赖

### DRY (杜绝重复)
- 自动识别重复代码模式
- 主动建议抽象和复用
- 统一相似功能的实现方式

### SOLID原则
- **S**: 确保单一职责,拆分过大的组件
- **O**: 设计可扩展接口,避免修改现有代码
- **L**: 保证子类型可替换父类型
- **I**: 接口专一,避免"胖接口"
- **D**: 依赖抽象而非具体实现

## 开发里程碑

### 第1阶段: 基础搭建 (1-2周) ✅ 已完成
- [x] 理解需求与前端项目
- [x] 后端FastAPI框架搭建
- [x] SQLite连接与基础表创建 (11张表)
- [x] 前后端能通过`/health`接口通信

### 第2阶段: 用户与权限 (1周) ✅ 已完成
- [x] 注册/登录/JWT (7天有效期)
- [x] 角色权限中间件 (学生/教师/管理员)
- [ ] 课程/知识点CRUD

### 第3阶段: 出题核心 (2-3周) ⭐核心创新 ✅ 已完成
- [x] LLM调用封装 (DeepSeek/Qwen/GLM多Provider)
- [x] 题目Schema + Validator
- [x] Generator → Validator → Reviewer流水线
- [ ] 教师端出题配置与审核界面

### 第4阶段: 考试闭环 (2周)
- [ ] 考试发布
- [ ] 学生答题(自动保存)
- [ ] AI批改(客观题+主观题)
- [ ] 结果展示

### 第5阶段: 统计分析 (1周)
- [ ] 错题本
- [ ] 薄弱点统计
- [ ] 教师端班级统计

### 第6阶段: 前端改造 (1-2周)
- [ ] 移除前端LLM直连
- [ ] 对接后端API
- [ ] 添加登录/角色切换
- [ ] 添加课程/知识点管理页

### 第7阶段: 部署与收尾 (1周)
- [ ] Docker化
- [ ] Nginx反代
- [ ] 云端部署
- [ ] 演示数据准备

## 风险与降级方案

### 1. LLM输出不合规
- **降级**: 格式修复prompt一次 → 仍失败标记重试

### 2. 题目事实错误/答案不唯一
- **降级**: Reviewer纠错一次 → 仍失败进入人工审核池

### 3. 调用超时/接口不稳定
- **降级**: 切备用模型 / 提示重试 / 日志记录

### 4. API Key泄露风险
- **必须**: Key只放后端环境变量,前端永远不直接调用

## 代码规范

### 后端 (Python/FastAPI)
- 使用Type Hints (类型注解)
- Pydantic进行数据校验
- 遵循PEP 8代码风格
- 异步优先 (async/await)
- 错误处理要明确 (HTTPException)

### 前端 (TypeScript/React)
- 严格TypeScript模式
- 组件遵循单一职责
- Hook封装业务逻辑
- 使用React.memo/useMemo/useCallback优化
- 遵循ESLint规范

### Git提交
- 遵循Conventional Commits规范
- 每个功能块独立提交
- 提交信息清晰描述变更

## 重要注意事项

⚠️ **危险操作确认**:
- 数据库删除/批量修改
- git commit/push
- 系统配置修改
- 生产环境操作

⚠️ **禁止自动执行**:
- 未经用户明确要求,不要自动进行git提交
- 不要主动创建文档文件(*.md)除非明确要求

⚠️ **API Key安全**:
- Key只能存在后端环境变量
- 前端不允许出现任何API Key
- 前端必须通过后端API调用LLM

## 开发指令模板

### Ticket模板
使用Ticket驱动开发,每个Ticket包含:
- 标题: 一句话描述
- 目标/用户故事: 用户能做什么
- 接口契约: API定义
- 数据模型: 表/字段设计
- 验收标准: 如何验证完成
- 约束: 不做什么

### 子任务顺序
1. 先定接口与数据结构 (不写大段代码)
2. 后端实现 (只改后端)
3. 前端对接 (只改前端)
4. 联调修bug (原样贴错误信息)

## 相关文档

- [要求.md](./要求.md) - 完整毕设需求与规划
- [Front-end/CLAUDE.md](./Front-end/CLAUDE.md) - 前端QuAIz项目上下文
- [Front-end/README.md](./Front-end/README.md) - QuAIz项目文档

## 当前状态

- ✅ 前端: QuAIz项目完整,待改造对接后端
- ✅ 后端: 核心功能已实现 (认证 + LLM + 题目生成流水线)
- 📋 计划: 完成考试闭环与前端改造

---

**最后更新**: 2026-01-04
**项目状态**: 第3阶段完成 (出题核心)
**下一步**: 测试题目生成API / 课程管理CRUD / 前端对接
