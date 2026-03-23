import type { WorkflowStage, WorkflowFileRole } from '@/types/data';

export type StageWorkMode = 'prompt_tuning' | 'file_review';

export interface StageConfig {
  id: WorkflowStage;
  label: string;
  isPrimary: boolean;
  order: number;
  intro: { zh: string; en: string };
  whyItMatters: { zh: string; en: string };
  deliverable: { zh: string; en: string };
  basePrompt: { zh: string; en: string };
  immutableRequirements: { zh: string[]; en: string[] };
  nextStepHint: { zh: string; en: string };
  relevantFileRoles: WorkflowFileRole[];
  defaultUploadRole: WorkflowFileRole;
  fileReviewGuide: { zh: string; en: string };
  readinessCheck?: {
    requiredFileRoles?: WorkflowFileRole[];
    requiredArtifactTypes?: string[];
    warningZh: string;
    warningEn: string;
  };
}

export const STAGE_CONFIGS: Record<WorkflowStage, StageConfig> = {
  research: {
    id: 'research',
    label: 'Research',
    isPrimary: true,
    order: 1,
    intro: {
      zh: '先让 agent 深入理解现有代码、系统或上下文，并把发现写进 research.md。你需要先读完 research.md，确认理解无误，再进入下一阶段。',
      en: 'Have the agent deeply understand the existing code, system, or context, and write findings into research.md. Read research.md to confirm understanding before moving on.',
    },
    whyItMatters: {
      zh: '如果 research 错了，后面的 plan 和实现就会建立在错误理解上，越走越偏。',
      en: 'If the research is wrong, all subsequent plans and implementations will be built on a flawed understanding.',
    },
    deliverable: { zh: 'research.md', en: 'research.md' },
    basePrompt: {
      zh: `深入阅读当前代码库中与 [主题/目录/模块] 相关的内容，彻底理解其工作原理、职责、关键依赖、调用关系、边界条件和实现细节。
完成后，把你的发现详细写入 research.md。
要求：
- 先做 research，不要给实现方案
- 不要修改代码
- 明确列出相关文件、模块、数据流和不确定点`,
      en: `Read the relevant parts of the current codebase related to [topic/directory/module] in depth.
Understand how they work, what their responsibilities are, their key dependencies, call relationships, boundaries, and implementation details.
When finished, write a detailed report in research.md.
Requirements:
- Do research first, do not propose implementation yet
- Do not modify code
- Clearly list relevant files, modules, data flows, and uncertainties`,
    },
    immutableRequirements: {
      zh: [
        '把发现详细写入 research.md',
        '先做 research，不要给实现方案',
        '不要修改代码',
        '明确列出相关文件、模块、数据流和不确定点',
      ],
      en: [
        'Write a detailed report in research.md',
        'Do research first, do not propose implementation yet',
        'Do not modify code',
        'Clearly list relevant files, modules, data flows, and uncertainties',
      ],
    },
    nextStepHint: {
      zh: '先认真阅读 research.md，确认 agent 理解无误，再进入 Plan。',
      en: 'Read research.md carefully and confirm the agent\'s understanding before entering Plan.',
    },
    relevantFileRoles: ['research_output', 'reference_material', 'general_notes'],
    defaultUploadRole: 'research_output',
    fileReviewGuide: {
      zh: '检查 research.md 是否正确理解了代码库，是否遗漏了关键模块、文件、数据流或不确定点。生成一个让外部 agent 修正 research.md 的 prompt。',
      en: 'Check whether research.md correctly understands the codebase. Identify missing modules, files, data flows, or uncertainties. Generate a prompt for the external agent to revise research.md.',
    },
  },

  plan: {
    id: 'plan',
    label: 'Plan',
    isPrimary: true,
    order: 2,
    intro: {
      zh: '基于 research.md 生成详细实现方案，并写进 plan.md。这个阶段的重点是想清楚怎么做，不要急着写代码。',
      en: 'Based on research.md, create a detailed implementation plan in plan.md. Focus on thinking through the approach, not coding.',
    },
    whyItMatters: {
      zh: '计划越清楚，后续实现越稳定，越不容易浪费 token 或走偏架构。',
      en: 'The clearer the plan, the more stable the implementation, and the less token waste or architectural drift.',
    },
    deliverable: { zh: 'plan.md', en: 'plan.md' },
    basePrompt: {
      zh: `基于 research.md 的内容，生成一份详细的实现方案并写入 plan.md。
包括：
- 分步骤实现思路
- 需要修改的文件路径
- 关键代码草图
- 不同方案的取舍
- 风险点
- 验证方法
先不要实现代码。`,
      en: `Based on research.md, create a detailed implementation plan in plan.md.
Include:
- step-by-step approach
- file paths to modify
- key code sketches
- trade-offs between approaches
- risks
- verification methods
Do not implement yet.`,
    },
    immutableRequirements: {
      zh: [
        '生成实现方案并写入 plan.md',
        '包括分步骤实现思路、文件路径、代码草图、取舍、风险点、验证方法',
        '先不要实现代码',
      ],
      en: [
        'Create a detailed implementation plan in plan.md',
        'Include step-by-step approach, file paths, code sketches, trade-offs, risks, verification methods',
        'Do not implement yet',
      ],
    },
    nextStepHint: {
      zh: '打开 plan.md，直接在文件中批注。不要还没审完就进入实现。',
      en: 'Open plan.md and annotate directly. Do not proceed to implementation before review.',
    },
    relevantFileRoles: ['research_output', 'plan_output', 'general_notes'],
    defaultUploadRole: 'plan_output',
    fileReviewGuide: {
      zh: '检查 plan.md 是否足够详细：步骤是否清晰、文件路径是否准确、代码草图是否合理、风险和验证方法是否完整。生成一个让外部 agent 修正 plan.md 的 prompt。',
      en: 'Check whether plan.md is detailed enough: clear steps, accurate file paths, reasonable code sketches, complete risks and verification methods. Generate a prompt for the external agent to revise plan.md.',
    },
    readinessCheck: {
      requiredFileRoles: ['research_output'],
      warningZh: '建议先完成并阅读 research.md，再进入 Plan。',
      warningEn: 'Complete and review research.md before entering Plan.',
    },
  },

  annotation_loop: {
    id: 'annotation_loop',
    label: 'Annotation',
    isPrimary: true,
    order: 3,
    intro: {
      zh: '你在 plan.md 里直接加批注，让 agent 逐条处理并更新方案。这个阶段可以反复循环，直到你完全满意。',
      en: 'Add your notes directly to plan.md, and have the agent address each note and update the plan. Iterate until satisfied.',
    },
    whyItMatters: {
      zh: '这是把你的经验、业务知识和判断注入流程的关键阶段。',
      en: 'This is the critical phase for injecting your experience, domain knowledge, and judgment into the process.',
    },
    deliverable: { zh: '更新后的 plan.md', en: 'updated plan.md' },
    basePrompt: {
      zh: `我已经在 plan.md 中加入了批注。
请逐条处理这些批注，更新 plan.md，并明确说明每条批注是如何处理的。
先不要实现代码。`,
      en: `I have added notes to plan.md.
Please address each note, update plan.md, and clearly explain how each note was handled.
Do not implement yet.`,
    },
    immutableRequirements: {
      zh: [
        '逐条处理批注，更新 plan.md',
        '明确说明每条批注是如何处理的',
        '先不要实现代码',
      ],
      en: [
        'Address each note and update plan.md',
        'Clearly explain how each note was handled',
        'Do not implement yet',
      ],
    },
    nextStepHint: {
      zh: '如果还有问题，就继续批注再更新。不要在 plan 未批准前进入 Implement。',
      en: 'Keep annotating and iterating. Do not start implementation before the plan is approved.',
    },
    relevantFileRoles: ['plan_output', 'annotated_plan', 'general_notes'],
    defaultUploadRole: 'annotated_plan',
    fileReviewGuide: {
      zh: '检查批注是否都被正确处理。如果有遗漏或处理不当的批注，生成一个让外部 agent 继续更新 plan.md 的 prompt。强调"先不要实现代码"。',
      en: 'Check whether all annotations were properly addressed. If any were missed or handled incorrectly, generate a prompt for the agent to update plan.md. Emphasize "Do not implement yet."',
    },
    readinessCheck: {
      requiredFileRoles: ['plan_output'],
      warningZh: '建议先完成 plan.md，再进入批注循环。',
      warningEn: 'Complete plan.md before entering the annotation loop.',
    },
  },

  implement: {
    id: 'implement',
    label: 'Implement',
    isPrimary: true,
    order: 4,
    intro: {
      zh: '只有在 plan 已经审定后，才进入实现。这个阶段要把批准后的 plan 转成强约束的执行 prompt。',
      en: 'Enter implementation only after the plan is approved. Convert the approved plan into strongly constrained execution prompts.',
    },
    whyItMatters: {
      zh: '如果 plan 还没定就开始写代码，agent 很容易乱做、漏做、做偏。',
      en: 'Starting implementation without an approved plan leads to random, incomplete, or misaligned agent work.',
    },
    deliverable: { zh: '已实现的变更 + plan.md 中标记进度', en: 'implemented changes + progress marked in plan.md' },
    basePrompt: {
      zh: `基于已批准的 plan.md，完整实现所有任务。
每完成一个任务或阶段，就在 plan.md 中标记为已完成。
不要停，直到全部任务完成。
不要添加不必要的注释或无关改动。
持续运行 typecheck 和相关测试，避免引入新问题。`,
      en: `Based on the approved plan.md, implement all tasks completely.
As you finish each task or phase, mark it as completed in plan.md.
Do not stop until everything is completed.
Do not add unnecessary comments or unrelated changes.
Continuously run typecheck and relevant tests to avoid introducing new issues.`,
    },
    immutableRequirements: {
      zh: [
        '基于已批准的 plan.md 实现',
        '每完成一个任务就在 plan.md 中标记为已完成',
        '持续运行 typecheck 和相关测试',
        '不要添加不必要的注释或无关改动',
      ],
      en: [
        'Implement based on the approved plan.md',
        'Mark each completed task in plan.md',
        'Continuously run typecheck and relevant tests',
        'Do not add unnecessary comments or unrelated changes',
      ],
    },
    nextStepHint: {
      zh: '实现完成后不要直接相信结果，立即进入 Verify。',
      en: 'Do not trust results blindly after implementation. Proceed to Verify immediately.',
    },
    relevantFileRoles: ['plan_output', 'annotated_plan', 'code_summary', 'general_notes'],
    defaultUploadRole: 'code_summary',
    fileReviewGuide: {
      zh: '检查实现进展和代码摘要，确认是否严格按照 plan 推进。生成一个让外部 agent 继续实现或修正偏差的 prompt。',
      en: 'Review implementation progress and code summary. Confirm whether the plan is being followed. Generate a prompt for the agent to continue implementation or correct drift.',
    },
    readinessCheck: {
      requiredFileRoles: ['plan_output'],
      warningZh: '当前未检测到已批准的 plan.md，Implement 阶段可能导致方向漂移。',
      warningEn: 'No approved plan.md detected. Implementation without a plan may cause drift.',
    },
  },

  verify: {
    id: 'verify',
    label: 'Verify',
    isPrimary: true,
    order: 5,
    intro: {
      zh: '要求 agent 真正跑验证、生成测试报告、修复失败，再重新验证。',
      en: 'Have the agent run verification, generate a test report, fix failures, and re-verify.',
    },
    whyItMatters: {
      zh: '"看起来没问题"不等于真的没问题。验证阶段是发现执行型错误的最后一道关。',
      en: '"Looks fine" is not the same as "is fine." Verification is the last checkpoint for catching execution errors.',
    },
    deliverable: { zh: 'test-report.md', en: 'test-report.md' },
    basePrompt: {
      zh: `运行所有相关测试和验证步骤，并生成 test-report.md。
包括：
- 运行了哪些检查
- 哪些通过
- 哪些失败
- 每个失败的原因
- 已做的修复
然后修复所有可以安全修复的问题，并重新验证。`,
      en: `Run all relevant tests and verification steps and create test-report.md.
Include:
- what checks were run
- what passed
- what failed
- the cause of each failure
- fixes that were applied
Then fix all safely fixable problems and re-run verification.`,
    },
    immutableRequirements: {
      zh: [
        '生成 test-report.md',
        '包括运行了哪些检查、通过、失败、原因、修复',
        '修复可以安全修复的问题并重新验证',
      ],
      en: [
        'Create test-report.md',
        'Include checks run, passed, failed, causes, and fixes',
        'Fix safely fixable problems and re-run verification',
      ],
    },
    nextStepHint: {
      zh: '阅读 test-report.md，确认风险项和剩余问题，再决定是否收尾。',
      en: 'Read test-report.md, confirm risks and remaining issues, then decide whether to wrap up.',
    },
    relevantFileRoles: ['test_report', 'code_summary', 'plan_output'],
    defaultUploadRole: 'test_report',
    fileReviewGuide: {
      zh: '检查 test-report.md 中的失败项、遗漏的检查和不清楚的风险。生成一个让外部 agent 修复问题并重新验证的 prompt。',
      en: 'Review failures, missing checks, and unclear risks in test-report.md. Generate a prompt for the agent to fix issues and re-run verification.',
    },
    readinessCheck: {
      requiredFileRoles: ['plan_output'],
      warningZh: '当前未检测到 test-report 上下文，建议在验证后补充测试报告。',
      warningEn: 'No test report context detected. Consider running verification first.',
    },
  },

  requirement: {
    id: 'requirement',
    label: 'Requirement',
    isPrimary: false,
    order: 0,
    intro: {
      zh: '把模糊需求整理成可执行的问题陈述，提取目标、边界、已知条件和交付物。',
      en: 'Organize vague requirements into an actionable problem statement with goals, boundaries, and deliverables.',
    },
    whyItMatters: {
      zh: '需求不清会导致所有后续阶段方向不对。',
      en: 'Unclear requirements cause all subsequent stages to drift.',
    },
    deliverable: { zh: '需求简报', en: 'requirement brief' },
    basePrompt: {
      zh: '分析以下需求，提取目标、必须项、可选项、约束条件、未知问题和预期交付物。',
      en: 'Analyze the following requirement. Extract: objective, must-haves, nice-to-haves, constraints, unknowns, and deliverables.',
    },
    immutableRequirements: {
      zh: [
        '提取目标、必须项、可选项、约束条件、未知问题和预期交付物',
      ],
      en: [
        'Extract objective, must-haves, nice-to-haves, constraints, unknowns, and deliverables',
      ],
    },
    nextStepHint: {
      zh: '确认需求无误后，进入 Research。',
      en: 'Confirm the requirements, then proceed to Research.',
    },
    relevantFileRoles: ['general_notes', 'reference_material'],
    defaultUploadRole: 'general_notes',
    fileReviewGuide: {
      zh: '检查需求文档是否完整，是否有遗漏的目标、约束或未知问题。生成一个让外部 agent 补充需求的 prompt。',
      en: 'Check whether the requirement document is complete. Generate a prompt for the agent to fill in missing goals, constraints, or unknowns.',
    },
  },

  discussion: {
    id: 'discussion',
    label: 'Discussion',
    isPrimary: false,
    order: 2.5,
    intro: {
      zh: '和 agent 共同讨论候选技术路线，比较方案，不急于定稿。',
      en: 'Discuss candidate approaches with the agent. Compare options without rushing to a decision.',
    },
    whyItMatters: {
      zh: '跳过讨论直接做 plan 容易选错方案。',
      en: 'Skipping discussion and jumping to planning risks choosing the wrong approach.',
    },
    deliverable: { zh: '讨论记录 + 决策记录', en: 'discussion notes + decision record' },
    basePrompt: {
      zh: '针对当前问题，列出至少两个候选方案，分析各自的优缺点和风险，给出建议方向。不要直接进入实现。',
      en: 'List at least 2 candidate approaches for the current problem. Analyze pros/cons and risks for each. Recommend a direction. Do not implement.',
    },
    immutableRequirements: {
      zh: [
        '列出至少两个候选方案，分析优缺点和风险',
        '不要直接进入实现',
      ],
      en: [
        'List at least 2 candidate approaches with pros/cons and risks',
        'Do not implement',
      ],
    },
    nextStepHint: {
      zh: '确认讨论方向后，基于结论进入 Plan。',
      en: 'After confirming the direction, use the conclusions to inform the Plan stage.',
    },
    relevantFileRoles: ['research_output', 'general_notes', 'reference_material'],
    defaultUploadRole: 'general_notes',
    fileReviewGuide: {
      zh: '检查讨论记录是否全面覆盖了候选方案和取舍。生成一个让外部 agent 补充讨论的 prompt。',
      en: 'Check whether discussion notes fully cover candidate approaches and trade-offs. Generate a prompt for the agent to supplement the discussion.',
    },
  },

  solidify: {
    id: 'solidify',
    label: 'Solidify',
    isPrimary: false,
    order: 6,
    intro: {
      zh: '从本次流程中提炼稳定规则、偏好和架构经验，沉淀为可复用的规范。',
      en: 'Extract stable rules, preferences, and architectural lessons from this workflow for future reuse.',
    },
    whyItMatters: {
      zh: '沉淀经验可以让下次的 research 和 plan 质量更高。',
      en: 'Solidified lessons improve the quality of future research and planning.',
    },
    deliverable: { zh: '可复用规则 + 记忆摘要', en: 'reusable rules + memory summary' },
    basePrompt: {
      zh: '从本次完成的流程中提取可复用的规则、偏好和经验教训。要求具体、可操作，不要泛泛而谈。',
      en: 'Extract reusable rules, preferences, and lessons from the completed workflow. Be concrete and actionable.',
    },
    immutableRequirements: {
      zh: [
        '提取可复用的规则、偏好和经验教训',
        '要求具体、可操作',
      ],
      en: [
        'Extract reusable rules, preferences, and lessons',
        'Be concrete and actionable',
      ],
    },
    nextStepHint: {
      zh: '保存提炼出的规则，供未来 session 使用。',
      en: 'Save the extracted rules for use in future sessions.',
    },
    relevantFileRoles: ['test_report', 'plan_output', 'code_summary', 'general_notes'],
    defaultUploadRole: 'general_notes',
    fileReviewGuide: {
      zh: '检查提炼出的规则和经验是否具体、可操作。生成一个让外部 agent 细化和补充的 prompt。',
      en: 'Check whether extracted rules and lessons are concrete and actionable. Generate a prompt for the agent to refine and supplement them.',
    },
  },
};

export const PRIMARY_STAGES: WorkflowStage[] = ['research', 'plan', 'annotation_loop', 'implement', 'verify'];
export const SUPPORTING_STAGES: WorkflowStage[] = ['requirement', 'discussion', 'solidify'];

export function getStageConfig(stage: WorkflowStage): StageConfig {
  return STAGE_CONFIGS[stage];
}

export function getOrderedStages(): StageConfig[] {
  return Object.values(STAGE_CONFIGS).sort((a, b) => a.order - b.order);
}
