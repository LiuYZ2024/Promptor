import type {
  PromptTemplateSpec,
  PromptVariant,
  RepairStrategyId,
  FailureContract,
} from '@/types/prompt';
import type { ChatMessage } from '@/types/llm';
import { parseSections, validateOutput, applyDefaults, renderSections } from './output-parser';
import type { ParsedOutput, ValidationResult } from './output-parser';
import { renderRepairTemplate } from './repair-templates';

export interface ValidationPipelineResult {
  finalText: string;
  finalSections: Map<string, string>;
  usedVariant: PromptVariant;
  repairAttempted: boolean;
  repairSucceeded: boolean;
  downgraded: boolean;
  validationResult: ValidationResult;
  warnings: string[];
}

export type LLMCallFn = (messages: ChatMessage[]) => Promise<string>;

/**
 * Full validation pipeline as specified in §4B.2:
 *   validateOutputStructure → repairOutput → fallbackVariant
 *
 * @param rawOutput - The raw LLM output text
 * @param template - The prompt template spec used
 * @param variant - The variant that was used for generation
 * @param llmCall - A function to call the LLM for repair attempts
 * @param previousMessages - The messages that generated this output (for repair context)
 */
export async function runValidationPipeline(
  rawOutput: string,
  template: PromptTemplateSpec,
  variant: PromptVariant,
  llmCall?: LLMCallFn,
  previousMessages?: ChatMessage[],
): Promise<ValidationPipelineResult> {
  const warnings: string[] = [];
  let currentVariant = variant;

  // Step 1: Parse and validate
  let parsed = parseSections(rawOutput, template.outputContract);
  let validation = validateOutput(
    parsed,
    template.outputContract,
    template.gates.validateOutputStructure,
    template.failureContract.criticalSections,
  );

  // Fast path: output is valid
  if (validation.isValid) {
    const sections = applyDefaults(parsed, template.outputContract);
    return {
      finalText: renderSections(sections, template.outputContract),
      finalSections: sections,
      usedVariant: currentVariant,
      repairAttempted: false,
      repairSucceeded: false,
      downgraded: false,
      validationResult: validation,
      warnings,
    };
  }

  // Step 2: Handle empty output
  if (parsed.sections.size === 0) {
    return handleEmptyOutput(
      rawOutput,
      template,
      currentVariant,
      llmCall,
      previousMessages,
    );
  }

  // Step 3: Attempt repair if configured
  let repairAttempted = false;
  let repairSucceeded = false;

  if (shouldAttemptRepair(template.failureContract, validation) && llmCall && previousMessages) {
    repairAttempted = true;
    const repairResult = await attemptRepair(
      rawOutput,
      parsed,
      validation,
      template,
      llmCall,
      previousMessages,
    );

    if (repairResult) {
      parsed = repairResult.parsed;
      validation = repairResult.validation;
      repairSucceeded = validation.isValid || validation.isPartial;

      if (repairSucceeded) {
        const sections = applyDefaults(parsed, template.outputContract);
        return {
          finalText: renderSections(sections, template.outputContract),
          finalSections: sections,
          usedVariant: currentVariant,
          repairAttempted: true,
          repairSucceeded: true,
          downgraded: false,
          validationResult: validation,
          warnings,
        };
      }
    }
  }

  // Step 4: Auto-downgrade if configured
  if (template.gates.fallbackVariant.autoDowngradeOnFailure && llmCall && previousMessages) {
    const downgradeResult = await attemptDowngrade(
      template,
      currentVariant,
      llmCall,
      previousMessages,
    );

    if (downgradeResult) {
      return {
        ...downgradeResult,
        repairAttempted,
        downgraded: true,
        warnings: [
          ...warnings,
          `Output failed validation with variant "${currentVariant}". Downgraded to "${downgradeResult.usedVariant}".`,
        ],
      };
    }
  }

  // Step 5: Fallback — use partial output or raw text
  if (validation.isPartial) {
    const sections = applyDefaults(parsed, template.outputContract);
    warnings.push('Output is partial. Some required sections are missing.');
    return {
      finalText: renderSections(sections, template.outputContract),
      finalSections: sections,
      usedVariant: currentVariant,
      repairAttempted,
      repairSucceeded: false,
      downgraded: false,
      validationResult: validation,
      warnings,
    };
  }

  // Last resort: return raw text
  warnings.push('Output could not be parsed or repaired. Returning raw text.');
  return {
    finalText: rawOutput,
    finalSections: parsed.sections,
    usedVariant: currentVariant,
    repairAttempted,
    repairSucceeded: false,
    downgraded: false,
    validationResult: validation,
    warnings,
  };
}

function shouldAttemptRepair(
  failureContract: FailureContract,
  validation: ValidationResult,
): boolean {
  if (validation.isValid) return false;

  if (validation.missingSections.length > 0 && failureContract.onPartialOutput === 'attempt_repair') {
    return true;
  }
  if (validation.extraSections.length > 0 && failureContract.onMalformedOutput === 'attempt_repair') {
    return true;
  }
  return false;
}

async function attemptRepair(
  rawOutput: string,
  parsed: ParsedOutput,
  validation: ValidationResult,
  template: PromptTemplateSpec,
  llmCall: LLMCallFn,
  previousMessages: ChatMessage[],
): Promise<{ parsed: ParsedOutput; validation: ValidationResult } | null> {
  const strategies = template.gates.repairOutput.repairStrategies;
  const maxAttempts = template.gates.repairOutput.maxAttempts;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const strategy = selectRepairStrategy(strategies, validation);
    if (!strategy) return null;

    const repairPrompt = buildRepairPrompt(strategy, validation, template);
    if (!repairPrompt) return null;

    const repairMessages: ChatMessage[] = [
      ...previousMessages,
      { role: 'assistant', content: rawOutput },
      { role: 'user', content: repairPrompt },
    ];

    try {
      const repairOutput = await llmCall(repairMessages);

      if (strategy === 'missing_section_repair') {
        const mergedText = rawOutput + '\n\n' + repairOutput;
        const mergedParsed = parseSections(mergedText, template.outputContract);
        const mergedValidation = validateOutput(
          mergedParsed,
          template.outputContract,
          template.gates.validateOutputStructure,
          template.failureContract.criticalSections,
        );
        return { parsed: mergedParsed, validation: mergedValidation };
      }

      const repairedParsed = parseSections(repairOutput, template.outputContract);
      const repairedValidation = validateOutput(
        repairedParsed,
        template.outputContract,
        template.gates.validateOutputStructure,
        template.failureContract.criticalSections,
      );

      if (repairedValidation.isValid || repairedValidation.isPartial) {
        return { parsed: repairedParsed, validation: repairedValidation };
      }
    } catch {
      return null;
    }
  }

  return null;
}

function selectRepairStrategy(
  strategies: RepairStrategyId[],
  validation: ValidationResult,
): RepairStrategyId | null {
  for (const strategy of strategies) {
    switch (strategy) {
      case 'missing_section_repair':
        if (validation.missingSections.length > 0) return strategy;
        break;
      case 'invalid_heading_repair':
        if (validation.extraSections.length > 0) return strategy;
        break;
      case 'prose_to_structure':
        if (validation.parsedSections.size === 0 && validation.rawText.length > 50) return strategy;
        break;
      case 'trim_to_schema':
        if (validation.extraSections.length > 0) return strategy;
        break;
      case 'weak_model_shorten':
        return strategy;
    }
  }
  return strategies[0] ?? null;
}

function buildRepairPrompt(
  strategy: RepairStrategyId,
  validation: ValidationResult,
  template: PromptTemplateSpec,
): string | null {
  const allSections = [
    ...template.outputContract.requiredSections,
    ...template.outputContract.optionalSections,
  ];
  const allHeadings = allSections.map((s) => `## ${s.heading}`).join('\n');
  const requiredHeadings = template.outputContract.requiredSections
    .map((s) => `## ${s.heading}`)
    .join('\n');

  switch (strategy) {
    case 'missing_section_repair': {
      const missingHeadings = validation.missingSections
        .map((key) => {
          const section = allSections.find((s) => s.key === key);
          return section ? `## ${section.heading}` : `## ${key}`;
        })
        .join('\n');
      return renderRepairTemplate('missing_section_repair', {
        missingSections: validation.missingSections.join(', '),
        missingHeadingsFormatted: missingHeadings,
      });
    }
    case 'invalid_heading_repair':
      return renderRepairTemplate('invalid_heading_repair', {
        correctHeadings: allHeadings,
      });
    case 'prose_to_structure':
      return renderRepairTemplate('prose_to_structure', {
        requiredHeadings,
      });
    case 'trim_to_schema':
      return renderRepairTemplate('trim_to_schema', {
        allowedHeadings: allHeadings,
      });
    case 'weak_model_shorten': {
      const variant = template.variantContract.minimal;
      return renderRepairTemplate('weak_model_shorten', {
        tokenBudget: String(variant.tokenBudget),
        requiredHeadings,
      });
    }
    default:
      return null;
  }
}

async function attemptDowngrade(
  template: PromptTemplateSpec,
  currentVariant: PromptVariant,
  llmCall: LLMCallFn,
  previousMessages: ChatMessage[],
): Promise<Omit<ValidationPipelineResult, 'repairAttempted' | 'downgraded' | 'warnings'> | null> {
  const chain = template.gates.fallbackVariant.chain;
  const currentIdx = chain.indexOf(currentVariant);

  for (let i = currentIdx + 1; i < chain.length; i++) {
    const nextVariant = chain[i];
    if (!nextVariant) continue;

    const variantSpec = template.variantContract[nextVariant];
    const retryMessages: ChatMessage[] = [
      previousMessages[0]!,
      {
        role: 'user',
        content: variantSpec.promptText,
      },
    ];

    try {
      const retryOutput = await llmCall(retryMessages);
      const parsed = parseSections(retryOutput, template.outputContract);
      const validation = validateOutput(
        parsed,
        template.outputContract,
        template.gates.validateOutputStructure,
        template.failureContract.criticalSections,
      );

      if (validation.isValid || validation.isPartial) {
        const sections = applyDefaults(parsed, template.outputContract);
        return {
          finalText: renderSections(sections, template.outputContract),
          finalSections: sections,
          usedVariant: nextVariant,
          repairSucceeded: false,
          validationResult: validation,
        };
      }
    } catch {
      continue;
    }
  }

  return null;
}

async function handleEmptyOutput(
  _rawOutput: string,
  template: PromptTemplateSpec,
  variant: PromptVariant,
  llmCall?: LLMCallFn,
  previousMessages?: ChatMessage[],
): Promise<ValidationPipelineResult> {
  if (template.failureContract.onEmptyOutput === 'retry_once' && llmCall && previousMessages) {
    try {
      const retryOutput = await llmCall(previousMessages);
      const parsed = parseSections(retryOutput, template.outputContract);
      const validation = validateOutput(
        parsed,
        template.outputContract,
        template.gates.validateOutputStructure,
        template.failureContract.criticalSections,
      );

      if (parsed.sections.size > 0) {
        const sections = applyDefaults(parsed, template.outputContract);
        return {
          finalText: renderSections(sections, template.outputContract),
          finalSections: sections,
          usedVariant: variant,
          repairAttempted: true,
          repairSucceeded: validation.isValid || validation.isPartial,
          downgraded: false,
          validationResult: validation,
          warnings: ['First attempt returned empty output. Used retry.'],
        };
      }
    } catch {
      // Fall through to error
    }
  }

  return {
    finalText: '',
    finalSections: new Map(),
    usedVariant: variant,
    repairAttempted: false,
    repairSucceeded: false,
    downgraded: false,
    validationResult: {
      isValid: false,
      isPartial: false,
      missingSections: template.outputContract.requiredSections.map((s) => s.key),
      missingCriticalSections: template.failureContract.criticalSections,
      extraSections: [],
      parsedSections: new Map(),
      rawText: '',
    },
    warnings: ['LLM returned empty output.'],
  };
}
