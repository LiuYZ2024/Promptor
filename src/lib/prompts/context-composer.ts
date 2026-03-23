import type {
  PromptTemplateId,
  PromptVariant,
  VariantSpec,
} from '@/types/prompt';
import type { ChatMessage } from '@/types/llm';
import type { PinnedFact, Summary, Artifact, Session, OutputLanguage, WorkflowFile } from '@/types/data';
import { getBehaviorContract } from './contracts/behavior-contract';
import { getTemplate } from './registry';

export interface PromptCompositionInput {
  templateId: PromptTemplateId;
  variant: PromptVariant;
  userInput: string;
  outputLanguage?: OutputLanguage;
  session?: Session;
  pinnedFacts?: PinnedFact[];
  rollingSummary?: Summary;
  stageArtifacts?: Artifact[];
  recentMessages?: ChatMessage[];
  templateInputs?: Record<string, string>;
  workflowFiles?: WorkflowFile[];
}

export interface ComposedContext {
  messages: ChatMessage[];
  estimatedTokens: number;
  systemMessageLength: number;
}

const LAYER_SEPARATOR = '\n\n---\n\n';

/**
 * Assembles the 7-layer contract system into a ChatMessage array.
 * Context ordering per spec §9:
 *   1. system preset (layers 1-7)
 *   2. pinned facts
 *   3. session metadata
 *   4. current stage artifact
 *   5. rolling summary
 *   6. recent raw turns
 *   7. current user input
 */
export function composeContext(input: PromptCompositionInput): ComposedContext {
  const spec = getTemplate(input.templateId);
  const variantSpec: VariantSpec = spec.variantContract[input.variant];

  // Build system message from 7 layers
  const systemParts: string[] = [];

  // Layer 1: Behavior Contract (always included)
  systemParts.push(getBehaviorContract());

  // Layer 2: Task Contract
  if (spec.taskContract) {
    systemParts.push(spec.taskContract);
  }

  // Layer 3: Stage Contract
  if (spec.stageContract) {
    systemParts.push(spec.stageContract);
  }

  // Layer 4: Output Contract
  systemParts.push(renderOutputContract(spec, variantSpec));

  // Language instruction (between output and failure contracts)
  if (input.outputLanguage) {
    systemParts.push(renderLanguageInstruction(input.outputLanguage));
  }

  // Layer 5: Failure Contract
  systemParts.push(renderFailureContract(spec));

  // Layer 6: Repair Contract (self-check instruction)
  if (spec.repairContract.selfCheckInstruction) {
    systemParts.push(spec.repairContract.selfCheckInstruction);
  }

  // Layer 7: Variant Contract
  if (variantSpec.additionalConstraints.length > 0) {
    systemParts.push(
      'VARIANT RULES:\n' +
        variantSpec.additionalConstraints.map((c) => `- ${c}`).join('\n'),
    );
  }

  const systemContent = systemParts.filter(Boolean).join(LAYER_SEPARATOR);

  const messages: ChatMessage[] = [
    { role: 'system', content: systemContent },
  ];

  // Context blocks in priority order
  if (input.pinnedFacts && input.pinnedFacts.length > 0) {
    messages.push({
      role: 'system',
      content: formatPinnedFacts(input.pinnedFacts),
    });
  }

  if (input.session) {
    messages.push({
      role: 'system',
      content: formatSessionMeta(input.session),
    });
  }

  if (input.stageArtifacts && input.stageArtifacts.length > 0) {
    messages.push({
      role: 'system',
      content: formatArtifacts(input.stageArtifacts),
    });
  }

  if (input.workflowFiles && input.workflowFiles.length > 0) {
    messages.push({
      role: 'system',
      content: formatWorkflowFiles(input.workflowFiles),
    });
  }

  if (input.rollingSummary) {
    messages.push({
      role: 'system',
      content: `CONVERSATION SUMMARY:\n${input.rollingSummary.content}`,
    });
  }

  if (input.recentMessages) {
    messages.push(...input.recentMessages);
  }

  // User input with template-specific formatting
  const userContent = buildUserMessage(input, variantSpec);
  messages.push({ role: 'user', content: userContent });

  const estimatedTokens = estimateMessageTokens(messages);

  return {
    messages,
    estimatedTokens,
    systemMessageLength: systemContent.length,
  };
}

const LANGUAGE_INSTRUCTIONS: Record<OutputLanguage, string> = {
  zh: 'LANGUAGE RULE: Return all user-facing content in Simplified Chinese (简体中文). Keep all internal section headings (e.g. GOAL, CONTEXT, FINAL_PROMPT) in their canonical uppercase English form.',
  en: 'LANGUAGE RULE: Return all user-facing content in English. Keep all internal section headings in their canonical uppercase English form.',
};

function renderLanguageInstruction(lang: OutputLanguage): string {
  return LANGUAGE_INSTRUCTIONS[lang];
}

function renderOutputContract(
  spec: ReturnType<typeof getTemplate>,
  variantSpec: VariantSpec,
): string {
  const includedKeys = new Set(variantSpec.includedSections);
  const sections = [
    ...spec.outputContract.requiredSections,
    ...spec.outputContract.optionalSections,
  ].filter((s) => includedKeys.has(s.key));

  const headingList = sections.map((s) => `- ## ${s.heading}: ${s.description}`).join('\n');

  let result = `OUTPUT FORMAT:\nYour output MUST use these exact headings (markdown H2, uppercase):\n${headingList}`;

  if (variantSpec.includeSkeleton && spec.outputContract.skeletonExample) {
    result += `\n\nEXAMPLE STRUCTURE:\n${spec.outputContract.skeletonExample}`;
  }

  return result;
}

function renderFailureContract(
  spec: ReturnType<typeof getTemplate>,
): string {
  const fc = spec.failureContract;
  const lines = [
    'FAILURE RULES:',
    `- You MUST include at least ${fc.minAcceptableSections} sections.`,
    `- These sections are CRITICAL and must always be present: ${fc.criticalSections.join(', ')}.`,
    '- If you cannot produce a section, output the heading with "Not available" below it.',
    '- Do NOT skip headings. Do NOT merge sections.',
  ];
  return lines.join('\n');
}

function formatPinnedFacts(facts: PinnedFact[]): string {
  const sorted = [...facts].sort((a, b) => {
    const priorityOrder = { critical: 0, high: 1, normal: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  const lines = sorted.map(
    (f) => `[${f.priority}/${f.category}] ${f.content}`,
  );
  return `PINNED FACTS:\n${lines.join('\n')}`;
}

function formatSessionMeta(session: Session): string {
  return [
    'SESSION CONTEXT:',
    `- Task: ${session.title}`,
    `- Type: ${session.taskType}`,
    `- Goal: ${session.goal}`,
    `- Current Stage: ${session.currentStage}`,
    `- Agent Target: ${session.agentTarget}`,
    `- Has Codebase: ${session.hasCodebase}`,
  ].join('\n');
}

function formatArtifacts(artifacts: Artifact[]): string {
  const parts = artifacts.map(
    (a) => `[${a.artifactType} v${a.version}] ${a.title}:\n${a.content}`,
  );
  return `STAGE ARTIFACTS:\n${parts.join('\n\n')}`;
}

function formatWorkflowFiles(files: WorkflowFile[]): string {
  const MAX_FILE_CHARS = 3000;
  const parts = files.map((f) => {
    const content = f.content.length > MAX_FILE_CHARS
      ? f.content.slice(0, MAX_FILE_CHARS) + '\n... (truncated)'
      : f.content;
    return `[${f.fileRole}] ${f.fileName}:\n${content}`;
  });
  return `WORKFLOW FILES:\n${parts.join('\n\n')}`;
}

function buildUserMessage(
  input: PromptCompositionInput,
  variantSpec: VariantSpec,
): string {
  const parts: string[] = [];

  if (input.templateInputs) {
    const spec = getTemplate(input.templateId);
    for (const field of spec.requiredInputs) {
      const value = input.templateInputs[field.name];
      if (value) {
        parts.push(`${field.name}: ${value}`);
      }
    }
  }

  if (variantSpec.promptText) {
    parts.push(variantSpec.promptText);
  }

  if (input.userInput) {
    parts.push(input.userInput);
  }

  return parts.join('\n\n');
}

function estimateMessageTokens(messages: ChatMessage[]): number {
  let total = 0;
  for (const msg of messages) {
    total += Math.ceil(msg.content.length / 4) + 4;
  }
  return total;
}
