# 开发者扩展指南

本指南面向需要在本项目上进行二次开发与扩展的开发者，内容涵盖目录结构、页面与路由扩展、题型扩展、LLM 服务扩展、流式渲染管线、全局状态、性能优化、代码规范与常见问题等。

## 快速开始

- Node.js: 推荐 LTS（18+）。Windows 若遇到 PATH 问题，可将 `C:\Program Files\nodejs` 加入环境变量后重启终端。
- 包管理器: 推荐 pnpm（仓库包含 `pnpm-lock.yaml`）。

```bash
# 安装依赖
pnpm install

# 启动开发服务（默认 5173）
pnpm dev

# 构建与本地预览
pnpm build
pnpm preview

# 代码检查（ESLint + TypeScript）
pnpm check
```

## 技术栈概览

- React 19 + TypeScript 5 + Vite 7
- 状态管理: Zustand（`src/stores`）
- UI/样式: Tailwind CSS v4
- 列表性能: react-window 虚拟化
- 流式处理: 自研流处理工具（`src/llm/utils/stream` 与 `src/llm/api/streamProcessor.ts`）

## 目录结构与职责

- `src/main.tsx` / `src/App.tsx`: 应用入口与根组件。
- `src/router/AppRouter.tsx`: 路由注册与页面组织。
- `src/pages/*`: 页面层（生成、答题、结果等）。
- `src/components/*`: 可复用组件（`LogPanel`、`Question`、`TimeRecorder`、`FloatingButton` 等）。
- `src/llm/*`: LLM 服务层（API 客户端、服务实现、Prompt、流处理与 JSON 解析）。
- `src/stores/*`: 全局状态管理与业务动作。
- `src/config/app.ts`: 应用配置与常量。
- `src/styles/index.css` + `tailwind.config.js`: 全局样式与 Tailwind 配置。
- `src/types/*`: 共享类型。
- `src/utils/*`: 通用工具（预设存储、时间工具等）。

## 路由与页面扩展

当前前端路由分为两层：

1. **应用级（URL → 页面）**：`src/App.tsx` 使用 History API 维护 URL（不依赖 React Router），负责仪表盘、课程、题库、考试等“业务页面”的进入与返回。
2. **出题闭环（状态 → 页面）**：`src/router/AppRouter.tsx` 根据出题状态机（生成/答题/结果）自动切换页面，并同步 URL 到 `/generation`、`/quiz`、`/result`。

新增页面时按类型选择接入点：

- **仪表盘侧边栏类页面**（例如：新增 `/analytics`）：
  1) 在 `src/pages/` 下创建页面目录与入口组件  
  2) 在 `src/App.tsx` 中补充 `applyPathname()` 与 `getPathForPage()` 的映射  
  3) 在 `src/components/Layout/Sidebar.tsx` 中加入菜单项（如需要）

- **出题闭环内页面**（例如：新增新的答题态）：
  1) 在 `src/pages/` 下创建页面组件  
  2) 在 `src/router/AppRouter.tsx` 的状态分支中接入并同步 URL  

如需共享状态或日志，请在页面中使用相应的 store 或 `LogPanelProvider`。

建议：页面内将 UI 组件抽离至 `pages/<page>/components/`；将业务逻辑抽离至 `pages/<page>/hooks/`，保持关注点分离。

## 组件开发规范

- 组件目录内提供 `index.ts` 聚合导出，便于按需引用。
- 拆分展示组件与容器组件：尽量让展示组件无状态、仅通过 props 渲染。
- 大型滚动或日志类组件优先引入虚拟化，避免长列表全量渲染。
- 提供可测试的最小接口：类型声明放在 `src/types/` 或组件内 `types.ts`。

## 扩展题型（Question）

目标：在 `src/components/Question/questions/` 新增题型并接入渲染与流式管线。

步骤：

1. 创建新文件（例如 `ProgrammingFillIn.tsx`）并实现题型组件（受控输入、受控选项、或只读渲染）。
2. 在 `src/components/Question/questions/index.ts` 中导出该题型。
3. 若需要在统一渲染器中分发：
   - 非流式：更新 `QuestionRenderer.tsx` 的分发逻辑。
   - 流式：更新 `StreamingQuestionRenderer.tsx` 或优化版 `OptimizedStreamingQuestionRenderer.tsx` 的类型映射。
4. 若 LLM 需要产出该题型的结构化字段：更新 `src/llm/utils/json/questionExtractor.ts` 与 `validator.ts` 的规则，确保解析/校验通过。

注意：

- 组件对外 props 尽量使用稳定的领域模型（题干、选项、答案、解析、元信息等）。
- 对用户输入使用受控组件，配合上层 store 统一提交/判分。

## 流式渲染与数据管线

- 入口：`src/llm/api/client.ts` 发起请求；`streamProcessor.ts` 处理 SSE/分块文本。
- 管线：`src/llm/utils/stream/*`（`requestExecutor.ts`、`processor.ts`、`textProcessor.ts`、`types.ts`）。
- 页面/组件订阅：`hooks/useOptimizedStreaming.ts`、`components/Question/StreamingQuestionRenderer.tsx` 等。

扩展方式：

1. 新的流协议或分片格式：在 `stream/processor.ts` 扩展解析器与归一化类型（`types.ts`）。
2. 新的 UI 呈现策略：在 `OptimizedStreamingQuestionRenderer.tsx` 中使用批量 setState、`React.memo`、`useDeferredValue` 等减少重渲染。
3. 大日志：`LogPanel/optimized/VirtualizedLogList.tsx` 使用 `react-window` 实现虚拟化。

## LLM 服务扩展

典型场景：接入新的模型/服务端或替换为自建 API。

步骤：

1. 在 `src/llm/services/` 新增服务，建议继承 `baseService.ts`：
   - 约定输入（Prompt/参数）与输出（标准化结果/流）。
2. 在 `src/llm/services/serviceFactory.ts` 注册新服务，并在 `src/llm/api/config.ts` 暴露配置开关（如模型名、端点）。
3. 若服务通信特性不同（如 WebSocket/SSE 自定义事件）：
   - 扩展 `src/llm/api/client.ts` 与 `streamProcessor.ts`，并在 `src/llm/utils/stream/*` 衔接。
4. Prompt 层：在 `src/llm/prompt/` 增加对应的提示词构造器，复用公共段落，减少重复。

解析与校验：

- `src/llm/utils/json/parser.ts` 解析结构化 JSON 片段；
- `validator.ts` 校验字段完整性与约束；
- `questionExtractor.ts` 将内容转为内部题目模型，供渲染器使用。

## 全局状态（Zustand）

- 入口 store：`src/stores/useAppStore.ts`。
- 业务域：
  - 生成（`src/stores/generation/*`）
  - 日志（`src/stores/logStore/*`）
  - 计时器（`src/stores/timeRecorderStore.ts`）
  - 动作层（`answeringActions.ts`、`generationActions.ts`、`gradingActions.ts`）

扩展新状态模块：

1. 在 `src/stores/<feature>/` 创建 `types.ts`、`stateManager.ts`、`actions.ts`，分离类型、状态、动作。
2. 在 `src/stores/index.ts` 或上层聚合处导出公共 API。
3. UI 层通过选择器订阅最小必要片段，避免不必要重渲染。

## 日志与调试（LogPanel）

- Provider：`src/components/LogPanel/LogPanelProvider.tsx`。
- 组件：`LogPanel.tsx`、`LogEntry.tsx`、`FloatingToggle.tsx` 等。
- 优化：`optimized/OptimizedLogPanel.tsx`、`VirtualizedLogList.tsx`。

使用建议：

- 在页面根处包裹 `LogPanelProvider`，在重要请求点调用日志动作或 `requestLogger`。
- 大量日志时启用虚拟化版本，保持滚动性能与交互顺畅。

## 性能优化清单

- 长列表使用虚拟化（react-window）。
- 流式 UI 批处理状态更新、拆分组件、使用 `React.memo` 与选择器最小化订阅范围。
- 避免在高频渲染中创建新函数/对象；必要时使用 `useMemo`/`useCallback`。
- Store 中批量更新、尽量将业务计算移出渲染路径。
- 节流/防抖用户输入与滚动事件。

## 代码规范与提交

- ESLint/Prettier 已配置（`eslint.config.js`）。
- `pnpm format` 自动格式化；`pnpm check` 进行 ESLint + TS 编译检查。
- commitlint + husky：约束提交信息规范（见 `commitlint.config.cjs`）。

## 测试与验证

- 示例测试：`src/test/timeRecorderTest.ts`。
- 建议：针对复杂逻辑（解析、校验、流处理）补充单元测试。

## 部署与环境

- 生产构建：`pnpm build` 产出 `dist/`。
- 预览：`pnpm preview` 本地静态服务验证。
- Vercel/静态托管：参考仓库 `vercel.json` 与 Vite 静态部署方案。

## 常见问题（Windows）

- `node/npm/pnpm` 找不到：将 `C:\Program Files\nodejs`（或用户目录安装路径）加入 PATH，重启终端。
- `corepack` 不可用：先用 `npm i -g pnpm`；或升级 Node。
- 安装报 EPERM：关闭占用 `node_modules` 的编辑器/杀毒软件，或以管理员身份重试；必要时删除 `node_modules` 与 `package-lock.json` 重新安装。
- 端口占用：`pnpm dev -- --port 5174`。

## 扩展清单（Checklist）

新增功能前后快速自检：

- 是否将 UI 与业务逻辑解耦（组件/Hook/Store 分层）？
- 是否在 `index.ts` 聚合导出，避免深层 import？
- 是否补充/更新了类型、解析、校验与渲染映射？
- 是否考虑了流式渲染与性能影响（虚拟化、memo、批处理）？
- 是否通过 `pnpm check` 与基本运行验证？

如需进一步帮助，可在 `docs/` 目录添加功能专题文档，或在对应模块目录的 `README.md` 中补充实现细节与边界情况说明。


