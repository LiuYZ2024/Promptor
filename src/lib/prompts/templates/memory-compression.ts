import type { PromptTemplateSpec } from '@/types/prompt';
import { HEADINGS } from '../heading-constants';

export const memoryCompressionTemplate: PromptTemplateSpec = {
  id: 'task:memory_compression',
  layer: 'task',
  purpose:
    'Compress a long conversation history into a high-value context summary preserving goals, decisions, constraints, and open questions.',

  requiredInputs: [
    {
      name: 'messageHistory',
      type: 'messages',
      required: true,
      description:
        'The full conversation message history to compress.',
    },
    {
      name: 'currentStage',
      type: 'string',
      required: true,
      description:
        'The current workflow stage (e.g. "plan", "implement", "verify").',
    },
  ],

  optionalInputs: [
    {
      name: 'pinnedFacts',
      type: 'pinned_facts',
      required: false,
      description:
        'User-confirmed facts that must appear in the compressed summary.',
    },
    {
      name: 'existingSummary',
      type: 'string',
      required: false,
      description:
        'Previous compressed summary to update incrementally rather than regenerate.',
    },
  ],

  taskContract: `You are compressing a conversation history into a structured context summary.

INPUTS:
- messageHistory: The full message history to compress.
- currentStage: The active workflow stage.
- pinnedFacts (optional): Facts to preserve verbatim.
- existingSummary (optional): Previous summary to update rather than replace.

RULES:
1. CONFIRMED_GOALS must list only goals explicitly stated or confirmed by the user. Do not infer goals the user did not express.
2. CONFIRMED_CONSTRAINTS must list only constraints the user stated or confirmed. Separate hard constraints (must) from soft constraints (prefer).
3. ACCEPTED_DECISIONS must list decisions that were made and accepted during the conversation. Each must include: what was decided, why, and what alternatives were rejected.
4. REJECTED_OPTIONS must list approaches or ideas that were explicitly rejected, with the reason for rejection.
5. OPEN_QUESTIONS must list unresolved questions that came up during conversation and were not answered. Do not list questions that were answered — those go under the relevant decision or goal.
6. RISKS_AND_WATCHOUTS must list concerns, risks, or caveats mentioned during conversation that remain relevant.
7. CURRENT_STAGE must state the active stage and what progress has been made within it.
8. NEXT_BEST_PROMPT must suggest the exact prompt to use next, based on the current stage and open items. This prompt must be executable.
9. If existingSummary is provided, merge new information into the existing structure. Do not discard previous entries unless they are contradicted by newer messages.
10. If pinnedFacts are provided, they must appear verbatim in the appropriate section (goals, constraints, or decisions).
11. Discard: small talk, repeated information, superseded decisions, resolved questions, and implementation details already captured in artifacts.
12. Preserve: numerical values, specific names, exact constraints, version numbers, and file paths mentioned.`,

  stageContract: '',

  outputContract: {
    requiredSections: [
      {
        key: 'CONFIRMED_GOALS',
        heading: HEADINGS.CONFIRMED_GOALS,
        fieldType: 'bullet_list',
        description:
          'Goals explicitly stated or confirmed by the user.',
        pinnable: true,
        missingBehavior: 'reject',
      },
      {
        key: 'CONFIRMED_CONSTRAINTS',
        heading: HEADINGS.CONFIRMED_CONSTRAINTS,
        fieldType: 'bullet_list',
        description:
          'Hard and soft constraints the user stated or confirmed.',
        pinnable: true,
        missingBehavior: 'fill_default',
        defaultValue: '- No explicit constraints stated.',
      },
      {
        key: 'ACCEPTED_DECISIONS',
        heading: HEADINGS.ACCEPTED_DECISIONS,
        fieldType: 'bullet_list',
        description:
          'Decisions made: what, why, and rejected alternatives.',
        pinnable: true,
        missingBehavior: 'reject',
      },
      {
        key: 'REJECTED_OPTIONS',
        heading: HEADINGS.REJECTED_OPTIONS,
        fieldType: 'bullet_list',
        description:
          'Explicitly rejected approaches with rejection reason.',
        missingBehavior: 'fill_default',
        defaultValue: '- No options explicitly rejected.',
      },
      {
        key: 'OPEN_QUESTIONS',
        heading: HEADINGS.OPEN_QUESTIONS,
        fieldType: 'bullet_list',
        description:
          'Unresolved questions from the conversation.',
        pinnable: true,
        missingBehavior: 'reject',
      },
      {
        key: 'RISKS_AND_WATCHOUTS',
        heading: HEADINGS.RISKS_AND_WATCHOUTS,
        fieldType: 'bullet_list',
        description:
          'Concerns, risks, and caveats still relevant.',
        missingBehavior: 'fill_default',
        defaultValue: '- No risks identified.',
      },
      {
        key: 'CURRENT_STAGE',
        heading: HEADINGS.CURRENT_STAGE,
        fieldType: 'paragraph',
        description:
          'Active workflow stage and progress within it.',
        missingBehavior: 'fill_default',
        defaultValue: 'Stage: unknown. Progress: not determined.',
      },
      {
        key: 'NEXT_BEST_PROMPT',
        heading: HEADINGS.NEXT_BEST_PROMPT,
        fieldType: 'paragraph',
        description:
          'The exact next prompt to use, executable and stage-appropriate.',
        savableAs: 'prompt',
        missingBehavior: 'fill_default',
        defaultValue: 'Continue with the current stage prompt.',
      },
    ],
    optionalSections: [],
    sectionOrder: [
      'CONFIRMED_GOALS',
      'CONFIRMED_CONSTRAINTS',
      'ACCEPTED_DECISIONS',
      'REJECTED_OPTIONS',
      'OPEN_QUESTIONS',
      'RISKS_AND_WATCHOUTS',
      'CURRENT_STAGE',
      'NEXT_BEST_PROMPT',
    ],
    skeletonExample: `## CONFIRMED_GOALS
- Build a JWT-based authentication system for the REST API.
- Support token refresh without requiring re-login.

## CONFIRMED_CONSTRAINTS
- [HARD] Must use existing Prisma ORM — no new database libraries.
- [HARD] Must not break existing /api/users endpoint contract.
- [SOFT] Prefer stateless tokens over server-side sessions.

## ACCEPTED_DECISIONS
- Use RS256 JWT signing instead of HS256. Why: allows public key verification by downstream services. Rejected: HS256 (simpler but requires shared secret).
- Store refresh tokens in database with family tracking. Why: enables token rotation and revocation. Rejected: stateless refresh tokens (no revocation capability).

## REJECTED_OPTIONS
- Session-based auth: Rejected because the system must support multiple API consumers without shared cookie state.
- OAuth2 with external provider: Rejected as premature — requirements specify internal auth only for MVP.

## OPEN_QUESTIONS
- What should the access token TTL be? (User mentioned "short" but gave no number.)
- Should failed refresh attempts trigger account lockout?

## RISKS_AND_WATCHOUTS
- Token refresh race condition if multiple tabs send concurrent requests.
- RS256 key rotation procedure not discussed — will need a plan before production.

## CURRENT_STAGE
Stage: Plan. Progress: research and discussion complete. Decision record finalized. Implementation plan not yet started.

## NEXT_BEST_PROMPT
Generate an implementation plan for JWT authentication with RS256 signing and database-backed refresh tokens. Research summary and decision record are attached as artifacts. Constraints: use Prisma ORM, do not break existing /api/users contract.`,
  },

  failureContract: {
    minAcceptableSections: 5,
    onPartialOutput: 'warn_and_use',
    onMalformedOutput: 'attempt_repair',
    onEmptyOutput: 'retry_once',
    maxRepairAttempts: 2,
    criticalSections: [
      'CONFIRMED_GOALS',
      'ACCEPTED_DECISIONS',
      'OPEN_QUESTIONS',
    ],
  },

  repairContract: {
    selfCheckInstruction:
      'Verify CONFIRMED_GOALS contains only user-stated or user-confirmed goals (no inferred goals). Verify ACCEPTED_DECISIONS includes what was decided and what was rejected. Verify OPEN_QUESTIONS lists only unresolved questions (not answered ones). Verify NEXT_BEST_PROMPT is an executable prompt, not a description.',
    missingSectionRepair:
      'Your output is missing required sections. Add them using exact headings: CONFIRMED_GOALS, CONFIRMED_CONSTRAINTS, ACCEPTED_DECISIONS, REJECTED_OPTIONS, OPEN_QUESTIONS, RISKS_AND_WATCHOUTS, CURRENT_STAGE, NEXT_BEST_PROMPT. Do not remove existing content.',
    invalidHeadingRepair:
      'Your headings do not match the required format. Use exactly: ## CONFIRMED_GOALS, ## CONFIRMED_CONSTRAINTS, ## ACCEPTED_DECISIONS, ## REJECTED_OPTIONS, ## OPEN_QUESTIONS, ## RISKS_AND_WATCHOUTS, ## CURRENT_STAGE, ## NEXT_BEST_PROMPT. Keep all content, only fix headings.',
    proseToStructureRepair:
      'Your output is unstructured prose. Reorganize under these headings: ## CONFIRMED_GOALS, ## CONFIRMED_CONSTRAINTS, ## ACCEPTED_DECISIONS, ## REJECTED_OPTIONS, ## OPEN_QUESTIONS, ## RISKS_AND_WATCHOUTS, ## CURRENT_STAGE, ## NEXT_BEST_PROMPT. Extract facts from prose and place under the correct heading.',
    trimToSchemaRepair:
      'Your output contains extra sections. Keep only: CONFIRMED_GOALS, CONFIRMED_CONSTRAINTS, ACCEPTED_DECISIONS, REJECTED_OPTIONS, OPEN_QUESTIONS, RISKS_AND_WATCHOUTS, CURRENT_STAGE, NEXT_BEST_PROMPT. Remove everything else.',
  },

  variantContract: {
    standard: {
      promptText: `Compress the following conversation history into a structured context summary.

Current stage: {currentStage}
{existingSummary ? "Previous summary (merge, do not discard):\\n" + existingSummary : ""}
{pinnedFacts ? "Pinned facts (must appear verbatim):\\n" + pinnedFacts : ""}

Conversation history:
{messageHistory}

Produce these sections:
## CONFIRMED_GOALS — goals the user stated or confirmed. No inferred goals.
## CONFIRMED_CONSTRAINTS — constraints the user stated. Label each [HARD] or [SOFT].
## ACCEPTED_DECISIONS — decisions made: what, why, rejected alternatives.
## REJECTED_OPTIONS — explicitly rejected approaches with reason.
## OPEN_QUESTIONS — unresolved questions only. Do not list answered questions.
## RISKS_AND_WATCHOUTS — active concerns, risks, caveats.
## CURRENT_STAGE — active stage and progress.
## NEXT_BEST_PROMPT — exact executable prompt for the next step.

Rules:
- Only include user-confirmed information, not your inferences.
- Discard: small talk, repetition, superseded decisions, resolved questions.
- Preserve: numbers, names, exact constraints, versions, file paths.
- If existingSummary is provided, merge — do not discard unless contradicted.
- Pinned facts must appear verbatim in the relevant section.`,
      tokenBudget: 2000,
      includeSkeleton: true,
      includedSections: [
        'CONFIRMED_GOALS',
        'CONFIRMED_CONSTRAINTS',
        'ACCEPTED_DECISIONS',
        'REJECTED_OPTIONS',
        'OPEN_QUESTIONS',
        'RISKS_AND_WATCHOUTS',
        'CURRENT_STAGE',
        'NEXT_BEST_PROMPT',
      ],
      additionalConstraints: [],
    },
    strict: {
      promptText: `Compress this conversation into a structured summary. Follow every rule exactly. Deviation causes rejection.

Current stage: {currentStage}
History: {messageHistory}

MANDATORY SECTIONS (## HEADING format):
## CONFIRMED_GOALS — only user-stated goals. Minimum 1. No inferred goals allowed.
## CONFIRMED_CONSTRAINTS — labeled [HARD] or [SOFT]. Minimum 1 unless none exist (then state "None stated").
## ACCEPTED_DECISIONS — each must include: decision, reasoning, rejected alternative. Minimum 1.
## REJECTED_OPTIONS — each must include: option name, rejection reason. If none, state "None explicitly rejected."
## OPEN_QUESTIONS — unresolved only. Answered questions are forbidden here. Minimum 1 unless all resolved.
## RISKS_AND_WATCHOUTS — active risks only. Minimum 1 unless none exist.
## CURRENT_STAGE — stage name and 1-3 sentence progress update.
## NEXT_BEST_PROMPT — exact prompt text, minimum 20 words, must be executable without additional context.

STRICT RULES:
- ZERO inferred goals in CONFIRMED_GOALS.
- ZERO answered questions in OPEN_QUESTIONS.
- ZERO superseded decisions in ACCEPTED_DECISIONS.
- Pinned facts must appear verbatim.
- Violation of any rule invalidates the entire output.`,
      tokenBudget: 2000,
      includeSkeleton: true,
      includedSections: [
        'CONFIRMED_GOALS',
        'CONFIRMED_CONSTRAINTS',
        'ACCEPTED_DECISIONS',
        'REJECTED_OPTIONS',
        'OPEN_QUESTIONS',
        'RISKS_AND_WATCHOUTS',
        'CURRENT_STAGE',
        'NEXT_BEST_PROMPT',
      ],
      additionalConstraints: [
        'Zero inferred goals.',
        'Zero answered questions in OPEN_QUESTIONS.',
        'Every decision must name a rejected alternative.',
      ],
    },
    lowCost: {
      promptText: `Summarize this conversation for context preservation.

Stage: {currentStage}
History: {messageHistory}

Output:
## CONFIRMED_GOALS — user-stated goals.
## ACCEPTED_DECISIONS — what was decided and why.
## OPEN_QUESTIONS — unresolved items.
## CURRENT_STAGE — stage and progress.
## NEXT_BEST_PROMPT — next prompt to use.

Only confirmed info. No inferences. Discard small talk and repetition.`,
      tokenBudget: 1000,
      includeSkeleton: false,
      includedSections: [
        'CONFIRMED_GOALS',
        'ACCEPTED_DECISIONS',
        'OPEN_QUESTIONS',
        'CURRENT_STAGE',
        'NEXT_BEST_PROMPT',
      ],
      additionalConstraints: [
        'Skip CONFIRMED_CONSTRAINTS, REJECTED_OPTIONS, RISKS_AND_WATCHOUTS.',
      ],
    },
    minimal: {
      promptText: `Compress {messageHistory} for stage {currentStage}. Output ## CONFIRMED_GOALS, ## ACCEPTED_DECISIONS, ## OPEN_QUESTIONS, and ## NEXT_BEST_PROMPT (executable next step); include only user-stated or confirmed facts—no invented goals or answered questions.`,
      tokenBudget: 100,
      includeSkeleton: false,
      includedSections: [
        'CONFIRMED_GOALS',
        'ACCEPTED_DECISIONS',
        'OPEN_QUESTIONS',
        'NEXT_BEST_PROMPT',
      ],
      additionalConstraints: [
        'No optional sections.',
        'Maximum 3 items per section.',
      ],
    },
  },

  weakModelSpec: {
    maxInstructionWords: 100,
    requiredNegativeConstraints: [
      'Do not infer goals the user did not state.',
      'Do not list answered questions under OPEN_QUESTIONS.',
      'Do not include small talk or pleasantries.',
      'Do not fabricate decisions that were not made.',
    ],
    extractionFields: [
      {
        label: 'Goal',
        format: 'short declarative sentence',
        section: 'CONFIRMED_GOALS',
      },
      {
        label: 'Decision',
        format: 'what + why + rejected alternative',
        section: 'ACCEPTED_DECISIONS',
      },
      {
        label: 'Open question',
        format: 'question sentence',
        section: 'OPEN_QUESTIONS',
      },
      {
        label: 'Current stage',
        format: 'stage name + progress',
        section: 'CURRENT_STAGE',
      },
      {
        label: 'Next prompt',
        format: 'executable prompt text',
        section: 'NEXT_BEST_PROMPT',
      },
    ],
    bannedPhrases: [
      'you might want to',
      'consider',
      'feel free',
      'it depends',
      'as mentioned above',
      'in summary',
    ],
    minimalExecutableTemplate: `Summarize this conversation: {messageHistory}

Write:
## CONFIRMED_GOALS — user goals
## ACCEPTED_DECISIONS — decisions made
## OPEN_QUESTIONS — unresolved items
## NEXT_BEST_PROMPT — next prompt to use

Only facts the user confirmed. No inferences.`,
    fewShotSkeleton: `## CONFIRMED_GOALS
- Add pagination to the users API.
- Support cursor-based and offset-based pagination.

## ACCEPTED_DECISIONS
- Use cursor-based as default. Why: better performance at scale. Rejected: offset-only (breaks on large datasets).

## OPEN_QUESTIONS
- What is the maximum page size?
- Should deleted records affect cursor position?

## CURRENT_STAGE
Stage: Plan. Research and discussion complete.

## NEXT_BEST_PROMPT
Create an implementation plan for cursor-based pagination on /api/users. Use Prisma cursor queries. Constraint: backward compatible with existing offset callers.`,
    fieldPreference: 'extraction',
  },

  gates: {
    validateOutputStructure: {
      headingMatchStrategy: 'uppercase_exact',
      minSectionsForPartial: 4,
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
