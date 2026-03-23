import type { PromptTemplateSpec } from '@/types/prompt';
import { HEADINGS } from '../heading-constants';

export const stageVerifyTemplate: PromptTemplateSpec = {
  id: 'stage:verify',
  layer: 'stage',
  purpose: 'Generate verification plan and prompts for completed implementation',

  requiredInputs: [
    { name: 'implementationPlan', type: 'artifact', required: true, description: 'The implementation plan that was executed' },
    { name: 'completedWork', type: 'string', required: true, description: 'Description of what was actually implemented' },
  ],
  optionalInputs: [
    { name: 'pinnedFacts', type: 'pinned_facts', required: false, description: 'Previously pinned facts for context' },
  ],

  taskContract: '',

  stageContract: [
    'Verification phase — produce verification prompts and checklists.',
    'Focus on evidence: what to check, how to check it, what constitutes pass/fail.',
    'Include typecheck, tests, manual QA, and regression checks.',
    'Do not re-implement or modify the code.',
    'Every check must have a clear pass/fail criterion.',
  ].join('\n'),

  outputContract: {
    requiredSections: [
      {
        key: 'VERIFICATION_PROMPT',
        heading: HEADINGS.VERIFICATION_PROMPT,
        fieldType: 'paragraph',
        description: 'A prompt to send to an agent or human to verify the implementation',
        savableAs: 'verification_prompt',
        pinnable: true,
        missingBehavior: 'reject',
      },
      {
        key: 'CHECKLIST',
        heading: HEADINGS.CHECKLIST,
        fieldType: 'checklist',
        description: 'Ordered verification checklist with pass/fail criteria',
        savableAs: 'verification_report',
        pinnable: true,
        missingBehavior: 'reject',
      },
      {
        key: 'EVIDENCE_REQUIRED',
        heading: HEADINGS.EVIDENCE_REQUIRED,
        fieldType: 'bullet_list',
        description: 'Specific evidence needed to confirm each check passed',
        missingBehavior: 'fill_default',
        defaultValue: '- TypeScript compiles without errors\n- All tests pass\n- No regressions in existing tests',
      },
      {
        key: 'FAILURE_HANDLING',
        heading: HEADINGS.FAILURE_HANDLING,
        fieldType: 'bullet_list',
        description: 'What to do if a check fails',
        missingBehavior: 'fill_default',
        defaultValue: '- Re-run the failed step from the implementation plan\n- If persistent, escalate to human review',
      },
    ],
    optionalSections: [
      {
        key: 'RISKS',
        heading: HEADINGS.RISKS,
        fieldType: 'bullet_list',
        description: 'Risks specific to this verification round',
        missingBehavior: 'skip',
      },
    ],
    sectionOrder: [
      HEADINGS.VERIFICATION_PROMPT,
      HEADINGS.CHECKLIST,
      HEADINGS.EVIDENCE_REQUIRED,
      HEADINGS.FAILURE_HANDLING,
      HEADINGS.RISKS,
    ],
    skeletonExample: [
      `## ${HEADINGS.VERIFICATION_PROMPT}`,
      'Verify the token refresh implementation in the Next.js auth module.',
      '',
      'Run the following checks in order:',
      '1. TypeScript compilation: `npm run typecheck`',
      '2. Unit tests: `npm test -- --grep "token"',
      '3. Integration test: start dev server, login, wait for token expiry, confirm refresh happens automatically.',
      '4. Manual check: open browser devtools > Application > Cookies. Confirm refresh token is httpOnly.',
      '5. Regression: run full test suite `npm test` to confirm no existing tests broke.',
      '',
      `## ${HEADINGS.CHECKLIST}`,
      '- [ ] `npm run typecheck` exits with code 0',
      '- [ ] Token rotation unit tests pass',
      '- [ ] Refresh endpoint returns 200 with new cookie',
      '- [ ] Expired access token triggers automatic refresh',
      '- [ ] httpOnly flag is set on refresh cookie',
      '- [ ] Full test suite passes (no regressions)',
      '',
      `## ${HEADINGS.EVIDENCE_REQUIRED}`,
      '- Screenshot or log of `typecheck` passing',
      '- Test output showing token tests pass',
      '- Network tab showing refresh request + 200 response',
      '- Cookie inspector showing httpOnly flag',
      '',
      `## ${HEADINGS.FAILURE_HANDLING}`,
      '- Typecheck failure: fix type errors, re-run',
      '- Test failure: check test expectations against implementation, fix mismatch',
      '- Cookie not httpOnly: check NextAuth cookie config in `src/app/api/auth/[...nextauth]/route.ts`',
      '',
      `## ${HEADINGS.RISKS}`,
      '- Flaky tests due to timing in token expiry checks',
      '- Dev server port conflict may cause false failures',
    ].join('\n'),
  },

  failureContract: {
    minAcceptableSections: 3,
    onPartialOutput: 'attempt_repair',
    onMalformedOutput: 'attempt_repair',
    onEmptyOutput: 'retry_once',
    maxRepairAttempts: 1,
    criticalSections: ['VERIFICATION_PROMPT', 'CHECKLIST'],
  },

  repairContract: {
    selfCheckInstruction:
      'Verify your output has all required headings: VERIFICATION_PROMPT, CHECKLIST, EVIDENCE_REQUIRED, FAILURE_HANDLING. RISKS is optional. Each heading must start with "## ".',
    missingSectionRepair:
      'Add the missing heading. CHECKLIST must use checkbox format "- [ ]". VERIFICATION_PROMPT must be actionable.',
    invalidHeadingRepair:
      'Rename headings to exact uppercase form: VERIFICATION_PROMPT, CHECKLIST, EVIDENCE_REQUIRED, FAILURE_HANDLING.',
    proseToStructureRepair:
      'Convert prose into a checklist under CHECKLIST. Extract failure steps into FAILURE_HANDLING bullets.',
    trimToSchemaRepair:
      'Remove any content not under a recognized heading.',
  },

  variantContract: {
    standard: {
      promptText:
        'Generate a verification plan for the completed implementation. Include all 4 required sections. Every check must have a clear pass/fail criterion.',
      tokenBudget: 1500,
      includeSkeleton: true,
      includedSections: [
        HEADINGS.VERIFICATION_PROMPT,
        HEADINGS.CHECKLIST,
        HEADINGS.EVIDENCE_REQUIRED,
        HEADINGS.FAILURE_HANDLING,
        HEADINGS.RISKS,
      ],
      additionalConstraints: [],
    },
    strict: {
      promptText:
        'Generate a rigorous verification plan. Every checklist item must map to a plan step. Include commands to run and expected outputs.',
      tokenBudget: 2000,
      includeSkeleton: true,
      includedSections: [
        HEADINGS.VERIFICATION_PROMPT,
        HEADINGS.CHECKLIST,
        HEADINGS.EVIDENCE_REQUIRED,
        HEADINGS.FAILURE_HANDLING,
        HEADINGS.RISKS,
      ],
      additionalConstraints: [
        'Every checklist item must include the exact command or action to run.',
        'Evidence must be machine-verifiable where possible.',
      ],
    },
    lowCost: {
      promptText:
        'Generate VERIFICATION_PROMPT and CHECKLIST only.',
      tokenBudget: 600,
      includeSkeleton: false,
      includedSections: [HEADINGS.VERIFICATION_PROMPT, HEADINGS.CHECKLIST],
      additionalConstraints: ['Keep checklist to 5 items max.'],
    },
    minimal: {
      promptText:
        'Write a CHECKLIST with up to 4 verification items. Each item is a checkbox with pass/fail criterion.',
      tokenBudget: 150,
      includeSkeleton: false,
      includedSections: [HEADINGS.CHECKLIST],
      additionalConstraints: ['50-100 words total. Checkbox format only.'],
    },
  },

  weakModelSpec: {
    maxInstructionWords: 80,
    requiredNegativeConstraints: [
      'Do not modify or re-implement code.',
      'Do not skip verification steps.',
      'Do not mark anything as passed without evidence.',
    ],
    extractionFields: [
      { label: 'Verification prompt', format: 'short paragraph', section: HEADINGS.VERIFICATION_PROMPT },
      { label: 'Checklist', format: 'checkbox list', section: HEADINGS.CHECKLIST },
    ],
    bannedPhrases: ['feel free', 'you might want to', 'consider', 'optionally', 'as appropriate'],
    minimalExecutableTemplate: [
      'Create a verification checklist for the completed work below.',
      '## VERIFICATION_PROMPT\n(what to verify and how)',
      '## CHECKLIST\n(- [ ] item with pass/fail)',
      'Plan: {{implementationPlan}}',
      'Completed: {{completedWork}}',
    ].join('\n'),
    fewShotSkeleton: [
      '## VERIFICATION_PROMPT',
      'Verify the auth endpoint works. Run typecheck and tests.',
      '## CHECKLIST',
      '- [ ] npm run typecheck — exits 0',
      '- [ ] npm test — all pass',
      '- [ ] Login returns JWT token',
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
      repairStrategies: ['missing_section_repair', 'invalid_heading_repair', 'prose_to_structure'],
      maxAttempts: 1,
    },
    fallbackVariant: {
      chain: ['standard', 'strict', 'lowCost', 'minimal'],
      autoDowngradeOnFailure: true,
    },
  },
};
