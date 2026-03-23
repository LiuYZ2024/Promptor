import { describe, it, expect } from 'vitest';
import {
  parseSections,
  validateOutput,
  applyDefaults,
  renderSections,
} from '@/lib/prompts/output-parser';
import type { OutputContract, StructureValidatorConfig } from '@/types/prompt';

const testContract: OutputContract = {
  requiredSections: [
    {
      key: 'GOAL',
      heading: 'GOAL',
      fieldType: 'single_line',
      description: 'The goal',
      missingBehavior: 'reject',
    },
    {
      key: 'CONTEXT',
      heading: 'CONTEXT',
      fieldType: 'paragraph',
      description: 'Background context',
      missingBehavior: 'fill_default',
      defaultValue: 'No context provided.',
    },
    {
      key: 'WORKFLOW_STAGES',
      heading: 'WORKFLOW_STAGES',
      fieldType: 'numbered_list',
      description: 'All workflow stages',
      missingBehavior: 'reject',
    },
  ],
  optionalSections: [
    {
      key: 'RISKS',
      heading: 'RISKS',
      fieldType: 'bullet_list',
      description: 'Potential risks',
      missingBehavior: 'skip',
    },
  ],
  sectionOrder: ['GOAL', 'CONTEXT', 'WORKFLOW_STAGES', 'RISKS'],
  skeletonExample: '## GOAL\n[goal]\n\n## CONTEXT\n[ctx]\n\n## WORKFLOW_STAGES\n1. ...',
};

const validatorConfig: StructureValidatorConfig = {
  headingMatchStrategy: 'uppercase_exact',
  minSectionsForPartial: 2,
  requireCriticalSections: true,
};

describe('Output Parser', () => {
  describe('parseSections', () => {
    it('should parse well-formatted output with exact headings', () => {
      const raw = `## GOAL
Build a web app

## CONTEXT
We have an existing codebase

## WORKFLOW_STAGES
1. Requirement
2. Research
3. Discussion`;

      const result = parseSections(raw, testContract);
      expect(result.sections.size).toBe(3);
      expect(result.sections.get('GOAL')).toBe('Build a web app');
      expect(result.sections.get('WORKFLOW_STAGES')).toContain('1. Requirement');
      expect(result.missingSections).toHaveLength(0);
      expect(result.isComplete).toBe(true);
    });

    it('should detect missing required sections', () => {
      const raw = `## GOAL
Build a web app`;

      const result = parseSections(raw, testContract);
      expect(result.sections.size).toBe(1);
      expect(result.missingSections).toContain('CONTEXT');
      expect(result.missingSections).toContain('WORKFLOW_STAGES');
      expect(result.isComplete).toBe(false);
    });

    it('should handle fuzzy headings (spaces instead of underscores)', () => {
      const raw = `## GOAL
Build a web app

## WORKFLOW STAGES
1. Requirement
2. Research`;

      const result = parseSections(raw, testContract);
      expect(result.sections.has('WORKFLOW_STAGES')).toBe(true);
    });

    it('should handle case-insensitive headings', () => {
      const raw = `## Goal
Build a web app

## Workflow_Stages
1. Requirement`;

      const result = parseSections(raw, testContract);
      expect(result.sections.has('GOAL')).toBe(true);
      expect(result.sections.has('WORKFLOW_STAGES')).toBe(true);
    });

    it('should handle substring matching for headings', () => {
      const raw = `## Project Goal
Build a web app

## All Workflow Stages
1. Requirement`;

      const result = parseSections(raw, testContract);
      expect(result.sections.has('GOAL')).toBe(true);
      expect(result.sections.has('WORKFLOW_STAGES')).toBe(true);
    });

    it('should detect extra sections', () => {
      const raw = `## GOAL
Build a web app

## BONUS_SECTION
Extra content

## WORKFLOW_STAGES
1. Requirement`;

      const result = parseSections(raw, testContract);
      expect(result.extraSections.length).toBeGreaterThan(0);
    });

    it('should handle empty input', () => {
      const result = parseSections('', testContract);
      expect(result.sections.size).toBe(0);
      expect(result.isComplete).toBe(false);
      expect(result.isPartiallyUsable).toBe(false);
    });

    it('should handle plain text without headings', () => {
      const result = parseSections(
        'This is just plain text without any structure.',
        testContract,
      );
      expect(result.sections.size).toBe(0);
    });
  });

  describe('validateOutput', () => {
    it('should mark complete output as valid', () => {
      const raw = `## GOAL\nBuild it\n\n## CONTEXT\nExists\n\n## WORKFLOW_STAGES\n1. R`;
      const parsed = parseSections(raw, testContract);
      const result = validateOutput(parsed, testContract, validatorConfig, [
        'GOAL',
        'WORKFLOW_STAGES',
      ]);
      expect(result.isValid).toBe(true);
      expect(result.missingCriticalSections).toHaveLength(0);
    });

    it('should mark output with missing critical section as invalid', () => {
      const raw = `## GOAL\nBuild it\n\n## CONTEXT\nExists`;
      const parsed = parseSections(raw, testContract);
      const result = validateOutput(parsed, testContract, validatorConfig, [
        'GOAL',
        'WORKFLOW_STAGES',
      ]);
      expect(result.isValid).toBe(false);
      expect(result.missingCriticalSections).toContain('WORKFLOW_STAGES');
    });

    it('should mark partial output correctly', () => {
      const raw = `## GOAL\nBuild it\n\n## WORKFLOW_STAGES\n1. R`;
      const parsed = parseSections(raw, testContract);
      const result = validateOutput(parsed, testContract, validatorConfig, [
        'GOAL',
        'WORKFLOW_STAGES',
      ]);
      expect(result.isPartial).toBe(true);
    });
  });

  describe('applyDefaults', () => {
    it('should fill default values for missing sections', () => {
      const raw = `## GOAL\nBuild it\n\n## WORKFLOW_STAGES\n1. R`;
      const parsed = parseSections(raw, testContract);
      const result = applyDefaults(parsed, testContract);
      expect(result.get('CONTEXT')).toBe('No context provided.');
    });

    it('should not override existing values', () => {
      const raw = `## GOAL\nBuild it\n\n## CONTEXT\nExisting context\n\n## WORKFLOW_STAGES\n1. R`;
      const parsed = parseSections(raw, testContract);
      const result = applyDefaults(parsed, testContract);
      expect(result.get('CONTEXT')).toBe('Existing context');
    });
  });

  describe('renderSections', () => {
    it('should render sections in canonical order', () => {
      const sections = new Map([
        ['WORKFLOW_STAGES', '1. Requirement\n2. Research'],
        ['GOAL', 'Build a web app'],
      ]);
      const rendered = renderSections(sections, testContract);
      const goalIdx = rendered.indexOf('## GOAL');
      const stagesIdx = rendered.indexOf('## WORKFLOW_STAGES');
      expect(goalIdx).toBeLessThan(stagesIdx);
    });
  });
});
