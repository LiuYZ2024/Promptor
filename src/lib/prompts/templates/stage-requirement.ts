import type { PromptTemplateSpec } from '@/types/prompt';
import { HEADINGS } from '../heading-constants';

export const stageRequirementTemplate: PromptTemplateSpec = {
  id: 'stage:requirement',
  layer: 'stage',
  purpose: 'Generate a requirement-extraction prompt for an external agent',

  requiredInputs: [
    { name: 'userInput', type: 'string', required: true, description: 'Raw user request or task description' },
    { name: 'taskType', type: 'string', required: true, description: 'Type of task: coding, research, mixed, or discussion' },
  ],
  optionalInputs: [
    { name: 'pinnedFacts', type: 'pinned_facts', required: false, description: 'Previously pinned facts for context' },
  ],

  taskContract: '',

  stageContract: [
    'Requirement stage — generate a prompt that instructs an external agent to extract structured requirements from the user\'s request.',
    'You are NOT extracting requirements yourself. You are producing a PROMPT for another agent to do so.',
    'The FINAL_PROMPT must be self-contained: the external agent must be able to act on it without additional context.',
    'Include the user\'s original request verbatim inside the FINAL_PROMPT.',
    'The prompt should instruct the agent to output: objective, must-haves, nice-to-haves, constraints, unknowns, and deliverables.',
  ].join('\n'),

  outputContract: {
    requiredSections: [
      {
        key: 'DIAGNOSIS',
        heading: HEADINGS.DIAGNOSIS,
        fieldType: 'bullet_list',
        description: 'Analysis of what is clear vs. vague in the user\'s raw request',
        missingBehavior: 'fill_default',
        defaultValue: '- No major issues found in the request.',
      },
      {
        key: 'ASSUMPTIONS_ADDED',
        heading: HEADINGS.ASSUMPTIONS_ADDED,
        fieldType: 'bullet_list',
        description: 'Assumptions Promptor added to make the prompt actionable, each labeled [REASONABLE] or [NEEDS_CONFIRMATION]',
        missingBehavior: 'fill_default',
        defaultValue: '- No assumptions added.',
      },
      {
        key: 'FINAL_PROMPT',
        heading: HEADINGS.FINAL_PROMPT,
        fieldType: 'paragraph',
        description: 'A complete, self-contained requirement-extraction prompt for an external agent. Must include the user\'s original request and instruct the agent to output structured requirements.',
        savableAs: 'requirement_brief',
        pinnable: true,
        missingBehavior: 'reject',
      },
      {
        key: 'CHEAPER_VARIANT',
        heading: HEADINGS.CHEAPER_VARIANT,
        fieldType: 'paragraph',
        description: 'Shorter version of FINAL_PROMPT at ≤60% token count, preserving core intent',
        savableAs: 'requirement_brief',
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
      '- Missing: No target platform specified.',
      '- Vague: "make it work" — no success criteria.',
      '- Good: Clear feature scope (login + registration).',
      '',
      `## ${HEADINGS.ASSUMPTIONS_ADDED}`,
      '- [REASONABLE] Target platform is web based on project context.',
      '- [NEEDS_CONFIRMATION] Authentication method is email/password.',
      '',
      `## ${HEADINGS.FINAL_PROMPT}`,
      'You are extracting structured requirements from a user request.',
      '',
      'User request:',
      '"Build a login and registration system for the app."',
      '',
      'Analyze this request and output the following sections:',
      '',
      '## OBJECTIVE',
      'One-paragraph summary of what the user wants to achieve.',
      '',
      '## MUST_HAVE',
      'Non-negotiable requirements (bullet list).',
      '',
      '## NICE_TO_HAVE',
      'Optional features (bullet list).',
      '',
      '## KNOWN_CONSTRAINTS',
      'Technical or business constraints stated or implied.',
      '',
      '## UNKNOWN_QUESTIONS',
      'Questions that must be answered before proceeding.',
      '',
      '## DELIVERABLES',
      'Concrete outputs the user expects.',
      '',
      `## ${HEADINGS.CHEAPER_VARIANT}`,
      'Extract requirements from: "Build a login and registration system." Output: OBJECTIVE (1 sentence), MUST_HAVE (bullets), DELIVERABLES (bullets).',
      '',
      `## ${HEADINGS.SUGGESTED_PINNED_FACTS}`,
      '- Feature scope: login + registration',
      '- Platform: web (assumed)',
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
      'Verify your output has: DIAGNOSIS, ASSUMPTIONS_ADDED, FINAL_PROMPT, CHEAPER_VARIANT, SUGGESTED_PINNED_FACTS. FINAL_PROMPT must contain a self-contained prompt for an external agent — not your own requirement analysis.',
    missingSectionRepair:
      'Add the missing heading. FINAL_PROMPT must be a prompt for an external agent to extract requirements.',
    invalidHeadingRepair:
      'Rename headings to exact uppercase form: DIAGNOSIS, ASSUMPTIONS_ADDED, FINAL_PROMPT, CHEAPER_VARIANT, SUGGESTED_PINNED_FACTS.',
    proseToStructureRepair:
      'Reorganize under the required headings. The main requirement-extraction prompt text goes under FINAL_PROMPT.',
    trimToSchemaRepair:
      'Remove any content not under one of the 5 required headings.',
  },

  variantContract: {
    standard: {
      promptText:
        'Generate a requirement-extraction prompt for an external agent based on the user input below. The FINAL_PROMPT must be self-contained and copy-ready. Include the user\'s original request inside it. Also provide DIAGNOSIS of the request quality, ASSUMPTIONS_ADDED, and a CHEAPER_VARIANT.',
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
        'Generate a rigorous requirement-extraction prompt. FINAL_PROMPT must instruct the agent to trace every requirement back to the user\'s words. DIAGNOSIS must cite at least 3 specific issues.',
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
        'DIAGNOSIS must have at least 3 items.',
        'FINAL_PROMPT must instruct the agent to cite user wording for each requirement.',
      ],
    },
    lowCost: {
      promptText:
        'Generate a short requirement-extraction prompt. Output DIAGNOSIS (2 items), FINAL_PROMPT, and CHEAPER_VARIANT.',
      tokenBudget: 600,
      includeSkeleton: false,
      includedSections: [HEADINGS.DIAGNOSIS, HEADINGS.FINAL_PROMPT, HEADINGS.CHEAPER_VARIANT],
      additionalConstraints: ['Keep FINAL_PROMPT under 150 words.'],
    },
    minimal: {
      promptText:
        'Generate FINAL_PROMPT (a requirement-extraction prompt for an external agent, under 100 words) and DIAGNOSIS (2 bullets).',
      tokenBudget: 200,
      includeSkeleton: false,
      includedSections: [HEADINGS.DIAGNOSIS, HEADINGS.FINAL_PROMPT],
      additionalConstraints: ['50-100 words for FINAL_PROMPT. No extra sections.'],
    },
  },

  weakModelSpec: {
    maxInstructionWords: 80,
    requiredNegativeConstraints: [
      'Do not extract requirements yourself — generate a prompt for another agent to do it.',
      'Do not answer as if you are the research/coding agent.',
      'Do not say you lack access to the codebase.',
    ],
    extractionFields: [
      { label: 'Diagnosis', format: 'bullet list', section: HEADINGS.DIAGNOSIS },
      { label: 'Prompt for agent', format: 'self-contained paragraph', section: HEADINGS.FINAL_PROMPT },
    ],
    bannedPhrases: ['feel free', 'you might want to', 'consider', 'optionally', 'as appropriate', 'I cannot access', 'I don\'t have access'],
    minimalExecutableTemplate: [
      'Generate a requirement-extraction prompt for an external agent.',
      '## DIAGNOSIS\n(what is clear vs. vague in the user request)',
      '## FINAL_PROMPT\n(self-contained prompt for an agent to extract requirements)',
      'User request: {{userInput}}',
    ].join('\n'),
    fewShotSkeleton: [
      '## DIAGNOSIS',
      '- Missing: No target platform specified',
      '- Good: Clear feature scope',
      '## FINAL_PROMPT',
      'Extract structured requirements from the following request. Output: OBJECTIVE, MUST_HAVE, NICE_TO_HAVE, KNOWN_CONSTRAINTS, UNKNOWN_QUESTIONS, DELIVERABLES.\n\nUser request: "Build a login system for the app."',
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
