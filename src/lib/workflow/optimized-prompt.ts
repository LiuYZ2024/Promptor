import type { WorkflowStage, OutputLanguage, WorkflowFile, PinnedFact, Session } from '@/types/data';
import type { StageConfig } from './stage-config';
import { getStageConfig } from './stage-config';
import { getWorkflowFilesByRole } from '@/hooks/use-workflow-files';

export interface OptimizedPromptInput {
  stage: WorkflowStage;
  lang: OutputLanguage;
  userGoal: string;
  session?: Session;
  workflowFiles: WorkflowFile[];
  pinnedFacts?: PinnedFact[];
  rollingSummary?: string;
}

export function buildOptimizedPrompt(input: OptimizedPromptInput): string {
  const config = getStageConfig(input.stage);
  const parts: string[] = [];

  parts.push(input.lang === 'zh' ? config.basePrompt.zh : config.basePrompt.en);

  if (input.userGoal) {
    parts.push('');
    parts.push(input.lang === 'zh' ? `当前任务目标：${input.userGoal}` : `Current goal: ${input.userGoal}`);
  }

  const relevantFiles = input.workflowFiles.filter((f) =>
    config.relevantFileRoles.includes(f.fileRole),
  );

  if (relevantFiles.length > 0) {
    parts.push('');
    parts.push(input.lang === 'zh' ? '参考文件：' : 'Reference files:');
    for (const file of relevantFiles) {
      const preview = file.content.length > 2000
        ? file.content.slice(0, 2000) + '\n... (truncated)'
        : file.content;
      parts.push(`\n--- ${file.fileName} (${file.fileRole}) ---`);
      parts.push(preview);
    }
  }

  addStageSpecificContext(parts, input, config);

  if (input.pinnedFacts && input.pinnedFacts.length > 0) {
    parts.push('');
    parts.push(input.lang === 'zh' ? '已确认事实：' : 'Confirmed facts:');
    for (const fact of input.pinnedFacts) {
      parts.push(`- [${fact.category}] ${fact.content}`);
    }
  }

  if (input.rollingSummary) {
    parts.push('');
    parts.push(input.lang === 'zh' ? '上下文摘要：' : 'Context summary:');
    parts.push(input.rollingSummary);
  }

  return parts.join('\n');
}

export interface TuningCompositionInput {
  stage: WorkflowStage;
  lang: OutputLanguage;
  userGoal: string;
  userTuningRequest: string;
  currentOptimizedPrompt: string;
  workflowFiles: WorkflowFile[];
  pinnedFacts?: PinnedFact[];
}

/**
 * Builds a system prompt for the tuning LLM call.
 * Instructs the LLM to refine the base prompt additively — never replace it.
 * Returns a ChatMessage-compatible content string.
 */
export function buildTuningSystemPrompt(input: TuningCompositionInput): string {
  const config = getStageConfig(input.stage);
  const basePrompt = input.lang === 'zh' ? config.basePrompt.zh : config.basePrompt.en;
  const reqs = input.lang === 'zh' ? config.immutableRequirements.zh : config.immutableRequirements.en;
  const deliverable = input.lang === 'zh' ? config.deliverable.zh : config.deliverable.en;

  const parts: string[] = [];

  if (input.lang === 'zh') {
    parts.push(`你是 Promptor 的 Prompt 优化器。你的任务是微调下面的阶段 prompt，使其更精准地匹配用户的具体需求。

核心规则 — 严格遵守：
1. 你必须保留基础 prompt 的所有不可变要求。不可删除、弱化或遗漏其中任何一条。
2. 优化 = 基础 prompt + 任务聚焦 + 上下文补充 + 约束细化。不是重写一个全新的 prompt。
3. 你输出的 FINAL_PROMPT 必须在结构上看起来像基础 prompt 的增强版，而不是一个完全不同的 prompt。
4. 产物文件要求（${deliverable}）必须保留。
5. 阶段边界约束必须保留（例如"不要实现代码"、"不要修改代码"等）。

当前阶段：${config.label}
产物文件：${deliverable}`);
  } else {
    parts.push(`You are Promptor's Prompt Optimizer. Your task is to refine the stage prompt below to better match the user's specific requirements.

Core rules — follow strictly:
1. You MUST preserve all immutable requirements from the base prompt. Do NOT drop, weaken, or omit any of them.
2. Optimization = Base Prompt + Task Focus + Contextual Additions + Constraint Refinements. NOT a complete rewrite.
3. Your FINAL_PROMPT must structurally look like an enhanced version of the base prompt, not a completely different prompt.
4. The deliverable file requirement (${deliverable}) must be preserved.
5. Phase boundary constraints must be preserved (e.g. "Do not implement yet", "Do not modify code").

Current stage: ${config.label}
Deliverable: ${deliverable}`);
  }

  parts.push('');
  parts.push(input.lang === 'zh' ? '=== 不可变要求（必须全部保留）===' : '=== IMMUTABLE REQUIREMENTS (must all be preserved) ===');
  for (const req of reqs) {
    parts.push(`- ${req}`);
  }

  parts.push('');
  parts.push(input.lang === 'zh' ? '=== 当前基础 Prompt ===' : '=== CURRENT BASE PROMPT ===');
  parts.push(basePrompt);

  parts.push('');
  parts.push(input.lang === 'zh' ? '=== 当前优化版本 ===' : '=== CURRENT OPTIMIZED VERSION ===');
  parts.push(input.currentOptimizedPrompt);

  if (input.userGoal) {
    parts.push('');
    parts.push(input.lang === 'zh' ? `任务目标：${input.userGoal}` : `Task goal: ${input.userGoal}`);
  }

  const relevantFiles = input.workflowFiles.filter((f) =>
    config.relevantFileRoles.includes(f.fileRole),
  );
  if (relevantFiles.length > 0) {
    parts.push('');
    parts.push(input.lang === 'zh' ? '参考文件：' : 'Reference files:');
    for (const file of relevantFiles) {
      const preview = file.content.length > 1500
        ? file.content.slice(0, 1500) + '\n... (truncated)'
        : file.content;
      parts.push(`--- ${file.fileName} ---`);
      parts.push(preview);
    }
  }

  if (input.pinnedFacts && input.pinnedFacts.length > 0) {
    parts.push('');
    parts.push(input.lang === 'zh' ? '已确认事实：' : 'Confirmed facts:');
    for (const fact of input.pinnedFacts) {
      parts.push(`- [${fact.category}] ${fact.content}`);
    }
  }

  parts.push('');
  if (input.lang === 'zh') {
    parts.push(`用户的优化要求：
${input.userTuningRequest}

请输出以下格式：

## FINAL_PROMPT
（在基础 prompt 基础上增强后的完整 prompt。必须包含所有不可变要求。）

## CHEAPER_VARIANT
（更短更省 token 的版本，但仍然必须包含所有不可变要求。）

## DIAGNOSIS
（简短说明你做了哪些优化。）

## ASSUMPTIONS_ADDED
（你补充了哪些假设。）`);
  } else {
    parts.push(`User's tuning request:
${input.userTuningRequest}

Output in this format:

## FINAL_PROMPT
(The full enhanced prompt built on top of the base prompt. Must contain all immutable requirements.)

## CHEAPER_VARIANT
(A shorter, token-efficient version that still preserves all immutable requirements.)

## DIAGNOSIS
(Brief explanation of what optimizations were made.)

## ASSUMPTIONS_ADDED
(What assumptions you added.)`);
  }

  return parts.join('\n');
}

function addStageSpecificContext(
  parts: string[],
  input: OptimizedPromptInput,
  _config: StageConfig,
): void {
  const { stage, lang, workflowFiles } = input;

  if (stage === 'plan') {
    const researchFiles = getWorkflowFilesByRole(workflowFiles, 'research_output');
    if (researchFiles.length > 0) {
      parts.push('');
      parts.push(lang === 'zh'
        ? '请基于以上 research 产物生成实现方案。'
        : 'Generate the implementation plan based on the research output above.');
    }
  }

  if (stage === 'annotation_loop') {
    const planFiles = getWorkflowFilesByRole(workflowFiles, 'plan_output', 'annotated_plan');
    if (planFiles.length > 0) {
      parts.push('');
      parts.push(lang === 'zh'
        ? '请基于以上 plan 文件处理批注。'
        : 'Process annotations based on the plan file above.');
    }
  }

  if (stage === 'implement') {
    const planFiles = getWorkflowFilesByRole(workflowFiles, 'plan_output', 'annotated_plan');
    if (planFiles.length > 0) {
      parts.push('');
      parts.push(lang === 'zh'
        ? '请严格按照以上已批准的 plan 进行实现。'
        : 'Implement strictly according to the approved plan above.');
    }
  }

  if (stage === 'verify') {
    const testFiles = getWorkflowFilesByRole(workflowFiles, 'test_report');
    if (testFiles.length > 0) {
      parts.push('');
      parts.push(lang === 'zh'
        ? '请基于以上测试报告继续修复和重新验证。'
        : 'Continue fixing and re-verifying based on the test report above.');
    }
  }
}

export interface FileReviewPromptInput {
  stage: WorkflowStage;
  lang: OutputLanguage;
  userGoal: string;
  reviewFile: WorkflowFile;
  userComments: string;
  pinnedFacts?: PinnedFact[];
}

export function buildFileReviewPrompt(input: FileReviewPromptInput): string {
  const config = getStageConfig(input.stage);
  const parts: string[] = [];

  parts.push(input.lang === 'zh'
    ? `以下是用户对本阶段产物文件 "${input.reviewFile.fileName}" 的审阅意见。请根据这些意见，生成一个让外部 agent 修改该文件的 prompt。`
    : `Below is the user's review of the stage deliverable file "${input.reviewFile.fileName}". Generate a prompt for an external agent to revise this file based on these comments.`);

  parts.push('');
  parts.push(input.lang === 'zh' ? '审阅指导：' : 'Review guidance:');
  parts.push(input.lang === 'zh' ? config.fileReviewGuide.zh : config.fileReviewGuide.en);

  parts.push('');
  parts.push(input.lang === 'zh'
    ? `当前任务目标：${input.userGoal}`
    : `Current goal: ${input.userGoal}`);

  parts.push('');
  parts.push(input.lang === 'zh' ? '用户审阅意见：' : 'User review comments:');
  parts.push(input.userComments);

  const filePreview = input.reviewFile.content.length > 3000
    ? input.reviewFile.content.slice(0, 3000) + '\n... (truncated)'
    : input.reviewFile.content;
  parts.push('');
  parts.push(`--- ${input.reviewFile.fileName} (${input.reviewFile.fileRole}) ---`);
  parts.push(filePreview);

  if (input.pinnedFacts && input.pinnedFacts.length > 0) {
    parts.push('');
    parts.push(input.lang === 'zh' ? '已确认事实：' : 'Confirmed facts:');
    for (const fact of input.pinnedFacts) {
      parts.push(`- [${fact.category}] ${fact.content}`);
    }
  }

  parts.push('');
  parts.push(input.lang === 'zh'
    ? '要求：输出一个完整的 REVISION_PROMPT，让外部 agent 按照审阅意见修改该文件。输出格式：\nREVIEW_SUMMARY: ...\nKEY_ISSUES: ...\nREVISION_PROMPT: ...\nCHEAPER_REVISION_PROMPT: ...'
    : 'Requirement: Output a complete REVISION_PROMPT for the external agent to revise this file per the review comments. Format:\nREVIEW_SUMMARY: ...\nKEY_ISSUES: ...\nREVISION_PROMPT: ...\nCHEAPER_REVISION_PROMPT: ...');

  return parts.join('\n');
}

export function getReadinessWarning(
  stage: WorkflowStage,
  lang: OutputLanguage,
  workflowFiles: WorkflowFile[],
): string | undefined {
  const config = getStageConfig(stage);
  if (!config.readinessCheck) return undefined;

  const { requiredFileRoles } = config.readinessCheck;
  if (!requiredFileRoles || requiredFileRoles.length === 0) return undefined;

  const hasRequired = requiredFileRoles.some((role) =>
    workflowFiles.some((f) => f.fileRole === role),
  );

  if (hasRequired) return undefined;

  return lang === 'zh'
    ? config.readinessCheck.warningZh
    : config.readinessCheck.warningEn;
}
