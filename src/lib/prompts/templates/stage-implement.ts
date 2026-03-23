import type { PromptTemplateSpec } from '@/types/prompt';
import { HEADINGS } from '../heading-constants';

export const stageImplementTemplate: PromptTemplateSpec = {
  id: 'stage:implement',
  layer: 'stage',
  purpose: 'Convert approved plan into executable prompt for external coding agent',

  requiredInputs: [
    { name: 'approvedPlan', type: 'artifact', required: true, description: 'The approved implementation plan artifact' },
    { name: 'agentTarget', type: 'string', required: true, description: 'Target coding agent: cursor, claude-code, copilot, etc.' },
  ],
  optionalInputs: [
    { name: 'pinnedFacts', type: 'pinned_facts', required: false, description: 'Previously pinned facts for context' },
    { name: 'executionContext', type: 'string', required: false, description: 'Additional context about the execution environment' },
  ],

  taskContract: '',

  stageContract: [
    'Implementation phase — convert the plan into a prompt that an external coding agent can execute.',
    'The prompt must be self-contained, specific, and actionable.',
    'Include file paths, code patterns, and step order.',
    'Do not assume the agent has prior context — embed everything needed.',
    'Use imperative language: "Create...", "Modify...", "Add...".',
  ].join('\n'),

  outputContract: {
    requiredSections: [
      {
        key: 'IMPLEMENTATION_PROMPT',
        heading: HEADINGS.IMPLEMENTATION_PROMPT,
        fieldType: 'paragraph',
        description: 'The self-contained prompt to send to the coding agent',
        savableAs: 'implementation_prompt',
        pinnable: true,
        missingBehavior: 'reject',
      },
      {
        key: 'EXECUTION_CHECKLIST',
        heading: HEADINGS.EXECUTION_CHECKLIST,
        fieldType: 'checklist',
        description: 'Ordered checklist of actions the agent should perform',
        savableAs: 'execution_checklist',
        pinnable: true,
        missingBehavior: 'reject',
      },
      {
        key: 'COMPLETION_CRITERIA',
        heading: HEADINGS.COMPLETION_CRITERIA,
        fieldType: 'bullet_list',
        description: 'How to determine the implementation is complete',
        missingBehavior: 'fill_default',
        defaultValue: '- All files created/modified as specified\n- No TypeScript errors\n- Tests pass',
      },
      {
        key: 'AGENT_INSTRUCTIONS',
        heading: HEADINGS.AGENT_INSTRUCTIONS,
        fieldType: 'paragraph',
        description: 'Meta-instructions for the agent: style, constraints, what to avoid',
        missingBehavior: 'fill_default',
        defaultValue: 'Follow the plan exactly. Do not refactor unrelated code. Ask if anything is ambiguous.',
      },
    ],
    optionalSections: [],
    sectionOrder: [
      HEADINGS.IMPLEMENTATION_PROMPT,
      HEADINGS.EXECUTION_CHECKLIST,
      HEADINGS.COMPLETION_CRITERIA,
      HEADINGS.AGENT_INSTRUCTIONS,
    ],
    skeletonExample: [
      `## ${HEADINGS.IMPLEMENTATION_PROMPT}`,
      'Implement httpOnly cookie-based token refresh for the auth module in a Next.js 14 app.',
      '',
      'Context: The app uses NextAuth v4 with PostgreSQL. Auth routes are in `src/app/api/auth/`.',
      '',
      'Steps:',
      '1. Create `src/lib/auth/tokens.ts` with a `rotateRefreshToken(oldToken: string)` function.',
      '   - Verify the old token, generate a new one, invalidate the old one in DB.',
      '2. Create `src/app/api/auth/refresh/route.ts`.',
      '   - POST handler: read refresh token from httpOnly cookie, call rotateRefreshToken, set new cookie.',
      '3. Update `src/middleware.ts` to intercept 401 responses and trigger `/api/auth/refresh`.',
      '4. Update NextAuth config to set httpOnly cookie on login.',
      '',
      `## ${HEADINGS.EXECUTION_CHECKLIST}`,
      '- [ ] Create `src/lib/auth/tokens.ts` with rotateRefreshToken',
      '- [ ] Create `src/app/api/auth/refresh/route.ts`',
      '- [ ] Update `src/middleware.ts` with 401 interception',
      '- [ ] Update NextAuth cookie config',
      '- [ ] Run `npm run typecheck` — no errors',
      '- [ ] Run `npm test` — all tests pass',
      '',
      `## ${HEADINGS.COMPLETION_CRITERIA}`,
      '- All 4 files created/modified',
      '- TypeScript compiles without errors',
      '- Refresh endpoint returns 200 with valid cookie',
      '- Integration test passes',
      '',
      `## ${HEADINGS.AGENT_INSTRUCTIONS}`,
      'Use the existing Drizzle ORM for database operations. Follow the existing code style in `src/lib/`. Do not modify unrelated files. If a dependency is missing, install it explicitly.',
    ].join('\n'),
  },

  failureContract: {
    minAcceptableSections: 3,
    onPartialOutput: 'attempt_repair',
    onMalformedOutput: 'attempt_repair',
    onEmptyOutput: 'retry_once',
    maxRepairAttempts: 1,
    criticalSections: ['IMPLEMENTATION_PROMPT', 'EXECUTION_CHECKLIST'],
  },

  repairContract: {
    selfCheckInstruction:
      'Verify your output has all 4 headings: IMPLEMENTATION_PROMPT, EXECUTION_CHECKLIST, COMPLETION_CRITERIA, AGENT_INSTRUCTIONS. Each heading must start with "## ".',
    missingSectionRepair:
      'Add the missing heading. IMPLEMENTATION_PROMPT must be a self-contained prompt. EXECUTION_CHECKLIST must use checkbox format.',
    invalidHeadingRepair:
      'Rename headings to exact uppercase form: IMPLEMENTATION_PROMPT, EXECUTION_CHECKLIST, COMPLETION_CRITERIA, AGENT_INSTRUCTIONS.',
    proseToStructureRepair:
      'Convert prose into a checklist under EXECUTION_CHECKLIST. Extract agent meta-instructions into AGENT_INSTRUCTIONS.',
    trimToSchemaRepair:
      'Remove any content not under one of the 4 required headings.',
  },

  variantContract: {
    standard: {
      promptText:
        'Convert the approved plan into a self-contained implementation prompt for the target coding agent. Include all 4 sections.',
      tokenBudget: 2000,
      includeSkeleton: true,
      includedSections: [
        HEADINGS.IMPLEMENTATION_PROMPT,
        HEADINGS.EXECUTION_CHECKLIST,
        HEADINGS.COMPLETION_CRITERIA,
        HEADINGS.AGENT_INSTRUCTIONS,
      ],
      additionalConstraints: [],
    },
    strict: {
      promptText:
        'Convert the plan into a prompt. Every checklist item must map to a plan step. Include file paths and expected outputs for each item.',
      tokenBudget: 2500,
      includeSkeleton: true,
      includedSections: [
        HEADINGS.IMPLEMENTATION_PROMPT,
        HEADINGS.EXECUTION_CHECKLIST,
        HEADINGS.COMPLETION_CRITERIA,
        HEADINGS.AGENT_INSTRUCTIONS,
      ],
      additionalConstraints: [
        'Every checklist item must include the target file path.',
        'Completion criteria must be machine-verifiable where possible.',
      ],
    },
    lowCost: {
      promptText:
        'Generate IMPLEMENTATION_PROMPT and EXECUTION_CHECKLIST from the plan.',
      tokenBudget: 800,
      includeSkeleton: false,
      includedSections: [HEADINGS.IMPLEMENTATION_PROMPT, HEADINGS.EXECUTION_CHECKLIST],
      additionalConstraints: ['Keep checklist to 6 items max.'],
    },
    minimal: {
      promptText:
        'Write a short IMPLEMENTATION_PROMPT (3-5 sentences) and EXECUTION_CHECKLIST (up to 4 items).',
      tokenBudget: 200,
      includeSkeleton: false,
      includedSections: [HEADINGS.IMPLEMENTATION_PROMPT, HEADINGS.EXECUTION_CHECKLIST],
      additionalConstraints: ['50-100 words total. Imperative sentences only.'],
    },
  },

  weakModelSpec: {
    maxInstructionWords: 100,
    requiredNegativeConstraints: [
      'Do not implement the code yourself.',
      'Do not add steps not in the approved plan.',
      'Do not use vague instructions.',
    ],
    extractionFields: [
      { label: 'Prompt', format: 'paragraph with numbered steps', section: HEADINGS.IMPLEMENTATION_PROMPT },
      { label: 'Checklist', format: 'checkbox list', section: HEADINGS.EXECUTION_CHECKLIST },
    ],
    bannedPhrases: ['feel free', 'you might want to', 'consider', 'optionally', 'as appropriate'],
    minimalExecutableTemplate: [
      'Convert the plan into a coding agent prompt.',
      '## IMPLEMENTATION_PROMPT\n(self-contained instructions)',
      '## EXECUTION_CHECKLIST\n(- [ ] item format)',
      'Plan: {{approvedPlan}}',
      'Target agent: {{agentTarget}}',
    ].join('\n'),
    fewShotSkeleton: [
      '## IMPLEMENTATION_PROMPT',
      'Create a login API endpoint at src/api/login.ts. Use bcrypt for password hashing. Return a JWT token on success.',
      '## EXECUTION_CHECKLIST',
      '- [ ] Create src/api/login.ts',
      '- [ ] Add bcrypt password comparison',
      '- [ ] Add JWT token generation',
      '- [ ] Run typecheck',
    ].join('\n'),
    fieldPreference: 'extraction',
  },

  gates: {
    validateOutputStructure: {
      headingMatchStrategy: 'uppercase_exact',
      minSectionsForPartial: 2,
      requireCriticalSections: true,
    },
    repairOutput: {
      repairStrategies: ['missing_section_repair', 'invalid_heading_repair', 'trim_to_schema'],
      maxAttempts: 1,
    },
    fallbackVariant: {
      chain: ['standard', 'strict', 'lowCost', 'minimal'],
      autoDowngradeOnFailure: true,
    },
  },
};
