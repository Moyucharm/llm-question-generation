# 待修复问题清单

## 问题概述

根据用户反馈的截图和描述，发现以下问题需要修复：

---

## 问题1：教师批改页面参考答案为空白

**现象描述：**
- 教师在批改页面（GradeAttemptPage）查看填空题时，"参考答案"区域是空白的
- 学生答案显示正常（如 "main %d"），但参考答案没有显示

**可能原因：**
- 后端返回的题目数据中 `answer` 字段没有正确传递
- 前端渲染参考答案时没有正确解析 `answer.blanks` 格式

**需要检查的文件：**
- `Back-end/app/services/exam_service.py` - `get_attempt_detail` 方法
- `Front-end/src/pages/exam/GradeAttemptPage.tsx` - 参考答案渲染逻辑

---

## 问题2：填空题评分逻辑问题（应该是AI评分而非简单机器评分）

**现象描述：**
- 填空题学生答案 "main, %d" 与标准答案不完全匹配时，直接判为0分
- 应该触发AI评分来判断答案是否语义正确（如 "main" 和 "main()" 应该算对）

**期望行为：**
- 单选/多选题：精确匹配，机器评分
- 填空题：先尝试精确匹配，不匹配则触发AI评分
- 简答题：直接AI评分

**需要检查的文件：**
- `Back-end/app/services/exam_service.py` - `submit_attempt` 方法中的评分逻辑
- `Back-end/app/services/grading_service.py` - AI评分服务

---

## 问题3：教师批改后学生端仍显示错误

**现象描述：**
- 教师在批改页面将填空题评为满分（10/10）
- 学生在结果页面（ExamResultPage）查看时，该题仍显示红色❌错误标记
- 分数显示正确（10/10），但状态图标显示错误

**可能原因：**
- 学生结果页面判断正确/错误的逻辑有问题
- 可能只看 `is_correct` 字段，没有考虑 `score` 字段
- 教师评分后没有更新 `is_correct` 字段

**需要检查的文件：**
- `Front-end/src/pages/exam/ExamResultPage.tsx` - 正确/错误状态判断逻辑
- `Back-end/app/services/exam_service.py` - 教师评分时是否更新 `is_correct`

---

## 问题4：填空题多空格显示问题（之前已修复，需验证）

**现象描述：**
- 填空题有多个空格时，学生答题页面只显示一个输入框

**状态：** 之前已修复，需要验证是否生效

---

## 修复计划

### 第一步：修复参考答案显示
1. 检查后端 `get_attempt_detail` 是否返回 `answer` 字段
2. 检查前端 `GradeAttemptPage` 参考答案渲染逻辑

### 第二步：修复填空题AI评分
1. 检查 `submit_attempt` 中填空题的评分逻辑
2. 确保不匹配时调用 `GradingService` 进行AI评分

### 第三步：修复教师评分后学生端显示
1. 检查教师评分API是否更新 `is_correct` 字段
2. 检查学生结果页面的状态判断逻辑

### 第四步：验证之前的修复
1. 验证填空题多空格显示
2. 验证计时器重置问题
3. 验证键盘快捷键兼容性

---

## 相关文件清单

### 后端
- `Back-end/app/services/exam_service.py`
- `Back-end/app/services/grading_service.py`
- `Back-end/app/api/exams.py`

### 前端
- `Front-end/src/pages/exam/GradeAttemptPage.tsx`
- `Front-end/src/pages/exam/ExamResultPage.tsx`
- `Front-end/src/pages/exam/TakeExamPage.tsx`

---

## 修复进度

- [x] 问题1：教师批改页面参考答案为空白
  - 修复了 `GradeAttemptPage.tsx` 中参考答案渲染逻辑，兼容 `{ blanks: [...] }` 和 `{ correct: [...] }` 两种格式
- [x] 问题2：填空题评分逻辑问题
  - 修复了 `exam_service.py` 中 `_check_answer` 方法，兼容两种答案格式
  - 修复了 `_auto_grade_attempt` 方法中填空题和简答题的答案格式获取
- [x] 问题3：教师批改后学生端仍显示错误
  - 修复了 `ExamResultPage.tsx` 中的状态判断逻辑，优先根据 `score` 字段判断正确/错误
  - 添加了 `isAnswerCorrect`、`isAnswerWrong`、`isAnswerPending` 辅助函数
  - 修复了参考答案显示格式，兼容多种答案格式
- [ ] 问题4：验证之前的修复

---

## 新发现的问题（2024-01-13）

### 问题5：填空题部分正确但全判错

**现象描述：**
- 填空题有多个空，学生部分答对（如第一空对、第二空错）
- 系统直接判为0分，没有给部分分
- 例如：答案 "corst, int"，正确答案可能是 "const, int"，第二空正确但得0分

**期望行为：**
- 填空题应该按空计分，每个空独立评分
- 部分正确应该给部分分数

**需要修改的文件：**
- `Back-end/app/services/exam_service.py` - `_auto_grade_attempt` 方法中填空题评分逻辑

**状态：** ✅ 已修复
- 重写了填空题评分逻辑，每个空独立评分
- 精确匹配的空给满分，不匹配的空尝试AI评分
- 部分正确的题目 `is_correct` 设为 `None`，前端显示为"部分正确"

### 问题6：简答题AI批改未触发

**现象描述：**
- 简答题提交后显示 "--/10"，没有AI评分
- AI批改服务可能没有正确初始化或调用失败

**需要检查的文件：**
- `Back-end/app/services/exam_service.py` - AI服务创建和调用
- `Back-end/app/services/grading_service.py` - AI批改服务
- 后端日志查看错误信息

**状态：** ✅ 已修复
- 修复了 `create_grading_service()` 中 `LLMService()` 的初始化（之前错误地传入了 settings 参数）
- 修复了 `grade_short_answer` 和 `grade_fill_blank` 方法，使用 `simple_chat(prompt)` 而不是 `chat([...])`

### 问题7：缺少"部分正确"状态显示

**现象描述：**
- 目前只有"正确"、"错误"、"待批改"三种状态
- 对于部分得分的题目（如填空题答对一半），显示为"待批改"状态
- 应该添加"部分正确"状态

**需要修改的文件：**
- `Front-end/src/pages/exam/ExamResultPage.tsx` - 添加部分正确状态判断和显示
- `Front-end/src/pages/exam/GradeAttemptPage.tsx` - 同步修改

**状态：** ✅ 已修复
- 添加了 `isAnswerPartial` 辅助函数
- 添加了橙色的"部分对"统计卡片
- 答题卡片支持橙色边框和 AlertTriangle 图标

---

## 修复计划（更新）

### 第一步：修复填空题部分得分
1. 修改 `_auto_grade_attempt` 中填空题评分逻辑
2. 每个空独立评分，按比例计算总分
3. 精确匹配的空给满分，不匹配的空调用AI评分

### 第二步：修复AI批改服务
1. 检查后端日志，确认AI服务是否正常
2. 添加更多调试日志
3. 确保简答题和填空题都能触发AI评分

### 第三步：添加部分正确状态
1. 在前端添加 `isAnswerPartial` 判断函数
2. 添加黄色/橙色的"部分正确"状态显示
3. 更新统计信息

---

## 待验证任务（2026-01-13）

### 问题8：提交考试时编码错误（待验证）

**现象描述：**
- 学生提交考试时报错：`'gbk' codec can't encode character '\u2713' in position 21: illegal multibyte sequence`
- 这是 Windows 控制台编码问题，print 语句中的 Unicode 字符无法在 GBK 编码下输出

**已执行的修复：**
- 删除了 `exam_service.py` 中 `_auto_grade_attempt` 方法里所有的调试 print 语句
- 这些 print 语句包含了 Unicode 字符（如 ✓、✗）和中文字符，在 Windows GBK 环境下会报错

**状态：** ⏳ 待验证
- 代码已修改，但尚未测试
- 下次启动后端服务后需要重新测试提交考试功能

### 下次测试步骤

1. **启动服务**
   ```bash
   # 后端
   cd Back-end && venv\Scripts\activate && uvicorn app.main:app --reload

   # 前端
   cd Front-end && pnpm dev
   ```

2. **测试提交考试**
   - 用学生账号登录（student@test.com）
   - 参加一个包含填空题和简答题的考试
   - 提交考试，观察是否还有编码错误

3. **验证评分功能**
   - 检查填空题是否按空独立评分
   - 检查简答题是否有 AI 评分
   - 检查"部分正确"状态是否正确显示

---

## 本次修改总结（2026-01-13）

### 后端修改

| 文件 | 修改内容 |
|------|----------|
| `exam_service.py` | 重写填空题评分逻辑（每空独立评分）、删除调试 print 语句 |
| `grading_service.py` | 修复 LLMService 初始化、使用 simple_chat 方法 |
| `exams.py` | 添加教师批改相关 API |
| `exam.py` (models) | 添加 AI 评分相关字段 |
| `exam.py` (schemas) | 添加批改相关请求/响应模型 |

### 前端修改

| 文件 | 修改内容 |
|------|----------|
| `ExamResultPage.tsx` | 添加"部分正确"状态显示（橙色） |
| `GradeAttemptPage.tsx` | 教师批改页面 |
| `ExamDetailPage.tsx` | 考试详情页面增强 |
| `TakeExamPage.tsx` | 学生答题页面优化 |
| `examService.ts` | 添加批改相关 API 调用 |
| `exam.ts` (types) | 添加批改相关类型定义 |

### 新增文件

| 文件 | 说明 |
|------|------|
| `Back-end/app/services/grading_service.py` | AI 批改服务 |
| `Front-end/src/pages/exam/ExamResultPage.tsx` | 学生考试结果页面 |
| `Front-end/src/pages/exam/GradeAttemptPage.tsx` | 教师批改页面 |

