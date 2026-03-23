import { describe, it, expect } from 'vitest';
import { getTemplate, getStageTemplates } from '@/lib/prompts/registry';
import { getBehaviorContract } from '@/lib/prompts/contracts/behavior-contract';
import { HEADINGS } from '@/lib/prompts/heading-constants';
import type { PromptTemplateSpec, FixedSection } from '@/types/prompt';

/**
 * Tests verifying Promptor's core product posture:
 * - Promptor generates prompts for external agents
 * - Promptor does NOT execute tasks directly
 * - Stage templates output FINAL_PROMPT, not direct task answers
 */

describe('Prompt Generation Posture', () => {
  describe('Behavior Contract', () => {
    const contract = getBehaviorContract();

    it('should explicitly state prompt-generation identity', () => {
      expect(contract).toContain('Prompt Architect');
      expect(contract).toContain('PROMPT GENERATION FIRST');
    });

    it('should declare that Promptor is NOT the execution agent', () => {
      expect(contract).toContain('NOT the execution agent');
    });

    it('should instruct never to say "I cannot access"', () => {
      expect(contract).toContain('NEVER say "I cannot access the repository"');
    });

    it('should declare FINAL_PROMPT as the primary output', () => {
      expect(contract).toContain('FINAL_PROMPT');
      expect(contract).toContain('primary output');
    });
  });

  describe('Stage templates produce prompts, not direct answers', () => {
    const PROMPT_GENERATION_STAGES = [
      'stage:requirement',
      'stage:research',
      'stage:discussion',
      'stage:plan',
      'stage:annotation_loop',
      'stage:solidify',
    ] as const;

    for (const stageId of PROMPT_GENERATION_STAGES) {
      describe(`${stageId}`, () => {
        const template = getTemplate(stageId);
        const requiredKeys = template.outputContract.requiredSections.map(
          (s: FixedSection) => s.key,
        );

        it('should have FINAL_PROMPT as a required section', () => {
          expect(requiredKeys).toContain('FINAL_PROMPT');
        });

        it('should have DIAGNOSIS as a required section', () => {
          expect(requiredKeys).toContain('DIAGNOSIS');
        });

        it('should have FINAL_PROMPT as a critical section', () => {
          expect(template.failureContract.criticalSections).toContain(
            'FINAL_PROMPT',
          );
        });

        it('should have CHEAPER_VARIANT in output', () => {
          const allKeys = [
            ...template.outputContract.requiredSections,
            ...template.outputContract.optionalSections,
          ].map((s: FixedSection) => s.key);
          expect(allKeys).toContain('CHEAPER_VARIANT');
        });

        it('stageContract should mention generating a prompt, not executing the task', () => {
          const contract = template.stageContract.toLowerCase();
          expect(contract).toMatch(/generate.*prompt|producing.*prompt/);
          expect(contract).toMatch(
            /not.*yourself|not.*doing.*yourself|not.*extracting.*yourself|not.*making.*decision.*yourself|not.*create.*plan.*yourself|not.*process.*yourself|not.*extract.*yourself/i,
          );
        });

        it('weakModelSpec should ban "I cannot access" phrases', () => {
          const banned = template.weakModelSpec.bannedPhrases;
          const hasAccessBan = banned.some(
            (p: string) =>
              p.includes('cannot access') || p.includes("don't have access"),
          );
          expect(hasAccessBan).toBe(true);
        });
      });
    }
  });

  describe('Research-style request produces research prompt', () => {
    const template = getTemplate('stage:research');

    it('should NOT output direct research findings sections', () => {
      const requiredKeys = template.outputContract.requiredSections.map(
        (s: FixedSection) => s.key,
      );
      expect(requiredKeys).not.toContain('EXISTING_CONTEXT');
      expect(requiredKeys).not.toContain('KEY_MODULES');
      expect(requiredKeys).not.toContain('RELEVANT_PATTERNS');
      expect(requiredKeys).not.toContain('BOUNDARIES');
      expect(requiredKeys).not.toContain('GAPS');
      expect(requiredKeys).not.toContain('RESEARCH_SUMMARY');
    });

    it('should output FINAL_PROMPT containing instructions for the external agent', () => {
      const finalPromptSection = template.outputContract.requiredSections.find(
        (s: FixedSection) => s.key === 'FINAL_PROMPT',
      );
      expect(finalPromptSection).toBeDefined();
      expect(finalPromptSection!.description).toMatch(/external agent/i);
    });

    it('skeleton example should show a prompt for an agent, not direct findings', () => {
      const skeleton = template.outputContract.skeletonExample ?? '';
      expect(skeleton).toContain(HEADINGS.FINAL_PROMPT);
      expect(skeleton).not.toMatch(
        /I cannot access|I don't have access|I lack/,
      );
    });
  });

  describe('Plan-style request produces planning prompt', () => {
    const template = getTemplate('stage:plan');

    it('should NOT output direct plan sections', () => {
      const requiredKeys = template.outputContract.requiredSections.map(
        (s: FixedSection) => s.key,
      );
      expect(requiredKeys).not.toContain('STEP_BY_STEP_PLAN');
      expect(requiredKeys).not.toContain('CODE_SKETCHES');
      expect(requiredKeys).not.toContain('FILES_TO_MODIFY');
      expect(requiredKeys).not.toContain('PRECONDITIONS');
    });

    it('should output FINAL_PROMPT as a planning prompt for external agent', () => {
      const finalPromptSection = template.outputContract.requiredSections.find(
        (s: FixedSection) => s.key === 'FINAL_PROMPT',
      );
      expect(finalPromptSection).toBeDefined();
      expect(finalPromptSection!.description).toMatch(/external agent/i);
    });
  });

  describe('Discussion-style request produces discussion prompt', () => {
    const template = getTemplate('stage:discussion');

    it('should NOT output direct discussion analysis sections', () => {
      const requiredKeys = template.outputContract.requiredSections.map(
        (s: FixedSection) => s.key,
      );
      expect(requiredKeys).not.toContain('CANDIDATE_APPROACHES');
      expect(requiredKeys).not.toContain('TRADEOFF_MATRIX');
      expect(requiredKeys).not.toContain('RECOMMENDED_DIRECTION');
      expect(requiredKeys).not.toContain('PROBLEM_FRAMING');
    });

    it('should output FINAL_PROMPT as a discussion prompt for external agent', () => {
      const finalPromptSection = template.outputContract.requiredSections.find(
        (s: FixedSection) => s.key === 'FINAL_PROMPT',
      );
      expect(finalPromptSection).toBeDefined();
      expect(finalPromptSection!.description).toMatch(/external agent/i);
    });
  });

  describe('Implement and Verify stages remain correctly postured', () => {
    it('stage:implement should still produce IMPLEMENTATION_PROMPT (already correct)', () => {
      const template = getTemplate('stage:implement');
      const requiredKeys = template.outputContract.requiredSections.map(
        (s: FixedSection) => s.key,
      );
      expect(requiredKeys).toContain('IMPLEMENTATION_PROMPT');
    });

    it('stage:verify should still produce VERIFICATION_PROMPT (already correct)', () => {
      const template = getTemplate('stage:verify');
      const requiredKeys = template.outputContract.requiredSections.map(
        (s: FixedSection) => s.key,
      );
      expect(requiredKeys).toContain('VERIFICATION_PROMPT');
    });
  });

  describe('All stage templates share prompt-generation output structure', () => {
    it('all stage templates should have at least one prompt-output section (FINAL_PROMPT or IMPLEMENTATION_PROMPT or VERIFICATION_PROMPT)', () => {
      const PROMPT_KEYS = [
        'FINAL_PROMPT',
        'IMPLEMENTATION_PROMPT',
        'VERIFICATION_PROMPT',
      ];
      for (const template of getStageTemplates()) {
        const requiredKeys = template.outputContract.requiredSections.map(
          (s: FixedSection) => s.key,
        );
        const hasPromptOutput = PROMPT_KEYS.some((k) =>
          requiredKeys.includes(k),
        );
        expect(
          hasPromptOutput,
          `${template.id} should have a prompt-output section`,
        ).toBe(true);
      }
    });
  });
});
