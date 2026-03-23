import type { PromptTemplateSpec } from '@/types/prompt';
import { HEADINGS } from '../heading-constants';

export const stagePlanTemplate: PromptTemplateSpec = {
  id: 'stage:plan',
  layer: 'stage',
  purpose: 'Generate a planning prompt for an external agent',

  requiredInputs: [
    { name: 'goal', type: 'string', required: true, description: 'The implementation goal in one sentence' },
    { name: 'researchSummary', type: 'artifact', required: true, description: 'Research summary artifact' },
    { name: 'decisionRecord', type: 'artifact', required: true, description: 'Decision record artifact from discussion' },
  ],
  optionalInputs: [
    { name: 'pinnedFacts', type: 'pinned_facts', required: false, description: 'Previously pinned facts for context' },
    { name: 'constraints', type: 'string[]', required: false, description: 'Additional constraints or requirements' },
  ],

  taskContract: '',

  stageContract: [
    'You generate a planning prompt — you do NOT create the plan yourself.',
    'Your output is a self-contained prompt the user will copy into an external agent (Cursor, Claude Code, etc.).',
    'The FINAL_PROMPT must give the external agent everything it needs to produce the plan without extra context.',
    'Diagnose the user\'s raw request: what is strong, what is weak, what is ambiguous.',
    'State every assumption you baked into the prompt.',
    'Suggest facts worth pinning for future stages.',
  ].join('\n'),

  outputContract: {
    requiredSections: [
      {
        key: 'DIAGNOSIS',
        heading: HEADINGS.DIAGNOSIS,
        fieldType: 'bullet_list',
        description: 'Analysis of what is good, weak, or ambiguous about the user\'s raw request',
        missingBehavior: 'reject',
      },
      {
        key: 'ASSUMPTIONS_ADDED',
        heading: HEADINGS.ASSUMPTIONS_ADDED,
        fieldType: 'bullet_list',
        description: 'Assumptions Promptor added to fill gaps in the user\'s request',
        pinnable: true,
        missingBehavior: 'fill_default',
        defaultValue: '- No additional assumptions were needed',
      },
      {
        key: 'FINAL_PROMPT',
        heading: HEADINGS.FINAL_PROMPT,
        fieldType: 'paragraph',
        description: 'Self-contained prompt for an external agent to produce the implementation plan. Must instruct the agent to output: GOAL, PRECONDITIONS, FILES_TO_MODIFY, STEP_BY_STEP_PLAN, CODE_SKETCHES, TRADEOFFS, VERIFICATION_METHOD.',
        savableAs: 'implementation_plan',
        pinnable: true,
        missingBehavior: 'reject',
      },
      {
        key: 'CHEAPER_VARIANT',
        heading: HEADINGS.CHEAPER_VARIANT,
        fieldType: 'paragraph',
        description: 'A shorter, lower-token version of FINAL_PROMPT that still produces a usable plan',
        missingBehavior: 'fill_default',
        defaultValue: '(No cheaper variant generated — use FINAL_PROMPT as-is.)',
      },
      {
        key: 'SUGGESTED_PINNED_FACTS',
        heading: HEADINGS.SUGGESTED_PINNED_FACTS,
        fieldType: 'bullet_list',
        description: 'Facts worth pinning for reuse in later stages',
        pinnable: true,
        missingBehavior: 'fill_default',
        defaultValue: '- No pinned facts suggested',
      },
    ],
    optionalSections: [],
    sectionOrder: [
      HEADINGS.DIAGNOSIS,
      HEADINGS.ASSUMPTIONS_ADDED,
      HEADINGS.FINAL_PROMPT,
      HEADINGS.CHEAPER_VARIANT,
      HEADINGS.SUGGESTED_PINNED_FACTS,
    ],
    skeletonExample: [
      `## ${HEADINGS.DIAGNOSIS}`,
      '- Goal is clear: implement httpOnly cookie-based token refresh.',
      '- Missing: no mention of error-handling strategy or concurrency.',
      '- Ambiguous: "auth module" could mean NextAuth config or a custom wrapper.',
      '',
      `## ${HEADINGS.ASSUMPTIONS_ADDED}`,
      '- Assumed NextAuth v4 is the auth framework.',
      '- Assumed PostgreSQL is the session store (from research summary).',
      '- Assumed the refresh endpoint should be at `/api/auth/refresh`.',
      '',
      `## ${HEADINGS.FINAL_PROMPT}`,
      'You are a senior engineer. Create a detailed implementation plan for adding httpOnly cookie-based token refresh to a Next.js app using NextAuth v4 with a PostgreSQL session store.',
      '',
      'Context:',
      '- NextAuth v4 is installed and configured.',
      '- PostgreSQL session table exists.',
      '- The refresh endpoint will live at `/api/auth/refresh`.',
      '',
      'Output your plan using exactly these sections:',
      '',
      '## GOAL',
      'One-sentence restatement of the implementation goal.',
      '',
      '## PRECONDITIONS',
      'Bullet list of what must be true before starting.',
      '',
      '## FILES_TO_MODIFY',
      'Bullet list of files to create, modify, or delete.',
      '',
      '## STEP_BY_STEP_PLAN',
      'Numbered list of implementation steps, ordered by dependency.',
      '',
      '## CODE_SKETCHES',
      'Pseudocode or structural sketches for key changes.',
      '',
      '## TRADEOFFS',
      'Bullet list of tradeoffs accepted in this plan.',
      '',
      '## VERIFICATION_METHOD',
      'How to verify each step was executed correctly.',
      '',
      'Constraints:',
      '- Every step must be verifiable.',
      '- Include file paths for every change.',
      '- Code sketches are pseudocode, not working code.',
      '- Do not implement — only plan.',
      '',
      `## ${HEADINGS.CHEAPER_VARIANT}`,
      'Create an implementation plan for httpOnly cookie-based token refresh in a Next.js/NextAuth v4 app. Output: GOAL (1 line), STEP_BY_STEP_PLAN (numbered, max 6 steps), FILES_TO_MODIFY (bullets), VERIFICATION_METHOD (bullets). No code sketches.',
      '',
      `## ${HEADINGS.SUGGESTED_PINNED_FACTS}`,
      '- Auth framework: NextAuth v4',
      '- Session store: PostgreSQL',
      '- Refresh endpoint path: /api/auth/refresh',
    ].join('\n'),
  },

  failureContract: {
    minAcceptableSections: 3,
    onPartialOutput: 'attempt_repair',
    onMalformedOutput: 'attempt_repair',
    onEmptyOutput: 'retry_once',
    maxRepairAttempts: 1,
    criticalSections: ['FINAL_PROMPT', 'DIAGNOSIS'],
  },

  repairContract: {
    selfCheckInstruction:
      'Verify your output has all 5 headings: DIAGNOSIS, ASSUMPTIONS_ADDED, FINAL_PROMPT, CHEAPER_VARIANT, SUGGESTED_PINNED_FACTS. FINAL_PROMPT must be a self-contained prompt that instructs an external agent to produce a plan.',
    missingSectionRepair:
      'Add the missing heading. FINAL_PROMPT must contain the full external-agent prompt. DIAGNOSIS must list strengths and weaknesses of the user\'s request.',
    invalidHeadingRepair:
      'Rename headings to exact uppercase form: DIAGNOSIS, ASSUMPTIONS_ADDED, FINAL_PROMPT, CHEAPER_VARIANT, SUGGESTED_PINNED_FACTS.',
    proseToStructureRepair:
      'Convert prose into bullets under DIAGNOSIS and ASSUMPTIONS_ADDED. Keep FINAL_PROMPT as a self-contained prompt paragraph.',
    trimToSchemaRepair:
      'Remove any content not under a recognized heading. Do not include the plan itself — only the prompt that generates it.',
  },

  variantContract: {
    standard: {
      promptText:
        'Generate a self-contained planning prompt for an external agent. Include all 5 sections. The FINAL_PROMPT must instruct the agent to output GOAL, PRECONDITIONS, FILES_TO_MODIFY, STEP_BY_STEP_PLAN, CODE_SKETCHES, TRADEOFFS, VERIFICATION_METHOD.',
      tokenBudget: 2000,
      includeSkeleton: true,
      includedSections: [
        HEADINGS.DIAGNOSIS,
        HEADINGS.ASSUMPTIONS_ADDED,
        HEADINGS.FINAL_PROMPT,
        HEADINGS.CHEAPER_VARIANT,
        HEADINGS.SUGGESTED_PINNED_FACTS,
      ],
      additionalConstraints: [],
    },
    strict: {
      promptText:
        'Generate a rigorous planning prompt for an external agent. FINAL_PROMPT must require the agent to justify each step, include code sketches for every file, and provide verification criteria per step.',
      tokenBudget: 2500,
      includeSkeleton: true,
      includedSections: [
        HEADINGS.DIAGNOSIS,
        HEADINGS.ASSUMPTIONS_ADDED,
        HEADINGS.FINAL_PROMPT,
        HEADINGS.CHEAPER_VARIANT,
        HEADINGS.SUGGESTED_PINNED_FACTS,
      ],
      additionalConstraints: [
        'FINAL_PROMPT must require per-step expected outputs.',
        'FINAL_PROMPT must require code sketches for every file listed.',
      ],
    },
    lowCost: {
      promptText:
        'Generate a concise planning prompt. Include DIAGNOSIS, FINAL_PROMPT, and CHEAPER_VARIANT.',
      tokenBudget: 800,
      includeSkeleton: false,
      includedSections: [
        HEADINGS.DIAGNOSIS,
        HEADINGS.FINAL_PROMPT,
        HEADINGS.CHEAPER_VARIANT,
      ],
      additionalConstraints: ['CHEAPER_VARIANT should target under 200 tokens.'],
    },
    minimal: {
      promptText:
        'Output FINAL_PROMPT (a planning prompt for an external agent, max 150 words) and DIAGNOSIS (2-3 bullets).',
      tokenBudget: 200,
      includeSkeleton: false,
      includedSections: [HEADINGS.FINAL_PROMPT, HEADINGS.DIAGNOSIS],
      additionalConstraints: ['50-150 words total. No prose outside sections.'],
    },
  },

  weakModelSpec: {
    maxInstructionWords: 100,
    requiredNegativeConstraints: [
      'Do not create the plan yourself.',
      'Do not write code.',
      'Do not implement anything.',
      'Only output a prompt that an external agent will execute.',
    ],
    extractionFields: [
      { label: 'Diagnosis', format: 'bullet list', section: HEADINGS.DIAGNOSIS },
      { label: 'Prompt', format: 'self-contained prompt paragraph', section: HEADINGS.FINAL_PROMPT },
      { label: 'Cheap prompt', format: 'shorter prompt paragraph', section: HEADINGS.CHEAPER_VARIANT },
    ],
    bannedPhrases: ['I cannot access', "I don't have access", 'feel free', 'you might want to', 'consider', 'optionally', 'as appropriate'],
    minimalExecutableTemplate: [
      'Generate a planning prompt for an external agent based on the inputs below.',
      '## DIAGNOSIS\n(bullet list: what is strong/weak/ambiguous in the request)',
      '## FINAL_PROMPT\n(self-contained prompt the user copies to an external agent)',
      '## CHEAPER_VARIANT\n(shorter version of the prompt)',
      'Goal: {{goal}}',
      'Research: {{researchSummary}}',
      'Decision: {{decisionRecord}}',
    ].join('\n'),
    fewShotSkeleton: [
      '## DIAGNOSIS',
      '- Goal is clear but missing error-handling constraints.',
      '- Ambiguous which auth library is in use.',
      '## FINAL_PROMPT',
      'You are a senior engineer. Create a plan for implementing token refresh. Output: GOAL, STEP_BY_STEP_PLAN, FILES_TO_MODIFY, VERIFICATION_METHOD. Context: ...',
      '## CHEAPER_VARIANT',
      'Plan token refresh: output STEP_BY_STEP_PLAN (max 5 steps) and FILES_TO_MODIFY. Context: ...',
    ].join('\n'),
    fieldPreference: 'extraction',
  },

  gates: {
    validateOutputStructure: {
      headingMatchStrategy: 'uppercase_exact',
      minSectionsForPartial: 3,
      requireCriticalSections: true,
    },
    repairOutput: {
      repairStrategies: ['missing_section_repair', 'invalid_heading_repair', 'prose_to_structure'],
      maxAttempts: 1,
    },
    fallbackVariant: {
      chain: ['standard', 'strict', 'lowCost', 'minimal'],
      autoDowngradeOnFailure: true,
    },
  },
};
