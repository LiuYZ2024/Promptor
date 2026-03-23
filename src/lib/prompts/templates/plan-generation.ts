import type { PromptTemplateSpec } from '@/types/prompt';
import { HEADINGS } from '../heading-constants';

export const planGenerationTemplate: PromptTemplateSpec = {
  id: 'task:plan_generation',
  layer: 'task',
  purpose:
    'Generate a detailed, step-by-step implementation plan from research findings and discussion decisions, including file targets, code sketches, and verification methods.',

  requiredInputs: [
    {
      name: 'goal',
      type: 'string',
      required: true,
      description:
        'The implementation goal — what the plan must achieve.',
    },
    {
      name: 'researchSummary',
      type: 'artifact',
      required: true,
      description:
        'Research stage output: existing patterns, modules, dependencies, gaps.',
    },
    {
      name: 'decisionRecord',
      type: 'artifact',
      required: true,
      description:
        'Discussion stage output: chosen approach, tradeoffs accepted, items entering plan.',
    },
  ],

  optionalInputs: [
    {
      name: 'pinnedFacts',
      type: 'pinned_facts',
      required: false,
      description:
        'User-confirmed facts that constrain the plan.',
    },
    {
      name: 'constraints',
      type: 'string[]',
      required: false,
      description:
        'Additional constraints not captured elsewhere (e.g. "no new dependencies", "must be backward compatible").',
    },
  ],

  taskContract: `You are generating a detailed implementation plan from research and discussion outputs.

INPUTS:
- goal: The implementation objective.
- researchSummary: Artifact from the Research stage.
- decisionRecord: Artifact from the Discussion stage.
- pinnedFacts (optional): User-confirmed constraints.
- constraints (optional): Additional explicit constraints.

RULES:
1. GOAL must be a single sentence restating the implementation objective.
2. PRECONDITIONS must list everything that must be true before implementation starts (dependencies installed, branches created, environment configured).
3. FILES_TO_MODIFY must list every file that will be created, modified, or deleted. Each entry needs: file path, action (create/modify/delete), and 1-sentence reason.
4. STEP_BY_STEP_PLAN must be a numbered list of implementation steps. Each step needs: what to do, which file(s), what the expected outcome is. Steps must be ordered by dependency — no step may reference work from a later step.
5. CODE_SKETCHES must show key interfaces, function signatures, or structural patterns. Use pseudocode or TypeScript. Do NOT write complete implementations — sketches only.
6. TRADEOFFS must list decisions made in the plan that have alternatives, and why the chosen path was selected.
7. VERIFICATION_METHOD must describe how to verify the implementation is correct: tests to run, manual checks, acceptance criteria.
8. Every item from WHAT_ENTERS_PLAN in the decisionRecord must appear somewhere in the plan. If an item cannot be addressed, state why in TRADEOFFS.
9. Respect all constraints from pinnedFacts and constraints input. If a constraint conflicts with the chosen approach, flag it in TRADEOFFS.
10. Do not add features or scope beyond what the goal and decision record specify.`,

  stageContract: '',

  outputContract: {
    requiredSections: [
      {
        key: 'GOAL',
        heading: HEADINGS.GOAL,
        fieldType: 'single_line',
        description: 'One sentence restating the implementation objective.',
        missingBehavior: 'reject',
      },
      {
        key: 'PRECONDITIONS',
        heading: HEADINGS.PRECONDITIONS,
        fieldType: 'checklist',
        description:
          'Checklist of prerequisites that must be met before implementation.',
        missingBehavior: 'fill_default',
        defaultValue: '- [ ] No special preconditions.',
      },
      {
        key: 'FILES_TO_MODIFY',
        heading: HEADINGS.FILES_TO_MODIFY,
        fieldType: 'table',
        description:
          'Table of files: path, action (create/modify/delete), reason.',
        missingBehavior: 'fill_default',
        defaultValue:
          '| File | Action | Reason |\n|------|--------|--------|\n| (to be determined) | — | — |',
      },
      {
        key: 'STEP_BY_STEP_PLAN',
        heading: HEADINGS.STEP_BY_STEP_PLAN,
        fieldType: 'numbered_list',
        description:
          'Ordered steps with what to do, target files, and expected outcome.',
        missingBehavior: 'reject',
      },
      {
        key: 'CODE_SKETCHES',
        heading: HEADINGS.CODE_SKETCHES,
        fieldType: 'code_block',
        description:
          'Key interfaces, signatures, and structural patterns. Sketches, not full implementations.',
        missingBehavior: 'fill_default',
        defaultValue: '```\n// No code sketches needed for this plan.\n```',
      },
      {
        key: 'TRADEOFFS',
        heading: HEADINGS.TRADEOFFS,
        fieldType: 'bullet_list',
        description:
          'Decisions with alternatives and justification for the chosen path.',
        missingBehavior: 'fill_default',
        defaultValue: '- No significant tradeoffs identified.',
      },
      {
        key: 'VERIFICATION_METHOD',
        heading: HEADINGS.VERIFICATION_METHOD,
        fieldType: 'paragraph',
        description:
          'How to verify correctness: tests, manual checks, acceptance criteria.',
        missingBehavior: 'reject',
      },
    ],
    optionalSections: [
      {
        key: 'RISKS',
        heading: HEADINGS.RISKS,
        fieldType: 'bullet_list',
        description:
          'Implementation risks and mitigation strategies.',
        missingBehavior: 'skip',
      },
    ],
    sectionOrder: [
      'GOAL',
      'PRECONDITIONS',
      'FILES_TO_MODIFY',
      'STEP_BY_STEP_PLAN',
      'CODE_SKETCHES',
      'TRADEOFFS',
      'VERIFICATION_METHOD',
      'RISKS',
    ],
    skeletonExample: `## GOAL
Implement {feature} using {chosen approach} as decided in the discussion stage.

## PRECONDITIONS
- [ ] Branch created: feature/{branch-name}
- [ ] Dependencies installed: {dep list}
- [ ] Environment variable {VAR} configured

## FILES_TO_MODIFY
| File | Action | Reason |
|------|--------|--------|
| src/services/auth.ts | modify | Add token refresh logic |
| src/types/auth.ts | modify | Add RefreshToken interface |
| src/services/__tests__/auth.test.ts | create | Unit tests for refresh flow |
| src/middleware/auth.ts | modify | Wire refresh into middleware chain |

## STEP_BY_STEP_PLAN
1. Define RefreshToken interface in src/types/auth.ts. Expected outcome: type available for import.
2. Add refreshToken() method to AuthService in src/services/auth.ts. Expected outcome: method compiles, not yet wired.
3. Update auth middleware in src/middleware/auth.ts to call refreshToken() on 401. Expected outcome: middleware intercepts expired tokens.
4. Write unit tests in src/services/__tests__/auth.test.ts covering: valid refresh, expired refresh, invalid token. Expected outcome: 3 test cases pass.
5. Manual integration test: login, wait for expiry, verify automatic refresh. Expected outcome: seamless token renewal.

## CODE_SKETCHES
\`\`\`typescript
interface RefreshToken {
  token: string;
  expiresAt: Date;
  userId: string;
}

class AuthService {
  async refreshToken(current: RefreshToken): Promise<AuthToken> { /* ... */ }
}
\`\`\`

## TRADEOFFS
- Chose in-memory token cache over Redis: simpler deployment, but tokens lost on restart. Acceptable for MVP.
- Chose synchronous refresh over background refresh: simpler flow, but brief latency spike on expiry.

## VERIFICATION_METHOD
Run \`npm test -- auth\` to execute unit tests. Verify all 3 test cases pass. Manually test the refresh flow by setting token TTL to 10 seconds and confirming seamless renewal in the browser.

## RISKS
- Token refresh race condition if multiple requests hit 401 simultaneously. Mitigate with a refresh lock.`,
  },

  failureContract: {
    minAcceptableSections: 4,
    onPartialOutput: 'attempt_repair',
    onMalformedOutput: 'attempt_repair',
    onEmptyOutput: 'retry_once',
    maxRepairAttempts: 2,
    criticalSections: ['STEP_BY_STEP_PLAN', 'VERIFICATION_METHOD'],
  },

  repairContract: {
    selfCheckInstruction:
      'Verify STEP_BY_STEP_PLAN is a numbered list where each step names the target file(s) and expected outcome. Verify steps are ordered by dependency. Verify VERIFICATION_METHOD includes concrete test commands or checks. Verify FILES_TO_MODIFY lists every file referenced in the plan.',
    missingSectionRepair:
      'Your output is missing required sections. Add them using exact headings: GOAL, PRECONDITIONS, FILES_TO_MODIFY, STEP_BY_STEP_PLAN, CODE_SKETCHES, TRADEOFFS, VERIFICATION_METHOD. Do not remove existing content.',
    invalidHeadingRepair:
      'Your headings do not match the required format. Use exactly: ## GOAL, ## PRECONDITIONS, ## FILES_TO_MODIFY, ## STEP_BY_STEP_PLAN, ## CODE_SKETCHES, ## TRADEOFFS, ## VERIFICATION_METHOD. Keep all content, only fix headings.',
    proseToStructureRepair:
      'Your output is unstructured prose. Reorganize under these headings: ## GOAL, ## PRECONDITIONS, ## FILES_TO_MODIFY, ## STEP_BY_STEP_PLAN, ## CODE_SKETCHES, ## TRADEOFFS, ## VERIFICATION_METHOD. The plan must be a numbered list under STEP_BY_STEP_PLAN.',
    trimToSchemaRepair:
      'Your output contains extra sections. Keep only: GOAL, PRECONDITIONS, FILES_TO_MODIFY, STEP_BY_STEP_PLAN, CODE_SKETCHES, TRADEOFFS, VERIFICATION_METHOD, RISKS. Remove everything else.',
  },

  variantContract: {
    standard: {
      promptText: `Generate a detailed implementation plan from the following inputs.

Goal: {goal}
Research summary: {researchSummary}
Decision record: {decisionRecord}
{constraints ? "Constraints:\\n" + constraints.join("\\n") : ""}
{pinnedFacts ? "Pinned facts:\\n" + pinnedFacts : ""}

Produce these sections:
## GOAL — one sentence restating the implementation objective.
## PRECONDITIONS — checklist of prerequisites (dependencies, branches, config).
## FILES_TO_MODIFY — table with columns: File, Action (create/modify/delete), Reason.
## STEP_BY_STEP_PLAN — numbered list. Each step: what to do, which file(s), expected outcome. Order by dependency.
## CODE_SKETCHES — key interfaces and signatures. Pseudocode or TypeScript. Sketches only, not full implementations.
## TRADEOFFS — decisions with alternatives and justification.
## VERIFICATION_METHOD — how to verify correctness: test commands, manual checks, acceptance criteria.
## RISKS — (optional) implementation risks and mitigations.

Rules:
- Every item from the decision record's WHAT_ENTERS_PLAN must appear in the plan.
- Steps must be dependency-ordered.
- Do not add scope beyond goal and decision record.
- CODE_SKETCHES are structural — not complete code.
- FILES_TO_MODIFY must list every file referenced in the plan.`,
      tokenBudget: 3500,
      includeSkeleton: true,
      includedSections: [
        'GOAL',
        'PRECONDITIONS',
        'FILES_TO_MODIFY',
        'STEP_BY_STEP_PLAN',
        'CODE_SKETCHES',
        'TRADEOFFS',
        'VERIFICATION_METHOD',
        'RISKS',
      ],
      additionalConstraints: [],
    },
    strict: {
      promptText: `Generate an implementation plan. Follow every rule exactly. Deviation causes rejection.

Goal: {goal}
Research: {researchSummary}
Decision: {decisionRecord}

MANDATORY SECTIONS (## HEADING format):
## GOAL — exactly one sentence.
## PRECONDITIONS — checklist format (- [ ] item). Minimum 2 items.
## FILES_TO_MODIFY — markdown table. Every file in STEP_BY_STEP_PLAN must appear here.
## STEP_BY_STEP_PLAN — numbered list. Each step MUST contain: action, file path, expected outcome. Minimum 4 steps. No step may reference a later step's output.
## CODE_SKETCHES — code blocks with interfaces/signatures only. No function bodies beyond placeholder comments.
## TRADEOFFS — minimum 1 item with chosen vs. alternative.
## VERIFICATION_METHOD — must include at least one concrete command or test name.

STRICT RULES:
- Every WHAT_ENTERS_PLAN item from the decision record must map to a plan step.
- Steps must be dependency-ordered. Dependency violation invalidates output.
- Do NOT add scope beyond the goal.
- CODE_SKETCHES must not contain complete implementations.
- Violation of any rule invalidates the entire output.`,
      tokenBudget: 3500,
      includeSkeleton: true,
      includedSections: [
        'GOAL',
        'PRECONDITIONS',
        'FILES_TO_MODIFY',
        'STEP_BY_STEP_PLAN',
        'CODE_SKETCHES',
        'TRADEOFFS',
        'VERIFICATION_METHOD',
      ],
      additionalConstraints: [
        'Minimum 4 steps in STEP_BY_STEP_PLAN.',
        'Every file in plan must appear in FILES_TO_MODIFY.',
        'No complete implementations in CODE_SKETCHES.',
      ],
    },
    lowCost: {
      promptText: `Create an implementation plan.

Goal: {goal}
Decision: {decisionRecord}

Output:
## GOAL — one sentence.
## FILES_TO_MODIFY — list files with action and reason.
## STEP_BY_STEP_PLAN — numbered steps. Each: action, file, outcome.
## VERIFICATION_METHOD — how to verify correctness.

Steps must be dependency-ordered. Do not add scope beyond the goal.`,
      tokenBudget: 1500,
      includeSkeleton: false,
      includedSections: [
        'GOAL',
        'FILES_TO_MODIFY',
        'STEP_BY_STEP_PLAN',
        'VERIFICATION_METHOD',
      ],
      additionalConstraints: [
        'Skip PRECONDITIONS, CODE_SKETCHES, TRADEOFFS.',
      ],
    },
    minimal: {
      promptText: `Using goal {goal}, research {researchSummary}, and decision {decisionRecord}, output ## GOAL (one sentence), ## STEP_BY_STEP_PLAN, and ## VERIFICATION_METHOD (how to verify). Number each plan step with action, target file(s), and expected outcome in dependency order.`,
      tokenBudget: 100,
      includeSkeleton: false,
      includedSections: [
        'GOAL',
        'STEP_BY_STEP_PLAN',
        'VERIFICATION_METHOD',
      ],
      additionalConstraints: [
        'No optional sections.',
        'Maximum 1 sentence per step.',
      ],
    },
  },

  weakModelSpec: {
    maxInstructionWords: 100,
    requiredNegativeConstraints: [
      'Do not write complete function implementations.',
      'Do not add features beyond the stated goal.',
      'Do not skip the verification method.',
      'Do not reorder steps out of dependency order.',
    ],
    extractionFields: [
      { label: 'Goal', format: 'single sentence', section: 'GOAL' },
      {
        label: 'File',
        format: 'path + action + reason',
        section: 'FILES_TO_MODIFY',
      },
      {
        label: 'Step',
        format: 'numbered with file and outcome',
        section: 'STEP_BY_STEP_PLAN',
      },
      {
        label: 'Verification',
        format: 'command or check description',
        section: 'VERIFICATION_METHOD',
      },
    ],
    bannedPhrases: [
      'you might want to',
      'consider',
      'feel free',
      'it depends',
      'as mentioned above',
      'optionally',
    ],
    minimalExecutableTemplate: `Plan implementation for: {goal}

Write:
## GOAL — one sentence
## STEP_BY_STEP_PLAN — numbered steps, each with: action, file, outcome
## VERIFICATION_METHOD — how to test

Order steps by dependency.`,
    fewShotSkeleton: `## GOAL
Add pagination to the /api/users endpoint.

## STEP_BY_STEP_PLAN
1. Add PaginationParams type to src/types/api.ts. Outcome: type available.
2. Update getUsersQuery in src/db/queries.ts to accept offset and limit. Outcome: query supports pagination.
3. Modify /api/users handler in src/routes/users.ts to parse page/limit params. Outcome: endpoint accepts pagination.
4. Add tests in src/routes/__tests__/users.test.ts. Outcome: 3 test cases pass.

## VERIFICATION_METHOD
Run \`npm test -- users\`. Verify pagination returns correct page sizes and total counts.`,
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
        'trim_to_schema',
      ],
      maxAttempts: 1,
    },
    fallbackVariant: {
      chain: ['standard', 'strict', 'lowCost', 'minimal'],
      autoDowngradeOnFailure: true,
    },
  },
};
