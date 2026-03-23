import type { PromptTemplateSpec } from '@/types/prompt';
import { HEADINGS } from '../heading-constants';

export const stageSolidifyTemplate: PromptTemplateSpec = {
  id: 'stage:solidify',
  layer: 'stage',
  purpose: 'Generate a knowledge-extraction prompt for an external agent',

  requiredInputs: [
    { name: 'sessionGoal', type: 'string', required: true, description: 'The original goal of the completed session' },
    { name: 'completedArtifacts', type: 'artifact', required: true, description: 'All artifacts produced during the session' },
  ],
  optionalInputs: [
    { name: 'pinnedFacts', type: 'pinned_facts', required: false, description: 'Previously pinned facts for context' },
    { name: 'sessionMessages', type: 'messages', required: false, description: 'Session message history for deeper analysis' },
  ],

  taskContract: '',

  stageContract: [
    'You generate a prompt for an external agent to extract rules and lessons — you do NOT extract them yourself.',
    'Your output is a self-contained prompt the user will copy into an external agent (Cursor, Claude Code, etc.).',
    'The FINAL_PROMPT must embed enough session context for the external agent to identify reusable knowledge.',
    'Diagnose the session: what went well, what was messy, what knowledge is worth preserving.',
    'State every assumption you baked into the prompt.',
    'Suggest facts worth pinning for future sessions.',
  ].join('\n'),

  outputContract: {
    requiredSections: [
      {
        key: 'DIAGNOSIS',
        heading: HEADINGS.DIAGNOSIS,
        fieldType: 'bullet_list',
        description: 'Analysis of the session: what went well, what was messy, what knowledge is worth extracting',
        missingBehavior: 'reject',
      },
      {
        key: 'ASSUMPTIONS_ADDED',
        heading: HEADINGS.ASSUMPTIONS_ADDED,
        fieldType: 'bullet_list',
        description: 'Assumptions Promptor added about what constitutes reusable knowledge from this session',
        pinnable: true,
        missingBehavior: 'fill_default',
        defaultValue: '- No additional assumptions were needed',
      },
      {
        key: 'FINAL_PROMPT',
        heading: HEADINGS.FINAL_PROMPT,
        fieldType: 'paragraph',
        description: 'Self-contained prompt for an external agent to extract reusable rules, memory summary, agent rule suggestions, and lessons learned from the session',
        savableAs: 'reusable_rules',
        pinnable: true,
        missingBehavior: 'reject',
      },
      {
        key: 'CHEAPER_VARIANT',
        heading: HEADINGS.CHEAPER_VARIANT,
        fieldType: 'paragraph',
        description: 'A shorter, lower-token version of FINAL_PROMPT that still extracts key rules and a summary',
        missingBehavior: 'fill_default',
        defaultValue: '(No cheaper variant generated — use FINAL_PROMPT as-is.)',
      },
      {
        key: 'SUGGESTED_PINNED_FACTS',
        heading: HEADINGS.SUGGESTED_PINNED_FACTS,
        fieldType: 'bullet_list',
        description: 'Facts worth pinning for reuse in future sessions',
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
      '- Session achieved its goal: httpOnly cookie-based token refresh is implemented.',
      '- The annotation loop was valuable — middleware change significantly improved the design.',
      '- Research phase could have caught the Redis dependency question earlier.',
      '- Several patterns emerged that are worth codifying as rules.',
      '',
      `## ${HEADINGS.ASSUMPTIONS_ADDED}`,
      '- Assumed rules should be scoped to Next.js/NextAuth projects.',
      '- Assumed agent rule suggestions should be formatted as cursor rules.',
      '',
      `## ${HEADINGS.FINAL_PROMPT}`,
      'You are a senior engineer reviewing a completed development session. Extract reusable knowledge from the session artifacts below.',
      '',
      'Session goal: Implement httpOnly cookie-based token refresh for the NextAuth module.',
      '',
      'Session artifacts:',
      '- Research summary: NextAuth v4 supports custom token rotation; PostgreSQL session store is recommended.',
      '- Decision record: Chose cookie rotation over in-memory approach for persistence and security.',
      '- Implementation plan: 5-step plan covering tokens.ts, refresh/route.ts, middleware.ts.',
      '- Annotations applied: Changed wrapper to middleware; added structured logging; kept Redis dependency.',
      '',
      'Output your analysis using exactly these sections:',
      '',
      '## REUSABLE_RULES',
      'Concrete, actionable rules worth reusing in future sessions. Each rule must start with an action verb.',
      '',
      '## MEMORY_SUMMARY',
      'Compact paragraph: what happened, key decisions, final outcome.',
      '',
      '## AGENT_RULE_SUGGESTIONS',
      'Suggestions for cursor rules, agent rules, or coding standards derived from this session.',
      '',
      '## LESSONS_LEARNED',
      'What worked well and what should be done differently next time.',
      '',
      'Constraints:',
      '- Rules must be concrete and actionable, not vague advice.',
      '- Focus on transferable knowledge, not implementation rehash.',
      '- Every lesson must reference a specific session event.',
      '',
      `## ${HEADINGS.CHEAPER_VARIANT}`,
      'Extract reusable knowledge from this session. Output: REUSABLE_RULES (up to 5 actionable bullets) and MEMORY_SUMMARY (3 sentences max). Session goal: ... Artifacts: ...',
      '',
      `## ${HEADINGS.SUGGESTED_PINNED_FACTS}`,
      '- httpOnly cookies are the standard for refresh tokens in Next.js apps',
      '- Middleware-based auth is preferred over wrapper functions',
      '- Structured JSON logging is the project standard',
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
      'Verify your output has all 5 headings: DIAGNOSIS, ASSUMPTIONS_ADDED, FINAL_PROMPT, CHEAPER_VARIANT, SUGGESTED_PINNED_FACTS. FINAL_PROMPT must instruct an external agent to output REUSABLE_RULES, MEMORY_SUMMARY, AGENT_RULE_SUGGESTIONS, LESSONS_LEARNED.',
    missingSectionRepair:
      'Add the missing heading. FINAL_PROMPT must contain the full external-agent prompt with embedded session context.',
    invalidHeadingRepair:
      'Rename headings to exact uppercase form: DIAGNOSIS, ASSUMPTIONS_ADDED, FINAL_PROMPT, CHEAPER_VARIANT, SUGGESTED_PINNED_FACTS.',
    proseToStructureRepair:
      'Convert prose into bullets under DIAGNOSIS and ASSUMPTIONS_ADDED. Keep FINAL_PROMPT as a self-contained prompt paragraph.',
    trimToSchemaRepair:
      'Remove any content not under a recognized heading. Do not extract rules yourself — only output the prompt that instructs an external agent to do so.',
  },

  variantContract: {
    standard: {
      promptText:
        'Generate a self-contained knowledge-extraction prompt for an external agent. Include all 5 sections. The FINAL_PROMPT must instruct the agent to output REUSABLE_RULES, MEMORY_SUMMARY, AGENT_RULE_SUGGESTIONS, LESSONS_LEARNED.',
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
        'Generate a rigorous knowledge-extraction prompt. FINAL_PROMPT must require every rule to start with an action verb, every lesson to cite a specific session event, and agent rule suggestions to be formatted as cursor-compatible rules.',
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
        'FINAL_PROMPT must require action-verb-prefixed rules.',
        'FINAL_PROMPT must require lessons to cite specific session events.',
      ],
    },
    lowCost: {
      promptText:
        'Generate a concise knowledge-extraction prompt. Include DIAGNOSIS, FINAL_PROMPT, and CHEAPER_VARIANT.',
      tokenBudget: 500,
      includeSkeleton: false,
      includedSections: [
        HEADINGS.DIAGNOSIS,
        HEADINGS.FINAL_PROMPT,
        HEADINGS.CHEAPER_VARIANT,
      ],
      additionalConstraints: ['CHEAPER_VARIANT should target under 150 tokens.'],
    },
    minimal: {
      promptText:
        'Output FINAL_PROMPT (knowledge-extraction prompt, max 150 words) and DIAGNOSIS (2-3 bullets).',
      tokenBudget: 150,
      includeSkeleton: false,
      includedSections: [HEADINGS.FINAL_PROMPT, HEADINGS.DIAGNOSIS],
      additionalConstraints: ['50-150 words total. No prose outside sections.'],
    },
  },

  weakModelSpec: {
    maxInstructionWords: 80,
    requiredNegativeConstraints: [
      'Do not extract rules or lessons yourself.',
      'Do not summarize the session yourself.',
      'Do not give vague advice.',
      'Only output a prompt that an external agent will execute.',
    ],
    extractionFields: [
      { label: 'Diagnosis', format: 'bullet list', section: HEADINGS.DIAGNOSIS },
      { label: 'Prompt', format: 'self-contained prompt paragraph', section: HEADINGS.FINAL_PROMPT },
      { label: 'Cheap prompt', format: 'shorter prompt paragraph', section: HEADINGS.CHEAPER_VARIANT },
    ],
    bannedPhrases: ['I cannot access', "I don't have access", 'feel free', 'you might want to', 'consider', 'optionally', 'as appropriate'],
    minimalExecutableTemplate: [
      'Generate a knowledge-extraction prompt for an external agent.',
      '## DIAGNOSIS\n(bullet list: what went well, what is worth extracting)',
      '## FINAL_PROMPT\n(self-contained prompt the user copies to an external agent)',
      '## CHEAPER_VARIANT\n(shorter version of the prompt)',
      'Goal: {{sessionGoal}}',
      'Artifacts: {{completedArtifacts}}',
    ].join('\n'),
    fewShotSkeleton: [
      '## DIAGNOSIS',
      '- Session succeeded; middleware pattern and logging rule are worth codifying.',
      '- Research phase missed the Redis question — lesson worth capturing.',
      '## FINAL_PROMPT',
      'Extract reusable knowledge from this session. Output: REUSABLE_RULES (actionable bullets), MEMORY_SUMMARY (2-3 sentences), AGENT_RULE_SUGGESTIONS, LESSONS_LEARNED. Session: ...',
      '## CHEAPER_VARIANT',
      'Extract rules and summary from this session. Output: REUSABLE_RULES (max 3 bullets) and MEMORY_SUMMARY (2 sentences). Session: ...',
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
