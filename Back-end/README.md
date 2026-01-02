# LLM智能出题考试系统 - 后端

基于FastAPI的高性能异步后端服务

## 技术栈

- **框架**: FastAPI 0.115+
- **数据库**: SQLite (异步) / PostgreSQL (可选)
- **ORM**: SQLAlchemy 2.0 (异步模式)
- **认证**: JWT + bcrypt
- **Python**: 3.10+

## 快速开始

### 1. 创建虚拟环境

```bash
# Windows
python -m venv venv
venv\Scripts\activate

# Linux/Mac
python3 -m venv venv
source venv/bin/activate
```

### 2. 安装依赖

```bash
pip install -r requirements.txt
```

### 3. 配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑.env文件,配置必要的参数
# 重要: 修改SECRET_KEY和LLM API密钥
```

### 4. 启动开发服务器

```bash
# 方式1: 使用uvicorn
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# 方式2: 直接运行main.py
python -m app.main

# 方式3: 使用fastapi cli (需要安装fastapi-cli)
fastapi dev app/main.py
```

### 5. 访问API文档

- Swagger UI: http://localhost:8000/api/docs
- ReDoc: http://localhost:8000/api/redoc
- 健康检查: http://localhost:8000/health

## 项目结构

```
Back-end/
├── app/
│   ├── __init__.py           # 应用包初始化
│   ├── main.py               # FastAPI应用入口
│   ├── config.py             # 配置管理 (Pydantic Settings)
│   ├── api/                  # API路由模块
│   │   ├── __init__.py       # 路由导出
│   │   ├── deps.py           # 依赖注入 (认证、权限)
│   │   └── auth.py           # ✅ 认证路由
│   ├── models/               # SQLAlchemy数据库模型
│   │   ├── __init__.py       # 模型导出
│   │   ├── user.py           # ✅ 用户模型
│   │   ├── course.py         # ✅ 课程/知识点模型
│   │   ├── question.py       # ✅ 题目/试卷模型
│   │   ├── exam.py           # ✅ 考试/答题模型
│   │   └── llm_log.py        # ✅ LLM日志模型
│   ├── schemas/              # Pydantic请求/响应模型
│   │   ├── __init__.py       # Schema导出
│   │   └── user.py           # ✅ 用户Schema
│   ├── services/             # 业务逻辑层
│   │   ├── __init__.py       # 服务导出
│   │   └── auth.py           # ✅ 认证服务
│   ├── core/                 # 核心工具
│   │   ├── __init__.py       # 工具导出
│   │   └── security.py       # ✅ JWT/密码加密
│   └── db/                   # 数据库相关
│       ├── __init__.py       # 数据库导出
│       ├── base.py           # ✅ Base类/Mixin
│       ├── session.py        # ✅ 数据库会话
│       └── init_db.py        # ✅ 数据库初始化
├── docs/                     # 文档目录
│   └── DATABASE_DESIGN.md    # ✅ 数据库设计文档
├── tests/                    # 测试文件
├── logs/                     # 日志文件 (自动生成)
├── .env.example              # 环境变量模板
├── .env                      # 环境变量 (需创建)
├── requirements.txt          # Python依赖
├── test_auth.py              # 认证测试脚本
└── README.md                 # 本文件
```

> ✅ = 已实现 | 🚧 = 待实现

## API 端点

> 完整的数据库设计文档请参阅: [docs/DATABASE_DESIGN.md](../docs/DATABASE_DESIGN.md)

### 已实现的 API

#### 认证模块 (`/api/auth`)

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | `/api/auth/register` | 用户注册 | 否 |
| POST | `/api/auth/login` | 用户登录 (JSON) | 否 |
| POST | `/api/auth/login/form` | 用户登录 (OAuth2表单) | 否 |
| GET | `/api/auth/me` | 获取当前用户信息 | 是 |
| PUT | `/api/auth/me` | 更新用户资料 | 是 |

<details>
<summary>📝 API 请求/响应示例</summary>

**注册用户**
```bash
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "name": "测试用户",
    "password": "password123",
    "role": "student"
  }'
```

**登录获取Token**
```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

**响应示例**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "user": {
    "id": 1,
    "email": "test@example.com",
    "name": "测试用户",
    "role": "student",
    "is_active": true,
    "avatar": null,
    "bio": null,
    "created_at": "2026-01-02T10:00:00",
    "updated_at": "2026-01-02T10:00:00"
  }
}
```

**使用Token访问受保护接口**
```bash
curl http://localhost:8000/api/auth/me \
  -H "Authorization: Bearer <your_access_token>"
```

</details>

### 待实现的 API

| 模块 | 前缀 | 状态 |
|------|------|------|
| 课程管理 | `/api/courses` | 🚧 待实现 |
| 题目管理 | `/api/questions` | 🚧 待实现 |
| 试卷管理 | `/api/papers` | 🚧 待实现 |
| 考试管理 | `/api/exams` | 🚧 待实现 |
| AI出题 | `/api/generate` | 🚧 待实现 |
| 统计分析 | `/api/analytics` | 🚧 待实现 |

---

## 核心功能

### 1. 用户认证与授权 ✅
- JWT Token认证 (7天有效期)
- 角色权限控制 (学生/教师/管理员)
- bcrypt密码加密存储
- OAuth2兼容的登录接口

### 2. AI出题流水线 🚧
- **Generator**: LLM生成题目
- **Validator**: 规则校验
- **Reviewer**: AI自审

### 3. 题目管理 🚧
- 多题型支持 (单选/多选/填空/简答)
- 知识点关联
- 难度分级 (1-5级)

### 4. 考试系统 🚧
- 考试发布与时间控制
- 作答记录与自动保存
- AI智能批改

### 5. 学习分析 🚧
- 错题本
- 薄弱点统计
- 学习建议

## 开发规范

### 代码风格
- 使用Black格式化代码
- 使用Ruff进行代码检查
- 遵循PEP 8规范

### 类型注解
所有函数必须添加类型注解:
```python
async def get_user(user_id: int) -> User:
    ...
```

### 异步优先
优先使用async/await:
```python
@app.get("/users/{user_id}")
async def get_user(user_id: int):
    user = await db.get_user(user_id)
    return user
```

### 错误处理
使用FastAPI的HTTPException:
```python
from fastapi import HTTPException

if not user:
    raise HTTPException(status_code=404, detail="用户不存在")
```

## 环境变量说明

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| SECRET_KEY | JWT密钥 | (必须修改) |
| DATABASE_URL | 数据库连接 | sqlite+aiosqlite:///./app.db |
| LLM_PROVIDER | LLM提供商 | deepseek |
| DEEPSEEK_API_KEY | DeepSeek API密钥 | (需配置) |
| CORS_ORIGINS | 允许的前端域名 | ["http://localhost:5173"] |

## 常用命令

```bash
# 格式化代码
black app/

# 代码检查
ruff check app/

# 运行测试
pytest

# 查看依赖树
pip list

# 导出依赖
pip freeze > requirements.txt
```

## 数据库迁移

(待实现 Alembic)

## 部署

(待补充 Docker部署说明)

## 许可证

MIT License

---

**开发状态**: 🚧 开发中
**版本**: v1.0.0
**最后更新**: 2026-01-02
