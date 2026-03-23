# Promptor

Promptor 是一个本地运行的 Prompt 编排与管理工具，面向使用 Cursor、Claude Code、Cline、Roo 等 AI coding agent 的开发者。

它不是聊天工具，也不是简单的 prompt 润色器。它是一个 **Prompt Operating System**：把模糊需求转换成高质量的结构化 prompt、阶段化 workflow、上下文摘要和记忆状态，减少 token 浪费，提高 agent 产出质量。

每个 Session 提供两大核心能力：
- **阶段工作流** — 按 Research → Plan → Annotation → Implement → Verify 流程生成高质量 prompt
- **Prompt 精炼** — 基于当前会话的记忆、文件和上下文，把粗糙 prompt 转化为结构化 prompt


## 核心特性

- **阶段化工作流** — 固定 8 阶段流程（Research → Plan → Annotation Loop → Implement → Verify + 辅助阶段），每个阶段有明确的产物文件和不可变要求
- **Prompt 编排** — 7 层合约体系（Behavior / Task / Stage / Output / Failure / Repair / Variant），内置 14 个 prompt 模板
- **Base-preserving 优化** — 优化 prompt 时保留阶段基础模板的核心要求，仅做聚焦和上下文增强，不做自由重写
- **文件驱动** — 上传 research.md / plan.md / test-report.md 等阶段产物文件，自动纳入 prompt 生成上下文
- **两模式工作区** — 每个阶段提供「优化 Prompt」和「审阅阶段文件」两种工作模式
- **会话级 Prompt 精炼** — Prompt Refiner 与工作流共享同一会话的记忆、文件和上下文，不是孤立功能
- **记忆系统** — 4 层记忆（Raw History / Rolling Summary / Pinned Facts / Stage Artifacts），支持上下文压缩
- **弱模型兼容** — 所有模板为低能力模型优化，输出结构固定、校验修复自动化
- **本地优先** — 无后端，数据存储在浏览器 IndexedDB，API key 不离开本地

## 快速开始

### 环境要求

- Node.js >= 18
- npm >= 9

### 安装与运行

```bash
# 克隆仓库
git clone https://github.com/LiuYZ2024/Promptor.git
cd Promptor

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

浏览器打开 `http://localhost:5173` 即可使用。

### 首次使用

1. 进入 **Settings** 页面
2. 选择 Provider Preset（OpenAI / DeepSeek / GLM / Gemini / Custom）
3. 填入 API Key
4. 点击 Test Connection 验证连接
5. 回到主页创建新 Session，进入统一工作区。在工作区中切换「阶段工作流」和「Prompt 精炼」两种模式

## 可用命令

```bash
npm run dev        # 启动开发服务器
npm run build      # 生产构建（先 typecheck 再 build）
npm run preview    # 预览生产构建
npm run test       # 运行单元测试
npm run test:watch # 监听模式运行测试
npm run typecheck  # TypeScript 类型检查
```

## 项目结构

```
src/
├── components/       # UI 组件
│   ├── layout/       # Sidebar、DbProvider
│   ├── session/      # DiscussionPanel
│   └── workflow/     # StageWorkArea、SessionRefinerPanel、StageCard、FileUploadPanel、NewSessionModal
├── hooks/            # React Hooks（sessions、settings、workflowFiles）
├── lib/
│   ├── llm/          # LLM client abstraction（streaming、error handling）
│   ├── prompts/      # 7 层合约系统、14 个模板、解析器、校验修复管线
│   ├── storage/      # Dexie 数据库 schema
│   ├── token-estimation/
│   ├── utils/
│   └── workflow/     # 阶段配置、优化 prompt 构建、tuning parser
├── pages/            # 页面（Session、Settings、Workflow）
└── types/            # TypeScript 类型定义
tests/                # Vitest 单元测试（448 tests）
```

## 工作流说明

Promptor 的标准工作流遵循 Boris-style vibe coding 流程：

1. **Research** — 让 agent 读懂代码库，产出 `research.md`
2. **Plan** — 基于 research 产出详细实现方案 `plan.md`
3. **Annotation Loop** — 在 plan.md 中加批注，agent 逐条处理并更新
4. **Implement** — plan 审定后，生成执行 prompt 驱动 agent 实现
5. **Verify** — 运行验证，产出 `test-report.md`

辅助阶段：Requirement（需求整理）、Discussion（方案讨论）、Solidify（经验沉淀）

辅以会话级 **Prompt 精炼** 能力：在任何阶段都可以切换到精炼模式，利用当前会话的对话历史、固定事实、上传文件和滚动摘要，把粗糙 prompt 转化为高质量结构化 prompt。

核心原则：**Promptor 生成 prompt，用户复制给外部 agent 执行。Promptor 不直接执行任务。**

