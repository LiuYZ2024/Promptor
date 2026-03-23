import { describe, it, expect } from 'vitest';
import {
  STAGE_CONFIGS,
  PRIMARY_STAGES,
  SUPPORTING_STAGES,
  getStageConfig,
  getOrderedStages,
} from '@/lib/workflow/stage-config';
import { buildOptimizedPrompt, getReadinessWarning } from '@/lib/workflow/optimized-prompt';
import { extractSessionTitle } from '@/hooks/use-sessions';
import { WORKFLOW_FILE_ROLES, WORKFLOW_FILE_ROLE_LABELS } from '@/types/data';
import type { WorkflowStage, WorkflowFile } from '@/types/data';

describe('Stage Configuration Registry', () => {
  it('should define all 8 workflow stages', () => {
    const stages = Object.keys(STAGE_CONFIGS);
    expect(stages).toHaveLength(8);
    expect(stages).toContain('research');
    expect(stages).toContain('plan');
    expect(stages).toContain('annotation_loop');
    expect(stages).toContain('implement');
    expect(stages).toContain('verify');
    expect(stages).toContain('requirement');
    expect(stages).toContain('discussion');
    expect(stages).toContain('solidify');
  });

  it('should have 5 primary stages and 3 supporting stages', () => {
    expect(PRIMARY_STAGES).toHaveLength(5);
    expect(SUPPORTING_STAGES).toHaveLength(3);
  });

  it('primary stages should be research → plan → annotation_loop → implement → verify', () => {
    expect(PRIMARY_STAGES).toEqual([
      'research',
      'plan',
      'annotation_loop',
      'implement',
      'verify',
    ]);
  });

  describe('each stage config', () => {
    const ALL_STAGES: WorkflowStage[] = [
      'research', 'plan', 'annotation_loop', 'implement', 'verify',
      'requirement', 'discussion', 'solidify',
    ];

    for (const stageId of ALL_STAGES) {
      describe(`${stageId}`, () => {
        const config = getStageConfig(stageId);

        it('should have intro in zh and en', () => {
          expect(config.intro.zh).toBeTruthy();
          expect(config.intro.en).toBeTruthy();
        });

        it('should have whyItMatters in zh and en', () => {
          expect(config.whyItMatters.zh).toBeTruthy();
          expect(config.whyItMatters.en).toBeTruthy();
        });

        it('should have deliverable in zh and en', () => {
          expect(config.deliverable.zh).toBeTruthy();
          expect(config.deliverable.en).toBeTruthy();
        });

        it('should have basePrompt in zh and en', () => {
          expect(config.basePrompt.zh).toBeTruthy();
          expect(config.basePrompt.en).toBeTruthy();
        });

        it('should have nextStepHint in zh and en', () => {
          expect(config.nextStepHint.zh).toBeTruthy();
          expect(config.nextStepHint.en).toBeTruthy();
        });

        it('should have at least one relevant file role', () => {
          expect(config.relevantFileRoles.length).toBeGreaterThan(0);
        });

        it('should have a defaultUploadRole', () => {
          expect(config.defaultUploadRole).toBeTruthy();
        });

        it('should have fileReviewGuide in zh and en', () => {
          expect(config.fileReviewGuide.zh.length).toBeGreaterThan(10);
          expect(config.fileReviewGuide.en.length).toBeGreaterThan(10);
        });

        it('should have immutableRequirements in zh and en', () => {
          expect(config.immutableRequirements.zh.length).toBeGreaterThan(0);
          expect(config.immutableRequirements.en.length).toBeGreaterThan(0);
        });
      });
    }
  });

  it('getOrderedStages should return stages sorted by order', () => {
    const ordered = getOrderedStages();
    for (let i = 1; i < ordered.length; i++) {
      expect(ordered[i].order).toBeGreaterThanOrEqual(ordered[i - 1].order);
    }
  });

  it('primary stages should be marked isPrimary=true', () => {
    for (const stage of PRIMARY_STAGES) {
      expect(getStageConfig(stage).isPrimary).toBe(true);
    }
  });

  it('supporting stages should be marked isPrimary=false', () => {
    for (const stage of SUPPORTING_STAGES) {
      expect(getStageConfig(stage).isPrimary).toBe(false);
    }
  });
});

describe('Stage Readiness Warnings', () => {
  const emptyFiles: WorkflowFile[] = [];

  it('plan stage should warn if no research_output file', () => {
    const warning = getReadinessWarning('plan', 'zh', emptyFiles);
    expect(warning).toBeTruthy();
    expect(warning).toContain('research');
  });

  it('plan stage should NOT warn if research_output exists', () => {
    const files: WorkflowFile[] = [
      makeFile('research_output', 'research.md'),
    ];
    const warning = getReadinessWarning('plan', 'zh', files);
    expect(warning).toBeUndefined();
  });

  it('implement stage should warn if no plan_output file', () => {
    const warning = getReadinessWarning('implement', 'zh', emptyFiles);
    expect(warning).toBeTruthy();
    expect(warning).toContain('plan');
  });

  it('implement stage should NOT warn if plan_output exists', () => {
    const files: WorkflowFile[] = [makeFile('plan_output', 'plan.md')];
    const warning = getReadinessWarning('implement', 'zh', files);
    expect(warning).toBeUndefined();
  });

  it('research stage should never warn (always ready)', () => {
    const warning = getReadinessWarning('research', 'zh', emptyFiles);
    expect(warning).toBeUndefined();
  });

  it('annotation_loop should warn if no plan_output', () => {
    const warning = getReadinessWarning('annotation_loop', 'zh', emptyFiles);
    expect(warning).toBeTruthy();
  });
});

describe('Optimized Prompt Generation', () => {
  it('should include base prompt content', () => {
    const prompt = buildOptimizedPrompt({
      stage: 'research',
      lang: 'zh',
      userGoal: '调研 auth 模块',
      workflowFiles: [],
    });
    expect(prompt).toContain('深入阅读');
  });

  it('should include user goal', () => {
    const prompt = buildOptimizedPrompt({
      stage: 'research',
      lang: 'zh',
      userGoal: '调研 scheme12',
      workflowFiles: [],
    });
    expect(prompt).toContain('调研 scheme12');
  });

  it('should include relevant workflow file content', () => {
    const files: WorkflowFile[] = [
      makeFile('research_output', 'research.md', 'auth module analysis'),
    ];
    const prompt = buildOptimizedPrompt({
      stage: 'plan',
      lang: 'zh',
      userGoal: '生成实现方案',
      workflowFiles: files,
    });
    expect(prompt).toContain('auth module analysis');
    expect(prompt).toContain('research.md');
  });

  it('should NOT include irrelevant files', () => {
    const files: WorkflowFile[] = [
      makeFile('test_report', 'test-report.md', 'test results'),
    ];
    const prompt = buildOptimizedPrompt({
      stage: 'research',
      lang: 'zh',
      userGoal: '调研模块',
      workflowFiles: files,
    });
    expect(prompt).not.toContain('test results');
  });

  it('should include pinned facts', () => {
    const prompt = buildOptimizedPrompt({
      stage: 'plan',
      lang: 'zh',
      userGoal: '生成方案',
      workflowFiles: [],
      pinnedFacts: [
        {
          id: '1',
          sessionId: 's1',
          category: 'constraint',
          content: 'Must use TypeScript',
          priority: 'high',
          createdAt: '',
          updatedAt: '',
        },
      ],
    });
    expect(prompt).toContain('Must use TypeScript');
  });

  it('english lang should use english base prompt', () => {
    const prompt = buildOptimizedPrompt({
      stage: 'research',
      lang: 'en',
      userGoal: 'investigate auth',
      workflowFiles: [],
    });
    expect(prompt).toContain('Read the relevant');
    expect(prompt).not.toContain('深入阅读');
  });
});

describe('Session Auto-naming', () => {
  it('should extract title from Chinese input', () => {
    expect(extractSessionTitle('调研现在代码库scheme12相关代码')).toBe(
      '调研现在代码库scheme12相关代码',
    );
  });

  it('should extract title from English input', () => {
    expect(extractSessionTitle('Investigate the auth module')).toBe(
      'Investigate the auth module',
    );
  });

  it('should truncate long titles to 40 chars', () => {
    const long = 'A'.repeat(60);
    const title = extractSessionTitle(long);
    expect(title.length).toBeLessThanOrEqual(42);
    expect(title).toContain('…');
  });

  it('should use first line only', () => {
    expect(extractSessionTitle('First line\nSecond line')).toBe('First line');
  });

  it('should strip markdown prefixes', () => {
    expect(extractSessionTitle('# My heading')).toBe('My heading');
    expect(extractSessionTitle('- bullet item')).toBe('bullet item');
  });

  it('should fallback to timestamp for empty input', () => {
    const title = extractSessionTitle('');
    expect(title).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
  });

  it('should fallback to timestamp for very short input', () => {
    const title = extractSessionTitle('a');
    expect(title).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
  });
});

describe('File Upload Role Inference', () => {
  it('uploaded files should be assignable to all defined roles', () => {
    expect(WORKFLOW_FILE_ROLES.length).toBe(7);
    for (const role of WORKFLOW_FILE_ROLES) {
      expect(WORKFLOW_FILE_ROLE_LABELS[role]).toBeTruthy();
    }
  });
});

function makeFile(
  role: WorkflowFile['fileRole'],
  name: string,
  content = 'file content',
): WorkflowFile {
  return {
    id: `f-${name}`,
    sessionId: 's1',
    fileName: name,
    fileRole: role,
    content,
    mimeType: 'text/plain',
    sizeBytes: content.length,
    createdAt: '',
    updatedAt: '',
  };
}
