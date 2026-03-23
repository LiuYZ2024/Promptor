export function DocsPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <article className="prose-sm prose-neutral dark:prose-invert">
        <h1 className="mb-1 text-xl font-bold">Promptor 使用文档</h1>
        <p className="mb-8 text-sm text-muted-foreground">
          本文档面向首次使用 Promptor 的用户，帮助你快速了解产品功能和正确使用方式。
        </p>

        {/* TOC */}
        <nav className="mb-10 rounded-lg border border-border bg-muted/30 px-5 py-4">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            目录
          </div>
          <ol className="columns-2 gap-8 space-y-1 text-sm">
            <li><a href="#intro" className="text-primary hover:underline">1. 产品简介</a></li>
            <li><a href="#ui-overview" className="text-primary hover:underline">2. 界面概览</a></li>
            <li><a href="#quickstart" className="text-primary hover:underline">3. 快速开始</a></li>
            <li><a href="#session" className="text-primary hover:underline">4. Session 的使用方式</a></li>
            <li><a href="#workflow" className="text-primary hover:underline">5. 阶段工作流</a></li>
            <li><a href="#refiner" className="text-primary hover:underline">6. Prompt 精炼</a></li>
            <li><a href="#files" className="text-primary hover:underline">7. 文件与上传</a></li>
            <li><a href="#context-panel" className="text-primary hover:underline">8. 右侧上下文面板</a></li>
            <li><a href="#settings" className="text-primary hover:underline">9. 设置</a></li>
            <li><a href="#best-practices" className="text-primary hover:underline">10. 推荐用法</a></li>
            <li><a href="#faq" className="text-primary hover:underline">11. 常见问题</a></li>
          </ol>
        </nav>

        {/* 1. 产品简介 */}
        <Section id="intro" title="1. 产品简介">
          <p>
            Promptor 是一个本地运行的 Prompt 编排工具，面向使用 Cursor、Claude Code、Cline、Roo 等 AI coding agent 的开发者。
          </p>
          <p>
            它不是聊天工具，也不是通用 AI 助手。它的核心职责是：
          </p>
          <ul>
            <li>把你的模糊需求转化为高质量、结构化的 prompt</li>
            <li>引导你按阶段推进任务（Research → Plan → 批注 → 实现 → 验证）</li>
            <li>管理多轮任务中的记忆和上下文，避免 token 浪费</li>
          </ul>
          <Callout type="info">
            Promptor 生成的是给外部 agent 使用的 prompt，不是直接帮你完成任务。你需要把 Promptor 生成的 prompt 复制到 Cursor / Claude Code 等工具中执行。
          </Callout>
          <h4>它和直接使用 AI 聊天工具有什么区别？</h4>
          <p>
            直接和 AI 聊天容易出现：需求不清导致 agent 理解偏差、缺少计划导致执行混乱、历史过长导致 token 暴涨。Promptor 通过阶段化流程和结构化 prompt 模板，让你在正式执行前把需求、计划和约束准备好，从而减少返工。
          </p>
        </Section>

        {/* 2. 界面概览 */}
        <Section id="ui-overview" title="2. 界面概览">
          <h4>左侧边栏</h4>
          <p>左侧边栏包含以下内容（从上到下）：</p>
          <ul>
            <li>
              <Strong>+ New Session</Strong> — 创建新的工作会话。首次创建时会弹出流程说明弹窗
            </li>
            <li>
              <Strong>Sessions 列表</Strong> — 显示你的活跃 Session，点击可切换
            </li>
            <li>
              <Strong>⚡ Workflow</Strong> — 独立的 Workflow Builder 页面，可直接从需求生成完整工作流
            </li>
            <li>
              <Strong>📖 使用文档</Strong> — 即本文档
            </li>
            <li>
              <Strong>⚙ Settings</Strong> — 配置 LLM 提供商、API Key、模型等
            </li>
          </ul>
          <p>
            边栏左上角有折叠/展开按钮（← / →），可以收起边栏以获得更大工作区。
          </p>

          <h4>Session 工作区</h4>
          <p>
            点击任意 Session 后，中间区域会显示该 Session 的工作区。工作区从上到下依次是：
          </p>
          <ol>
            <li><Strong>Session 标题栏</Strong> — 可编辑的标题，以及 Save Artifact / 下一阶段 等操作按钮</li>
            <li>
              <Strong>模式切换栏</Strong> — 两个并列的顶级按钮：
              <ul>
                <li>「⚡ 阶段工作流」— 进入阶段化工作流</li>
                <li>「✨ Prompt 精炼」— 进入 Session 级 Prompt 精炼</li>
              </ul>
            </li>
            <li><Strong>主内容区</Strong> — 根据所选模式显示工作流或精炼面板</li>
          </ol>

          <h4>右侧面板</h4>
          <p>
            在较宽屏幕上，右侧会显示上下文面板，包括 Context Budget、Workflow Files、Pinned Facts 和 All Artifacts。
          </p>
        </Section>

        {/* 3. 快速开始 */}
        <Section id="quickstart" title="3. 快速开始">
          <p>以下是首次使用 Promptor 的推荐步骤：</p>

          <h4>第一步：配置 LLM 提供商</h4>
          <p>
            点击左侧边栏底部的 <Strong>⚙ Settings</Strong>。在 LLM Provider 区域：
          </p>
          <ol>
            <li>在 <Strong>Provider Preset</Strong> 下拉中选择你的提供商（OpenAI / DeepSeek / GLM / Gemini / Custom）。选择后会自动填入 Base URL 和推荐模型</li>
            <li>填入你的 <Strong>API Key</Strong></li>
            <li>确认或修改 <Strong>Model</Strong>（可以点击推荐模型按钮快速选择）</li>
            <li>点击 <Strong>Test Connection</Strong> 按钮，确认连接成功</li>
          </ol>

          <h4>第二步：创建 Session</h4>
          <p>
            点击左侧边栏的 <Strong>+ New Session</Strong> 按钮。如果是首次使用，会弹出一个流程说明弹窗（标题为「如何按这个流程进行更稳定的 Vibe Coding」），建议仔细阅读。点击「我知道了」后进入新 Session。
          </p>

          <h4>第三步：在阶段工作流中生成 prompt</h4>
          <p>
            新 Session 默认进入「⚡ 阶段工作流」模式，起始阶段为 Research。你会看到：
          </p>
          <ul>
            <li>阶段介绍和预期产物（如 research.md）</li>
            <li>「优化本阶段 Prompt」标签页，展示当前阶段的优化后 prompt</li>
            <li>底部的下一步提示</li>
          </ul>
          <p>
            在输入框中补充你的具体需求（如「查看 scheme12 相关代码」），点击 <Strong>优化</Strong> 按钮，Promptor 会生成一个结合你需求的高质量 prompt。
          </p>

          <h4>第四步：复制 prompt，交给外部 agent 执行</h4>
          <p>
            生成的 prompt 旁有 <Strong>Copy</Strong> 按钮。复制后粘贴到 Cursor / Claude Code 等工具中执行。agent 执行后会产出文件（如 research.md）。
          </p>

          <h4>第五步：上传产物文件，进入下一阶段</h4>
          <p>
            在右侧面板的 Workflow Files 区域点击 <Strong>+ Upload</Strong>，上传 agent 产出的文件。然后点击标题栏的 <Strong>下一阶段 →</Strong> 按钮推进到下一个阶段。
          </p>
        </Section>

        {/* 4. Session */}
        <Section id="session" title="4. Session 的使用方式">
          <p>
            Session 是 Promptor 的基本工作单元。每个 Session 代表一个任务或项目，所有阶段、对话、文件、记忆都属于同一个 Session。
          </p>

          <h4>创建 Session</h4>
          <p>
            点击 <Strong>+ New Session</Strong> 创建。Session 会根据你的第一条输入自动生成标题（如「调研 scheme12 代码」）。如果没有有效输入，会使用时间戳作为标题（如「2026-03-23 14:30」）。你也可以随时在标题栏直接编辑标题。
          </p>

          <h4>Session 内的两大能力</h4>
          <p>
            在标题栏下方的模式切换栏中，你会看到两个并列按钮：
          </p>
          <ul>
            <li><Strong>⚡ 阶段工作流</Strong> — 按 Research → Plan → Annotation → Implement → Verify 流程推进</li>
            <li><Strong>✨ Prompt 精炼</Strong> — 利用整个 Session 的上下文把粗糙 prompt 转为高质量 prompt</li>
          </ul>
          <p>
            这两种模式共享同一个 Session 的所有数据：对话历史、上传文件、固定事实和滚动摘要。
          </p>

          <h4>Session 的记忆</h4>
          <p>
            Promptor 会自动记录你在 Session 中的所有交互。这些记忆包括：
          </p>
          <ul>
            <li>各阶段的对话记录</li>
            <li>你固定的事实（Pinned Facts）</li>
            <li>你上传的工作流文件</li>
            <li>滚动摘要（如果历史过长，会自动压缩）</li>
          </ul>
          <Callout type="tip">
            建议把同一个任务的所有阶段放在同一个 Session 中，这样后续阶段的 prompt 生成可以利用前面阶段积累的上下文。
          </Callout>
        </Section>

        {/* 5. 阶段工作流 */}
        <Section id="workflow" title="5. 阶段工作流">
          <p>
            在「⚡ 阶段工作流」模式下，顶部会显示阶段导航栏。核心流程包含 5 个主要阶段，3 个辅助阶段：
          </p>

          <h4>核心阶段</h4>

          <StageDoc
            name="Research"
            label="核心阶段"
            purpose="让 agent 深入理解现有代码、系统或上下文，把发现写进 research.md。"
            deliverable="research.md"
            whatYouSee="阶段介绍、优化后的 prompt（包含不可修改的核心要求：不要修改代码、不要给实现方案）、Copy 按钮。"
            nextStep="认真阅读 agent 产出的 research.md，确认理解无误后再进入 Plan。"
          />

          <StageDoc
            name="Plan"
            label="核心阶段"
            purpose="基于 research.md 生成详细实现方案，想清楚怎么做，不写代码。"
            deliverable="plan.md"
            whatYouSee="会提示「建议先完成并阅读 research.md，再进入 Plan」（如果没有检测到 research 文件）。优化后的 prompt 包含分步骤思路、文件路径、代码草图、风险点等要求。"
            nextStep="打开 plan.md，直接在文件中加批注，不要还没审完就进入实现。"
          />

          <StageDoc
            name="Annotation"
            label="核心阶段"
            purpose="你在 plan.md 中加批注，agent 逐条处理并更新方案。可反复循环。"
            deliverable="更新后的 plan.md"
            whatYouSee="会提示「建议先完成 plan.md，再进入批注循环」。这个阶段的核心约束是「先不要实现代码」。"
            nextStep="如果还有问题就继续批注。不要在 plan 未批准前进入 Implement。"
          />

          <StageDoc
            name="Implement"
            label="核心阶段"
            purpose="把已审定的 plan 转成执行 prompt，驱动 agent 完整实现。"
            deliverable="已实现的变更 + plan.md 中标记进度"
            whatYouSee="如果没有 plan 文件，会显示警告「当前未检测到已批准的 plan.md，Implement 阶段可能导致方向漂移」。prompt 要求 agent 按计划推进并持续跑测试。"
            nextStep="实现完成后不要直接相信结果，立即进入 Verify。"
          />

          <StageDoc
            name="Verify"
            label="核心阶段"
            purpose="要求 agent 跑验证、生成测试报告、修复失败并重新验证。"
            deliverable="test-report.md"
            whatYouSee="prompt 要求 agent 运行所有相关测试，列出通过/失败项及原因，修复后重新验证。"
            nextStep="阅读 test-report.md，确认风险项和剩余问题，再决定是否收尾。"
          />

          <h4>辅助阶段</h4>
          <p>
            在核心阶段导航下方，有一行较小的辅助阶段按钮：
          </p>
          <ul>
            <li><Strong>Requirement</Strong> — 把模糊需求整理成结构化问题陈述</li>
            <li><Strong>Discussion</Strong> — 和 agent 讨论候选方案，比较优缺点，不急于定稿</li>
            <li><Strong>Solidify</Strong> — 从本次流程中提炼可复用的规则和经验</li>
          </ul>

          <h4>每个阶段的两种工作模式</h4>
          <p>
            在每个阶段内部，有两个标签页：
          </p>
          <ul>
            <li>
              <Strong>优化本阶段 Prompt</Strong> — 根据你补充的约束和上下文，微调当前阶段给外部 agent 的 prompt。输入你的额外要求后点击「优化」按钮。主要输出是优化后的 Prompt 和更省 token 版本
            </li>
            <li>
              <Strong>审阅并修改阶段文件</Strong> — 上传当前阶段的产物文件（如 research.md），描述其中的问题，Promptor 会生成一个让外部 agent 修改该文件的 prompt。点击「审阅」按钮触发
            </li>
          </ul>
          <Callout type="info">
            底部输入框支持 Ctrl+Enter / Cmd+Enter 快捷发送。
          </Callout>
        </Section>

        {/* 6. Prompt 精炼 */}
        <Section id="refiner" title="6. Prompt 精炼">
          <p>
            Prompt 精炼是 Session 级能力，不依附于某个阶段。它位于 Session 工作区的顶部模式切换栏中，点击「✨ Prompt 精炼」即可进入。
          </p>

          <h4>它使用哪些上下文？</h4>
          <p>
            进入精炼模式后，你会看到一个「会话上下文」指示条，显示当前 Session 中可用的上下文：
          </p>
          <ul>
            <li>对话条数和涉及的阶段数</li>
            <li>固定事实（Pinned Facts）数量</li>
            <li>上传文件数量</li>
            <li>是否有滚动摘要</li>
          </ul>
          <p>
            Prompt 精炼会使用整个 Session 的上下文来优化你的 prompt，而不是仅限于某个阶段的数据。
          </p>

          <h4>可选的阶段关联</h4>
          <p>
            输入区域有一个「关联阶段（可选）」下拉选择。默认为「无」，表示不偏向任何阶段。如果你选择了某个阶段（如 Research），精炼结果会偏向该阶段的要求，但仍然使用整个 Session 的记忆。
          </p>

          <h4>如何使用</h4>
          <ol>
            <li>在文本框中粘贴你的粗糙 prompt</li>
            <li>选择变体（Standard / Strict / Low Cost / Minimal）</li>
            <li>可选：关联某个阶段</li>
            <li>点击 <Strong>精炼</Strong> 按钮</li>
          </ol>
          <p>
            生成结果包括：
          </p>
          <ul>
            <li><Strong>精炼后的 Prompt</Strong>（主要输出，有 Copy 按钮）</li>
            <li><Strong>更省 token 版本</Strong>（如果生成了，同样有 Copy 按钮）</li>
            <li>可展开的诊断信息（诊断、补充假设、可加入记忆），默认折叠</li>
          </ul>

          <h4>适用场景</h4>
          <ul>
            <li>你有一段粗糙的想法，想转成适合 agent 执行的高质量 prompt</li>
            <li>你想让 prompt 融入当前 Session 已积累的上下文和约束</li>
            <li>你需要同时获得标准版和低成本版 prompt</li>
          </ul>
        </Section>

        {/* 7. 文件与上传 */}
        <Section id="files" title="7. 文件与上传">
          <p>
            Promptor 支持上传工作流文件，这些文件会成为 prompt 生成的重要上下文。
          </p>

          <h4>在哪里上传</h4>
          <ul>
            <li>右侧面板的 <Strong>Workflow Files</Strong> 区域，点击 <Strong>+ Upload</Strong></li>
            <li>阶段工作流中「审阅并修改阶段文件」标签页内的上传按钮</li>
          </ul>

          <h4>支持的文件格式</h4>
          <ul>
            <li>.md（Markdown）</li>
            <li>.txt（纯文本）</li>
            <li>.json</li>
          </ul>

          <h4>文件角色</h4>
          <p>
            每个文件会被分配一个角色，Promptor 根据文件名自动推断，也可以手动修改。支持的角色有：
          </p>
          <ul>
            <li><Strong>Research Output</Strong> — research.md 等调研产物</li>
            <li><Strong>Plan Output</Strong> — plan.md 等计划文件</li>
            <li><Strong>Annotated Plan</Strong> — 带批注的 plan.md</li>
            <li><Strong>Test Report</Strong> — test-report.md 等验证报告</li>
            <li><Strong>Code Summary</Strong> — 代码摘要</li>
            <li><Strong>General Notes</Strong> — 一般笔记</li>
            <li><Strong>Reference Material</Strong> — 参考资料</li>
          </ul>
          <p>
            在阶段工作流中，与当前阶段相关的文件会标记为 <Strong>in use</Strong>，表示它们正在参与 prompt 生成。
          </p>

          <Callout type="tip">
            上传 research.md 后进入 Plan 阶段，Promptor 会在生成 prompt 时自动引用 research.md 的内容，让 Plan 更有依据。
          </Callout>
        </Section>

        {/* 8. 右侧上下文面板 */}
        <Section id="context-panel" title="8. 右侧上下文面板">
          <p>
            在宽屏设备上，Session 工作区右侧会显示上下文面板，包含以下区域：
          </p>

          <h4>Context Budget</h4>
          <p>
            显示当前 Session 的 token 使用量和上限。进度条颜色会变化：绿色表示安全，黄色建议压缩，红色表示必须压缩。
          </p>

          <h4>Workflow Files</h4>
          <p>
            列出当前 Session 中的所有上传文件。可以上传新文件、修改文件角色、删除文件。
          </p>

          <h4>Pinned Facts</h4>
          <p>
            固定的重要事实，不会被自动压缩。比如目标、约束、已确认方案等。点击 <Strong>+ Add</Strong> 可以手动添加。每条事实有类别标签（如 constraint、objective 等）和优先级标记。点击事实右侧的 × 可以移除。
          </p>

          <h4>All Artifacts</h4>
          <p>
            展示当前 Session 产生的所有 artifact（如各阶段的输出产物）。点击可展开查看内容。
          </p>
        </Section>

        {/* 9. 设置 */}
        <Section id="settings" title="9. 设置">
          <p>
            点击左侧边栏底部的 <Strong>⚙ Settings</Strong> 进入设置页面。
          </p>

          <h4>LLM Provider</h4>
          <ul>
            <li><Strong>Provider Preset</Strong> — 选择 OpenAI / DeepSeek / GLM / Gemini / Custom，会自动填入对应的 Base URL 和推荐模型</li>
            <li><Strong>Provider Label</Strong> — 提供商标签</li>
            <li><Strong>Base URL</Strong> — API 端点地址</li>
            <li><Strong>API Key</Strong> — 你的 API 密钥。可以勾选「Save API key to local storage」让它在刷新后保留</li>
            <li><Strong>Model</Strong> — 使用的模型名称。如果预设有推荐模型，会显示为可点选的按钮</li>
            <li><Strong>Test Connection</Strong> — 测试连接是否正常</li>
          </ul>

          <h4>Generation</h4>
          <ul>
            <li><Strong>Output Language</Strong> — 生成内容的语言（中文 / English）</li>
            <li><Strong>Temperature</Strong> — 生成温度（0-2 之间滑动调节）</li>
            <li><Strong>Max Tokens</Strong> — 单次生成的最大 token 数</li>
          </ul>

          <h4>Context Limits</h4>
          <ul>
            <li><Strong>Soft Limit</Strong> — 超过此值时建议压缩上下文</li>
            <li><Strong>Hard Limit</Strong> — 超过此值时强制压缩</li>
          </ul>

          <h4>Appearance</h4>
          <ul>
            <li><Strong>Theme</Strong> — System / Light / Dark</li>
          </ul>

          <h4>Advanced</h4>
          <ul>
            <li><Strong>Debug mode</Strong> — 启用后会在浏览器控制台输出原始 LLM 请求和响应</li>
          </ul>

          <h4>Data</h4>
          <ul>
            <li><Strong>Check DB</Strong> — 检查浏览器数据库中各类记录的数量</li>
            <li><Strong>Export All Data</Strong> — 导出所有数据为 JSON 文件备份</li>
            <li><Strong>Import Data</Strong> — 从 JSON 文件导入数据</li>
          </ul>
          <Callout type="warning">
            所有数据存储在浏览器的 IndexedDB 中。清除浏览器数据会丢失所有记录。建议定期使用 Export All Data 进行备份。
          </Callout>
        </Section>

        {/* 10. 推荐用法 */}
        <Section id="best-practices" title="10. 推荐用法">
          <Callout type="tip">
            <strong>核心原则：先调研，再规划，再实现。在 plan 没审定之前，不要进入实现。</strong>
          </Callout>

          <h4>标准工作流</h4>
          <ol>
            <li>在 Research 阶段生成 prompt，复制给 agent 执行，让它产出 research.md</li>
            <li>认真阅读 research.md，确认 agent 理解无误</li>
            <li>进入 Plan 阶段，上传 research.md，生成 prompt 让 agent 产出 plan.md</li>
            <li>打开 plan.md，直接在文件中加批注</li>
            <li>进入 Annotation 阶段，让 agent 逐条处理你的批注，更新 plan.md</li>
            <li>反复循环直到你完全满意</li>
            <li>进入 Implement 阶段，生成执行 prompt</li>
            <li>最后进入 Verify 阶段，确认实现质量</li>
          </ol>

          <h4>使用文件建立阶段连续性</h4>
          <p>
            每个阶段完成后，把 agent 产出的文件（research.md、plan.md 等）上传回 Promptor。下一阶段生成 prompt 时，Promptor 会自动引用这些文件，让 prompt 更有针对性。
          </p>

          <h4>善用 Pinned Facts</h4>
          <p>
            把项目中的关键约束、已确认的方案、已否决的方案作为 Pinned Facts 添加。它们会长期保留在上下文中，确保后续 prompt 不会遗忘重要信息。
          </p>

          <h4>灵活使用 Prompt 精炼</h4>
          <p>
            当你有一段粗糙想法但不确定适合哪个阶段时，可以先切换到 Prompt 精炼模式，把想法转成结构化 prompt，再决定在哪个阶段使用。
          </p>
        </Section>

        {/* 11. 常见问题 */}
        <Section id="faq" title="11. 常见问题">
          <FaqItem q="为什么 Promptor 不直接帮我完成任务？">
            Promptor 的定位是 prompt 编排工具，不是执行工具。它生成的是给 Cursor / Claude Code 等外部 agent 使用的 prompt。这样设计的原因是：Promptor 可以通过结构化模板和上下文管理，让任何 agent（甚至较弱的模型）都能得到更好的执行结果。
          </FaqItem>

          <FaqItem q="为什么建议按阶段推进，而不是直接让 agent 写代码？">
            大部分 token 浪费不是因为「agent 不会写代码」，而是因为「理解错了」和「方向走偏了」。把时间花在 Research 和 Plan 上，通常能显著减少后续的返工。
          </FaqItem>

          <FaqItem q="已上传的文件会影响 prompt 生成吗？">
            会。Promptor 在生成 prompt 时，会根据当前阶段自动引用与之相关的已上传文件。例如在 Plan 阶段，research.md 会作为上下文被纳入。
          </FaqItem>

          <FaqItem q="刷新页面后数据还在吗？">
            数据保存在浏览器的 IndexedDB 中，刷新页面不会丢失。但清除浏览器数据会导致数据丢失，建议在 Settings → Data 中定期导出备份。
          </FaqItem>

          <FaqItem q="Prompt 精炼和阶段内的「优化本阶段 Prompt」有什么区别？">
            「优化本阶段 Prompt」是在阶段工作流内对某个具体阶段的 prompt 进行微调，它会保留该阶段的核心约束（如 Research 阶段的「不要修改代码」）。Prompt 精炼则是 Session 级能力，不绑定任何阶段，适合把任意粗糙想法转为结构化 prompt。
          </FaqItem>

          <FaqItem q="如何减少 token 浪费？">
            <ul className="mt-1 space-y-1">
              <li>按阶段推进，避免一次性把大量需求丢给 agent</li>
              <li>利用 Pinned Facts 保留关键信息，而不是在每次 prompt 中重复</li>
              <li>上传阶段产物文件，让 Promptor 自动引用而不是手动拼接</li>
              <li>使用 Low Cost 或 Minimal 变体获得更精简的 prompt</li>
              <li>关注右侧面板的 Context Budget 指示器</li>
            </ul>
          </FaqItem>
        </Section>

        <div className="mt-12 border-t border-border pt-6 text-center text-xs text-muted-foreground">
          Promptor — 本地运行的 Prompt 编排工具
        </div>
      </article>
    </div>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mb-10 scroll-mt-8">
      <h2 className="mb-3 border-b border-border pb-2 text-base font-bold">{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-foreground/90">{children}</div>
    </section>
  );
}

function Strong({ children }: { children: React.ReactNode }) {
  return <strong className="font-semibold text-foreground">{children}</strong>;
}

function Callout({ type, children }: { type: 'tip' | 'info' | 'warning'; children: React.ReactNode }) {
  const styles = {
    tip: 'border-primary/30 bg-primary/5 text-primary',
    info: 'border-sky-400/30 bg-sky-50 text-sky-700 dark:bg-sky-950/30 dark:text-sky-300',
    warning: 'border-warning/30 bg-warning/5 text-warning',
  };
  const labels = { tip: '推荐做法', info: '提示', warning: '注意事项' };
  return (
    <div className={`my-3 rounded-md border px-4 py-3 text-sm ${styles[type]}`}>
      <div className="mb-1 text-xs font-semibold uppercase">{labels[type]}</div>
      <div className="text-foreground/80">{children}</div>
    </div>
  );
}

function StageDoc({
  name,
  label,
  purpose,
  deliverable,
  whatYouSee,
  nextStep,
}: {
  name: string;
  label: string;
  purpose: string;
  deliverable: string;
  whatYouSee: string;
  nextStep: string;
}) {
  return (
    <div className="my-3 rounded-md border border-border bg-muted/20 px-4 py-3">
      <div className="mb-1 flex items-center gap-2">
        <span className="text-sm font-semibold">{name}</span>
        <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">{label}</span>
      </div>
      <div className="space-y-1.5 text-xs text-foreground/80">
        <div><strong className="text-foreground">目的：</strong>{purpose}</div>
        <div><strong className="text-foreground">预期产物：</strong><code className="rounded bg-muted px-1 text-foreground">{deliverable}</code></div>
        <div><strong className="text-foreground">界面中看到的：</strong>{whatYouSee}</div>
        <div><strong className="text-foreground">下一步：</strong>{nextStep}</div>
      </div>
    </div>
  );
}

function FaqItem({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <details className="group my-2 rounded-md border border-border">
      <summary className="cursor-pointer px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted/50">
        {q}
      </summary>
      <div className="border-t border-border px-4 py-2.5 text-sm text-foreground/80">
        {children}
      </div>
    </details>
  );
}
