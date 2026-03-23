import type { PromptTemplateSpec } from '@/types/prompt';
import { HEADINGS } from '../heading-constants';

export const promptRefinementTemplate: PromptTemplateSpec = {
  id: 'task:prompt_refinement',
  layer: 'task',
  purpose:
    'Transform a raw user prompt into a high-quality structured prompt with diagnosis, assumptions, a refined version, and a cheaper variant.',

  requiredInputs: [
    {
      name: 'rawPrompt',
      type: 'string',
      required: true,
      description: 'The original unrefined prompt from the user.',
    },
    {
      name: 'taskType',
      type: 'string',
      required: true,
      description:
        'Classification of the task (e.g. "feature", "refactor", "bugfix", "docs").',
    },
    {
      name: 'mode',
      type: 'string',
      required: true,
      description:
        'Refinement mode: "full" for complete restructure, "patch" for targeted fixes only.',
    },
  ],

  optionalInputs: [
    {
      name: 'sessionHistory',
      type: 'messages',
      required: false,
      description:
        'Previous conversation messages for context continuity.',
    },
    {
      name: 'pinnedFacts',
      type: 'pinned_facts',
      required: false,
      description:
        'User-confirmed facts that must be preserved in the refined prompt.',
    },
    {
      name: 'rollingSummary',
      type: 'string',
      required: false,
      description:
        'Compressed summary of earlier conversation for long sessions.',
    },
  ],

  taskContract: `You are refining a raw user prompt into a structured, high-quality prompt.

INPUTS:
- rawPrompt: The user's original prompt text.
- taskType: The category of work.
- mode: "full" (complete restructure) or "patch" (fix weaknesses only).
- sessionHistory (optional): Prior conversation messages.
- pinnedFacts (optional): Confirmed facts to preserve.
- rollingSummary (optional): Compressed session summary.

RULES:
1. DIAGNOSIS must list specific weaknesses found in the raw prompt: missing context, vague scope, absent constraints, unclear success criteria, ambiguous terms.
2. ASSUMPTIONS_ADDED must list every assumption you introduced that the user did not state. Each assumption must be labeled as [REASONABLE] or [NEEDS_CONFIRMATION].
3. FINAL_PROMPT must be a complete, self-contained prompt that an AI agent can execute without the original raw prompt. It must include: clear objective, scope boundaries, constraints, expected output format, and success criteria.
4. CHEAPER_VARIANT must achieve the same goal in ≤60% of the token count of FINAL_PROMPT. Remove examples, reduce detail, keep all structural elements.
5. SUGGESTED_PINNED_FACTS must extract 3-7 facts from the raw prompt and your analysis that the user should pin for future sessions.
6. If mode is "patch": keep the original prompt structure intact, only fix identified weaknesses.
7. If mode is "full": restructure completely, ignoring original formatting.
8. Do not invent requirements. If information is missing, state it in DIAGNOSIS and add it to ASSUMPTIONS_ADDED with [NEEDS_CONFIRMATION].
9. Pinned facts from input must appear verbatim in FINAL_PROMPT.`,

  stageContract: '',

  outputContract: {
    requiredSections: [
      {
        key: 'GOAL',
        heading: HEADINGS.GOAL,
        fieldType: 'single_line',
        description:
          'One sentence stating what the refined prompt achieves.',
        missingBehavior: 'reject',
      },
      {
        key: 'DIAGNOSIS',
        heading: HEADINGS.DIAGNOSIS,
        fieldType: 'bullet_list',
        description:
          'List of specific weaknesses found in the raw prompt.',
        missingBehavior: 'reject',
      },
      {
        key: 'ASSUMPTIONS_ADDED',
        heading: HEADINGS.ASSUMPTIONS_ADDED,
        fieldType: 'bullet_list',
        description:
          'Assumptions introduced during refinement, each labeled [REASONABLE] or [NEEDS_CONFIRMATION].',
        missingBehavior: 'fill_default',
        defaultValue: '- No assumptions added.',
      },
      {
        key: 'FINAL_PROMPT',
        heading: HEADINGS.FINAL_PROMPT,
        fieldType: 'paragraph',
        description:
          'The complete refined prompt, self-contained and executable.',
        savableAs: 'prompt',
        missingBehavior: 'reject',
      },
      {
        key: 'CHEAPER_VARIANT',
        heading: HEADINGS.CHEAPER_VARIANT,
        fieldType: 'paragraph',
        description:
          'Shorter version of FINAL_PROMPT at ≤60% token count.',
        savableAs: 'prompt',
        missingBehavior: 'fill_default',
        defaultValue: 'Use FINAL_PROMPT as-is; no further reduction possible.',
      },
      {
        key: 'SUGGESTED_PINNED_FACTS',
        heading: HEADINGS.SUGGESTED_PINNED_FACTS,
        fieldType: 'bullet_list',
        description:
          '3-7 facts extracted from the analysis that the user should pin.',
        pinnable: true,
        missingBehavior: 'fill_default',
        defaultValue: '- No pinnable facts identified.',
      },
    ],
    optionalSections: [
      {
        key: 'CONTEXT',
        heading: HEADINGS.CONTEXT,
        fieldType: 'paragraph',
        description:
          'Background context derived from session history or rolling summary.',
        missingBehavior: 'skip',
      },
      {
        key: 'CONSTRAINTS',
        heading: HEADINGS.CONSTRAINTS,
        fieldType: 'bullet_list',
        description:
          'Explicit constraints extracted or inferred from the raw prompt.',
        missingBehavior: 'skip',
      },
    ],
    sectionOrder: [
      'GOAL',
      'DIAGNOSIS',
      'ASSUMPTIONS_ADDED',
      'CONTEXT',
      'CONSTRAINTS',
      'FINAL_PROMPT',
      'CHEAPER_VARIANT',
      'SUGGESTED_PINNED_FACTS',
    ],
    skeletonExample: `## GOAL
Produce a structured, unambiguous prompt for implementing {task summary}.

## DIAGNOSIS
- Missing: No success criteria defined.
- Vague: "make it fast" — no measurable performance target.
- Missing: No output format specified.
- Ambiguous: "handle errors" — which errors? what handling?

## ASSUMPTIONS_ADDED
- [REASONABLE] Target language is TypeScript based on project context.
- [NEEDS_CONFIRMATION] Performance target is <200ms response time.
- [REASONABLE] Error handling means try/catch with user-facing messages.

## CONTEXT
User is building a REST API endpoint. Session history shows prior discussion about database schema.

## CONSTRAINTS
- Must use existing ORM patterns.
- Must not break existing API contracts.

## FINAL_PROMPT
You are implementing a REST API endpoint for {feature}.

Objective: {clear objective}
Scope: {boundaries}
Constraints:
- {constraint 1}
- {constraint 2}

Expected output:
- {output format}

Success criteria:
- {criterion 1}
- {criterion 2}

## CHEAPER_VARIANT
Implement {feature} endpoint. Must: {constraint list}. Output: {format}. Success: {criteria}.

## SUGGESTED_PINNED_FACTS
- Target language: TypeScript
- ORM: Prisma
- API style: REST with JSON responses
- Error format: { error: string, code: number }`,
  },

  failureContract: {
    minAcceptableSections: 4,
    onPartialOutput: 'attempt_repair',
    onMalformedOutput: 'attempt_repair',
    onEmptyOutput: 'retry_once',
    maxRepairAttempts: 2,
    criticalSections: ['FINAL_PROMPT', 'DIAGNOSIS'],
  },

  repairContract: {
    selfCheckInstruction:
      'Verify your output contains DIAGNOSIS with specific weaknesses (not generic), FINAL_PROMPT that is self-contained, CHEAPER_VARIANT that is shorter than FINAL_PROMPT, and SUGGESTED_PINNED_FACTS with 3-7 items. Verify all ASSUMPTIONS_ADDED are labeled [REASONABLE] or [NEEDS_CONFIRMATION].',
    missingSectionRepair:
      'Your output is missing required sections. Add them using exact headings: GOAL, DIAGNOSIS, ASSUMPTIONS_ADDED, FINAL_PROMPT, CHEAPER_VARIANT, SUGGESTED_PINNED_FACTS. Do not remove existing content.',
    invalidHeadingRepair:
      'Your headings do not match the required format. Use exactly: ## GOAL, ## DIAGNOSIS, ## ASSUMPTIONS_ADDED, ## FINAL_PROMPT, ## CHEAPER_VARIANT, ## SUGGESTED_PINNED_FACTS. Keep all content, only fix headings.',
    proseToStructureRepair:
      'Your output is unstructured prose. Reorganize under these headings: ## GOAL, ## DIAGNOSIS, ## ASSUMPTIONS_ADDED, ## FINAL_PROMPT, ## CHEAPER_VARIANT, ## SUGGESTED_PINNED_FACTS. The FINAL_PROMPT section should contain the refined prompt text.',
    trimToSchemaRepair:
      'Your output contains extra sections. Keep only: GOAL, DIAGNOSIS, ASSUMPTIONS_ADDED, FINAL_PROMPT, CHEAPER_VARIANT, SUGGESTED_PINNED_FACTS, CONTEXT, CONSTRAINTS. Remove everything else.',
  },

  variantContract: {
    standard: {
      promptText: `Refine the following raw prompt into a structured, high-quality prompt.

Raw prompt: {rawPrompt}
Task type: {taskType}
Mode: {mode}
{pinnedFacts ? "Pinned facts (must appear in FINAL_PROMPT):\\n" + pinnedFacts : ""}
{rollingSummary ? "Session summary:\\n" + rollingSummary : ""}

Produce these sections:
## GOAL — one sentence stating what the refined prompt achieves.
## DIAGNOSIS — bullet list of specific weaknesses in the raw prompt (missing context, vague scope, absent constraints, unclear criteria, ambiguous terms).
## ASSUMPTIONS_ADDED — bullet list of assumptions you introduced, each labeled [REASONABLE] or [NEEDS_CONFIRMATION].
## FINAL_PROMPT — complete self-contained prompt with: objective, scope, constraints, output format, success criteria. An agent must be able to execute this without seeing the raw prompt.
## CHEAPER_VARIANT — same goal as FINAL_PROMPT in ≤60% tokens. Remove examples and reduce detail, keep structure.
## SUGGESTED_PINNED_FACTS — 3-7 facts worth pinning for future sessions.

Rules:
- DIAGNOSIS must cite specific problems, not generic advice.
- FINAL_PROMPT must be self-contained.
- CHEAPER_VARIANT must be measurably shorter.
- Do not invent requirements. Mark unknowns as [NEEDS_CONFIRMATION].
- Pinned facts from input must appear verbatim in FINAL_PROMPT.`,
      tokenBudget: 3000,
      includeSkeleton: true,
      includedSections: [
        'GOAL',
        'DIAGNOSIS',
        'ASSUMPTIONS_ADDED',
        'FINAL_PROMPT',
        'CHEAPER_VARIANT',
        'SUGGESTED_PINNED_FACTS',
        'CONTEXT',
        'CONSTRAINTS',
      ],
      additionalConstraints: [],
    },
    strict: {
      promptText: `Refine this raw prompt. Follow every rule exactly. Any deviation causes rejection.

Raw prompt: {rawPrompt}
Task type: {taskType}
Mode: {mode}

MANDATORY SECTIONS (## HEADING format):
## GOAL — exactly one sentence.
## DIAGNOSIS — minimum 3 specific weaknesses as bullets. Each must name the problem type (missing, vague, ambiguous, absent).
## ASSUMPTIONS_ADDED — every assumption labeled [REASONABLE] or [NEEDS_CONFIRMATION]. Minimum 1 item.
## FINAL_PROMPT — self-contained prompt. Must include: objective line, scope paragraph, constraints list, output format, success criteria. Minimum 100 words.
## CHEAPER_VARIANT — maximum 60% of FINAL_PROMPT word count. Must preserve all structural elements.
## SUGGESTED_PINNED_FACTS — exactly 3-7 items as bullets.

STRICT RULES:
- Do NOT add sections beyond those listed.
- Do NOT use vague diagnosis like "could be improved."
- FINAL_PROMPT must work without the raw prompt.
- CHEAPER_VARIANT must be measurably shorter than FINAL_PROMPT.
- Violation of any rule invalidates the entire output.`,
      tokenBudget: 3000,
      includeSkeleton: true,
      includedSections: [
        'GOAL',
        'DIAGNOSIS',
        'ASSUMPTIONS_ADDED',
        'FINAL_PROMPT',
        'CHEAPER_VARIANT',
        'SUGGESTED_PINNED_FACTS',
      ],
      additionalConstraints: [
        'Minimum 3 items in DIAGNOSIS.',
        'Every assumption must be labeled.',
        'CHEAPER_VARIANT must be ≤60% of FINAL_PROMPT tokens.',
      ],
    },
    lowCost: {
      promptText: `Refine this prompt: {rawPrompt}
Task type: {taskType}

Output:
## GOAL — one sentence.
## DIAGNOSIS — list weaknesses (minimum 2).
## FINAL_PROMPT — improved version with clear objective, constraints, output format.
## CHEAPER_VARIANT — shorter version of FINAL_PROMPT.
## SUGGESTED_PINNED_FACTS — 3-5 facts to save.

Keep FINAL_PROMPT self-contained. Mark assumptions as [REASONABLE] or [NEEDS_CONFIRMATION].`,
      tokenBudget: 1500,
      includeSkeleton: false,
      includedSections: [
        'GOAL',
        'DIAGNOSIS',
        'FINAL_PROMPT',
        'CHEAPER_VARIANT',
        'SUGGESTED_PINNED_FACTS',
      ],
      additionalConstraints: ['Skip CONTEXT and CONSTRAINTS sections.'],
    },
    minimal: {
      promptText: `Refine raw prompt {rawPrompt} for task type {taskType} in mode {mode}. Output ## GOAL (one sentence), ## DIAGNOSIS (2–3 specific weaknesses), ## FINAL_PROMPT (self-contained: objective, constraints, expected output), and ## CHEAPER_VARIANT (shorter but same intent).`,
      tokenBudget: 100,
      includeSkeleton: false,
      includedSections: [
        'GOAL',
        'DIAGNOSIS',
        'FINAL_PROMPT',
        'CHEAPER_VARIANT',
      ],
      additionalConstraints: [
        'No optional sections.',
        'Maximum 2 sentences per section except FINAL_PROMPT.',
      ],
    },
  },

  weakModelSpec: {
    maxInstructionWords: 100,
    requiredNegativeConstraints: [
      'Do not invent requirements the user did not state.',
      'Do not use vague language like "consider" or "you might."',
      'Do not output the raw prompt unchanged.',
      'Do not add features beyond the original scope.',
    ],
    extractionFields: [
      { label: 'Goal', format: 'single sentence', section: 'GOAL' },
      {
        label: 'Weakness',
        format: 'short phrase with category',
        section: 'DIAGNOSIS',
      },
      {
        label: 'Assumption',
        format: 'statement with [REASONABLE] or [NEEDS_CONFIRMATION]',
        section: 'ASSUMPTIONS_ADDED',
      },
      {
        label: 'Refined prompt',
        format: 'structured paragraph',
        section: 'FINAL_PROMPT',
      },
      {
        label: 'Pinned fact',
        format: 'short declarative sentence',
        section: 'SUGGESTED_PINNED_FACTS',
      },
    ],
    bannedPhrases: [
      'you might want to',
      'consider',
      'feel free',
      'it depends',
      'as mentioned above',
      'broadly speaking',
    ],
    minimalExecutableTemplate: `Improve this prompt: {rawPrompt}

Write:
## GOAL — one sentence
## DIAGNOSIS — list 2 weaknesses
## FINAL_PROMPT — better version with objective, constraints, output format
## CHEAPER_VARIANT — shorter version`,
    fewShotSkeleton: `## GOAL
Produce a clear prompt for adding user authentication.

## DIAGNOSIS
- Missing: No auth method specified (JWT, session, OAuth).
- Vague: "secure" — no specific security requirements.

## FINAL_PROMPT
Implement JWT-based authentication for the /api/auth endpoint. Requirements: email/password login, token refresh, 1-hour expiry. Output: TypeScript files with tests. Success: all tests pass, tokens validate correctly.

## CHEAPER_VARIANT
Add JWT auth to /api/auth. Email/password login, token refresh, 1h expiry. Output TypeScript with tests.

## SUGGESTED_PINNED_FACTS
- Auth method: JWT
- Token expiry: 1 hour
- Endpoint: /api/auth`,
    fieldPreference: 'extraction',
  },

  gates: {
    validateOutputStructure: {
      headingMatchStrategy: 'uppercase_exact',
      minSectionsForPartial: 3,
      requireCriticalSections: true,
    },
    repairOutput: {
      repairStrategies: [
        'missing_section_repair',
        'prose_to_structure',
        'trim_to_schema',
      ],
      maxAttempts: 1,
    },
    fallbackVariant: {
      chain: ['standard', 'strict', 'lowCost', 'minimal'],
      autoDowngradeOnFailure: true,
    },
  },
};
