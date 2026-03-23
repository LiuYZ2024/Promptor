import { describe, it, expect } from 'vitest';
import {
  STAGE_CONFIGS,
  PRIMARY_STAGES,
  SUPPORTING_STAGES,
  getStageConfig,
} from '@/lib/workflow/stage-config';
import type { StageWorkMode } from '@/lib/workflow/stage-config';
import { buildOptimizedPrompt, buildFileReviewPrompt, getReadinessWarning, buildTuningSystemPrompt } from '@/lib/workflow/optimized-prompt';
import { parseTuningOutput, findMissingRequirements, enforceImmutableRequirements } from '@/lib/workflow/tuning-parser';
import type { WorkflowStage, WorkflowFile, PinnedFact } from '@/types/data';

function makeFile(overrides: Partial<WorkflowFile> = {}): WorkflowFile {
  return {
    id: 'f1',
    sessionId: 's1',
    fileName: 'research.md',
    fileRole: 'research_output',
    content: '# Research\n\nSome research content here.',
    mimeType: 'text/markdown',
    sizeBytes: 100,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeFact(overrides: Partial<PinnedFact> = {}): PinnedFact {
  return {
    id: 'pf1',
    sessionId: 's1',
    category: 'constraint',
    content: 'Must use TypeScript',
    priority: 'normal',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

// ─── Stage Config: two-mode support fields ───

describe('Stage Config: work mode fields', () => {
  it('every stage should have a defaultUploadRole', () => {
    for (const [id, cfg] of Object.entries(STAGE_CONFIGS)) {
      expect(cfg.defaultUploadRole).toBeTruthy();
      expect(typeof cfg.defaultUploadRole).toBe('string');
    }
  });

  it('every stage should have fileReviewGuide in both languages', () => {
    for (const [id, cfg] of Object.entries(STAGE_CONFIGS)) {
      expect(cfg.fileReviewGuide.zh.length).toBeGreaterThan(10);
      expect(cfg.fileReviewGuide.en.length).toBeGreaterThan(10);
    }
  });

  it('primary stages should map to expected default upload roles', () => {
    expect(getStageConfig('research').defaultUploadRole).toBe('research_output');
    expect(getStageConfig('plan').defaultUploadRole).toBe('plan_output');
    expect(getStageConfig('annotation_loop').defaultUploadRole).toBe('annotated_plan');
    expect(getStageConfig('implement').defaultUploadRole).toBe('code_summary');
    expect(getStageConfig('verify').defaultUploadRole).toBe('test_report');
  });

  it('StageWorkMode type should include exactly two values', () => {
    const validModes: StageWorkMode[] = ['prompt_tuning', 'file_review'];
    expect(validModes).toHaveLength(2);
  });
});

// ─── File Review Prompt Generation ───

describe('buildFileReviewPrompt', () => {
  it('should include the review file name', () => {
    const result = buildFileReviewPrompt({
      stage: 'research',
      lang: 'zh',
      userGoal: '调研 auth 模块',
      reviewFile: makeFile({ fileName: 'research.md', fileRole: 'research_output' }),
      userComments: '缺少对 middleware 的分析',
    });
    expect(result).toContain('research.md');
  });

  it('should include user review comments', () => {
    const result = buildFileReviewPrompt({
      stage: 'research',
      lang: 'en',
      userGoal: 'Research auth module',
      reviewFile: makeFile(),
      userComments: 'Missing middleware analysis',
    });
    expect(result).toContain('Missing middleware analysis');
  });

  it('should include the file review guide from stage config', () => {
    const result = buildFileReviewPrompt({
      stage: 'plan',
      lang: 'zh',
      userGoal: '实现用户注册',
      reviewFile: makeFile({ fileName: 'plan.md', fileRole: 'plan_output' }),
      userComments: '缺少数据库 schema 设计',
    });
    const planConfig = getStageConfig('plan');
    expect(result).toContain(planConfig.fileReviewGuide.zh);
  });

  it('should include the file content (or truncated version)', () => {
    const result = buildFileReviewPrompt({
      stage: 'research',
      lang: 'en',
      userGoal: 'Research',
      reviewFile: makeFile({ content: 'Short content' }),
      userComments: 'Needs more detail',
    });
    expect(result).toContain('Short content');
  });

  it('should truncate very long file content', () => {
    const longContent = 'x'.repeat(5000);
    const result = buildFileReviewPrompt({
      stage: 'research',
      lang: 'en',
      userGoal: 'Research',
      reviewFile: makeFile({ content: longContent }),
      userComments: 'Too short',
    });
    expect(result).toContain('(truncated)');
    expect(result.length).toBeLessThan(longContent.length);
  });

  it('should include pinned facts when provided', () => {
    const result = buildFileReviewPrompt({
      stage: 'plan',
      lang: 'en',
      userGoal: 'Plan implementation',
      reviewFile: makeFile({ fileName: 'plan.md', fileRole: 'plan_output' }),
      userComments: 'Missing test strategy',
      pinnedFacts: [makeFact({ content: 'Must use TypeScript' })],
    });
    expect(result).toContain('Must use TypeScript');
  });

  it('should request structured output format (REVISION_PROMPT)', () => {
    const result = buildFileReviewPrompt({
      stage: 'research',
      lang: 'zh',
      userGoal: '调研代码库',
      reviewFile: makeFile(),
      userComments: '遗漏了重要模块',
    });
    expect(result).toContain('REVISION_PROMPT');
    expect(result).toContain('KEY_ISSUES');
    expect(result).toContain('REVIEW_SUMMARY');
  });

  it('should include the current goal', () => {
    const result = buildFileReviewPrompt({
      stage: 'verify',
      lang: 'en',
      userGoal: 'Add user auth',
      reviewFile: makeFile({ fileName: 'test-report.md', fileRole: 'test_report' }),
      userComments: 'Missing edge cases',
    });
    expect(result).toContain('Add user auth');
  });

  it('should produce a prompt that instructs external agent revision (not direct rewrite)', () => {
    const result = buildFileReviewPrompt({
      stage: 'research',
      lang: 'zh',
      userGoal: '调研',
      reviewFile: makeFile(),
      userComments: '需要补充',
    });
    expect(result).toContain('外部 agent');
    expect(result).toContain('修改');
  });

  it('should produce English prompt when lang is en', () => {
    const result = buildFileReviewPrompt({
      stage: 'research',
      lang: 'en',
      userGoal: 'Research',
      reviewFile: makeFile(),
      userComments: 'Needs work',
    });
    expect(result).toContain('external agent');
    expect(result).toContain('revise');
  });
});

// ─── Annotation Loop file review specifics ───

describe('Annotation Loop file review', () => {
  it('annotation_loop config file review guide should mention "不要实现代码" in zh', () => {
    const cfg = getStageConfig('annotation_loop');
    expect(cfg.fileReviewGuide.zh).toContain('不要实现代码');
  });

  it('annotation_loop config file review guide should mention "Do not implement" in en', () => {
    const cfg = getStageConfig('annotation_loop');
    expect(cfg.fileReviewGuide.en).toContain('Do not implement');
  });
});

// ─── Verify stage file review ───

describe('Verify stage file review', () => {
  it('verify config should default to test_report upload role', () => {
    const cfg = getStageConfig('verify');
    expect(cfg.defaultUploadRole).toBe('test_report');
  });

  it('verify file review guide should mention failures', () => {
    const cfg = getStageConfig('verify');
    expect(cfg.fileReviewGuide.zh).toContain('失败');
    expect(cfg.fileReviewGuide.en).toContain('failure');
  });
});

// ─── Prompt Tuning mode still produces optimized prompts ───

describe('Prompt Tuning mode (buildOptimizedPrompt)', () => {
  it('should still include base prompt content', () => {
    const result = buildOptimizedPrompt({
      stage: 'research',
      lang: 'zh',
      userGoal: '调研认证模块',
      workflowFiles: [],
    });
    expect(result).toContain('research');
  });

  it('should include user goal', () => {
    const result = buildOptimizedPrompt({
      stage: 'plan',
      lang: 'en',
      userGoal: 'Implement user auth',
      workflowFiles: [],
    });
    expect(result).toContain('Implement user auth');
  });

  it('should include relevant uploaded files', () => {
    const researchFile = makeFile({
      fileName: 'research.md',
      fileRole: 'research_output',
      content: 'Found key modules: auth, middleware, db',
    });
    const result = buildOptimizedPrompt({
      stage: 'plan',
      lang: 'zh',
      userGoal: '规划实现',
      workflowFiles: [researchFile],
    });
    expect(result).toContain('auth, middleware, db');
  });

  it('should not include irrelevant files', () => {
    const testFile = makeFile({
      id: 'f2',
      fileName: 'test-report.md',
      fileRole: 'test_report',
      content: 'All tests passed',
    });
    const result = buildOptimizedPrompt({
      stage: 'research',
      lang: 'zh',
      userGoal: '调研',
      workflowFiles: [testFile],
    });
    expect(result).not.toContain('All tests passed');
  });
});

// ─── Two modes are structurally distinct ───

describe('Two-mode structural separation', () => {
  it('prompt_tuning output format should not mention REVISION_PROMPT', () => {
    const result = buildOptimizedPrompt({
      stage: 'research',
      lang: 'zh',
      userGoal: '调研',
      workflowFiles: [],
    });
    expect(result).not.toContain('REVISION_PROMPT');
  });

  it('file_review output should mention REVISION_PROMPT and KEY_ISSUES', () => {
    const result = buildFileReviewPrompt({
      stage: 'research',
      lang: 'en',
      userGoal: 'Research',
      reviewFile: makeFile(),
      userComments: 'Needs improvement',
    });
    expect(result).toContain('REVISION_PROMPT');
    expect(result).toContain('KEY_ISSUES');
  });
});

// ─── Tuning Output Parser ───

describe('parseTuningOutput', () => {
  const SAMPLE_OUTPUT = `## DIAGNOSIS
The original prompt is too vague.

## ASSUMPTIONS_ADDED
Assuming TypeScript project with React.

## FINAL_PROMPT
深入阅读当前代码库中与 scheme12 相关的所有代码。
重点关注：
- scheme12 的定义和入口
- 依赖关系和调用链
完成后写入 research.md。

## CHEAPER_VARIANT
阅读 scheme12 相关代码，输出关键模块和依赖到 research.md。

## SUGGESTED_PINNED_FACTS
- scheme12 是主要调研目标`;

  it('should extract FINAL_PROMPT as the primary output', () => {
    const result = parseTuningOutput(SAMPLE_OUTPUT);
    expect(result.hasStructuredOutput).toBe(true);
    expect(result.finalPrompt).toContain('scheme12');
    expect(result.finalPrompt).toContain('research.md');
  });

  it('should extract CHEAPER_VARIANT', () => {
    const result = parseTuningOutput(SAMPLE_OUTPUT);
    expect(result.cheaperVariant).toBeTruthy();
    expect(result.cheaperVariant).toContain('scheme12');
  });

  it('should extract DIAGNOSIS', () => {
    const result = parseTuningOutput(SAMPLE_OUTPUT);
    expect(result.diagnosis).toContain('vague');
  });

  it('should extract ASSUMPTIONS_ADDED', () => {
    const result = parseTuningOutput(SAMPLE_OUTPUT);
    expect(result.assumptionsAdded).toContain('TypeScript');
  });

  it('should extract SUGGESTED_PINNED_FACTS', () => {
    const result = parseTuningOutput(SAMPLE_OUTPUT);
    expect(result.suggestedPinnedFacts).toContain('scheme12');
  });

  it('should report hasStructuredOutput=false when no FINAL_PROMPT section exists', () => {
    const noPrompt = `## DIAGNOSIS
Some analysis text.
## ASSUMPTIONS_ADDED
Some assumptions.`;
    const result = parseTuningOutput(noPrompt);
    expect(result.hasStructuredOutput).toBe(false);
    expect(result.finalPrompt).toBeNull();
  });

  it('should handle FINAL_PROMPT with underscores replaced by spaces', () => {
    const output = `## FINAL PROMPT
Check the codebase for auth patterns.

## CHEAPER VARIANT
Check auth module.`;
    const result = parseTuningOutput(output);
    expect(result.hasStructuredOutput).toBe(true);
    expect(result.finalPrompt).toContain('auth patterns');
    expect(result.cheaperVariant).toContain('auth module');
  });

  it('should handle case-insensitive headings', () => {
    const output = `## Final_Prompt
Review all modules.

## Cheaper_Variant
Review key modules.`;
    const result = parseTuningOutput(output);
    expect(result.hasStructuredOutput).toBe(true);
    expect(result.finalPrompt).toContain('Review all modules');
  });

  it('should return null for sections not present', () => {
    const minimal = `## FINAL_PROMPT
Just the prompt content here.`;
    const result = parseTuningOutput(minimal);
    expect(result.hasStructuredOutput).toBe(true);
    expect(result.finalPrompt).toContain('Just the prompt');
    expect(result.cheaperVariant).toBeNull();
    expect(result.diagnosis).toBeNull();
    expect(result.assumptionsAdded).toBeNull();
    expect(result.suggestedPinnedFacts).toBeNull();
  });

  it('should handle completely unstructured text gracefully', () => {
    const raw = 'This is just a plain text response with no sections.';
    const result = parseTuningOutput(raw);
    expect(result.hasStructuredOutput).toBe(false);
    expect(result.finalPrompt).toBeNull();
  });

  it('FINAL_PROMPT should be the primary deliverable, not DIAGNOSIS', () => {
    const result = parseTuningOutput(SAMPLE_OUTPUT);
    expect(result.finalPrompt).toBeTruthy();
    expect(result.finalPrompt!.length).toBeGreaterThan(0);
    if (result.diagnosis) {
      expect(result.finalPrompt!.length).toBeGreaterThan(result.diagnosis.length);
    }
  });
});

// ─── Prompt-first UI contract ───

describe('Prompt-first output contract', () => {
  it('parseTuningOutput primary fields are finalPrompt and cheaperVariant', () => {
    const result = parseTuningOutput(`## FINAL_PROMPT
The main prompt.
## CHEAPER_VARIANT
Short version.
## DIAGNOSIS
Analysis.`);
    expect(result.finalPrompt).toBe('The main prompt.');
    expect(result.cheaperVariant).toBe('Short version.');
    expect(result.diagnosis).toBe('Analysis.');
  });

  it('DIAGNOSIS without FINAL_PROMPT should not count as structured', () => {
    const result = parseTuningOutput(`## DIAGNOSIS
Only analysis, no prompt.`);
    expect(result.hasStructuredOutput).toBe(false);
  });

  it('computed prompt fallback: activePrompt is computedPrompt when no tuning', () => {
    const computedPrompt = buildOptimizedPrompt({
      stage: 'research',
      lang: 'zh',
      userGoal: '调研 scheme12',
      workflowFiles: [],
    });
    const tuningResult = parseTuningOutput('unstructured response');
    const activePrompt = tuningResult.finalPrompt || computedPrompt;
    expect(activePrompt).toBe(computedPrompt);
    expect(activePrompt.length).toBeGreaterThan(0);
  });

  it('refined prompt replaces computed when tuning succeeds', () => {
    const computedPrompt = buildOptimizedPrompt({
      stage: 'research',
      lang: 'zh',
      userGoal: '调研 scheme12',
      workflowFiles: [],
    });
    const tuningResult = parseTuningOutput(`## FINAL_PROMPT
深入阅读 scheme12 代码，输出到 research.md。`);
    const activePrompt = tuningResult.finalPrompt || computedPrompt;
    expect(activePrompt).not.toBe(computedPrompt);
    expect(activePrompt).toContain('scheme12');
  });
});

// ─── Immutable Requirements ───

describe('Stage immutable requirements', () => {
  const ALL_STAGES: WorkflowStage[] = [
    'research', 'plan', 'annotation_loop', 'implement', 'verify',
    'requirement', 'discussion', 'solidify',
  ];

  for (const stageId of ALL_STAGES) {
    it(`${stageId} should have immutableRequirements in zh and en`, () => {
      const cfg = getStageConfig(stageId);
      expect(cfg.immutableRequirements.zh.length).toBeGreaterThan(0);
      expect(cfg.immutableRequirements.en.length).toBeGreaterThan(0);
    });
  }

  it('research immutable requirements must include research.md and do-not-modify-code (zh)', () => {
    const cfg = getStageConfig('research');
    const joined = cfg.immutableRequirements.zh.join(' ');
    expect(joined).toContain('research.md');
    expect(joined).toContain('不要修改代码');
  });

  it('research immutable requirements must include research.md and do-not-modify (en)', () => {
    const cfg = getStageConfig('research');
    const joined = cfg.immutableRequirements.en.join(' ');
    expect(joined).toContain('research.md');
    expect(joined).toContain('Do not modify code');
  });

  it('plan immutable requirements must include plan.md and do-not-implement (zh)', () => {
    const cfg = getStageConfig('plan');
    const joined = cfg.immutableRequirements.zh.join(' ');
    expect(joined).toContain('plan.md');
    expect(joined).toContain('不要实现代码');
  });

  it('plan immutable requirements must include plan.md and do-not-implement (en)', () => {
    const cfg = getStageConfig('plan');
    const joined = cfg.immutableRequirements.en.join(' ');
    expect(joined).toContain('plan.md');
    expect(joined).toContain('Do not implement');
  });

  it('verify immutable requirements must include test-report.md (zh)', () => {
    const cfg = getStageConfig('verify');
    const joined = cfg.immutableRequirements.zh.join(' ');
    expect(joined).toContain('test-report.md');
  });

  it('annotation_loop immutable requirements must include do-not-implement (zh)', () => {
    const cfg = getStageConfig('annotation_loop');
    const joined = cfg.immutableRequirements.zh.join(' ');
    expect(joined).toContain('不要实现代码');
  });

  it('implement immutable requirements must include plan.md and typecheck (en)', () => {
    const cfg = getStageConfig('implement');
    const joined = cfg.immutableRequirements.en.join(' ');
    expect(joined).toContain('plan.md');
    expect(joined).toContain('typecheck');
  });
});

// ─── findMissingRequirements ───

describe('findMissingRequirements', () => {
  it('should return empty when all requirements are present', () => {
    const prompt = '深入阅读代码，把发现详细写入 research.md。先做 research，不要给实现方案。不要修改代码。明确列出相关文件、模块、数据流和不确定点。';
    const reqs = getStageConfig('research').immutableRequirements.zh;
    const missing = findMissingRequirements(prompt, reqs);
    expect(missing).toHaveLength(0);
  });

  it('should detect missing requirements', () => {
    const prompt = '深入阅读 scheme12 代码。';
    const reqs = getStageConfig('research').immutableRequirements.zh;
    const missing = findMissingRequirements(prompt, reqs);
    expect(missing.length).toBeGreaterThan(0);
    expect(missing.some(r => r.includes('research.md'))).toBe(true);
  });

  it('should handle English requirements', () => {
    const prompt = 'Read scheme12 code deeply and write to research.md. Do research first.';
    const reqs = getStageConfig('research').immutableRequirements.en;
    const missing = findMissingRequirements(prompt, reqs);
    expect(missing.some(r => r.includes('Do not modify code'))).toBe(true);
  });
});

// ─── enforceImmutableRequirements ───

describe('enforceImmutableRequirements', () => {
  it('should not modify prompt when all requirements present', () => {
    const prompt = '把发现详细写入 research.md。先做 research，不要给实现方案。不要修改代码。明确列出相关文件、模块、数据流和不确定点。';
    const reqs = getStageConfig('research').immutableRequirements.zh;
    const result = enforceImmutableRequirements(prompt, reqs, 'zh');
    expect(result.injected).toHaveLength(0);
    expect(result.text).toBe(prompt);
  });

  it('should inject missing requirements at the end', () => {
    const prompt = '阅读 scheme12 代码，写入 research.md。';
    const reqs = getStageConfig('research').immutableRequirements.zh;
    const result = enforceImmutableRequirements(prompt, reqs, 'zh');
    expect(result.injected.length).toBeGreaterThan(0);
    expect(result.text).toContain('要求：');
    expect(result.text.startsWith(prompt)).toBe(true);
  });

  it('should produce English block for en lang', () => {
    const prompt = 'Read scheme12 code.';
    const reqs = getStageConfig('research').immutableRequirements.en;
    const result = enforceImmutableRequirements(prompt, reqs, 'en');
    expect(result.text).toContain('Requirements:');
  });

  it('plan enforcement should inject missing do-not-implement', () => {
    const prompt = '基于 research 生成 plan.md，包括分步骤实现思路、文件路径、代码草图、取舍、风险点、验证方法。';
    const reqs = getStageConfig('plan').immutableRequirements.zh;
    const result = enforceImmutableRequirements(prompt, reqs, 'zh');
    expect(result.text).toContain('不要实现代码');
  });
});

// ─── buildTuningSystemPrompt ───

describe('buildTuningSystemPrompt', () => {
  it('should include the base prompt', () => {
    const result = buildTuningSystemPrompt({
      stage: 'research',
      lang: 'zh',
      userGoal: '调研 scheme12',
      userTuningRequest: '主要查看scheme12的相关代码',
      currentOptimizedPrompt: '当前优化版本...',
      workflowFiles: [],
    });
    const cfg = getStageConfig('research');
    expect(result).toContain(cfg.basePrompt.zh);
  });

  it('should include all immutable requirements', () => {
    const cfg = getStageConfig('research');
    const result = buildTuningSystemPrompt({
      stage: 'research',
      lang: 'zh',
      userGoal: '调研 auth',
      userTuningRequest: '重点看认证模块',
      currentOptimizedPrompt: '...',
      workflowFiles: [],
    });
    for (const req of cfg.immutableRequirements.zh) {
      expect(result).toContain(req);
    }
  });

  it('should include the deliverable file name', () => {
    const result = buildTuningSystemPrompt({
      stage: 'plan',
      lang: 'en',
      userGoal: 'Plan auth implementation',
      userTuningRequest: 'Focus on OAuth flow',
      currentOptimizedPrompt: '...',
      workflowFiles: [],
    });
    expect(result).toContain('plan.md');
  });

  it('should instruct additive optimization, not rewriting (zh)', () => {
    const result = buildTuningSystemPrompt({
      stage: 'research',
      lang: 'zh',
      userGoal: '调研',
      userTuningRequest: '关注 scheme12',
      currentOptimizedPrompt: '...',
      workflowFiles: [],
    });
    expect(result).toContain('不是重写');
  });

  it('should instruct additive optimization, not rewriting (en)', () => {
    const result = buildTuningSystemPrompt({
      stage: 'research',
      lang: 'en',
      userGoal: 'Research',
      userTuningRequest: 'Focus on scheme12',
      currentOptimizedPrompt: '...',
      workflowFiles: [],
    });
    expect(result).toContain('NOT a complete rewrite');
  });

  it('should include FINAL_PROMPT output instruction', () => {
    const result = buildTuningSystemPrompt({
      stage: 'verify',
      lang: 'zh',
      userGoal: '验证',
      userTuningRequest: '重点检查边界情况',
      currentOptimizedPrompt: '...',
      workflowFiles: [],
    });
    expect(result).toContain('FINAL_PROMPT');
    expect(result).toContain('CHEAPER_VARIANT');
  });

  it('should include pinned facts when provided', () => {
    const result = buildTuningSystemPrompt({
      stage: 'research',
      lang: 'en',
      userGoal: 'Research',
      userTuningRequest: 'Focus on auth',
      currentOptimizedPrompt: '...',
      workflowFiles: [],
      pinnedFacts: [makeFact({ content: 'Use TypeScript only' })],
    });
    expect(result).toContain('Use TypeScript only');
  });

  it('should include relevant workflow files', () => {
    const result = buildTuningSystemPrompt({
      stage: 'plan',
      lang: 'zh',
      userGoal: '规划',
      userTuningRequest: '关注数据库设计',
      currentOptimizedPrompt: '...',
      workflowFiles: [
        makeFile({ fileName: 'research.md', fileRole: 'research_output', content: 'Found auth module.' }),
      ],
    });
    expect(result).toContain('Found auth module.');
  });
});
