import type { PromptTemplateSpec } from '@/types/prompt';
import { HEADINGS } from '../heading-constants';

export const verificationGenerationTemplate: PromptTemplateSpec = {
  id: 'task:verification_generation',
  layer: 'task',
  purpose:
    'Generate verification prompts and checklists for validating completed implementation work against the original plan.',

  requiredInputs: [
    {
      name: 'implementationPlan',
      type: 'artifact',
      required: true,
      description:
        'The plan artifact that was used to guide implementation.',
    },
    {
      name: 'completedWork',
      type: 'string',
      required: true,
      description:
        'Description or summary of the work that was actually completed.',
    },
  ],

  optionalInputs: [
    {
      name: 'pinnedFacts',
      type: 'pinned_facts',
      required: false,
      description:
        'User-confirmed facts that verification must check against.',
    },
  ],

  taskContract: `You are generating verification materials for completed implementation work.

INPUTS:
- implementationPlan: The plan artifact the implementation followed.
- completedWork: Summary of what was actually built.
- pinnedFacts (optional): Confirmed facts to verify against.

RULES:
1. VERIFICATION_PROMPT must be a self-contained prompt that a separate AI agent can use to review the completed work. The agent receiving this prompt must be able to verify without access to the conversation history.
2. VERIFICATION_PROMPT must instruct the reviewer to check: functional correctness, adherence to the plan, edge cases, error handling, and any constraints from pinned facts.
3. CHECKLIST must be a checkbox list where each item is a single verifiable claim. Items must be specific, not vague ("Token refresh returns new token within 1 second" not "refresh works").
4. Every step in the implementation plan must map to at least one checklist item. If a plan step has no corresponding checklist item, add one.
5. EVIDENCE_REQUIRED must list what concrete evidence the reviewer needs to collect (test output, screenshots, log snippets, code diffs).
6. FAILURE_HANDLING must describe what to do for each type of failure: test failure, missing feature, performance regression, broken existing functionality.
7. If pinned facts are provided, add one checklist item per pinned fact that can be verified.
8. Do not add verification items for features not in the plan. Do not expand scope.
9. Checklist items must be ordered: critical items first, nice-to-have items last.
10. VERIFICATION_PROMPT must end with a clear instruction to output findings in a structured format.`,

  stageContract: '',

  outputContract: {
    requiredSections: [
      {
        key: 'VERIFICATION_PROMPT',
        heading: HEADINGS.VERIFICATION_PROMPT,
        fieldType: 'paragraph',
        description:
          'Self-contained prompt for an AI reviewer to verify the completed work.',
        savableAs: 'prompt',
        missingBehavior: 'reject',
      },
      {
        key: 'CHECKLIST',
        heading: HEADINGS.CHECKLIST,
        fieldType: 'checklist',
        description:
          'Checkbox list of specific verifiable claims, ordered by criticality.',
        missingBehavior: 'reject',
      },
      {
        key: 'EVIDENCE_REQUIRED',
        heading: HEADINGS.EVIDENCE_REQUIRED,
        fieldType: 'bullet_list',
        description:
          'Concrete evidence the reviewer must collect (test output, screenshots, logs, diffs).',
        missingBehavior: 'fill_default',
        defaultValue: '- Test suite output showing all tests pass.',
      },
      {
        key: 'FAILURE_HANDLING',
        heading: HEADINGS.FAILURE_HANDLING,
        fieldType: 'key_value_pairs',
        description:
          'What to do for each failure type: test failure, missing feature, performance regression, broken existing functionality.',
        missingBehavior: 'fill_default',
        defaultValue:
          'Test failure: Re-run failed test in isolation, check for environment issues.\nMissing feature: Flag as incomplete, return to implementation.\nPerformance regression: Profile and identify bottleneck.\nBroken existing functionality: Revert changes, investigate root cause.',
      },
    ],
    optionalSections: [
      {
        key: 'RISKS',
        heading: HEADINGS.RISKS,
        fieldType: 'bullet_list',
        description:
          'Verification risks — areas where testing may be insufficient or unreliable.',
        missingBehavior: 'skip',
      },
    ],
    sectionOrder: [
      'VERIFICATION_PROMPT',
      'CHECKLIST',
      'EVIDENCE_REQUIRED',
      'FAILURE_HANDLING',
      'RISKS',
    ],
    skeletonExample: `## VERIFICATION_PROMPT
You are reviewing completed implementation work. Your task is to verify it against the original plan.

Plan summary: {plan summary}
Completed work: {work summary}

Check the following:
1. Functional correctness: Does each plan step have a working implementation?
2. Plan adherence: Are there deviations from the plan? Are they justified?
3. Edge cases: Are boundary conditions handled?
4. Error handling: Do errors produce meaningful messages? Are they caught appropriately?
5. Constraints: {list pinned facts/constraints to verify}

For each check, collect evidence (test output, code inspection, log review).

Output your findings as:
## PASSED — items verified successfully.
## FAILED — items that failed with reason and evidence.
## WARNINGS — items that passed but have concerns.
## BLOCKERS — issues that must be fixed before merging.

## CHECKLIST
- [ ] [CRITICAL] API endpoint returns correct response for valid input
- [ ] [CRITICAL] Token refresh generates valid JWT with correct claims
- [ ] [CRITICAL] Expired token triggers automatic refresh without user action
- [ ] [CRITICAL] Invalid refresh token returns 401 with error message
- [ ] [HIGH] Rate limiting prevents refresh abuse (max 10/minute)
- [ ] [HIGH] All existing auth tests still pass
- [ ] [MEDIUM] Refresh token rotation invalidates previous token
- [ ] [LOW] Response times under 200ms for refresh endpoint

## EVIDENCE_REQUIRED
- Output of \`npm test -- auth\` showing all test cases pass.
- Screenshot or curl output of successful token refresh.
- Log snippet showing expired token detection and refresh.
- Output of \`npm test\` (full suite) confirming no regressions.

## FAILURE_HANDLING
Test failure: Re-run the specific test in isolation. Check for timing or environment issues. If reproducible, return to implementation with the failing test name and error message.
Missing feature: Mark the plan step as incomplete. Return to implementation stage with the specific missing item.
Performance regression: Run profiling on the affected endpoint. Compare before/after metrics. Identify the bottleneck before attempting a fix.
Broken existing functionality: Immediately revert the last change set. Run the full test suite on the reverted code to confirm the revert is clean. Investigate the root cause before re-implementing.

## RISKS
- Token refresh timing tests may be flaky in CI due to clock precision.
- Integration tests require a running database — may fail in some environments.`,
  },

  failureContract: {
    minAcceptableSections: 3,
    onPartialOutput: 'attempt_repair',
    onMalformedOutput: 'attempt_repair',
    onEmptyOutput: 'retry_once',
    maxRepairAttempts: 2,
    criticalSections: ['VERIFICATION_PROMPT', 'CHECKLIST'],
  },

  repairContract: {
    selfCheckInstruction:
      'Verify VERIFICATION_PROMPT is self-contained (a separate agent can use it without conversation history). Verify CHECKLIST has one item per plan step at minimum. Verify checklist items are specific claims, not vague ("returns 200" not "works"). Verify FAILURE_HANDLING covers at least: test failure, missing feature.',
    missingSectionRepair:
      'Your output is missing required sections. Add them using exact headings: VERIFICATION_PROMPT, CHECKLIST, EVIDENCE_REQUIRED, FAILURE_HANDLING. Do not remove existing content.',
    invalidHeadingRepair:
      'Your headings do not match the required format. Use exactly: ## VERIFICATION_PROMPT, ## CHECKLIST, ## EVIDENCE_REQUIRED, ## FAILURE_HANDLING. Keep all content, only fix headings.',
    proseToStructureRepair:
      'Your output is unstructured prose. Reorganize under these headings: ## VERIFICATION_PROMPT, ## CHECKLIST, ## EVIDENCE_REQUIRED, ## FAILURE_HANDLING. CHECKLIST must use checkbox format (- [ ] item).',
    trimToSchemaRepair:
      'Your output contains extra sections. Keep only: VERIFICATION_PROMPT, CHECKLIST, EVIDENCE_REQUIRED, FAILURE_HANDLING, RISKS. Remove everything else.',
  },

  variantContract: {
    standard: {
      promptText: `Generate verification materials for completed implementation work.

Implementation plan: {implementationPlan}
Completed work: {completedWork}
{pinnedFacts ? "Pinned facts (must be verified):\\n" + pinnedFacts : ""}

Produce these sections:
## VERIFICATION_PROMPT — self-contained prompt for a separate AI reviewer. Must include: what to check (functional correctness, plan adherence, edge cases, error handling, constraints), what evidence to collect, and the output format (PASSED/FAILED/WARNINGS/BLOCKERS). The reviewer has no access to conversation history.
## CHECKLIST — checkbox list of specific verifiable claims. Each item must be a concrete testable statement. Tag each: [CRITICAL], [HIGH], [MEDIUM], or [LOW]. Order critical items first. Map every plan step to at least one item.
## EVIDENCE_REQUIRED — bullet list of concrete evidence: test output, screenshots, logs, code diffs.
## FAILURE_HANDLING — for each failure type (test failure, missing feature, performance regression, broken existing functionality): what action to take.
## RISKS — (optional) areas where testing may be insufficient.

Rules:
- VERIFICATION_PROMPT must be self-contained.
- One checklist item per plan step at minimum.
- Checklist items must be specific, not vague.
- Do not add items for features not in the plan.
- If pinned facts exist, add one checklist item per verifiable fact.`,
      tokenBudget: 2500,
      includeSkeleton: true,
      includedSections: [
        'VERIFICATION_PROMPT',
        'CHECKLIST',
        'EVIDENCE_REQUIRED',
        'FAILURE_HANDLING',
        'RISKS',
      ],
      additionalConstraints: [],
    },
    strict: {
      promptText: `Generate verification materials. Follow every rule exactly. Deviation causes rejection.

Plan: {implementationPlan}
Work done: {completedWork}

MANDATORY SECTIONS (## HEADING format):
## VERIFICATION_PROMPT — self-contained prompt for a reviewer with no conversation history. Must end with structured output format instruction. Minimum 100 words.
## CHECKLIST — checkbox format (- [ ] [TAG] item). Every plan step must have ≥1 item. Tags: [CRITICAL], [HIGH], [MEDIUM], [LOW]. Critical items first. Minimum 5 items.
## EVIDENCE_REQUIRED — bullet list. Minimum 3 items. Each must name a concrete artifact (test output, screenshot, log).
## FAILURE_HANDLING — must cover exactly: test failure, missing feature, performance regression, broken existing functionality. Each with specific action.

STRICT RULES:
- VERIFICATION_PROMPT must work without conversation history.
- Every plan step maps to ≥1 checklist item.
- No vague checklist items ("works" is rejected; "returns 200 with valid JSON" is accepted).
- No items for features outside the plan.
- Violation of any rule invalidates the entire output.`,
      tokenBudget: 2500,
      includeSkeleton: true,
      includedSections: [
        'VERIFICATION_PROMPT',
        'CHECKLIST',
        'EVIDENCE_REQUIRED',
        'FAILURE_HANDLING',
      ],
      additionalConstraints: [
        'Minimum 5 checklist items.',
        'Every plan step must have a corresponding checklist item.',
        'Checklist items must be specific testable claims.',
      ],
    },
    lowCost: {
      promptText: `Generate verification for completed work.

Plan: {implementationPlan}
Done: {completedWork}

Output:
## VERIFICATION_PROMPT — prompt for a reviewer to check the work. Must be self-contained.
## CHECKLIST — checkbox list of what to verify. Tag as [CRITICAL] or [OTHER].
## EVIDENCE_REQUIRED — what evidence to collect.
## FAILURE_HANDLING — what to do if tests fail or features are missing.

Keep checklist specific. One item per plan step.`,
      tokenBudget: 1200,
      includeSkeleton: false,
      includedSections: [
        'VERIFICATION_PROMPT',
        'CHECKLIST',
        'EVIDENCE_REQUIRED',
        'FAILURE_HANDLING',
      ],
      additionalConstraints: ['Skip RISKS section.'],
    },
    minimal: {
      promptText: `For plan {implementationPlan} and completed work {completedWork}, output ## VERIFICATION_PROMPT and ## CHECKLIST. The prompt must be a short self-contained reviewer instruction (no conversation history); the checklist must use - [ ] lines with specific verifiable claims, at least one per plan step.`,
      tokenBudget: 80,
      includeSkeleton: false,
      includedSections: ['VERIFICATION_PROMPT', 'CHECKLIST'],
      additionalConstraints: [
        'No optional sections.',
        'Maximum 8 checklist items.',
      ],
    },
  },

  weakModelSpec: {
    maxInstructionWords: 100,
    requiredNegativeConstraints: [
      'Do not add verification for features not in the plan.',
      'Do not use vague checklist items like "it works" or "looks good."',
      'Do not assume the reviewer has conversation history.',
      'Do not expand scope beyond the implementation plan.',
    ],
    extractionFields: [
      {
        label: 'Verification prompt',
        format: 'self-contained paragraph',
        section: 'VERIFICATION_PROMPT',
      },
      {
        label: 'Checklist item',
        format: '- [ ] [TAG] specific claim',
        section: 'CHECKLIST',
      },
      {
        label: 'Evidence',
        format: 'concrete artifact name',
        section: 'EVIDENCE_REQUIRED',
      },
      {
        label: 'Failure action',
        format: 'failure type: action',
        section: 'FAILURE_HANDLING',
      },
    ],
    bannedPhrases: [
      'you might want to',
      'consider',
      'feel free',
      'it depends',
      'looks good',
      'seems to work',
    ],
    minimalExecutableTemplate: `Write a verification checklist for: {completedWork}

Based on plan: {implementationPlan}

## VERIFICATION_PROMPT
Prompt for a reviewer to check the work.

## CHECKLIST
- [ ] (list items to verify, one per line)`,
    fewShotSkeleton: `## VERIFICATION_PROMPT
Review the completed pagination feature. Check: endpoint accepts page/limit params, returns correct page size, total count is accurate, page beyond range returns empty array. Collect test output as evidence. Report PASSED or FAILED per item.

## CHECKLIST
- [ ] [CRITICAL] GET /api/users?page=1&limit=10 returns 10 items
- [ ] [CRITICAL] Response includes totalCount field with correct value
- [ ] [HIGH] page=999 returns empty array, not error
- [ ] [MEDIUM] Default page=1, limit=20 when params omitted

## EVIDENCE_REQUIRED
- Output of \`npm test -- pagination\`
- curl response for page boundary test

## FAILURE_HANDLING
Test failure: Re-run in isolation, check database seed data.
Missing feature: Return to implementation with specific gap.`,
    fieldPreference: 'extraction',
  },

  gates: {
    validateOutputStructure: {
      headingMatchStrategy: 'uppercase_exact',
      minSectionsForPartial: 2,
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
