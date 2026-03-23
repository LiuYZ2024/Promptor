import { describe, it, expect } from 'vitest';
import {
  getTemplate,
  getAllTemplateIds,
  getTaskTemplates,
  getStageTemplates,
  PROMPT_REGISTRY,
} from '@/lib/prompts/registry';
import { HEADINGS, isValidHeading } from '@/lib/prompts/heading-constants';
import type { PromptTemplateSpec, FixedSection } from '@/types/prompt';

describe('Prompt Registry', () => {
  it('should contain exactly 14 templates', () => {
    expect(PROMPT_REGISTRY.size).toBe(14);
  });

  it('should return all 14 template IDs', () => {
    const ids = getAllTemplateIds();
    expect(ids).toHaveLength(14);
  });

  it('should have 6 task templates and 8 stage templates', () => {
    expect(getTaskTemplates()).toHaveLength(6);
    expect(getStageTemplates()).toHaveLength(8);
  });

  it('should retrieve each template by ID', () => {
    for (const id of getAllTemplateIds()) {
      const template = getTemplate(id);
      expect(template).toBeDefined();
      expect(template.id).toBe(id);
    }
  });

  it('should throw for unknown template ID', () => {
    expect(() => getTemplate('unknown:template' as never)).toThrow(
      'Unknown prompt template',
    );
  });

  describe.each(getAllTemplateIds())('template: %s', (id) => {
    let template: PromptTemplateSpec;

    beforeAll(() => {
      template = getTemplate(id);
    });

    it('should have a non-empty purpose', () => {
      expect(template.purpose.length).toBeGreaterThan(10);
    });

    it('should have correct layer for its ID prefix', () => {
      if (id.startsWith('task:')) {
        expect(template.layer).toBe('task');
      } else if (id.startsWith('stage:')) {
        expect(template.layer).toBe('stage');
      }
    });

    it('should have at least one required input', () => {
      expect(template.requiredInputs.length).toBeGreaterThanOrEqual(1);
    });

    it('should have required sections with valid headings', () => {
      for (const section of template.outputContract.requiredSections) {
        expect(section.heading).toBeTruthy();
        expect(section.key).toBeTruthy();
        expect(section.heading).toBe(section.heading.toUpperCase());
      }
    });

    it('should have a non-empty skeleton example', () => {
      expect(template.outputContract.skeletonExample.length).toBeGreaterThan(20);
    });

    it('should have section order covering all required sections', () => {
      const requiredKeys = template.outputContract.requiredSections.map((s) => s.key);
      for (const key of requiredKeys) {
        expect(template.outputContract.sectionOrder).toContain(key);
      }
    });

    it('should have failure contract with critical sections', () => {
      expect(template.failureContract.criticalSections.length).toBeGreaterThanOrEqual(1);
      expect(template.failureContract.maxRepairAttempts).toBeGreaterThanOrEqual(1);
      expect(template.failureContract.maxRepairAttempts).toBeLessThanOrEqual(2);
    });

    it('should have non-empty repair contract self-check', () => {
      expect(template.repairContract.selfCheckInstruction.length).toBeGreaterThan(10);
    });

    it('should have all 4 variants', () => {
      expect(template.variantContract.standard).toBeDefined();
      expect(template.variantContract.strict).toBeDefined();
      expect(template.variantContract.lowCost).toBeDefined();
      expect(template.variantContract.minimal).toBeDefined();
    });

    it('should have minimal variant with low token budget', () => {
      expect(template.variantContract.minimal.tokenBudget).toBeLessThanOrEqual(300);
    });

    it('should have weak model spec with extraction preference', () => {
      expect(template.weakModelSpec.fieldPreference).toBe('extraction');
    });

    it('should have weak model spec with banned phrases', () => {
      expect(template.weakModelSpec.bannedPhrases.length).toBeGreaterThanOrEqual(1);
    });

    it('should have non-empty minimal executable template', () => {
      expect(template.weakModelSpec.minimalExecutableTemplate.length).toBeGreaterThan(20);
    });

    it('should have validation gates configured', () => {
      expect(template.gates.validateOutputStructure.headingMatchStrategy).toBe('uppercase_exact');
      expect(template.gates.validateOutputStructure.requireCriticalSections).toBe(true);
      expect(template.gates.repairOutput.maxAttempts).toBeGreaterThanOrEqual(1);
      expect(template.gates.fallbackVariant.chain).toContain('minimal');
      expect(template.gates.fallbackVariant.autoDowngradeOnFailure).toBe(true);
    });
  });
});

describe('Heading Constants', () => {
  it('should have all headings as uppercase', () => {
    for (const [key, value] of Object.entries(HEADINGS)) {
      expect(value).toBe(value.toUpperCase());
      expect(key).toBe(value);
    }
  });

  it('should validate known headings', () => {
    expect(isValidHeading('GOAL')).toBe(true);
    expect(isValidHeading('WORKFLOW_STAGES')).toBe(true);
    expect(isValidHeading('FINAL_PROMPT')).toBe(true);
  });

  it('should reject unknown headings', () => {
    expect(isValidHeading('NOT_A_HEADING')).toBe(false);
    expect(isValidHeading('goal')).toBe(false);
  });
});
