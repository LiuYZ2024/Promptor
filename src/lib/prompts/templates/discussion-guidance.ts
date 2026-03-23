import type { PromptTemplateSpec } from '@/types/prompt';
import { HEADINGS } from '../heading-constants';

export const discussionGuidanceTemplate: PromptTemplateSpec = {
  id: 'task:discussion_guidance',
  layer: 'task',
  purpose:
    'Guide a technical discussion to evaluate candidate approaches, surface tradeoffs, and recommend a direction — without producing implementation details.',

  requiredInputs: [
    {
      name: 'problemStatement',
      type: 'string',
      required: true,
      description:
        'Clear statement of the problem or decision to be discussed.',
    },
    {
      name: 'contextSummary',
      type: 'string',
      required: true,
      description:
        'Summary of relevant context: codebase state, prior research, constraints.',
    },
  ],

  optionalInputs: [
    {
      name: 'pinnedFacts',
      type: 'pinned_facts',
      required: false,
      description:
        'User-confirmed facts that constrain the discussion.',
    },
    {
      name: 'existingApproaches',
      type: 'string[]',
      required: false,
      description:
        'Approaches already identified that should be included in evaluation.',
    },
  ],

  taskContract: `You are facilitating a technical discussion about candidate approaches to a problem.

INPUTS:
- problemStatement: The problem or decision requiring discussion.
- contextSummary: Relevant background information.
- pinnedFacts (optional): Confirmed constraints.
- existingApproaches (optional): Pre-identified approaches to include.

RULES:
1. This is DISCUSSION, not implementation. Do NOT produce code, file paths, or implementation steps.
2. PROBLEM_FRAMING must restate the problem in precise terms and identify the core tension or decision point.
3. CANDIDATE_APPROACHES must list at minimum 2 distinct approaches (3 preferred). Each approach needs: name, 1-paragraph description, pros (bullet list), cons (bullet list).
4. If existingApproaches are provided, include them in CANDIDATE_APPROACHES and add at least 1 new alternative.
5. TRADEOFF_MATRIX must compare all approaches across at least 3 dimensions (e.g. complexity, performance, maintainability, risk, time-to-implement).
6. KEY_UNKNOWNS must list questions that cannot be answered without more information or experimentation.
7. RECOMMENDED_DIRECTION must pick one approach and give a 2-3 sentence justification. If no clear winner exists, state the tie-breaking criterion.
8. WHAT_ENTERS_PLAN must list concrete items that move forward to the Plan stage.
9. WHAT_REMAINS_OPEN must list items that need user input or further research before planning.
10. Do not collapse discussion into a single "obvious" answer. Present genuine tradeoffs even if one approach seems stronger.`,

  stageContract: '',

  outputContract: {
    requiredSections: [
      {
        key: 'PROBLEM_FRAMING',
        heading: HEADINGS.PROBLEM_FRAMING,
        fieldType: 'paragraph',
        description:
          'Precise restatement of the problem and its core decision point.',
        missingBehavior: 'fill_default',
        defaultValue: 'Problem as stated: see input.',
      },
      {
        key: 'CANDIDATE_APPROACHES',
        heading: HEADINGS.CANDIDATE_APPROACHES,
        fieldType: 'numbered_list',
        description:
          'Numbered list of approaches, each with name, description, pros, and cons.',
        missingBehavior: 'reject',
      },
      {
        key: 'TRADEOFF_MATRIX',
        heading: HEADINGS.TRADEOFF_MATRIX,
        fieldType: 'table',
        description:
          'Comparison table of approaches across multiple dimensions.',
        missingBehavior: 'fill_default',
        defaultValue:
          '| Approach | Complexity | Risk | Time |\n|----------|-----------|------|------|\n| (fill) | — | — | — |',
      },
      {
        key: 'KEY_UNKNOWNS',
        heading: HEADINGS.KEY_UNKNOWNS,
        fieldType: 'bullet_list',
        description:
          'Questions that require more information or experimentation.',
        missingBehavior: 'fill_default',
        defaultValue: '- No unknowns identified.',
      },
      {
        key: 'RECOMMENDED_DIRECTION',
        heading: HEADINGS.RECOMMENDED_DIRECTION,
        fieldType: 'paragraph',
        description:
          'Selected approach with 2-3 sentence justification.',
        missingBehavior: 'reject',
      },
      {
        key: 'WHAT_ENTERS_PLAN',
        heading: HEADINGS.WHAT_ENTERS_PLAN,
        fieldType: 'bullet_list',
        description:
          'Concrete items that move forward to the Plan stage.',
        missingBehavior: 'fill_default',
        defaultValue: '- Recommended approach details.',
      },
      {
        key: 'WHAT_REMAINS_OPEN',
        heading: HEADINGS.WHAT_REMAINS_OPEN,
        fieldType: 'bullet_list',
        description:
          'Items needing user input or further research before planning.',
        missingBehavior: 'fill_default',
        defaultValue: '- No open items.',
      },
    ],
    optionalSections: [
      {
        key: 'DECISION_DRAFT',
        heading: HEADINGS.DECISION_DRAFT,
        fieldType: 'paragraph',
        description:
          'Draft decision record for archival if the user accepts the recommendation.',
        savableAs: 'decision_record',
        missingBehavior: 'skip',
      },
    ],
    sectionOrder: [
      'PROBLEM_FRAMING',
      'CANDIDATE_APPROACHES',
      'TRADEOFF_MATRIX',
      'KEY_UNKNOWNS',
      'RECOMMENDED_DIRECTION',
      'WHAT_ENTERS_PLAN',
      'WHAT_REMAINS_OPEN',
      'DECISION_DRAFT',
    ],
    skeletonExample: `## PROBLEM_FRAMING
The system needs {problem description}. The core tension is between {dimension A} and {dimension B}.

## CANDIDATE_APPROACHES
1. **Approach A: {name}**
   {1-paragraph description}
   Pros:
   - Fast to implement.
   - Uses existing infrastructure.
   Cons:
   - Higher runtime cost.
   - Harder to extend later.

2. **Approach B: {name}**
   {1-paragraph description}
   Pros:
   - Better long-term maintainability.
   - Lower runtime cost.
   Cons:
   - Requires new dependency.
   - More upfront work.

3. **Approach C: {name}**
   {1-paragraph description}
   Pros:
   - Balanced tradeoff.
   Cons:
   - Moderate complexity in both dimensions.

## TRADEOFF_MATRIX
| Approach | Complexity | Performance | Maintainability | Risk | Time |
|----------|-----------|-------------|-----------------|------|------|
| A        | Low       | Medium      | Low             | Low  | 2d   |
| B        | High      | High        | High            | Med  | 5d   |
| C        | Medium    | Medium      | Medium          | Low  | 3d   |

## KEY_UNKNOWNS
- Will the system need to scale beyond 10k requests/sec?
- Is the new dependency approved by the security team?

## RECOMMENDED_DIRECTION
Approach B. The long-term maintainability advantage outweighs the upfront cost. The performance improvement reduces infrastructure spend over 6 months. If time is the hard constraint, fall back to Approach C.

## WHAT_ENTERS_PLAN
- Approach B architecture and component list.
- Dependency installation and configuration steps.
- Integration points with existing code.

## WHAT_REMAINS_OPEN
- Security team approval for the new dependency.
- Exact performance targets from product team.

## DECISION_DRAFT
Decision: Adopt Approach B ({name}). Rationale: {justification}. Alternatives considered: A, C. Review date: {date}.`,
  },

  failureContract: {
    minAcceptableSections: 4,
    onPartialOutput: 'attempt_repair',
    onMalformedOutput: 'attempt_repair',
    onEmptyOutput: 'retry_once',
    maxRepairAttempts: 2,
    criticalSections: ['CANDIDATE_APPROACHES', 'RECOMMENDED_DIRECTION'],
  },

  repairContract: {
    selfCheckInstruction:
      'Verify CANDIDATE_APPROACHES lists at least 2 approaches, each with pros and cons. Verify TRADEOFF_MATRIX compares all approaches. Verify RECOMMENDED_DIRECTION names one approach with justification. Verify no code or implementation details appear anywhere.',
    missingSectionRepair:
      'Your output is missing required sections. Add them using exact headings: PROBLEM_FRAMING, CANDIDATE_APPROACHES, TRADEOFF_MATRIX, KEY_UNKNOWNS, RECOMMENDED_DIRECTION, WHAT_ENTERS_PLAN, WHAT_REMAINS_OPEN. Do not remove existing content.',
    invalidHeadingRepair:
      'Your headings do not match the required format. Use exactly: ## PROBLEM_FRAMING, ## CANDIDATE_APPROACHES, ## TRADEOFF_MATRIX, ## KEY_UNKNOWNS, ## RECOMMENDED_DIRECTION, ## WHAT_ENTERS_PLAN, ## WHAT_REMAINS_OPEN. Keep all content, only fix headings.',
    proseToStructureRepair:
      'Your output is unstructured prose. Reorganize under these headings: ## PROBLEM_FRAMING, ## CANDIDATE_APPROACHES, ## TRADEOFF_MATRIX, ## KEY_UNKNOWNS, ## RECOMMENDED_DIRECTION, ## WHAT_ENTERS_PLAN, ## WHAT_REMAINS_OPEN. List approaches as numbered items with pros/cons.',
    trimToSchemaRepair:
      'Your output contains extra sections. Keep only: PROBLEM_FRAMING, CANDIDATE_APPROACHES, TRADEOFF_MATRIX, KEY_UNKNOWNS, RECOMMENDED_DIRECTION, WHAT_ENTERS_PLAN, WHAT_REMAINS_OPEN, DECISION_DRAFT. Remove everything else.',
  },

  variantContract: {
    standard: {
      promptText: `Evaluate candidate approaches for the following problem. This is a DISCUSSION — do NOT produce code or implementation steps.

Problem: {problemStatement}
Context: {contextSummary}
{existingApproaches ? "Pre-identified approaches:\\n" + existingApproaches : ""}
{pinnedFacts ? "Pinned facts:\\n" + pinnedFacts : ""}

Produce these sections:
## PROBLEM_FRAMING — restate the problem precisely. Identify the core tension.
## CANDIDATE_APPROACHES — list 2-3 approaches. Each needs: name, 1-paragraph description, pros (bullets), cons (bullets). If pre-identified approaches exist, include them and add at least 1 new alternative.
## TRADEOFF_MATRIX — table comparing approaches across ≥3 dimensions (complexity, performance, maintainability, risk, time).
## KEY_UNKNOWNS — questions needing more information or experimentation.
## RECOMMENDED_DIRECTION — pick one approach, justify in 2-3 sentences. State tie-breaking criterion if no clear winner.
## WHAT_ENTERS_PLAN — concrete items for the Plan stage.
## WHAT_REMAINS_OPEN — items needing user input or further research.
## DECISION_DRAFT — (optional) draft decision record.

Rules:
- No code. No file paths. No implementation steps.
- Minimum 2 approaches in CANDIDATE_APPROACHES.
- Present genuine tradeoffs. Do not collapse to one "obvious" answer.
- Every approach in the matrix must appear in CANDIDATE_APPROACHES.`,
      tokenBudget: 3000,
      includeSkeleton: true,
      includedSections: [
        'PROBLEM_FRAMING',
        'CANDIDATE_APPROACHES',
        'TRADEOFF_MATRIX',
        'KEY_UNKNOWNS',
        'RECOMMENDED_DIRECTION',
        'WHAT_ENTERS_PLAN',
        'WHAT_REMAINS_OPEN',
        'DECISION_DRAFT',
      ],
      additionalConstraints: [],
    },
    strict: {
      promptText: `Evaluate approaches for this problem. Follow every rule exactly. Deviation causes rejection.

Problem: {problemStatement}
Context: {contextSummary}

MANDATORY SECTIONS (## HEADING format):
## PROBLEM_FRAMING — 2-4 sentences. Must identify the core tension.
## CANDIDATE_APPROACHES — exactly 3 approaches. Each must have: name (bold), description (1 paragraph), pros (≥2 bullets), cons (≥2 bullets).
## TRADEOFF_MATRIX — markdown table with all 3 approaches as rows. Minimum 4 dimension columns.
## KEY_UNKNOWNS — minimum 2 items as bullets.
## RECOMMENDED_DIRECTION — name one approach. Justify in exactly 2-3 sentences.
## WHAT_ENTERS_PLAN — minimum 3 items as bullets.
## WHAT_REMAINS_OPEN — minimum 1 item as bullets.

STRICT RULES:
- ZERO code, file paths, or implementation details anywhere in output.
- Exactly 3 approaches.
- Every approach must appear in both CANDIDATE_APPROACHES and TRADEOFF_MATRIX.
- Do NOT collapse discussion. Present genuine tradeoffs.
- Violation of any rule invalidates the entire output.`,
      tokenBudget: 3000,
      includeSkeleton: true,
      includedSections: [
        'PROBLEM_FRAMING',
        'CANDIDATE_APPROACHES',
        'TRADEOFF_MATRIX',
        'KEY_UNKNOWNS',
        'RECOMMENDED_DIRECTION',
        'WHAT_ENTERS_PLAN',
        'WHAT_REMAINS_OPEN',
      ],
      additionalConstraints: [
        'Exactly 3 approaches, no more, no less.',
        'Zero code anywhere in output.',
        'All approaches must appear in both list and matrix.',
      ],
    },
    lowCost: {
      promptText: `Discuss approaches for: {problemStatement}
Context: {contextSummary}

Output:
## CANDIDATE_APPROACHES — 2-3 approaches, each with: name, 1-sentence description, 2 pros, 2 cons.
## TRADEOFF_MATRIX — simple table comparing approaches.
## RECOMMENDED_DIRECTION — pick one, justify in 1-2 sentences.
## WHAT_ENTERS_PLAN — items for planning.
## WHAT_REMAINS_OPEN — unresolved items.

No code. No implementation details. Present real tradeoffs.`,
      tokenBudget: 1500,
      includeSkeleton: false,
      includedSections: [
        'CANDIDATE_APPROACHES',
        'TRADEOFF_MATRIX',
        'RECOMMENDED_DIRECTION',
        'WHAT_ENTERS_PLAN',
        'WHAT_REMAINS_OPEN',
      ],
      additionalConstraints: ['Skip PROBLEM_FRAMING and KEY_UNKNOWNS.'],
    },
    minimal: {
      promptText: `For problem {problemStatement} and context {contextSummary}, output ## CANDIDATE_APPROACHES (two approaches: each with name, one-line description, one pro, one con), ## RECOMMENDED_DIRECTION (pick one; one sentence why), and ## WHAT_ENTERS_PLAN (bullets). Do not include code, file paths, or implementation steps.`,
      tokenBudget: 100,
      includeSkeleton: false,
      includedSections: [
        'CANDIDATE_APPROACHES',
        'RECOMMENDED_DIRECTION',
        'WHAT_ENTERS_PLAN',
      ],
      additionalConstraints: [
        'Maximum 2 approaches.',
        'No table, no optional sections.',
      ],
    },
  },

  weakModelSpec: {
    maxInstructionWords: 100,
    requiredNegativeConstraints: [
      'Do not write code or pseudocode.',
      'Do not list file paths or implementation steps.',
      'Do not collapse to a single approach without comparison.',
      'Do not use conditional language.',
    ],
    extractionFields: [
      {
        label: 'Problem',
        format: 'single sentence',
        section: 'PROBLEM_FRAMING',
      },
      {
        label: 'Approach name',
        format: 'short phrase',
        section: 'CANDIDATE_APPROACHES',
      },
      {
        label: 'Pro',
        format: 'short phrase',
        section: 'CANDIDATE_APPROACHES',
      },
      {
        label: 'Con',
        format: 'short phrase',
        section: 'CANDIDATE_APPROACHES',
      },
      {
        label: 'Recommendation',
        format: 'name + one sentence justification',
        section: 'RECOMMENDED_DIRECTION',
      },
    ],
    bannedPhrases: [
      'you might want to',
      'consider',
      'feel free',
      'it depends',
      'as mentioned above',
      'there are many ways',
    ],
    minimalExecutableTemplate: `List 2 approaches for: {problemStatement}

For each write:
- Name
- Description (1 sentence)
- 1 pro, 1 con

Then pick one and say why.

Start with:
## CANDIDATE_APPROACHES
## RECOMMENDED_DIRECTION`,
    fewShotSkeleton: `## CANDIDATE_APPROACHES
1. **REST API** — Standard HTTP endpoints.
   Pros: Simple, well-understood.
   Cons: Overhead for real-time data.

2. **WebSocket** — Persistent connection.
   Pros: Real-time, low latency.
   Cons: More complex infrastructure.

## RECOMMENDED_DIRECTION
WebSocket. The feature requires real-time updates, making polling impractical.

## WHAT_ENTERS_PLAN
- WebSocket server setup
- Client connection management
- Fallback for disconnections`,
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
