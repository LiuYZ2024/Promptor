import type { PromptTemplateSpec } from '@/types/prompt';
import { HEADINGS } from '../heading-constants';

export const stageResearchTemplate: PromptTemplateSpec = {
  id: 'stage:research',
  layer: 'stage',
  purpose: 'Generate a research prompt for an external agent to investigate codebase/context',

  requiredInputs: [
    { name: 'requirementBrief', type: 'artifact', required: true, description: 'Requirement brief artifact from previous stage' },
    { name: 'userInput', type: 'string', required: true, description: 'Original user request for reference' },
  ],
  optionalInputs: [
    { name: 'pinnedFacts', type: 'pinned_facts', required: false, description: 'Previously pinned facts for context' },
    { name: 'codebaseContext', type: 'string', required: false, description: 'Relevant codebase files, structure, or snippets' },
  ],

  taskContract: '',

  stageContract: [
    'Research stage — generate a prompt that instructs an external agent to research the codebase or context.',
    'You are NOT doing the research yourself. You are producing a PROMPT for an external agent (Cursor, Claude Code, etc.) that HAS codebase access.',
    'The FINAL_PROMPT must tell the external agent exactly what to investigate, what to output, and how to structure findings.',
    'NEVER say "I cannot access the repository" or "I lack context." Instead, write a prompt that instructs an agent WITH access to do the research.',
    'Include the user\'s research goal verbatim inside FINAL_PROMPT.',
  ].join('\n'),

  outputContract: {
    requiredSections: [
      {
        key: 'DIAGNOSIS',
        heading: HEADINGS.DIAGNOSIS,
        fieldType: 'bullet_list',
        description: 'Analysis of the research request: what is clear, what is vague, what additional context would help',
        missingBehavior: 'fill_default',
        defaultValue: '- Research request is clear enough to proceed.',
      },
      {
        key: 'ASSUMPTIONS_ADDED',
        heading: HEADINGS.ASSUMPTIONS_ADDED,
        fieldType: 'bullet_list',
        description: 'Assumptions added to make the research prompt actionable',
        missingBehavior: 'fill_default',
        defaultValue: '- No assumptions added.',
      },
      {
        key: 'FINAL_PROMPT',
        heading: HEADINGS.FINAL_PROMPT,
        fieldType: 'paragraph',
        description: 'A complete, self-contained research prompt for an external agent. Must include: what to investigate, where to look, what to output (structured findings: key modules, patterns, boundaries, gaps, summary).',
        savableAs: 'research_summary',
        pinnable: true,
        missingBehavior: 'reject',
      },
      {
        key: 'CHEAPER_VARIANT',
        heading: HEADINGS.CHEAPER_VARIANT,
        fieldType: 'paragraph',
        description: 'Shorter research prompt at ≤60% token count',
        missingBehavior: 'fill_default',
        defaultValue: 'Use FINAL_PROMPT as-is.',
      },
      {
        key: 'SUGGESTED_PINNED_FACTS',
        heading: HEADINGS.SUGGESTED_PINNED_FACTS,
        fieldType: 'bullet_list',
        description: 'Facts worth pinning for later stages',
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
      '- Clear: User wants to understand scheme12-related code in the codebase.',
      '- Vague: No specific files or modules mentioned as starting points.',
      '- Missing: No stated goal for the research (understanding for refactoring? debugging? extending?).',
      '',
      `## ${HEADINGS.ASSUMPTIONS_ADDED}`,
      '- [REASONABLE] The research is preparatory — user wants to understand before making changes.',
      '- [NEEDS_CONFIRMATION] "scheme12" refers to a database schema version or migration.',
      '',
      `## ${HEADINGS.FINAL_PROMPT}`,
      'Research the current codebase to understand all code related to "scheme12."',
      '',
      'Investigate:',
      '1. Search for all files referencing "scheme12" (or "schema12", "schema_12", "scheme_12").',
      '2. For each file found, summarize its purpose and how it relates to scheme12.',
      '3. Identify the data flow: where scheme12 data is created, read, updated, and deleted.',
      '4. Note any migration files, configuration, or constants related to scheme12.',
      '',
      'Output your findings in this structure:',
      '## EXISTING_CONTEXT — What is already known about scheme12 in this codebase.',
      '## KEY_MODULES — List of files/modules involved, with a one-line purpose for each.',
      '## RELEVANT_PATTERNS — Design patterns or conventions used in scheme12 code.',
      '## BOUNDARIES — What scheme12 code does NOT touch or depend on.',
      '## GAPS — Missing information, undocumented areas, or unclear relationships.',
      '## RESEARCH_SUMMARY — 3-5 sentence summary of findings.',
      '',
      'Do not propose changes. Do not implement anything. Only report findings.',
      '',
      `## ${HEADINGS.CHEAPER_VARIANT}`,
      'Find all files referencing "scheme12" in the codebase. For each, state its purpose. List unknowns. Output: KEY_MODULES (bullet list), GAPS (bullet list), RESEARCH_SUMMARY (2-3 sentences).',
      '',
      `## ${HEADINGS.SUGGESTED_PINNED_FACTS}`,
      '- Research target: scheme12-related code',
      '- Research type: codebase understanding (preparatory)',
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
      'Verify your output has: DIAGNOSIS, ASSUMPTIONS_ADDED, FINAL_PROMPT, CHEAPER_VARIANT, SUGGESTED_PINNED_FACTS. FINAL_PROMPT must be a research prompt for an EXTERNAL agent — not your own research attempt. It must never say "I cannot access the repo."',
    missingSectionRepair:
      'Add the missing heading. FINAL_PROMPT must be a self-contained research prompt for an external agent.',
    invalidHeadingRepair:
      'Rename headings to exact uppercase form: DIAGNOSIS, ASSUMPTIONS_ADDED, FINAL_PROMPT, CHEAPER_VARIANT, SUGGESTED_PINNED_FACTS.',
    proseToStructureRepair:
      'Reorganize under the required headings. The research prompt for the external agent goes under FINAL_PROMPT.',
    trimToSchemaRepair:
      'Remove any content not under one of the 5 required headings.',
  },

  variantContract: {
    standard: {
      promptText:
        'Generate a research prompt for an external coding agent based on the user\'s research request below. The FINAL_PROMPT must tell the agent what to investigate, where to look, and how to structure findings. NEVER attempt to do the research yourself. Include DIAGNOSIS, ASSUMPTIONS_ADDED, and CHEAPER_VARIANT.',
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
        'Generate a thorough research prompt. FINAL_PROMPT must specify exact search terms, file patterns, and required output structure. DIAGNOSIS must have at least 3 items.',
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
        'FINAL_PROMPT must include specific search terms or file patterns.',
        'DIAGNOSIS must have at least 3 items.',
      ],
    },
    lowCost: {
      promptText:
        'Generate a short research prompt for an external agent. Output DIAGNOSIS (2 items), FINAL_PROMPT, CHEAPER_VARIANT.',
      tokenBudget: 600,
      includeSkeleton: false,
      includedSections: [HEADINGS.DIAGNOSIS, HEADINGS.FINAL_PROMPT, HEADINGS.CHEAPER_VARIANT],
      additionalConstraints: ['Keep FINAL_PROMPT under 150 words.'],
    },
    minimal: {
      promptText:
        'Generate FINAL_PROMPT (a research prompt for an external agent, under 100 words) and DIAGNOSIS (2 bullets).',
      tokenBudget: 200,
      includeSkeleton: false,
      includedSections: [HEADINGS.DIAGNOSIS, HEADINGS.FINAL_PROMPT],
      additionalConstraints: ['50-100 words for FINAL_PROMPT.'],
    },
  },

  weakModelSpec: {
    maxInstructionWords: 80,
    requiredNegativeConstraints: [
      'Do not do the research yourself — generate a prompt for another agent to do it.',
      'Do not say you cannot access the codebase.',
      'Do not output research findings — output a research PROMPT.',
    ],
    extractionFields: [
      { label: 'Diagnosis', format: 'bullet list', section: HEADINGS.DIAGNOSIS },
      { label: 'Research prompt', format: 'self-contained paragraph', section: HEADINGS.FINAL_PROMPT },
    ],
    bannedPhrases: ['feel free', 'you might want to', 'consider', 'optionally', 'I cannot access', 'I don\'t have access', 'I lack context'],
    minimalExecutableTemplate: [
      'Generate a research prompt for an external agent that has codebase access.',
      '## DIAGNOSIS\n(what is clear vs. vague)',
      '## FINAL_PROMPT\n(self-contained research prompt for the agent)',
      'User research request: {{userInput}}',
    ].join('\n'),
    fewShotSkeleton: [
      '## DIAGNOSIS',
      '- Clear: User wants to find scheme12-related code',
      '- Missing: No stated purpose for the research',
      '## FINAL_PROMPT',
      'Search the codebase for all references to "scheme12". For each file found, summarize its purpose. Output: KEY_MODULES (bullet list), GAPS (bullet list), RESEARCH_SUMMARY (2-3 sentences). Do not propose changes.',
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
