import type { PromptTemplateSpec } from '@/types/prompt';
import { HEADINGS } from '../heading-constants';

export const stageDiscussionTemplate: PromptTemplateSpec = {
  id: 'stage:discussion',
  layer: 'stage',
  purpose: 'Generate a discussion/comparison prompt for an external agent',

  requiredInputs: [
    { name: 'problemStatement', type: 'string', required: true, description: 'Clear statement of the problem to discuss' },
    { name: 'researchSummary', type: 'artifact', required: true, description: 'Research summary artifact from previous stage' },
  ],
  optionalInputs: [
    { name: 'pinnedFacts', type: 'pinned_facts', required: false, description: 'Previously pinned facts for context' },
    { name: 'existingApproaches', type: 'string[]', required: false, description: 'Previously proposed approaches to evaluate' },
  ],

  taskContract: '',

  stageContract: [
    'Discussion stage — generate a prompt that instructs an external agent to compare approaches and discuss tradeoffs.',
    'You are NOT making the decision yourself. You are producing a PROMPT for an external agent to facilitate a structured discussion.',
    'The FINAL_PROMPT must instruct the agent to present candidate approaches with pros/cons, a tradeoff comparison, and a recommendation.',
    'Do NOT output your own recommended direction as if you are the project owner.',
  ].join('\n'),

  outputContract: {
    requiredSections: [
      {
        key: 'DIAGNOSIS',
        heading: HEADINGS.DIAGNOSIS,
        fieldType: 'bullet_list',
        description: 'Analysis of the discussion request: what is clear, what context is missing',
        missingBehavior: 'fill_default',
        defaultValue: '- Discussion request is clear enough to proceed.',
      },
      {
        key: 'ASSUMPTIONS_ADDED',
        heading: HEADINGS.ASSUMPTIONS_ADDED,
        fieldType: 'bullet_list',
        description: 'Assumptions added to scope the discussion',
        missingBehavior: 'fill_default',
        defaultValue: '- No assumptions added.',
      },
      {
        key: 'FINAL_PROMPT',
        heading: HEADINGS.FINAL_PROMPT,
        fieldType: 'paragraph',
        description: 'A complete discussion prompt for an external agent. Must instruct the agent to present at least 2 approaches with pros/cons, tradeoffs, unknowns, and a recommended direction.',
        savableAs: 'discussion_notes',
        pinnable: true,
        missingBehavior: 'reject',
      },
      {
        key: 'CHEAPER_VARIANT',
        heading: HEADINGS.CHEAPER_VARIANT,
        fieldType: 'paragraph',
        description: 'Shorter discussion prompt at ≤60% token count',
        missingBehavior: 'fill_default',
        defaultValue: 'Use FINAL_PROMPT as-is.',
      },
      {
        key: 'SUGGESTED_PINNED_FACTS',
        heading: HEADINGS.SUGGESTED_PINNED_FACTS,
        fieldType: 'bullet_list',
        description: 'Facts worth pinning from the discussion context',
        pinnable: true,
        missingBehavior: 'fill_default',
        defaultValue: '- No pinnable facts identified.',
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
      '- Clear: User wants to choose a token refresh strategy.',
      '- Good: Research summary provides relevant technical context.',
      '- Missing: No stated preference for security vs. simplicity tradeoff.',
      '',
      `## ${HEADINGS.ASSUMPTIONS_ADDED}`,
      '- [REASONABLE] Both server-side and client-side approaches should be considered.',
      '',
      `## ${HEADINGS.FINAL_PROMPT}`,
      'Evaluate approaches for implementing token refresh in the auth module.',
      '',
      'Context from prior research:',
      '[research summary would be included here]',
      '',
      'Instructions:',
      '1. Present at least 2 candidate approaches. For each, provide: name, description, pros, cons.',
      '2. Create a tradeoff comparison across: complexity, security, persistence, performance.',
      '3. List key unknowns that could affect the decision.',
      '4. Recommend one direction with justification.',
      '5. State what enters the implementation plan and what remains open.',
      '',
      'Output structure:',
      '## PROBLEM_FRAMING — Restate the problem precisely.',
      '## CANDIDATE_APPROACHES — At least 2 approaches with name/description/pros/cons.',
      '## TRADEOFF_MATRIX — Side-by-side comparison table.',
      '## KEY_UNKNOWNS — Unknowns that affect the decision.',
      '## RECOMMENDED_DIRECTION — Which approach and why.',
      '## WHAT_ENTERS_PLAN — Items for the plan stage.',
      '## WHAT_REMAINS_OPEN — Deferred or unresolved items.',
      '',
      'Do not implement. Do not write code. Compare and recommend only.',
      '',
      `## ${HEADINGS.CHEAPER_VARIANT}`,
      'Compare 2 approaches for token refresh. For each: name, 2 pros, 2 cons. Recommend one. Output: CANDIDATE_APPROACHES, RECOMMENDED_DIRECTION.',
      '',
      `## ${HEADINGS.SUGGESTED_PINNED_FACTS}`,
      '- Discussion topic: token refresh strategy',
      '- Stage: evaluating approaches, no decision finalized yet',
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
      'Verify your output has: DIAGNOSIS, ASSUMPTIONS_ADDED, FINAL_PROMPT, CHEAPER_VARIANT, SUGGESTED_PINNED_FACTS. FINAL_PROMPT must be a discussion prompt for an EXTERNAL agent — not your own analysis or decision.',
    missingSectionRepair:
      'Add the missing heading. FINAL_PROMPT must instruct an external agent to compare approaches.',
    invalidHeadingRepair:
      'Rename headings to exact uppercase form: DIAGNOSIS, ASSUMPTIONS_ADDED, FINAL_PROMPT, CHEAPER_VARIANT, SUGGESTED_PINNED_FACTS.',
    proseToStructureRepair:
      'Reorganize under the required headings. The discussion prompt for the external agent goes under FINAL_PROMPT.',
    trimToSchemaRepair:
      'Remove any content not under one of the 5 required headings.',
  },

  variantContract: {
    standard: {
      promptText:
        'Generate a structured discussion prompt for an external agent. The FINAL_PROMPT must instruct the agent to compare at least 2 approaches with pros/cons and recommend a direction. Do NOT make the decision yourself.',
      tokenBudget: 1500,
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
        'Generate a rigorous discussion prompt. FINAL_PROMPT must require at least 3 comparison dimensions and evidence-based pros/cons.',
      tokenBudget: 2000,
      includeSkeleton: true,
      includedSections: [
        HEADINGS.DIAGNOSIS,
        HEADINGS.ASSUMPTIONS_ADDED,
        HEADINGS.FINAL_PROMPT,
        HEADINGS.CHEAPER_VARIANT,
        HEADINGS.SUGGESTED_PINNED_FACTS,
      ],
      additionalConstraints: [
        'FINAL_PROMPT must require a tradeoff matrix with at least 4 dimensions.',
      ],
    },
    lowCost: {
      promptText:
        'Generate a short discussion prompt. Output DIAGNOSIS, FINAL_PROMPT, CHEAPER_VARIANT.',
      tokenBudget: 600,
      includeSkeleton: false,
      includedSections: [HEADINGS.DIAGNOSIS, HEADINGS.FINAL_PROMPT, HEADINGS.CHEAPER_VARIANT],
      additionalConstraints: ['Keep FINAL_PROMPT under 150 words.'],
    },
    minimal: {
      promptText:
        'Generate FINAL_PROMPT (a discussion prompt under 100 words) and DIAGNOSIS (2 bullets).',
      tokenBudget: 200,
      includeSkeleton: false,
      includedSections: [HEADINGS.DIAGNOSIS, HEADINGS.FINAL_PROMPT],
      additionalConstraints: ['50-100 words for FINAL_PROMPT.'],
    },
  },

  weakModelSpec: {
    maxInstructionWords: 100,
    requiredNegativeConstraints: [
      'Do not conduct the discussion yourself — generate a prompt for another agent.',
      'Do not output your own recommended approach as if you are the decision-maker.',
      'Do not write code.',
    ],
    extractionFields: [
      { label: 'Diagnosis', format: 'bullet list', section: HEADINGS.DIAGNOSIS },
      { label: 'Discussion prompt', format: 'self-contained paragraph', section: HEADINGS.FINAL_PROMPT },
    ],
    bannedPhrases: ['feel free', 'you might want to', 'consider', 'optionally', 'I cannot access', 'I recommend'],
    minimalExecutableTemplate: [
      'Generate a discussion prompt for an external agent.',
      '## DIAGNOSIS\n(analysis of the discussion request)',
      '## FINAL_PROMPT\n(self-contained prompt for agent to compare approaches)',
      'Problem: {{problemStatement}}',
      'Research: {{researchSummary}}',
    ].join('\n'),
    fewShotSkeleton: [
      '## DIAGNOSIS',
      '- Clear: User wants to compare auth approaches',
      '- Missing: No priority stated (security vs. simplicity)',
      '## FINAL_PROMPT',
      'Compare at least 2 approaches for token refresh. For each: name, pros, cons. Recommend one. Output: CANDIDATE_APPROACHES, RECOMMENDED_DIRECTION. Do not implement.',
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
