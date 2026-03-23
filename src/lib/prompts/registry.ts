import type { PromptTemplateId, PromptTemplateSpec } from '@/types/prompt';
import { workflowGenerationTemplate } from './templates/workflow-generation';
import { promptRefinementTemplate } from './templates/prompt-refinement';
import { discussionGuidanceTemplate } from './templates/discussion-guidance';
import { planGenerationTemplate } from './templates/plan-generation';
import { verificationGenerationTemplate } from './templates/verification-generation';
import { memoryCompressionTemplate } from './templates/memory-compression';
import { stageRequirementTemplate } from './templates/stage-requirement';
import { stageResearchTemplate } from './templates/stage-research';
import { stageDiscussionTemplate } from './templates/stage-discussion';
import { stagePlanTemplate } from './templates/stage-plan';
import { stageAnnotationLoopTemplate } from './templates/stage-annotation-loop';
import { stageImplementTemplate } from './templates/stage-implement';
import { stageVerifyTemplate } from './templates/stage-verify';
import { stageSolidifyTemplate } from './templates/stage-solidify';

const PROMPT_REGISTRY: ReadonlyMap<PromptTemplateId, PromptTemplateSpec> = new Map<
  PromptTemplateId,
  PromptTemplateSpec
>([
  ['task:workflow_generation', workflowGenerationTemplate],
  ['task:prompt_refinement', promptRefinementTemplate],
  ['task:discussion_guidance', discussionGuidanceTemplate],
  ['task:plan_generation', planGenerationTemplate],
  ['task:verification_generation', verificationGenerationTemplate],
  ['task:memory_compression', memoryCompressionTemplate],
  ['stage:requirement', stageRequirementTemplate],
  ['stage:research', stageResearchTemplate],
  ['stage:discussion', stageDiscussionTemplate],
  ['stage:plan', stagePlanTemplate],
  ['stage:annotation_loop', stageAnnotationLoopTemplate],
  ['stage:implement', stageImplementTemplate],
  ['stage:verify', stageVerifyTemplate],
  ['stage:solidify', stageSolidifyTemplate],
]);

export function getTemplate(id: PromptTemplateId): PromptTemplateSpec {
  const spec = PROMPT_REGISTRY.get(id);
  if (!spec) {
    throw new Error(`Unknown prompt template: ${id}`);
  }
  return spec;
}

export function getAllTemplateIds(): PromptTemplateId[] {
  return [...PROMPT_REGISTRY.keys()];
}

export function getTaskTemplates(): PromptTemplateSpec[] {
  return [...PROMPT_REGISTRY.values()].filter((t) => t.layer === 'task');
}

export function getStageTemplates(): PromptTemplateSpec[] {
  return [...PROMPT_REGISTRY.values()].filter((t) => t.layer === 'stage');
}

export { PROMPT_REGISTRY };
