import type { PromptTemplateSpec } from '@/types/prompt';
import { HEADINGS } from '../heading-constants';

export const stageAnnotationLoopTemplate: PromptTemplateSpec = {
  id: 'stage:annotation_loop',
  layer: 'stage',
  purpose: 'Generate an annotation-processing prompt for an external agent',

  requiredInputs: [
    { name: 'currentPlan', type: 'artifact', required: true, description: 'The current implementation plan artifact to annotate' },
    { name: 'annotations', type: 'string', required: true, description: 'User annotations, corrections, or feedback on the plan' },
  ],
  optionalInputs: [
    { name: 'pinnedFacts', type: 'pinned_facts', required: false, description: 'Previously pinned facts for context' },
  ],

  taskContract: '',

  stageContract: [
    'You generate a prompt for an external agent to process annotations — you do NOT process them yourself.',
    'Your output is a self-contained prompt the user will copy into an external agent (Cursor, Claude Code, etc.).',
    'The FINAL_PROMPT must embed the current plan AND the annotations so the external agent can apply/reject each one.',
    'Diagnose the annotations: are they clear, contradictory, or missing context?',
    'State every assumption you baked into the prompt.',
    'Suggest facts worth pinning for future stages.',
  ].join('\n'),

  outputContract: {
    requiredSections: [
      {
        key: 'DIAGNOSIS',
        heading: HEADINGS.DIAGNOSIS,
        fieldType: 'bullet_list',
        description: 'Analysis of the annotations: clarity, contradictions, missing context, potential issues',
        missingBehavior: 'reject',
      },
      {
        key: 'ASSUMPTIONS_ADDED',
        heading: HEADINGS.ASSUMPTIONS_ADDED,
        fieldType: 'bullet_list',
        description: 'Assumptions Promptor added to interpret ambiguous annotations',
        pinnable: true,
        missingBehavior: 'fill_default',
        defaultValue: '- No additional assumptions were needed',
      },
      {
        key: 'FINAL_PROMPT',
        heading: HEADINGS.FINAL_PROMPT,
        fieldType: 'paragraph',
        description: 'Self-contained prompt for an external agent to read the annotations, apply or reject each one, and output the full updated plan',
        savableAs: 'revised_plan',
        pinnable: true,
        missingBehavior: 'reject',
      },
      {
        key: 'CHEAPER_VARIANT',
        heading: HEADINGS.CHEAPER_VARIANT,
        fieldType: 'paragraph',
        description: 'A shorter, lower-token version of FINAL_PROMPT that still produces a usable revised plan',
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
      '- Annotation "use middleware instead of wrapper" is clear and actionable.',
      '- Annotation "add error logging" is vague — does not specify logging library or format.',
      '- Annotation "remove Redis" conflicts with the decision record; will flag for rejection.',
      '',
      `## ${HEADINGS.ASSUMPTIONS_ADDED}`,
      '- Assumed "error logging" means structured JSON logging via the existing logger.',
      '- Assumed the middleware annotation applies to Step 3 specifically.',
      '',
      `## ${HEADINGS.FINAL_PROMPT}`,
      'You are a senior engineer. Below is an implementation plan and a set of user annotations. Process each annotation: apply it to the plan or reject it with a reason.',
      '',
      'Current plan:',
      '1. Create token rotation utility in `src/lib/auth/tokens.ts`',
      '2. Add `/api/auth/refresh` route handler',
      '3. Add auth wrapper function in `src/middleware.ts`',
      '4. Configure httpOnly cookie in NextAuth options',
      '5. Write integration test for refresh flow',
      '',
      'Annotations:',
      '- "Step 3 should use middleware, not a wrapper function"',
      '- "Add error logging to every step"',
      '- "Remove the Redis dependency"',
      '',
      'Output your response using exactly these sections:',
      '',
      '## ANNOTATIONS_RECEIVED',
      'List every annotation verbatim.',
      '',
      '## CHANGES_APPLIED',
      'For each accepted annotation, describe the change made.',
      '',
      '## REJECTED_ANNOTATIONS',
      'For each rejected annotation, state the annotation and the reason.',
      '',
      '## UPDATED_PLAN',
      'The full revised plan (numbered steps) incorporating accepted changes. Not a diff.',
      '',
      '## REMAINING_OPEN_ITEMS',
      'Anything still unresolved after this round.',
      '',
      'Constraints:',
      '- Address every annotation explicitly — do not skip any.',
      '- If rejecting, give a concrete reason.',
      '- Output the full plan, not a diff.',
      '- Do not start implementing.',
      '',
      `## ${HEADINGS.CHEAPER_VARIANT}`,
      'Apply these annotations to the plan below. Output CHANGES_APPLIED (bullets) and UPDATED_PLAN (full numbered steps). Reject any annotation that conflicts with prior decisions and explain why. Plan: ... Annotations: ...',
      '',
      `## ${HEADINGS.SUGGESTED_PINNED_FACTS}`,
      '- Middleware pattern preferred over wrappers for route protection',
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
      'Verify your output has all 5 headings: DIAGNOSIS, ASSUMPTIONS_ADDED, FINAL_PROMPT, CHEAPER_VARIANT, SUGGESTED_PINNED_FACTS. FINAL_PROMPT must embed the plan and annotations and instruct the agent to output ANNOTATIONS_RECEIVED, CHANGES_APPLIED, REJECTED_ANNOTATIONS, UPDATED_PLAN, REMAINING_OPEN_ITEMS.',
    missingSectionRepair:
      'Add the missing heading. FINAL_PROMPT must contain the full external-agent prompt with embedded plan and annotations.',
    invalidHeadingRepair:
      'Rename headings to exact uppercase form: DIAGNOSIS, ASSUMPTIONS_ADDED, FINAL_PROMPT, CHEAPER_VARIANT, SUGGESTED_PINNED_FACTS.',
    proseToStructureRepair:
      'Convert prose into bullets under DIAGNOSIS and ASSUMPTIONS_ADDED. Keep FINAL_PROMPT as a self-contained prompt paragraph.',
    trimToSchemaRepair:
      'Remove any content not under a recognized heading. Do not process annotations yourself — only output the prompt that instructs an external agent to do so.',
  },

  variantContract: {
    standard: {
      promptText:
        'Generate a self-contained annotation-processing prompt for an external agent. Include all 5 sections. The FINAL_PROMPT must embed the current plan and annotations, and instruct the agent to output ANNOTATIONS_RECEIVED, CHANGES_APPLIED, REJECTED_ANNOTATIONS, UPDATED_PLAN, REMAINING_OPEN_ITEMS.',
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
        'Generate a rigorous annotation-processing prompt. FINAL_PROMPT must require the agent to address each annotation individually, explicitly state accept/reject with rationale, and mark changed steps in the updated plan.',
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
        'FINAL_PROMPT must require per-annotation accept/reject rationale.',
        'FINAL_PROMPT must require changed steps to be marked with "(changed)" suffix.',
      ],
    },
    lowCost: {
      promptText:
        'Generate a concise annotation-processing prompt. Include DIAGNOSIS, FINAL_PROMPT, and CHEAPER_VARIANT.',
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
        'Output FINAL_PROMPT (annotation-processing prompt, max 150 words) and DIAGNOSIS (2-3 bullets).',
      tokenBudget: 200,
      includeSkeleton: false,
      includedSections: [HEADINGS.FINAL_PROMPT, HEADINGS.DIAGNOSIS],
      additionalConstraints: ['50-150 words total. No prose outside sections.'],
    },
  },

  weakModelSpec: {
    maxInstructionWords: 80,
    requiredNegativeConstraints: [
      'Do not process the annotations yourself.',
      'Do not modify the plan yourself.',
      'Do not start implementing.',
      'Only output a prompt that an external agent will execute.',
    ],
    extractionFields: [
      { label: 'Diagnosis', format: 'bullet list', section: HEADINGS.DIAGNOSIS },
      { label: 'Prompt', format: 'self-contained prompt paragraph', section: HEADINGS.FINAL_PROMPT },
      { label: 'Cheap prompt', format: 'shorter prompt paragraph', section: HEADINGS.CHEAPER_VARIANT },
    ],
    bannedPhrases: ['I cannot access', "I don't have access", 'feel free', 'you might want to', 'consider', 'optionally', 'as appropriate'],
    minimalExecutableTemplate: [
      'Generate an annotation-processing prompt for an external agent.',
      '## DIAGNOSIS\n(bullet list: clarity, contradictions, issues with the annotations)',
      '## FINAL_PROMPT\n(self-contained prompt the user copies to an external agent)',
      '## CHEAPER_VARIANT\n(shorter version of the prompt)',
      'Current plan: {{currentPlan}}',
      'Annotations: {{annotations}}',
    ].join('\n'),
    fewShotSkeleton: [
      '## DIAGNOSIS',
      '- "Use middleware" annotation is clear and actionable.',
      '- "Add logging" is vague — assumed structured JSON logging.',
      '## FINAL_PROMPT',
      'Process these annotations on the plan below. For each: accept and describe the change, or reject with a reason. Output: CHANGES_APPLIED, REJECTED_ANNOTATIONS, UPDATED_PLAN. Plan: ... Annotations: ...',
      '## CHEAPER_VARIANT',
      'Apply annotations to the plan. Output CHANGES_APPLIED and UPDATED_PLAN. Plan: ... Annotations: ...',
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
