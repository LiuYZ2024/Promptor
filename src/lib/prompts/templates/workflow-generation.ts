import type { PromptTemplateSpec } from '@/types/prompt';
import { HEADINGS } from '../heading-constants';

export const workflowGenerationTemplate: PromptTemplateSpec = {
  id: 'task:workflow_generation',
  layer: 'task',
  purpose:
    'Generate a complete 8-stage workflow from a user requirement, including per-stage prompts, low-cost variants, and expected artifacts.',

  requiredInputs: [
    {
      name: 'userRequirement',
      type: 'string',
      required: true,
      description: 'The raw user requirement to build a workflow for.',
    },
    {
      name: 'taskType',
      type: 'string',
      required: true,
      description:
        'Classification of the task (e.g. "feature", "refactor", "bugfix", "docs").',
    },
    {
      name: 'agentTarget',
      type: 'string',
      required: true,
      description:
        'Target agent or IDE that will execute the workflow (e.g. "cursor", "copilot", "generic").',
    },
    {
      name: 'hasCodebase',
      type: 'string',
      required: true,
      description:
        'Whether a codebase already exists ("yes" or "no"). Controls whether research stage scans existing code.',
    },
  ],

  optionalInputs: [],

  taskContract: `You are generating a complete 8-stage workflow for the given user requirement.

INPUTS:
- userRequirement: The user's original request.
- taskType: The category of work.
- agentTarget: The AI agent that will execute each stage.
- hasCodebase: Whether existing code must be analyzed.

RULES:
1. Produce exactly 8 stages in this order: Requirement, Research, Discussion, Plan, Annotation Loop, Implement, Verify, Solidify.
2. Each stage MUST include: name, purpose (1 sentence), recommended prompt (full text the agent will receive), low-cost prompt (shorter variant for weaker/cheaper models), and expected artifacts (list of outputs the stage produces).
3. Recommended prompts must be self-contained — an agent reading only that prompt must be able to execute the stage without external context beyond supplied artifacts.
4. Low-cost prompts must be ≤100 words and produce the same artifact types, even if less detailed.
5. If hasCodebase is "no", the Research stage prompt must skip file scanning and focus on requirement analysis and external research.
6. If hasCodebase is "yes", the Research stage prompt must include instructions to scan relevant files, identify patterns, and map dependencies.
7. The GOAL section must be a single sentence stating the end-state the workflow achieves.
8. ASSUMPTIONS must list every inference you made that the user did not explicitly state.
9. SUGGESTED_FIRST_STEP must name the exact first action and its expected duration.
10. Do not add stages beyond the 8 defined. Do not merge or skip stages.`,

  stageContract: '',

  outputContract: {
    requiredSections: [
      {
        key: 'GOAL',
        heading: HEADINGS.GOAL,
        fieldType: 'single_line',
        description:
          'One sentence describing the end-state this workflow achieves.',
        missingBehavior: 'reject',
      },
      {
        key: 'CONTEXT',
        heading: HEADINGS.CONTEXT,
        fieldType: 'paragraph',
        description:
          'Summary of the user requirement, task type, agent target, and codebase status.',
        missingBehavior: 'fill_default',
        defaultValue: 'No additional context provided.',
      },
      {
        key: 'ASSUMPTIONS',
        heading: HEADINGS.ASSUMPTIONS,
        fieldType: 'bullet_list',
        description:
          'List of inferences made that the user did not explicitly state.',
        missingBehavior: 'fill_default',
        defaultValue: '- No assumptions made.',
      },
      {
        key: 'WORKFLOW_STAGES',
        heading: HEADINGS.WORKFLOW_STAGES,
        fieldType: 'numbered_list',
        description:
          'The 8 stages, each with name, purpose, recommended prompt, low-cost prompt, and expected artifacts.',
        missingBehavior: 'reject',
      },
      {
        key: 'SUGGESTED_FIRST_STEP',
        heading: HEADINGS.SUGGESTED_FIRST_STEP,
        fieldType: 'paragraph',
        description:
          'The exact first action to take and its expected duration.',
        missingBehavior: 'fill_default',
        defaultValue:
          'Begin with the Requirement stage: paste the user requirement and run the requirement prompt.',
      },
    ],
    optionalSections: [
      {
        key: 'RISKS',
        heading: HEADINGS.RISKS,
        fieldType: 'bullet_list',
        description:
          'Risks or blockers that could derail the workflow.',
        missingBehavior: 'skip',
      },
      {
        key: 'PREREQUISITES',
        heading: HEADINGS.PREREQUISITES,
        fieldType: 'bullet_list',
        description:
          'Tools, access, or information required before starting.',
        missingBehavior: 'skip',
      },
    ],
    sectionOrder: [
      'GOAL',
      'CONTEXT',
      'ASSUMPTIONS',
      'WORKFLOW_STAGES',
      'SUGGESTED_FIRST_STEP',
      'RISKS',
      'PREREQUISITES',
    ],
    skeletonExample: `## GOAL
Deliver a fully tested implementation of {requirement summary} via an 8-stage guided workflow.

## CONTEXT
Requirement: {userRequirement}
Task type: {taskType}
Agent: {agentTarget}
Codebase: {hasCodebase}

## ASSUMPTIONS
- The user wants a production-quality result, not a prototype.
- The target agent supports multi-turn conversation.

## WORKFLOW_STAGES
1. **Requirement**
   - Purpose: Clarify scope, extract must-haves, identify unknowns.
   - Prompt: "You are analyzing a user requirement. Extract the objective, must-have features, nice-to-have features, constraints, open questions, and deliverables. Output under these headings: OBJECTIVE, MUST_HAVE, NICE_TO_HAVE, KNOWN_CONSTRAINTS, UNKNOWN_QUESTIONS, DELIVERABLES. Requirement: {userRequirement}"
   - Low-cost prompt: "Extract from this requirement: objective, must-haves, constraints, open questions. Use headings OBJECTIVE, MUST_HAVE, KNOWN_CONSTRAINTS, UNKNOWN_QUESTIONS. Requirement: {userRequirement}"
   - Expected artifacts: requirement_doc

2. **Research**
   - Purpose: Gather codebase context and relevant patterns.
   - Prompt: "..."
   - Low-cost prompt: "..."
   - Expected artifacts: research_summary

3. **Discussion**
   - Purpose: Evaluate candidate approaches and select a direction.
   - Prompt: "..."
   - Low-cost prompt: "..."
   - Expected artifacts: decision_record

4. **Plan**
   - Purpose: Produce a step-by-step implementation plan.
   - Prompt: "..."
   - Low-cost prompt: "..."
   - Expected artifacts: implementation_plan

5. **Annotation Loop**
   - Purpose: Incorporate user feedback into the plan.
   - Prompt: "..."
   - Low-cost prompt: "..."
   - Expected artifacts: updated_plan

6. **Implement**
   - Purpose: Execute the plan and produce code.
   - Prompt: "..."
   - Low-cost prompt: "..."
   - Expected artifacts: code_changes

7. **Verify**
   - Purpose: Validate the implementation against the plan.
   - Prompt: "..."
   - Low-cost prompt: "..."
   - Expected artifacts: verification_report

8. **Solidify**
   - Purpose: Extract reusable rules and lessons learned.
   - Prompt: "..."
   - Low-cost prompt: "..."
   - Expected artifacts: rules, lessons

## SUGGESTED_FIRST_STEP
Run the Requirement stage prompt with the user's original requirement. Expected duration: 1-2 minutes.

## RISKS
- User requirement may be ambiguous, requiring early clarification.

## PREREQUISITES
- Access to the target agent (Cursor, Copilot, etc.).`,
  },

  failureContract: {
    minAcceptableSections: 3,
    onPartialOutput: 'attempt_repair',
    onMalformedOutput: 'attempt_repair',
    onEmptyOutput: 'retry_once',
    maxRepairAttempts: 2,
    criticalSections: ['GOAL', 'WORKFLOW_STAGES'],
  },

  repairContract: {
    selfCheckInstruction:
      'Verify your output contains exactly 8 stages under WORKFLOW_STAGES, each with name, purpose, prompt, low-cost prompt, and expected artifacts. Verify GOAL is a single sentence. Verify ASSUMPTIONS is a bullet list.',
    missingSectionRepair:
      'Your output is missing required sections. Add the missing sections using the exact headings: GOAL, CONTEXT, ASSUMPTIONS, WORKFLOW_STAGES, SUGGESTED_FIRST_STEP. Do not remove existing content.',
    invalidHeadingRepair:
      'Your headings do not match the required format. Use exactly: ## GOAL, ## CONTEXT, ## ASSUMPTIONS, ## WORKFLOW_STAGES, ## SUGGESTED_FIRST_STEP. Keep all content, only fix headings.',
    proseToStructureRepair:
      'Your output is unstructured prose. Reorganize it under these headings: ## GOAL, ## CONTEXT, ## ASSUMPTIONS, ## WORKFLOW_STAGES, ## SUGGESTED_FIRST_STEP. Place workflow content under WORKFLOW_STAGES as a numbered list.',
    trimToSchemaRepair:
      'Your output contains extra sections. Keep only: GOAL, CONTEXT, ASSUMPTIONS, WORKFLOW_STAGES, SUGGESTED_FIRST_STEP, RISKS, PREREQUISITES. Remove everything else.',
  },

  variantContract: {
    standard: {
      promptText: `Generate a complete 8-stage workflow for the following requirement.

Requirement: {userRequirement}
Task type: {taskType}
Agent target: {agentTarget}
Has codebase: {hasCodebase}

Produce these sections:
## GOAL — one sentence end-state.
## CONTEXT — summarize inputs.
## ASSUMPTIONS — bullet list of inferences.
## WORKFLOW_STAGES — numbered 1-8. Each stage must have:
  - Name (Requirement, Research, Discussion, Plan, Annotation Loop, Implement, Verify, Solidify)
  - Purpose (1 sentence)
  - Recommended prompt (full prompt text an agent receives)
  - Low-cost prompt (≤100 words, same artifact types)
  - Expected artifacts (list)
## SUGGESTED_FIRST_STEP — exact first action.
## RISKS — (optional) bullet list.
## PREREQUISITES — (optional) bullet list.

Rules:
- Exactly 8 stages, in the listed order.
- Each recommended prompt must be self-contained.
- Low-cost prompts must be ≤100 words.
- Do not add extra stages. Do not merge stages.
- ASSUMPTIONS must list every inference not stated by the user.`,
      tokenBudget: 4000,
      includeSkeleton: true,
      includedSections: [
        'GOAL',
        'CONTEXT',
        'ASSUMPTIONS',
        'WORKFLOW_STAGES',
        'SUGGESTED_FIRST_STEP',
        'RISKS',
        'PREREQUISITES',
      ],
      additionalConstraints: [],
    },
    strict: {
      promptText: `Generate a complete 8-stage workflow. Follow every rule exactly. Any deviation causes rejection.

Requirement: {userRequirement}
Task type: {taskType}
Agent target: {agentTarget}
Has codebase: {hasCodebase}

MANDATORY SECTIONS (use ## HEADING format):
## GOAL — exactly one sentence.
## CONTEXT — exactly 3-5 sentences summarizing inputs.
## ASSUMPTIONS — bullet list, minimum 2 items.
## WORKFLOW_STAGES — exactly 8 stages, numbered 1-8. Each stage MUST contain exactly these sub-fields:
  - Name: one of [Requirement, Research, Discussion, Plan, Annotation Loop, Implement, Verify, Solidify]
  - Purpose: exactly one sentence
  - Prompt: full self-contained prompt text (minimum 50 words)
  - Low-cost prompt: maximum 100 words
  - Expected artifacts: comma-separated list
## SUGGESTED_FIRST_STEP — one paragraph, name the action and duration.

STRICT RULES:
- Do NOT add sections beyond those listed.
- Do NOT invent stage names.
- Do NOT merge or reorder stages.
- Every prompt must be executable without external context.
- Violation of any rule invalidates the entire output.`,
      tokenBudget: 4000,
      includeSkeleton: true,
      includedSections: [
        'GOAL',
        'CONTEXT',
        'ASSUMPTIONS',
        'WORKFLOW_STAGES',
        'SUGGESTED_FIRST_STEP',
      ],
      additionalConstraints: [
        'Exactly 8 stages, no more, no less.',
        'Each prompt sub-field must be self-contained.',
        'Any deviation from heading format causes rejection.',
      ],
    },
    lowCost: {
      promptText: `Generate an 8-stage workflow.

Requirement: {userRequirement}
Task type: {taskType}
Agent: {agentTarget}
Codebase: {hasCodebase}

Output these sections:
## GOAL — one sentence.
## ASSUMPTIONS — bullet list.
## WORKFLOW_STAGES — 8 stages numbered. Each stage: Name, Purpose (1 sentence), Prompt (2-3 sentences), Low-cost prompt (1-2 sentences), Artifacts (comma list).
## SUGGESTED_FIRST_STEP — what to do first.

Stages: Requirement, Research, Discussion, Plan, Annotation Loop, Implement, Verify, Solidify.
Keep prompts short. No extra sections.`,
      tokenBudget: 2000,
      includeSkeleton: false,
      includedSections: [
        'GOAL',
        'ASSUMPTIONS',
        'WORKFLOW_STAGES',
        'SUGGESTED_FIRST_STEP',
      ],
      additionalConstraints: ['Keep each stage prompt to 2-3 sentences.'],
    },
    minimal: {
      promptText: `For requirement {userRequirement} (task {taskType}, agent {agentTarget}, codebase {hasCodebase}), output ## GOAL (one sentence), ## WORKFLOW_STAGES, and ## SUGGESTED_FIRST_STEP (first action). Under WORKFLOW_STAGES list exactly eight numbered stages in order: Requirement, Research, Discussion, Plan, Annotation Loop, Implement, Verify, Solidify—each with name, one-line purpose, and one-line prompt.`,
      tokenBudget: 100,
      includeSkeleton: false,
      includedSections: ['GOAL', 'WORKFLOW_STAGES', 'SUGGESTED_FIRST_STEP'],
      additionalConstraints: [
        'Maximum 1 sentence per stage.',
        'No optional sections.',
      ],
    },
  },

  weakModelSpec: {
    maxInstructionWords: 120,
    requiredNegativeConstraints: [
      'Do not add stages beyond the 8 listed.',
      'Do not merge or skip stages.',
      'Do not write code.',
      'Do not use conditional language.',
    ],
    extractionFields: [
      { label: 'Goal', format: 'single sentence', section: 'GOAL' },
      {
        label: 'Stage name',
        format: 'one of 8 fixed names',
        section: 'WORKFLOW_STAGES',
      },
      {
        label: 'Stage purpose',
        format: 'single sentence',
        section: 'WORKFLOW_STAGES',
      },
      {
        label: 'Stage prompt',
        format: 'short paragraph',
        section: 'WORKFLOW_STAGES',
      },
      {
        label: 'Expected artifacts',
        format: 'comma-separated list',
        section: 'WORKFLOW_STAGES',
      },
    ],
    bannedPhrases: [
      'you might want to',
      'consider',
      'feel free',
      'it depends',
      'as mentioned above',
      'in conclusion',
    ],
    minimalExecutableTemplate: `List 8 stages for: {userRequirement}

Stages: Requirement, Research, Discussion, Plan, Annotation Loop, Implement, Verify, Solidify.

For each stage write:
- Name
- Purpose (1 sentence)
- Prompt (1-2 sentences)

Start with:
## GOAL
## WORKFLOW_STAGES`,
    fewShotSkeleton: `## GOAL
Build a login page with email and password.

## WORKFLOW_STAGES
1. Requirement — Clarify scope. Prompt: "Extract objective, must-haves, constraints from: build login page."
2. Research — Scan codebase. Prompt: "Find existing auth patterns and UI components."
3. Discussion — Compare approaches. Prompt: "List pros/cons of form library vs custom form."
4. Plan — Write steps. Prompt: "Create step-by-step plan for login page implementation."
5. Annotation Loop — Get feedback. Prompt: "Review plan, mark changes needed."
6. Implement — Write code. Prompt: "Implement login page per plan."
7. Verify — Test result. Prompt: "Verify login page meets all requirements."
8. Solidify — Extract rules. Prompt: "List reusable patterns from this implementation."

## SUGGESTED_FIRST_STEP
Run the Requirement stage prompt.`,
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
        'invalid_heading_repair',
      ],
      maxAttempts: 1,
    },
    fallbackVariant: {
      chain: ['standard', 'strict', 'lowCost', 'minimal'],
      autoDowngradeOnFailure: true,
    },
  },
};
