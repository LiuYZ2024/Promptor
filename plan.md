# Promptor — Implementation Plan

---

## 1. Page Structure & Layout

### 1.1 Application Shell

```
┌──────────────────────────────────────────────────────────────────────┐
│  App Shell                                                           │
│ ┌──────────┬──────────────────────────────────┬───────────────────┐  │
│ │ Sidebar  │  Main Content Area               │ Info Panel (R)    │  │
│ │          │                                   │ (collapsible)     │  │
│ │ Sessions │  Renders current page:            │                   │  │
│ │ ───────  │  - WorkflowBuilder                │ Pinned Facts      │  │
│ │ + New    │  - PromptRefiner                  │ Artifacts         │  │
│ │ Session1 │  - SessionWorkspace               │ Memory Summary    │  │
│ │ Session2 │  - Settings                       │ Context Budget    │  │
│ │ ───────  │                                   │ Session Meta      │  │
│ │ Workflow │                                   │                   │  │
│ │ Refiner  │                                   │                   │  │
│ │ Settings │                                   │                   │  │
│ └──────────┴──────────────────────────────────┴───────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
```

### 1.1B Session Workspace — Stage-First Layout

The Session Workspace is **not a chat page**. It is a stage-oriented control surface.
The message stream exists but is secondary to stage state, artifacts, and prompts.

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Session: "Refactor auth module"                          [Archive] [⚙]  │
├──────────────────────────────────────────────────────────────────────────┤
│ ┌─ Stage Progress Bar ────────────────────────────────────────────────┐  │
│ │ [✓Req] [✓Res] [●Disc] [○Plan] [○Ann] [○Impl] [○Vfy] [○Sol]       │  │
│ └─────────────────────────────────────────────────────────────────────┘  │
├─────────────────────────────────────┬────────────────────────────────────┤
│  STAGE PANEL (primary)              │  CONTEXT PANEL (right, collapsible)│
│                                     │                                    │
│  ┌─ Current Stage Header ────────┐  │  ┌─ Context Budget ────────────┐  │
│  │ Stage: Discussion              │  │  │ ██████████░░░ 4200/6000     │  │
│  │ Goal: Evaluate auth approaches │  │  │ Compression advised: No     │  │
│  │ Status: In Progress            │  │  └────────────────────────────┘  │
│  └────────────────────────────────┘  │                                    │
│                                     │  ┌─ Pinned Facts (4) ──────────┐  │
│  ┌─ Stage Prompt ────────────────┐  │  │ [critical] Must use OAuth2  │  │
│  │ Current stage prompt, ready    │  │  │ [accepted] Use passport.js  │  │
│  │ to copy to external agent      │  │  │ [rejected] No custom JWT    │  │
│  │              [Copy] [Refine]  │  │  │ [constraint] No new deps    │  │
│  └────────────────────────────────┘  │  │              [+ Add Fact]   │  │
│                                     │  └────────────────────────────┘  │
│  ┌─ Artifacts (this stage) ──────┐  │                                    │
│  │ ▸ research_summary (v1)       │  │  ┌─ Artifacts (all) ──────────┐  │
│  │ ▸ discussion_notes (v1)  [new]│  │  │ ▸ requirement_brief (v1)   │  │
│  │          [+ Save New Artifact]│  │  │ ▸ research_summary (v1)    │  │
│  └────────────────────────────────┘  │  │ ▸ discussion_notes (v1)   │  │
│                                     │  └────────────────────────────┘  │
│  ┌─ Next Action ─────────────────┐  │                                    │
│  │ Suggested: "Finalize decision  │  │  ┌─ Memory Summary ──────────┐  │
│  │ record, then advance to Plan"  │  │  │ Rolling summary preview... │  │
│  │       [Generate Stage Prompt]  │  │  │            [View Full]     │  │
│  │       [Advance to Next Stage]  │  │  └────────────────────────────┘  │
│  └────────────────────────────────┘  │                                    │
│                                     │                                    │
│  ┌─ Conversation ────────────────┐  │                                    │
│  │ (collapsible, secondary)       │  │                                    │
│  │ [user] Can we compare...       │  │                                    │
│  │ [asst] Here are 3 approaches.. │  │                                    │
│  │ ─────────────────────          │  │                                    │
│  │ [input area]     [Send] [⚡]  │  │                                    │
│  └────────────────────────────────┘  │                                    │
├─────────────────────────────────────┴────────────────────────────────────┤
└──────────────────────────────────────────────────────────────────────────┘
```

**Key layout principles:**
1. **Stage header is always visible at top** — current stage, goal, status
2. **Stage prompt block is prominent** — the ready-to-copy prompt for the current stage
3. **Artifacts for this stage are above the fold** — not buried in a sidebar tab
4. **Next suggested action is explicit** — Promptor tells the user what to do next
5. **Conversation is collapsible and positioned below** — it supports the stage workflow, it doesn't drive it
6. **Context panel (right)** shows budget, pinned facts, all artifacts, memory — always available but secondary

### 1.2 Page Inventory

| Page | Route | Description |
|---|---|---|
| Settings | `/settings` | LLM provider config, theme, limits |
| Workflow Builder | `/workflow` | Generate 8-stage workflow from requirement |
| Prompt Refiner | `/refiner` | Transform raw prompt into refined output |
| Session Workspace | `/session/:id` | Multi-turn session with stage control |

### 1.3 Responsive Behavior

- **Desktop (≥1280px)**: Three-column layout — sidebar + main + info panel
- **Tablet (768–1279px)**: Sidebar collapses to icon rail; info panel is a slide-over sheet
- **Mobile (<768px)**: Sidebar is a full-screen drawer; info panel is bottom sheet; single column main

---

## 2. State Management Design

### 2.1 State Ownership Principle

| State Category | Owner | Persistence |
|---|---|---|
| LLM settings, sessions, messages, artifacts, pinned facts, summaries | Dexie (IndexedDB) | Persistent |
| Theme preference, last model | localStorage | Persistent |
| Current page/route | React Router | URL |
| Active session ID, sidebar open, info panel open, loading states, modal states | Zustand (UI store) | Transient |
| Streaming response buffer | Zustand or React state | Transient |

### 2.2 Zustand Store Design

```typescript
// Single UI store — keeps transient UI state only
interface UIStore {
  sidebarOpen: boolean;
  infoPanelOpen: boolean;
  activeSessionId: string | null;
  streamingContent: string | null;
  isStreaming: boolean;
  isLoading: boolean;

  setSidebarOpen: (open: boolean) => void;
  setInfoPanelOpen: (open: boolean) => void;
  setActiveSessionId: (id: string | null) => void;
  setStreamingContent: (content: string | null) => void;
  setIsStreaming: (streaming: boolean) => void;
  setIsLoading: (loading: boolean) => void;
}
```

### 2.3 Data Access Pattern

```
Component
  │
  ├─ useLiveQuery(() => db.sessions.toArray())  ← Read (reactive)
  │
  └─ sessionService.createSession(data)          ← Write (imperative)
        │
        └─ db.sessions.add(data)                 ← Dexie write
```

All reads go through Dexie's `useLiveQuery()` for reactivity.
All writes go through service functions (thin wrappers around Dexie operations).

---

## 3. Data Model (Dexie Schema)

### 3.1 Database Definition

```typescript
import Dexie, { Table } from 'dexie';

class PromptoDb extends Dexie {
  settings!: Table<Settings>;
  sessions!: Table<Session>;
  messages!: Table<Message>;
  artifacts!: Table<Artifact>;
  pinnedFacts!: Table<PinnedFact>;
  summaries!: Table<Summary>;

  constructor() {
    super('promptor');
    this.version(1).stores({
      settings:    'id',
      sessions:    'id, status, updatedAt',
      messages:    'id, sessionId, [sessionId+createdAt], stage',
      artifacts:   'id, sessionId, [sessionId+stage], artifactType',
      pinnedFacts: 'id, sessionId, category, priority',
      summaries:   'id, sessionId, summaryType',
    });
  }
}
```

### 3.2 Type Definitions

```typescript
// ─── Settings ───
interface Settings {
  id: string;                     // 'default' for singleton
  providerLabel: string;          // Display name
  baseUrl: string;
  apiKey: string;
  model: string;
  temperature: number;            // 0.0 – 2.0
  maxTokens: number;
  contextSoftLimit: number;       // Token count
  contextHardLimit: number;       // Token count
  theme: 'light' | 'dark' | 'system';
  debugMode: boolean;
  persistApiKey: boolean;         // If false, use sessionStorage
  createdAt: string;              // ISO 8601
  updatedAt: string;
}

// ─── Session ───
type TaskType = 'coding' | 'research' | 'mixed' | 'discussion';
type SessionStatus = 'active' | 'archived';
type WorkflowStage =
  | 'requirement' | 'research' | 'discussion' | 'plan'
  | 'annotation_loop' | 'implement' | 'verify' | 'solidify';

interface Session {
  id: string;
  title: string;
  taskType: TaskType;
  goal: string;
  hasCodebase: boolean;
  agentTarget: string;            // e.g. 'cursor', 'claude-code', 'cline', 'roo', 'other'
  currentStage: WorkflowStage;
  completedStages: WorkflowStage[];
  status: SessionStatus;
  createdAt: string;
  updatedAt: string;
}

// ─── Message ───
type MessageRole = 'user' | 'assistant' | 'system' | 'tool';

interface Message {
  id: string;
  sessionId: string;
  role: MessageRole;
  content: string;
  stage: WorkflowStage;
  tokenEstimate: number;
  includedInSummary: boolean;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

// ─── Artifact ───
type ArtifactType =
  | 'requirement_brief' | 'research_summary'
  | 'discussion_notes' | 'decision_record'
  | 'implementation_plan' | 'revised_plan'
  | 'implementation_prompt' | 'execution_checklist'
  | 'verification_prompt' | 'verification_report'
  | 'reusable_rules' | 'memory_summary'
  | 'refined_prompt';

interface Artifact {
  id: string;
  sessionId: string;
  stage: WorkflowStage;
  artifactType: ArtifactType;
  title: string;
  content: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

// ─── Pinned Fact ───
type FactCategory =
  | 'objective' | 'constraint' | 'preference'
  | 'accepted_decision' | 'rejected_option'
  | 'coding_style' | 'validation_rule' | 'scope_boundary';

type FactPriority = 'critical' | 'high' | 'normal';

interface PinnedFact {
  id: string;
  sessionId: string;
  category: FactCategory;
  content: string;
  priority: FactPriority;
  sourceArtifactId?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Summary ───
type SummaryType = 'rolling' | 'stage_end' | 'long_term';

interface Summary {
  id: string;
  sessionId: string;
  summaryType: SummaryType;
  content: string;
  sourceRange: {
    fromMessageId: string;
    toMessageId: string;
    messageCount: number;
  };
  tokenEstimate: number;
  createdAt: string;
}
```

---

## 4. Prompt Architecture — 7-Layer Contract System

### 4.1 Design Philosophy

Promptor assumes the model is mediocre at instruction following.
Every prompt is composed of **7 typed contract layers**, each serving a distinct enforcement purpose.
The system prefers **extraction and field-filling** over open-ended generation at every level.
All output headings are **standardized uppercase fixed labels** for maximum parseability.

### 4.2 The 7 Contract Layers

When Promptor sends a request to the LLM, the system message is assembled from 7 layers in this fixed order:

```
┌─────────────────────────────────────────────────────────────┐
│ Layer 1: BEHAVIOR CONTRACT                                  │
│ Who you are. How you behave. Extraction-first principle.    │
│ Always included. Identical across all templates.            │
├─────────────────────────────────────────────────────────────┤
│ Layer 2: TASK CONTRACT                                      │
│ What task type this is. Task-specific instructions.         │
│ Selected per task (workflow_generation, prompt_refinement…) │
├─────────────────────────────────────────────────────────────┤
│ Layer 3: STAGE CONTRACT                                     │
│ What stage constraints apply. What is forbidden.            │
│ Selected per stage (requirement, research, discussion…)     │
├─────────────────────────────────────────────────────────────┤
│ Layer 4: OUTPUT CONTRACT                                    │
│ Exact output structure. Fixed uppercase headings.           │
│ Skeleton example with placeholders. Field types per section.│
├─────────────────────────────────────────────────────────────┤
│ Layer 5: FAILURE CONTRACT                                   │
│ What constitutes failure. What is acceptable partial output.│
│ Tells the model upfront: "If you cannot produce X, then Y."│
├─────────────────────────────────────────────────────────────┤
│ Layer 6: REPAIR CONTRACT                                    │
│ Self-repair instructions embedded in the initial prompt.    │
│ "Before finishing, verify your output has these headings."  │
├─────────────────────────────────────────────────────────────┤
│ Layer 7: VARIANT CONTRACT                                   │
│ Which variant is active (standard/strict/lowCost/minimal).  │
│ Variant-specific rules: token limits, section subset, etc.  │
└─────────────────────────────────────────────────────────────┘
```

**Why 7 layers, not 4:**

| Old (4-layer) | Problem | New (7-layer) |
|---|---|---|
| Global preset | Mixed identity + failure rules + repair hints | Split into Behavior (1) + Failure (5) + Repair (6) |
| Task-type preset | No explicit failure/repair per task | Task (2) is pure task logic; failure/repair are separate typed contracts |
| Stage preset | Variants were implicit string swaps | Stage (3) is pure constraint; Variant (7) makes variant logic explicit |
| Output format preset | Headings were inconsistent, not typed | Output (4) has typed `FixedSection[]` with uppercase headings and field types |

### 4.3 File Organization

```
src/lib/prompts/
  ├── index.ts                          // Public API: composeContext(), getTemplate()
  ├── registry.ts                       // Central PROMPT_REGISTRY map + lookup
  ├── types.ts                          // All contract types (see §4.4)
  ├── contracts/
  │   ├── behavior-contract.ts          // Layer 1: singleton, always included
  │   ├── task-contracts.ts             // Layer 2: per task-type
  │   ├── stage-contracts.ts            // Layer 3: per stage
  │   ├── output-contracts.ts           // Layer 4: output schemas with FixedSection[]
  │   ├── failure-contracts.ts          // Layer 5: per template
  │   ├── repair-contracts.ts           // Layer 6: per template + shared repair templates
  │   └── variant-contracts.ts          // Layer 7: variant-specific rules
  ├── templates/                        // One file per template, assembles all 7 layers
  │   ├── workflow-generation.ts
  │   ├── prompt-refinement.ts
  │   ├── discussion-guidance.ts
  │   ├── plan-generation.ts
  │   ├── verification-generation.ts
  │   ├── memory-compression.ts
  │   ├── stage-requirement.ts
  │   ├── stage-research.ts
  │   ├── stage-discussion.ts
  │   ├── stage-plan.ts
  │   ├── stage-annotation-loop.ts
  │   ├── stage-implement.ts
  │   ├── stage-verify.ts
  │   └── stage-solidify.ts
  ├── repair-templates.ts              // 5 canonical repair prompts
  ├── output-parser.ts                 // Section extraction + validation
  ├── validation.ts                    // Build-time template spec checks
  └── heading-constants.ts             // Canonical uppercase heading registry
```

### 4.4 Core Type Definitions

```typescript
// ═══════════════════════════════════════════════════════
// Template Identity
// ═══════════════════════════════════════════════════════

type PromptTemplateId =
  | 'task:workflow_generation'
  | 'task:prompt_refinement'
  | 'task:discussion_guidance'
  | 'task:plan_generation'
  | 'task:verification_generation'
  | 'task:memory_compression'
  | 'stage:requirement'
  | 'stage:research'
  | 'stage:discussion'
  | 'stage:plan'
  | 'stage:annotation_loop'
  | 'stage:implement'
  | 'stage:verify'
  | 'stage:solidify';

type PromptVariant = 'standard' | 'strict' | 'lowCost' | 'minimal';

// ═══════════════════════════════════════════════════════
// The Complete Template Spec
// ═══════════════════════════════════════════════════════

interface PromptTemplateSpec {
  id: PromptTemplateId;
  layer: 'task' | 'stage';
  purpose: string;                    // Single declarative sentence

  // Inputs
  requiredInputs: PromptInputField[];
  optionalInputs: PromptInputField[];

  // 7 Contract Layers (layers 2-7; layer 1 is global singleton)
  taskContract: string;               // Layer 2 text
  stageContract: string;              // Layer 3 text
  outputContract: OutputContract;     // Layer 4 typed structure
  failureContract: FailureContract;   // Layer 5 typed structure
  repairContract: RepairContract;     // Layer 6 typed structure
  variantContract: VariantContract;   // Layer 7 typed structure

  // Weak-model compatibility (TYPED, not a note)
  weakModelSpec: WeakModelSpec;

  // Validation gates
  gates: ValidationGates;
}

// ═══════════════════════════════════════════════════════
// Layer 4: Output Contract
// ═══════════════════════════════════════════════════════

interface OutputContract {
  requiredSections: FixedSection[];
  optionalSections: FixedSection[];
  sectionOrder: string[];             // Canonical ordering of section keys
  skeletonExample: string;            // Structural micro-example with all headings
}

interface FixedSection {
  key: string;                        // Canonical key, e.g. 'GOAL'
  heading: string;                    // UPPERCASE fixed label, e.g. 'GOAL'
  fieldType: SectionFieldType;
  description: string;                // What this section must contain
  maxTokens?: number;                 // Soft cap for this section
  savableAs?: ArtifactType;
  pinnable?: boolean;
  missingBehavior: 'reject' | 'warn' | 'fill_default' | 'skip';
  defaultValue?: string;              // Used when missingBehavior is 'fill_default'
}

type SectionFieldType =
  | 'single_line'                     // 1-2 sentences
  | 'paragraph'                       // Multi-sentence block
  | 'bullet_list'                     // - item\n- item
  | 'numbered_list'                   // 1. item\n2. item
  | 'table'                           // Markdown table
  | 'key_value_pairs'                 // Key: Value\nKey: Value
  | 'code_block'                      // Fenced code
  | 'checklist';                      // ✓/✗ items

// ═══════════════════════════════════════════════════════
// Layer 5: Failure Contract
// ═══════════════════════════════════════════════════════

interface FailureContract {
  minAcceptableSections: number;
  onPartialOutput: 'warn_and_use' | 'attempt_repair' | 'reject';
  onMalformedOutput: 'attempt_repair' | 'downgrade_and_retry' | 'show_raw';
  onEmptyOutput: 'retry_once' | 'show_error';
  maxRepairAttempts: number;          // Usually 1, never > 2
  criticalSections: string[];         // Section keys that MUST be present or output is rejected
}

// ═══════════════════════════════════════════════════════
// Layer 6: Repair Contract
// ═══════════════════════════════════════════════════════

interface RepairContract {
  selfCheckInstruction: string;       // Embedded in initial prompt: "Before finishing, verify..."
  missingSectionRepair: string;       // Follow-up prompt for missing sections
  invalidHeadingRepair: string;       // Follow-up prompt for wrong headings
  proseToStructureRepair: string;     // Follow-up prompt for narrative output
  trimToSchemaRepair: string;         // Follow-up prompt to remove extraneous content
}

// ═══════════════════════════════════════════════════════
// Layer 7: Variant Contract
// ═══════════════════════════════════════════════════════

interface VariantContract {
  standard: VariantSpec;
  strict: VariantSpec;
  lowCost: VariantSpec;
  minimal: VariantSpec;               // Last-resort: absolute minimum that still works
}

interface VariantSpec {
  promptText: string;                 // The variant-specific prompt content
  tokenBudget: number;                // Approximate tokens for this variant
  includeSkeleton: boolean;           // Whether to include the skeleton example
  includedSections: string[];         // Which output sections to request (subset for lowCost/minimal)
  additionalConstraints: string[];    // Variant-specific "Do NOT" rules
}

// ═══════════════════════════════════════════════════════
// Weak-Model Compatibility (TYPED)
// ═══════════════════════════════════════════════════════

interface WeakModelSpec {
  maxInstructionWords: number;        // Max words per instruction sentence (e.g. 20)
  requiredNegativeConstraints: string[];  // Actual "DO NOT" rules for this template
  extractionFields: ExtractionField[];    // Fill-in-blank fields for this template
  bannedPhrases: string[];            // Phrases that cause weak models to derail
  minimalExecutableTemplate: string;  // Absolute minimum prompt (~50-100 tokens)
  fewShotSkeleton: string;           // Structural micro-example (≤100 tokens)
  fieldPreference: 'extraction' | 'generation';  // Almost always 'extraction'
}

interface ExtractionField {
  label: string;                      // e.g. "Chosen approach"
  format: string;                     // e.g. "The chosen approach is: [___]."
  section: string;                    // Which output section this belongs to
}

// ═══════════════════════════════════════════════════════
// Validation Gates (per template)
// ═══════════════════════════════════════════════════════

interface ValidationGates {
  validateOutputStructure: StructureValidatorConfig;
  repairOutput: RepairPipelineConfig;
  fallbackVariant: VariantDowngradeChain;
}

interface StructureValidatorConfig {
  headingMatchStrategy: 'uppercase_exact' | 'uppercase_fuzzy' | 'any_heading';
  minSectionsForPartial: number;
  requireCriticalSections: boolean;   // If true, critical sections missing = unusable
}

interface RepairPipelineConfig {
  repairStrategies: RepairStrategyId[];  // Ordered list, tried in sequence
  maxAttempts: number;
  alwaysUsStrictVariant: boolean;     // Repair prompts use strict variant
}

type RepairStrategyId =
  | 'missing_section_repair'
  | 'invalid_heading_repair'
  | 'prose_to_structure'
  | 'trim_to_schema'
  | 'weak_model_shorten';

interface VariantDowngradeChain {
  chain: PromptVariant[];             // e.g. ['standard', 'strict', 'lowCost', 'minimal']
  autoDowngradeOnFailure: boolean;    // If true, automatically try next variant on failure
}

// ═══════════════════════════════════════════════════════
// Inputs
// ═══════════════════════════════════════════════════════

interface PromptInputField {
  name: string;
  type: 'string' | 'string[]' | 'artifact' | 'pinned_facts' | 'messages';
  required: boolean;
  description: string;
}
```

### 4.5 Standardized Output Headings

All output headings across Promptor are **uppercase, underscored, fixed labels**. This eliminates heading variation as a failure mode.

**Canonical heading registry** (`heading-constants.ts`):

```typescript
const HEADINGS = {
  // ── Universal ──
  GOAL:                   'GOAL',
  CONTEXT:                'CONTEXT',
  CONSTRAINTS:            'CONSTRAINTS',
  ASSUMPTIONS:            'ASSUMPTIONS',
  RISKS:                  'RISKS',
  NEXT_STEP:              'NEXT_STEP',

  // ── Workflow ──
  WORKFLOW_STAGES:        'WORKFLOW_STAGES',
  STAGE_PROMPT:           'STAGE_PROMPT',
  STAGE_PROMPT_LOW_COST:  'STAGE_PROMPT_LOW_COST',
  EXPECTED_ARTIFACTS:     'EXPECTED_ARTIFACTS',
  SUGGESTED_FIRST_STEP:   'SUGGESTED_FIRST_STEP',
  PREREQUISITES:          'PREREQUISITES',

  // ── Prompt Refinement ──
  FINAL_PROMPT:           'FINAL_PROMPT',
  CHEAPER_VARIANT:        'CHEAPER_VARIANT',
  DIAGNOSIS:              'DIAGNOSIS',
  ASSUMPTIONS_ADDED:      'ASSUMPTIONS_ADDED',
  SUGGESTED_PINNED_FACTS: 'SUGGESTED_PINNED_FACTS',

  // ── Requirement ──
  OBJECTIVE:              'OBJECTIVE',
  MUST_HAVE:              'MUST_HAVE',
  NICE_TO_HAVE:           'NICE_TO_HAVE',
  KNOWN_CONSTRAINTS:      'KNOWN_CONSTRAINTS',
  UNKNOWN_QUESTIONS:      'UNKNOWN_QUESTIONS',
  DELIVERABLES:           'DELIVERABLES',

  // ── Research ──
  EXISTING_CONTEXT:       'EXISTING_CONTEXT',
  KEY_MODULES:            'KEY_MODULES',
  RELEVANT_PATTERNS:      'RELEVANT_PATTERNS',
  BOUNDARIES:             'BOUNDARIES',
  GAPS:                   'GAPS',
  RESEARCH_SUMMARY:       'RESEARCH_SUMMARY',

  // ── Discussion ──
  PROBLEM_FRAMING:        'PROBLEM_FRAMING',
  CANDIDATE_APPROACHES:   'CANDIDATE_APPROACHES',
  TRADEOFF_MATRIX:        'TRADEOFF_MATRIX',
  KEY_UNKNOWNS:           'KEY_UNKNOWNS',
  RECOMMENDED_DIRECTION:  'RECOMMENDED_DIRECTION',
  WHAT_ENTERS_PLAN:       'WHAT_ENTERS_PLAN',
  WHAT_REMAINS_OPEN:      'WHAT_REMAINS_OPEN',
  DECISION_DRAFT:         'DECISION_DRAFT',

  // ── Plan ──
  PRECONDITIONS:          'PRECONDITIONS',
  FILES_TO_MODIFY:        'FILES_TO_MODIFY',
  STEP_BY_STEP_PLAN:      'STEP_BY_STEP_PLAN',
  CODE_SKETCHES:          'CODE_SKETCHES',
  TRADEOFFS:              'TRADEOFFS',
  VERIFICATION_METHOD:    'VERIFICATION_METHOD',

  // ── Annotation Loop ──
  ANNOTATIONS_RECEIVED:   'ANNOTATIONS_RECEIVED',
  CHANGES_APPLIED:        'CHANGES_APPLIED',
  REJECTED_ANNOTATIONS:   'REJECTED_ANNOTATIONS',
  UPDATED_PLAN:           'UPDATED_PLAN',
  REMAINING_OPEN_ITEMS:   'REMAINING_OPEN_ITEMS',

  // ── Implement ──
  IMPLEMENTATION_PROMPT:  'IMPLEMENTATION_PROMPT',
  EXECUTION_CHECKLIST:    'EXECUTION_CHECKLIST',
  COMPLETION_CRITERIA:    'COMPLETION_CRITERIA',
  AGENT_INSTRUCTIONS:     'AGENT_INSTRUCTIONS',

  // ── Verify ──
  VERIFICATION_PROMPT:    'VERIFICATION_PROMPT',
  CHECKLIST:              'CHECKLIST',
  EVIDENCE_REQUIRED:      'EVIDENCE_REQUIRED',
  FAILURE_HANDLING:       'FAILURE_HANDLING',

  // ── Solidify ──
  REUSABLE_RULES:         'REUSABLE_RULES',
  MEMORY_SUMMARY:         'MEMORY_SUMMARY',
  AGENT_RULE_SUGGESTIONS: 'AGENT_RULE_SUGGESTIONS',
  LESSONS_LEARNED:        'LESSONS_LEARNED',

  // ── Compression ──
  CONFIRMED_GOALS:        'CONFIRMED_GOALS',
  CONFIRMED_CONSTRAINTS:  'CONFIRMED_CONSTRAINTS',
  ACCEPTED_DECISIONS:     'ACCEPTED_DECISIONS',
  REJECTED_OPTIONS:       'REJECTED_OPTIONS',
  OPEN_QUESTIONS:         'OPEN_QUESTIONS',
  RISKS_AND_WATCHOUTS:    'RISKS_AND_WATCHOUTS',
  CURRENT_STAGE:          'CURRENT_STAGE',
  NEXT_BEST_PROMPT:       'NEXT_BEST_PROMPT',
} as const;
```

**Heading format in prompts:** All templates instruct the model to output headings as `## HEADING_NAME` (markdown H2 + uppercase). The output parser matches on this pattern as its primary strategy.

### 4.6 Full Template Registry — All 14 Templates

Each template is shown with its complete contract structure. Exemplar templates are shown in full detail; remaining templates follow the same structure with a condensed specification.

---

#### Exemplar 1: `task:workflow_generation` (Full Detail)

```typescript
{
  id: 'task:workflow_generation',
  layer: 'task',
  purpose: 'Generate complete 8-stage workflow from user requirement.',

  requiredInputs: [
    { name: 'userRequirement', type: 'string', required: true, description: 'Raw user need' },
    { name: 'taskType', type: 'string', required: true, description: 'coding|research|mixed|discussion' },
    { name: 'agentTarget', type: 'string', required: true, description: 'Target agent name' },
    { name: 'hasCodebase', type: 'string', required: true, description: 'true|false' },
  ],
  optionalInputs: [],

  // Layer 2
  taskContract: 'You are generating a complete 8-stage workflow. Each stage must have: name, purpose, recommended prompt, low-cost prompt, expected artifacts. Do NOT skip any stage. Do NOT merge stages.',

  // Layer 3 (not stage-specific for task-type templates; uses a generic)
  stageContract: '',

  // Layer 4
  outputContract: {
    requiredSections: [
      { key: 'GOAL',              heading: 'GOAL',              fieldType: 'single_line',  description: '1-2 sentence goal.', missingBehavior: 'reject' },
      { key: 'CONTEXT',           heading: 'CONTEXT',           fieldType: 'paragraph',    description: 'Relevant background.', missingBehavior: 'warn' },
      { key: 'ASSUMPTIONS',       heading: 'ASSUMPTIONS',       fieldType: 'bullet_list',  description: 'Assumptions made.', missingBehavior: 'fill_default', defaultValue: '- None stated' },
      { key: 'WORKFLOW_STAGES',   heading: 'WORKFLOW_STAGES',   fieldType: 'numbered_list', description: '8 stages, each with sub-fields.', missingBehavior: 'reject' },
      { key: 'SUGGESTED_FIRST_STEP', heading: 'SUGGESTED_FIRST_STEP', fieldType: 'single_line', description: 'What user should do first.', missingBehavior: 'fill_default', defaultValue: 'Start with the Requirement stage.' },
    ],
    optionalSections: [
      { key: 'RISKS',         heading: 'RISKS',         fieldType: 'bullet_list', description: 'Potential risks.', missingBehavior: 'skip' },
      { key: 'PREREQUISITES', heading: 'PREREQUISITES', fieldType: 'bullet_list', description: 'Pre-work needed.', missingBehavior: 'skip' },
    ],
    sectionOrder: ['GOAL', 'CONTEXT', 'ASSUMPTIONS', 'WORKFLOW_STAGES', 'SUGGESTED_FIRST_STEP', 'RISKS', 'PREREQUISITES'],
    skeletonExample: `## GOAL\n[1-2 sentence goal]\n\n## CONTEXT\n[Background paragraph]\n\n## ASSUMPTIONS\n- [assumption 1]\n- [assumption 2]\n\n## WORKFLOW_STAGES\n### Stage 1: Requirement\n- Purpose: [purpose]\n- Prompt: [recommended prompt]\n- Low-cost prompt: [shorter prompt]\n- Artifacts: [expected outputs]\n\n### Stage 2: Research\n...\n\n## SUGGESTED_FIRST_STEP\n[What to do first]`,
  },

  // Layer 5
  failureContract: {
    minAcceptableSections: 3,
    onPartialOutput: 'attempt_repair',
    onMalformedOutput: 'downgrade_and_retry',
    onEmptyOutput: 'retry_once',
    maxRepairAttempts: 1,
    criticalSections: ['GOAL', 'WORKFLOW_STAGES'],
  },

  // Layer 6
  repairContract: {
    selfCheckInstruction: 'Before finishing, verify your output contains: ## GOAL, ## WORKFLOW_STAGES with all 8 stages, ## SUGGESTED_FIRST_STEP. If any are missing, add them now.',
    missingSectionRepair: 'The output is missing these sections: {missingSections}. Output ONLY the missing sections using the exact headings listed. Do not repeat existing sections.',
    invalidHeadingRepair: 'Reformat the output using EXACTLY these headings: ## GOAL, ## CONTEXT, ## ASSUMPTIONS, ## WORKFLOW_STAGES, ## SUGGESTED_FIRST_STEP. Keep all content.',
    proseToStructureRepair: 'The output was plain text. Reformat it into sections using these headings: ## GOAL, ## CONTEXT, ## ASSUMPTIONS, ## WORKFLOW_STAGES, ## SUGGESTED_FIRST_STEP.',
    trimToSchemaRepair: 'Remove any content that does not belong under these headings: GOAL, CONTEXT, ASSUMPTIONS, WORKFLOW_STAGES, SUGGESTED_FIRST_STEP, RISKS, PREREQUISITES.',
  },

  // Layer 7
  variantContract: {
    standard: {
      promptText: '...full prompt with all details...',
      tokenBudget: 600,
      includeSkeleton: true,
      includedSections: ['GOAL', 'CONTEXT', 'ASSUMPTIONS', 'WORKFLOW_STAGES', 'SUGGESTED_FIRST_STEP', 'RISKS', 'PREREQUISITES'],
      additionalConstraints: ['Do NOT skip any workflow stage.'],
    },
    strict: {
      promptText: '...adds per-stage validation criteria...',
      tokenBudget: 750,
      includeSkeleton: true,
      includedSections: ['GOAL', 'CONTEXT', 'ASSUMPTIONS', 'WORKFLOW_STAGES', 'SUGGESTED_FIRST_STEP', 'RISKS', 'PREREQUISITES'],
      additionalConstraints: ['Do NOT skip any workflow stage.', 'Each stage MUST have exactly 4 sub-fields: Purpose, Prompt, Low-cost prompt, Artifacts.', 'Do NOT use vague language.'],
    },
    lowCost: {
      promptText: '...skeleton only, 1 prompt variant per stage...',
      tokenBudget: 300,
      includeSkeleton: false,
      includedSections: ['GOAL', 'WORKFLOW_STAGES', 'SUGGESTED_FIRST_STEP'],
      additionalConstraints: ['Keep each stage description to 1 sentence.'],
    },
    minimal: {
      promptText: 'Generate an 8-stage workflow for this task. Output under these headings: ## GOAL, ## WORKFLOW_STAGES (list 8 stages with 1-sentence purpose each), ## SUGGESTED_FIRST_STEP.',
      tokenBudget: 80,
      includeSkeleton: false,
      includedSections: ['GOAL', 'WORKFLOW_STAGES', 'SUGGESTED_FIRST_STEP'],
      additionalConstraints: [],
    },
  },

  // Weak-model spec (TYPED)
  weakModelSpec: {
    maxInstructionWords: 20,
    requiredNegativeConstraints: [
      'Do NOT skip any of the 8 stages.',
      'Do NOT merge stages together.',
      'Do NOT reference earlier sections with "see above."',
    ],
    extractionFields: [
      { label: 'Goal', format: 'The goal is: [___].', section: 'GOAL' },
      { label: 'First step', format: 'The suggested first step is: [___].', section: 'SUGGESTED_FIRST_STEP' },
    ],
    bannedPhrases: ['feel free', 'you might want to', 'consider', 'optionally', 'as appropriate'],
    minimalExecutableTemplate: 'Generate an 8-stage workflow. Stages: Requirement, Research, Discussion, Plan, Annotation Loop, Implement, Verify, Solidify. For each stage write: name, purpose (1 sentence), prompt (1 paragraph). Output under heading ## WORKFLOW_STAGES.',
    fewShotSkeleton: '## GOAL\n[goal here]\n\n## WORKFLOW_STAGES\n### Stage 1: Requirement\n- Purpose: [purpose]\n- Prompt: [prompt]\n...',
    fieldPreference: 'extraction',
  },

  // Validation gates
  gates: {
    validateOutputStructure: {
      headingMatchStrategy: 'uppercase_exact',
      minSectionsForPartial: 3,
      requireCriticalSections: true,
    },
    repairOutput: {
      repairStrategies: ['missing_section_repair', 'prose_to_structure', 'trim_to_schema'],
      maxAttempts: 1,
      alwaysUsStrictVariant: true,
    },
    fallbackVariant: {
      chain: ['standard', 'strict', 'lowCost', 'minimal'],
      autoDowngradeOnFailure: true,
    },
  },
}
```

---

#### Exemplar 2: `task:memory_compression` (Full Detail)

```typescript
{
  id: 'task:memory_compression',
  layer: 'task',
  purpose: 'Compress conversation history into structured high-value summary.',

  requiredInputs: [
    { name: 'messages', type: 'messages', required: true, description: 'Messages to compress' },
    { name: 'existingPinnedFacts', type: 'pinned_facts', required: true, description: 'Current pinned facts (do not restate)' },
  ],
  optionalInputs: [
    { name: 'existingRollingSummary', type: 'string', required: false, description: 'Previous rolling summary to merge' },
  ],

  taskContract: 'You are compressing conversation history. EXTRACT key facts verbatim. Do NOT paraphrase unless original exceeds 2 sentences. Do NOT restate pinned facts. Do NOT add information not present in the conversation.',

  stageContract: '',

  outputContract: {
    requiredSections: [
      { key: 'CONFIRMED_GOALS',       heading: 'CONFIRMED_GOALS',       fieldType: 'bullet_list',    description: 'Goals explicitly stated.', missingBehavior: 'reject' },
      { key: 'CONFIRMED_CONSTRAINTS',  heading: 'CONFIRMED_CONSTRAINTS',  fieldType: 'bullet_list',    description: 'Constraints explicitly stated.', missingBehavior: 'reject' },
      { key: 'ACCEPTED_DECISIONS',     heading: 'ACCEPTED_DECISIONS',     fieldType: 'key_value_pairs', description: 'Decision: Rationale pairs.', missingBehavior: 'reject' },
      { key: 'REJECTED_OPTIONS',       heading: 'REJECTED_OPTIONS',       fieldType: 'key_value_pairs', description: 'Option: Rejection reason pairs.', missingBehavior: 'fill_default', defaultValue: '- None' },
      { key: 'OPEN_QUESTIONS',         heading: 'OPEN_QUESTIONS',         fieldType: 'bullet_list',    description: 'Unresolved questions.', missingBehavior: 'fill_default', defaultValue: '- None' },
      { key: 'RISKS_AND_WATCHOUTS',    heading: 'RISKS_AND_WATCHOUTS',    fieldType: 'bullet_list',    description: 'Known risks.', missingBehavior: 'fill_default', defaultValue: '- None identified' },
      { key: 'CURRENT_STAGE',          heading: 'CURRENT_STAGE',          fieldType: 'single_line',    description: 'Current workflow stage.', missingBehavior: 'fill_default', defaultValue: 'Unknown' },
      { key: 'NEXT_BEST_PROMPT',       heading: 'NEXT_BEST_PROMPT',       fieldType: 'paragraph',      description: 'Suggested next prompt.', missingBehavior: 'warn' },
    ],
    optionalSections: [
      { key: 'SUGGESTED_PINNED_FACTS', heading: 'SUGGESTED_PINNED_FACTS', fieldType: 'bullet_list', description: 'Facts worth pinning.', missingBehavior: 'skip' },
    ],
    sectionOrder: ['CONFIRMED_GOALS', 'CONFIRMED_CONSTRAINTS', 'ACCEPTED_DECISIONS', 'REJECTED_OPTIONS', 'OPEN_QUESTIONS', 'RISKS_AND_WATCHOUTS', 'CURRENT_STAGE', 'NEXT_BEST_PROMPT'],
    skeletonExample: '## CONFIRMED_GOALS\n- [goal]\n\n## CONFIRMED_CONSTRAINTS\n- [constraint]\n\n## ACCEPTED_DECISIONS\n- [decision]: [rationale]\n\n## REJECTED_OPTIONS\n- [option]: [reason]\n\n## OPEN_QUESTIONS\n- [question]\n\n## RISKS_AND_WATCHOUTS\n- [risk]\n\n## CURRENT_STAGE\n[stage name]\n\n## NEXT_BEST_PROMPT\n[suggested prompt]',
  },

  failureContract: {
    minAcceptableSections: 3,
    onPartialOutput: 'attempt_repair',
    onMalformedOutput: 'attempt_repair',
    onEmptyOutput: 'retry_once',
    maxRepairAttempts: 1,
    criticalSections: ['CONFIRMED_GOALS', 'CONFIRMED_CONSTRAINTS', 'ACCEPTED_DECISIONS'],
  },

  repairContract: {
    selfCheckInstruction: 'Before finishing, verify: ## CONFIRMED_GOALS, ## CONFIRMED_CONSTRAINTS, ## ACCEPTED_DECISIONS are all present. If any section is empty, write "- None confirmed" rather than omitting it.',
    missingSectionRepair: 'Output is missing: {missingSections}. Produce ONLY these sections. Use exact headings. Extract from the conversation — do not invent.',
    invalidHeadingRepair: 'Reformat using EXACTLY these headings: ## CONFIRMED_GOALS, ## CONFIRMED_CONSTRAINTS, ## ACCEPTED_DECISIONS, ## REJECTED_OPTIONS, ## OPEN_QUESTIONS, ## RISKS_AND_WATCHOUTS, ## CURRENT_STAGE, ## NEXT_BEST_PROMPT.',
    proseToStructureRepair: 'Your output was narrative text. Reformat into the required sections. Each section must start with ## HEADING_NAME. Use bullet lists, not paragraphs.',
    trimToSchemaRepair: 'Remove all content that does not belong under the required headings. Keep only extracted facts.',
  },

  variantContract: {
    standard: {
      promptText: '...',
      tokenBudget: 500,
      includeSkeleton: true,
      includedSections: ['CONFIRMED_GOALS', 'CONFIRMED_CONSTRAINTS', 'ACCEPTED_DECISIONS', 'REJECTED_OPTIONS', 'OPEN_QUESTIONS', 'RISKS_AND_WATCHOUTS', 'CURRENT_STAGE', 'NEXT_BEST_PROMPT'],
      additionalConstraints: ['Do NOT paraphrase pinned facts.', 'Do NOT add information not in the conversation.'],
    },
    strict: {
      promptText: '...',
      tokenBudget: 600,
      includeSkeleton: true,
      includedSections: ['CONFIRMED_GOALS', 'CONFIRMED_CONSTRAINTS', 'ACCEPTED_DECISIONS', 'REJECTED_OPTIONS', 'OPEN_QUESTIONS', 'RISKS_AND_WATCHOUTS', 'CURRENT_STAGE', 'NEXT_BEST_PROMPT'],
      additionalConstraints: ['Do NOT paraphrase pinned facts.', 'Each decision MUST cite which message it came from.', 'If a section is empty, write "- None" — do NOT omit the heading.'],
    },
    lowCost: {
      promptText: '...',
      tokenBudget: 250,
      includeSkeleton: false,
      includedSections: ['CONFIRMED_GOALS', 'CONFIRMED_CONSTRAINTS', 'ACCEPTED_DECISIONS'],
      additionalConstraints: ['3 sections only.'],
    },
    minimal: {
      promptText: 'Extract from the conversation: goals, constraints, and decisions. Output under: ## CONFIRMED_GOALS, ## CONFIRMED_CONSTRAINTS, ## ACCEPTED_DECISIONS. Use bullet lists.',
      tokenBudget: 60,
      includeSkeleton: false,
      includedSections: ['CONFIRMED_GOALS', 'CONFIRMED_CONSTRAINTS', 'ACCEPTED_DECISIONS'],
      additionalConstraints: [],
    },
  },

  weakModelSpec: {
    maxInstructionWords: 15,
    requiredNegativeConstraints: [
      'Do NOT summarize in your own words. Copy facts verbatim.',
      'Do NOT add goals or constraints not stated in the conversation.',
      'Do NOT restate information already in pinned facts.',
    ],
    extractionFields: [
      { label: 'Current stage', format: 'Current stage: [___]', section: 'CURRENT_STAGE' },
    ],
    bannedPhrases: ['in summary', 'overall', 'to summarize', 'in conclusion', 'feel free'],
    minimalExecutableTemplate: 'Read the conversation. List goals, constraints, decisions as bullet points under headings ## CONFIRMED_GOALS, ## CONFIRMED_CONSTRAINTS, ## ACCEPTED_DECISIONS. Copy exact wording.',
    fewShotSkeleton: '## CONFIRMED_GOALS\n- Build auth module with OAuth2\n\n## CONFIRMED_CONSTRAINTS\n- No new dependencies\n- Must use existing Express setup\n\n## ACCEPTED_DECISIONS\n- Use passport.js: Mature library with OAuth2 support',
    fieldPreference: 'extraction',
  },

  gates: {
    validateOutputStructure: {
      headingMatchStrategy: 'uppercase_exact',
      minSectionsForPartial: 3,
      requireCriticalSections: true,
    },
    repairOutput: {
      repairStrategies: ['missing_section_repair', 'prose_to_structure', 'weak_model_shorten'],
      maxAttempts: 1,
      alwaysUsStrictVariant: true,
    },
    fallbackVariant: {
      chain: ['standard', 'lowCost', 'minimal'],
      autoDowngradeOnFailure: true,
    },
  },
}
```

---

#### Remaining 12 Templates — Condensed Specifications

Each follows the exact same `PromptTemplateSpec` structure. Key differentiating fields:

**Task-Type Templates:**

| Template | Critical Sections | Missing Behavior | Downgrade Chain | Minimal Template Summary |
|---|---|---|---|---|
| `task:prompt_refinement` | `FINAL_PROMPT`, `CHEAPER_VARIANT` | reject if FINAL_PROMPT missing; warn for DIAGNOSIS | standard → strict → lowCost → minimal | "Rewrite this prompt. Output under ## FINAL_PROMPT and ## CHEAPER_VARIANT." |
| `task:discussion_guidance` | `CANDIDATE_APPROACHES`, `RECOMMENDED_DIRECTION` | reject if <2 candidates; repair if prose | standard → strict → lowCost → minimal | "List 2+ approaches with pros/cons. Output under ## CANDIDATE_APPROACHES, ## RECOMMENDED_DIRECTION." |
| `task:plan_generation` | `STEP_BY_STEP_PLAN`, `GOAL` | reject if STEP_BY_STEP_PLAN missing | standard → strict → lowCost → minimal | "Create numbered step plan. Output under ## GOAL, ## STEP_BY_STEP_PLAN, ## FILES_TO_MODIFY." |
| `task:verification_generation` | `CHECKLIST`, `VERIFICATION_PROMPT` | warn_and_use for partial | standard → lowCost → minimal | "Generate yes/no checklist. Output under ## CHECKLIST, ## VERIFICATION_PROMPT." |

**Stage Templates:**

| Template | Critical Sections | Key Extraction Fields | Missing → Default | Minimal Template Summary |
|---|---|---|---|---|
| `stage:requirement` | `OBJECTIVE`, `MUST_HAVE` | "The objective is: [___]." | NICE_TO_HAVE → "- None stated" | "Extract: objective, must-haves, constraints, unknowns. Use headings ## OBJECTIVE, ## MUST_HAVE, ## KNOWN_CONSTRAINTS, ## UNKNOWN_QUESTIONS." |
| `stage:research` | `EXISTING_CONTEXT`, `RESEARCH_SUMMARY` | Label findings as [FACT]/[INFERENCE]/[UNCERTAIN] | GAPS → "- None identified" | "List what exists. Label each as [FACT] or [INFERENCE]. Output under ## EXISTING_CONTEXT, ## RESEARCH_SUMMARY." |
| `stage:discussion` | `CANDIDATE_APPROACHES`, `RECOMMENDED_DIRECTION` | "I recommend [___] because [___]." | WHAT_REMAINS_OPEN → "- None" | "Compare 2+ approaches. For each: name, pros, cons. Output under ## CANDIDATE_APPROACHES, ## RECOMMENDED_DIRECTION." |
| `stage:plan` | `STEP_BY_STEP_PLAN`, `FILES_TO_MODIFY` | Steps must be numbered | CODE_SKETCHES → skip | "Create numbered plan. List files. Output under ## STEP_BY_STEP_PLAN, ## FILES_TO_MODIFY." |
| `stage:annotation_loop` | `CHANGES_APPLIED`, `UPDATED_PLAN` | "Annotation: [___] → Action: [___]" | REJECTED_ANNOTATIONS → "- None" | "Process each annotation. Output ## CHANGES_APPLIED, ## UPDATED_PLAN." |
| `stage:implement` | `IMPLEMENTATION_PROMPT` | Prompt must be self-contained | AGENT_INSTRUCTIONS → fill from agentTarget | "Convert plan to executable prompt. Output under ## IMPLEMENTATION_PROMPT. Include all context inline." |
| `stage:verify` | `CHECKLIST` | Each item is yes/no | FAILURE_HANDLING → "Retry failed checks" | "Create yes/no verification checklist. Output under ## CHECKLIST, ## EVIDENCE_REQUIRED." |
| `stage:solidify` | `REUSABLE_RULES` | Format: "ALWAYS/NEVER/PREFER + action." | LESSONS_LEARNED → skip | "Extract rules from this session. Format: ALWAYS/NEVER/PREFER + action. Output under ## REUSABLE_RULES." |

**All 12 share these defaults unless overridden:**
- `failureContract.maxRepairAttempts`: 1
- `failureContract.onEmptyOutput`: 'retry_once'
- `gates.validateOutputStructure.headingMatchStrategy`: 'uppercase_exact'
- `gates.repairOutput.alwaysUsStrictVariant`: true
- `gates.fallbackVariant.autoDowngradeOnFailure`: true
- `weakModelSpec.fieldPreference`: 'extraction'
- `weakModelSpec.maxInstructionWords`: 20

### 4.7 Context Composition API

```typescript
interface PromptCompositionInput {
  templateId: PromptTemplateId;
  variant: PromptVariant;
  pinnedFacts: PinnedFact[];
  sessionMeta: { title: string; goal: string; agentTarget: string };
  currentArtifact?: Artifact;
  rollingSummary?: string;
  recentMessages: Message[];
  userInput: string;
}

function composeContext(input: PromptCompositionInput): ChatMessage[] {
  const spec = getTemplate(input.templateId);
  const variantSpec = spec.variantContract[input.variant];

  // Assemble 7 layers into system message
  const systemContent = [
    getBehaviorContract(),                                    // Layer 1
    spec.taskContract,                                        // Layer 2
    spec.stageContract,                                       // Layer 3
    renderOutputContract(spec.outputContract, variantSpec),    // Layer 4
    renderFailureContract(spec.failureContract),               // Layer 5
    spec.repairContract.selfCheckInstruction,                  // Layer 6
    renderVariantContract(variantSpec),                         // Layer 7
  ].filter(Boolean).join('\n\n---\n\n');

  return [
    { role: 'system', content: systemContent },
    { role: 'system', content: formatPinnedFacts(input.pinnedFacts) },
    { role: 'system', content: formatSessionMeta(input.sessionMeta) },
    ...(input.currentArtifact
      ? [{ role: 'system', content: formatArtifact(input.currentArtifact) }]
      : []),
    ...(input.rollingSummary
      ? [{ role: 'system', content: `<rolling_summary>\n${input.rollingSummary}\n</rolling_summary>` }]
      : []),
    ...input.recentMessages.map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: input.userInput },
  ];
}
```

### 4.8 Behavior Contract (Layer 1 — Singleton)

Always included. Defines Promptor's AI identity and system-wide rules:

> You are Promptor's internal Prompt Architect, Workflow Designer, and Context Compressor.
> Your job is to transform fuzzy user needs into clear, structured, low-ambiguity prompts and workflow artifacts.

**System-wide extraction-first principle (embedded in Layer 1):**
1. When given existing text, EXTRACT and COPY — do not paraphrase.
2. When given a question, provide a FILL-IN-THE-BLANK answer, not an essay.
3. When given choices, output a STRUCTURED COMPARISON, not a narrative discussion.
4. When asked to summarize, output LABELED FIELDS, not paragraphs.
5. Separate [FACT] from [INFERENCE] from [UNCERTAIN] in all outputs.
6. Never expand scope beyond the current request.
7. Use the EXACT section headings provided. Do not rename them.
8. If a section is empty, write "- None" under the heading. Do not omit the heading.

---

## 4B. Repair Template Catalog & Validation Pipeline

### 4B.1 Five Canonical Repair Templates

Stored in `repair-templates.ts`. Each is a short, self-contained follow-up prompt.

**1. `missing_section_repair`**
```
Your previous output is missing these required sections: {missingSections}.

Output ONLY the missing sections. Use these EXACT headings:
{missingHeadingsFormatted}

Do not repeat sections already provided. Do not add commentary.
```

**2. `invalid_heading_repair`**
```
Your output used incorrect headings. Reformat your ENTIRE output using EXACTLY these headings in this order:
{expectedHeadingsFormatted}

Keep all content. Only change the headings.
```

**3. `prose_to_structure`**
```
Your output was plain text without section headings. Restructure it using these headings:
{expectedHeadingsFormatted}

Each section must start on a new line with ## HEADING_NAME.
Use bullet lists, not paragraphs.
Do not add new information. Only reorganize.
```

**4. `trim_to_schema`**
```
Your output contains content outside the expected sections. Remove all content that does not belong under these headings:
{expectedHeadingsFormatted}

Output only the trimmed version. Do not add commentary.
```

**5. `weak_model_shorten`**
```
Your output was too long or complex. Simplify to the minimum:
{minimalExpectedHeadings}

For each section, use at most 2 bullet points. Total output must be under {maxTokens} tokens.
```

### 4B.2 Validation Pipeline

When the LLM returns a response, it passes through a deterministic validation pipeline:

```
LLM returns raw output
        │
        ▼
Step 1: validateOutputStructure(raw, spec.outputContract, spec.gates.validateOutputStructure)
        │
        ├─ ALL required sections found ─────────► status: COMPLETE → use as-is
        │
        ├─ ≥ minSectionsForPartial found ───────► status: PARTIAL
        │       │
        │       ├─ critical sections present? ──► Yes → warn_and_use (show with banners for missing)
        │       │
        │       └─ critical sections missing? ──► attempt_repair (go to Step 2)
        │
        └─ < minSectionsForPartial found ───────► status: UNUSABLE (go to Step 2)
                │
                └─ is output entirely prose? ──► attempt prose_to_structure first
                └─ is output empty? ──► check failureContract.onEmptyOutput

Step 2: repairOutput(raw, spec, spec.gates.repairOutput)
        │
        ├─ Select repair strategy from ordered list in gates.repairOutput.repairStrategies
        ├─ Send repair prompt to LLM (always strict variant)
        ├─ Validate repaired output (recurse Step 1, but maxAttempts enforced)
        │
        ├─ Repair succeeded ─────────► PARTIAL or COMPLETE → use repaired
        │
        └─ Repair failed or maxAttempts reached
                │
                ▼
Step 3: fallbackVariant(currentVariant, spec.gates.fallbackVariant)
        │
        ├─ autoDowngradeOnFailure = true?
        │       │
        │       ├─ Next variant in chain exists? ──► Retry entire request with downgraded variant
        │       │       (e.g. standard → strict → lowCost → minimal)
        │       │
        │       └─ Already at 'minimal'? ──► Show raw output with warning
        │
        └─ autoDowngradeOnFailure = false? ──► Show raw output with warning
                                               [Retry] [Copy Raw] [Downgrade Manually]
```

### 4B.3 Automated Template Validation (Build-Time Tests)

`prompt-registry.test.ts` validates all 14 templates:

```typescript
describe('Prompt Registry — 7-Layer Contract Validation', () => {
  for (const [id, spec] of PROMPT_REGISTRY) {
    describe(id, () => {
      // Identity
      it('has unique id matching registry key');
      it('has non-empty purpose under 200 chars');
      it('has at least 1 required input');

      // Output contract (Layer 4)
      it('has at least 2 required output sections');
      it('all headings are UPPERCASE_UNDERSCORED');
      it('all headings exist in HEADINGS constant');
      it('sectionOrder includes all required section keys');
      it('skeletonExample contains all required headings');
      it('every section has a defined missingBehavior');
      it('sections with missingBehavior "fill_default" have a defaultValue');

      // Failure contract (Layer 5)
      it('minAcceptableSections > 0 and ≤ requiredSections.length');
      it('criticalSections is a subset of requiredSection keys');
      it('maxRepairAttempts ≤ 2');

      // Repair contract (Layer 6)
      it('selfCheckInstruction is non-empty');
      it('missingSectionRepair contains {missingSections} placeholder');
      it('all repair prompts are non-empty');

      // Variant contract (Layer 7)
      it('all 4 variants are defined: standard, strict, lowCost, minimal');
      it('minimal.tokenBudget ≤ 100');
      it('lowCost.tokenBudget ≤ 60% of standard.tokenBudget');
      it('minimal.includedSections is a subset of lowCost.includedSections');
      it('no variant promptText contains banned phrases');

      // Weak-model spec
      it('weakModelSpec.maxInstructionWords ≤ 25');
      it('weakModelSpec.requiredNegativeConstraints has ≥ 1 entry');
      it('weakModelSpec.minimalExecutableTemplate is non-empty and ≤ 150 tokens');
      it('weakModelSpec.fewShotSkeleton contains at least 1 required heading');
      it('weakModelSpec.fieldPreference is "extraction"');
      it('weakModelSpec.bannedPhrases has ≥ 3 entries');
      it('weakModelSpec.extractionFields reference valid section keys');

      // Validation gates
      it('gates.repairOutput.repairStrategies is non-empty');
      it('gates.fallbackVariant.chain starts with "standard" and ends with "minimal"');
      it('gates.fallbackVariant.chain has no duplicates');
    });
  }
});
```

### 4B.4 Template Quality Rubric (Manual Review)

| Dimension | Standard | Strict | Low-Cost | Minimal |
|---|---|---|---|---|
| All instructions ≤ 20 words each | Required | Required | Required | Required |
| Every output section has UPPERCASE heading | Required | Required | Required | Required |
| Skeleton example included | Required | Required | — | — |
| Negative constraints ("Do NOT...") count | ≥1 | ≥3 | ≥1 | 0 (too short) |
| Self-check instruction embedded | ✓ | ✓ | ✓ | — |
| Token budget measured and recorded | ✓ | ✓ | ✓ | ✓ |
| Tested with weak model (GPT-3.5-turbo level) | ✓ | ✓ | ✓ | ✓ |
| Output parses with `uppercase_exact` strategy | ✓ | ✓ | ✓ | ✓ |
| Repair pipeline tested (inject missing section) | ✓ | ✓ | — | — |
| Downgrade chain tested (standard → minimal) | ✓ | — | — | — |

---

## 5. LLM Client Design

### 5.1 Module Structure

```
src/lib/llm/
  ├── index.ts          // Public API exports
  ├── client.ts         // Core sendChatCompletion, streamChatCompletion
  ├── message-builder.ts // buildMessages helper
  ├── connection.ts     // testConnection
  ├── errors.ts         // Error normalization and user-facing messages
  ├── stream-parser.ts  // SSE stream parser utility
  └── types.ts          // Request/response types
```

### 5.2 Core API

```typescript
interface LLMConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
  timeout?: number;     // ms, default 60000
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatCompletionResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  finishReason: string;
}

// Non-streaming
async function sendChatCompletion(
  messages: ChatMessage[],
  config: LLMConfig
): Promise<ChatCompletionResponse>;

// Streaming
async function streamChatCompletion(
  messages: ChatMessage[],
  config: LLMConfig,
  onChunk: (text: string) => void,
  onDone: (fullResponse: ChatCompletionResponse) => void,
  onError: (error: LLMError) => void
): Promise<AbortController>;

// Connection test
async function testConnection(config: LLMConfig): Promise<{
  success: boolean;
  model: string;
  error?: string;
}>;
```

### 5.3 Error Handling

```typescript
type LLMErrorCode =
  | 'AUTH_FAILED'        // 401
  | 'FORBIDDEN'          // 403
  | 'MODEL_NOT_FOUND'    // 404
  | 'RATE_LIMITED'       // 429
  | 'SERVER_ERROR'       // 5xx
  | 'CORS_BLOCKED'
  | 'TIMEOUT'
  | 'NETWORK_ERROR'
  | 'INVALID_RESPONSE'
  | 'CONFIG_MISSING';

interface LLMError {
  code: LLMErrorCode;
  message: string;        // User-facing message
  suggestion: string;     // Actionable fix suggestion
  raw?: unknown;          // Original error for debug mode
}
```

### 5.4 SSE Stream Parser

A lightweight parser that processes `text/event-stream` responses:

```typescript
async function* parseSSEStream(
  response: Response
): AsyncGenerator<string> {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        if (data === '[DONE]') return;
        const parsed = JSON.parse(data);
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) yield content;
      }
    }
  }
}
```

---

## 6. Memory Compaction Strategy

### 6.1 Token Budget Calculation

```typescript
interface ContextBudget {
  softLimit: number;          // From settings (e.g. 6000)
  hardLimit: number;          // From settings (e.g. 8000)
  systemPresetTokens: number; // Estimated ~800
  pinnedFactsTokens: number;  // Sum of pinned facts estimates
  artifactTokens: number;     // Current stage artifact estimate
  rollingSummaryTokens: number;
  recentMessagesTokens: number;
  currentInputTokens: number;
  totalEstimated: number;     // Sum of above
  remainingBudget: number;    // hardLimit - totalEstimated
  compressionAdvised: boolean;// totalEstimated > softLimit
  compressionRequired: boolean;// totalEstimated > hardLimit
}
```

### 6.2 Compression Algorithm

```
When totalEstimated > softLimit:
  1. Calculate how many tokens to free: overage = totalEstimated - (softLimit * 0.8)
  2. Select oldest messages NOT yet included in any summary
  3. Group them into a batch
  4. Send to LLM with memory_compression preset
  5. Store result as new rolling summary (or append to existing)
  6. Mark source messages as includedInSummary = true
  7. Recalculate budget

When totalEstimated > hardLimit:
  Same as above but mandatory; also:
  - If rolling summary itself is too large, re-compress it
  - Strip all non-critical metadata from context
```

### 6.3 Rolling Summary Merge Rules

Rolling summaries are NOT appended blindly. They follow explicit merge rules:

**Merge algorithm:**

```
function mergeRollingSummary(existing: Summary | null, newCompression: string): string {
  if (!existing) return newCompression;

  // 1. Parse both summaries into structured sections
  //    (goals, constraints, decisions, rejected, open questions, risks)
  // 2. For each section, merge using deduplication rules below
  // 3. Reserialize into a single summary
  // 4. If merged result exceeds rolling summary token budget,
  //    re-compress by sending the merged result through memory_compression
}
```

**Deduplication rules by section:**

| Section | Merge rule |
|---|---|
| ConfirmedGoals | Union. If two goals overlap semantically (same objective, different wording), keep the more recent phrasing. |
| ConfirmedConstraints | Union. Duplicates detected by keyword overlap (>60% token overlap = duplicate). Keep newer. |
| AcceptedDecisions | Append only. Never remove a decision. If a newer decision contradicts an older one, mark older as "superseded by [newer]." |
| RejectedOptions | Append only. Never remove. Dedup by option name. |
| OpenQuestions | Union. If a question was answered in a later decision, remove it from open questions. |
| Risks | Union. Dedup by keyword overlap. |

**Rolling summary token budget:** Capped at 25% of context soft limit. If a merge produces a summary exceeding this, re-compress.

### 6.4 Stage-End Summaries vs. Rolling Summaries

These serve different purposes and must not be conflated.

| Dimension | Rolling Summary | Stage-End Summary |
|---|---|---|
| **Purpose** | Bridge older conversation into current context | Capture the complete conclusion of a finished stage |
| **When created** | Whenever context approaches soft limit | When user advances to the next stage |
| **Mutability** | Replaced/merged on each compression | Immutable once created |
| **Scope** | Covers arbitrary message ranges within a stage | Covers the entire stage |
| **Storage** | `summaries` table, type `rolling` | `summaries` table, type `stage_end` + saved as Artifact |
| **In context assembly** | Included as background context | Included only if current stage depends on it |
| **Survives stage transitions** | Discarded — replaced by the stage-end summary | Persists as artifact, referenced by later stages |

**Stage transition workflow:**
1. User clicks "Advance to Next Stage"
2. System generates a stage-end summary using `task:memory_compression`
3. Stage-end summary is saved as both Summary record and Artifact
4. The rolling summary for the old stage is discarded (its content is subsumed by the stage-end summary)
5. New stage begins with a fresh rolling summary (empty)
6. Previous stage's stage-end artifact is available for context assembly in the new stage

### 6.5 Conflict Resolution: Summaries vs. Pinned Facts

When the same information appears in both a summary and a pinned fact:

| Scenario | Resolution |
|---|---|
| Pinned fact says "use PostgreSQL"; rolling summary says "database choice: PostgreSQL" | **Pinned fact wins.** Duplicate content is stripped from rolling summary during merge. Pinned facts are the canonical source for decisions, constraints, and objectives. |
| Pinned fact says "use PostgreSQL"; rolling summary says "considering MySQL or PostgreSQL" | **No conflict.** The summary reflects historical deliberation; the pinned fact reflects the final decision. Both can coexist, but if token budget is tight, the summary's version is the one to trim. |
| Pinned fact is deleted by user; summary still references it | **Summary is stale but acceptable.** The user's explicit unpin is authoritative. On next compression cycle, the stale reference will be naturally excluded because the compression prompt receives current pinned facts as input. |
| New compression output contradicts a pinned fact | **Pinned fact always wins.** The compression prompt explicitly receives current pinned facts as context and is instructed: "Do not contradict or restate pinned facts. They are authoritative." |

**Implementation rule:** The compression prompt always receives the current pinned facts list as a required input. The prompt instructs: "The following facts are pinned and authoritative. Do not restate them in your summary. Do not contradict them. Your summary covers only information NOT already captured in pinned facts."

### 6.6 Stage Transition Summary

When user moves to a new stage:
1. Generate a `stage_end` summary of the current stage's conversation
2. Save it as both a Summary record and an Artifact (immutable)
3. Discard the current rolling summary (subsumed by stage-end)
4. This artifact can be referenced by later stages without including all raw messages
5. Relevant pinned facts carry forward automatically (they are session-scoped, not stage-scoped)

---

## 6B. Discussion Stage — Productized UX & Data Flow

### 6B.1 Discussion Is Not Chat

The Discussion stage has first-class UX for:
- Presenting candidate approaches
- Comparing tradeoffs
- Accepting one approach as the direction
- Explicitly rejecting alternatives (with reasons saved)
- Producing a decision record that flows forward into Plan

### 6B.2 Discussion Data Model Additions

```typescript
interface CandidateApproach {
  id: string;
  sessionId: string;
  name: string;
  description: string;
  pros: string[];
  cons: string[];
  status: 'proposed' | 'accepted' | 'rejected';
  rejectionReason?: string;
  sourceMessageId: string;   // Which assistant message proposed it
  createdAt: string;
  updatedAt: string;
}
```

This is stored as a sub-structure within Discussion artifacts, not as a separate Dexie table.
The `discussion_notes` artifact contains the raw discussion.
The `decision_record` artifact contains the structured `CandidateApproach[]` plus the final decision rationale.

### 6B.3 Discussion UX Flow

```
Step 1: User enters discussion topic or question
        System responds using stage:discussion template
        → Output includes CandidateApproaches section

Step 2: System parses CandidateApproaches from LLM output
        → Renders as interactive cards in the Stage Panel:

        ┌─ Candidate A: Passport.js ────────────┐
        │ OAuth2 middleware for Express           │
        │ + Mature, large community               │
        │ + Many strategies available              │
        │ - Heavy dependency                       │
        │ - Complex configuration                  │
        │                                          │
        │ [✓ Accept]  [✗ Reject]  [💬 Discuss More]│
        └──────────────────────────────────────────┘

        ┌─ Candidate B: Custom JWT ─────────────┐
        │ Lightweight custom implementation       │
        │ + Full control                           │
        │ + No external dependency                 │
        │ - Security risk if done wrong            │
        │ - More maintenance                       │
        │                                          │
        │ [✓ Accept]  [✗ Reject]  [💬 Discuss More]│
        └──────────────────────────────────────────┘

Step 3: User clicks [Accept] on one approach
        → Confirmation dialog: "Accept 'Passport.js' as the chosen direction?"
        → On confirm:
           a. Accepted approach → pinned fact (category: accepted_decision)
           b. All other approaches → pinned facts (category: rejected_option)
              with auto-populated rejection reason (user can edit)
           c. decision_record artifact is auto-generated and saved

Step 4: User clicks [Reject] on an approach
        → Inline prompt: "Brief reason for rejection:"
        → On submit: approach marked rejected, saved as pinned fact

Step 5: User clicks [Discuss More] on an approach
        → Pre-fills the message input with: "Let's discuss [approach name] further.
           Specifically, I want to understand: [cursor here]"
        → Conversation continues, focused on that approach
        → System may update pros/cons based on new discussion

Step 6: When all approaches are resolved (1 accepted, rest rejected)
        → "Next Action" block updates to:
           "Decision made. Generate decision record and advance to Plan?"
           [Generate Decision Record]  [Advance to Plan]
```

### 6B.4 Discussion → Plan Transition

When the user advances from Discussion to Plan:

1. **Auto-generate `decision_record` artifact** containing:
   - Accepted approach (name, description, rationale)
   - Rejected approaches (name, rejection reason)
   - Open questions that remain
   - Constraints confirmed during discussion

2. **Auto-create pinned facts** (if not already created):
   - `accepted_decision`: The chosen approach
   - `rejected_option`: Each rejected approach (prevents them from resurfacing)
   - `constraint`: Any new constraints identified during discussion

3. **Stage-end summary** generated per §6.4 rules

4. **Plan stage auto-receives**:
   - `decision_record` artifact as required input
   - `research_summary` artifact (from Research stage, if exists)
   - All pinned facts (session-scoped, carry forward automatically)

### 6B.5 Discussion Without Explicit Candidates

If the LLM output doesn't contain parseable candidate approaches (e.g., user is in free-form discussion), the system:
1. Shows the output as normal text in the conversation area
2. Displays a prompt: "No structured approaches detected. You can:"
   - [Extract approaches manually] → opens a form to add candidate cards
   - [Ask for structured comparison] → pre-fills input with "Please compare at least 2 concrete approaches in structured format with pros and cons for each."
   - [Continue discussing] → no action needed

---

## 6C. System-Wide Extraction-First Principle & Section Parser

### 6C.1 Extraction Over Generation — System-Wide Rule

All weak-model optimization rules are now **typed** into each template's `WeakModelSpec` (see §4.4).
All repair logic is now **typed** into each template's `RepairContract` and `ValidationGates` (see §4.4, §4B.2).
All output headings are now **standardized uppercase** from a canonical registry (see §4.5).

This section documents the **system-wide principle** that applies across all templates and all contract layers.

**The extraction-first principle:**

Promptor never asks the LLM "what do you think?" or "summarize in your own words."
Every prompt is structured as an extraction or field-filling task.

| Instead of... | Use... |
|---|---|
| "Summarize the discussion" | "Extract goals, constraints, decisions as bullet points under fixed headings" |
| "What approach do you recommend?" | "I recommend [___] because [___]." |
| "Describe the tradeoffs" | "Fill in this table: Approach \| Pros \| Cons" |
| "Write a verification plan" | "Answer these yes/no questions: [checklist]" |
| "Tell me what you think about X" | "List [FACT], [INFERENCE], and [UNCERTAIN] items about X" |

This principle is enforced through:
1. The Behavior Contract (Layer 1) — always included, states the extraction mandate
2. Each template's `weakModelSpec.fieldPreference` — always set to `'extraction'`
3. Each template's `weakModelSpec.extractionFields` — typed fill-in-blank fields
4. Build-time tests that ban open-ended phrases in all template variants

### 6C.2 Section Extraction Parser

The parser that identifies sections in LLM output uses a 4-strategy approach with priority on the standardized uppercase headings:

```typescript
function extractSections(raw: string, contract: OutputContract): Map<string, string> {
  // Strategy 1 (primary): UPPERCASE_EXACT
  //   Match "## HEADING_NAME" exactly as defined in contract
  //   This is the expected format and should match for compliant models.
  //
  // Strategy 2: UPPERCASE_FUZZY
  //   Match "HEADING_NAME" anywhere on a line (without ##)
  //   Handles models that drop the markdown heading prefix.
  //
  // Strategy 3: CASE_INSENSITIVE
  //   Match heading name case-insensitively, ignoring underscores vs spaces
  //   e.g. "Confirmed Goals" matches CONFIRMED_GOALS
  //
  // Strategy 4: SUBSTRING_MATCH
  //   Match if the heading key appears as a substring in any line
  //   Last resort for very weak models.
  //
  // Selection: Try strategies in order.
  // Use the first strategy that finds ≥50% of expected sections.
  // If no strategy finds ≥50%, fall back to splitting by any markdown heading
  // and fuzzy-matching section names.
}
```

**Why 4 strategies:** Even with UPPERCASE headings and skeleton examples, weak models will sometimes:
- Drop the `##` prefix → Strategy 2 catches this
- Use "Confirmed Goals" instead of "CONFIRMED_GOALS" → Strategy 3 catches this
- Bury the heading inside a sentence → Strategy 4 catches this

The parser always prefers Strategy 1 when it works, which is the target for all compliant models.

---

## 7. Directory Structure

```
promptor-v1/
├── index.html
├── package.json
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
├── vite.config.ts
├── components.json             // shadcn/ui config
├── research.md
├── plan.md
│
├── public/
│   └── favicon.svg
│
├── src/
│   ├── main.tsx                // Entry point
│   ├── App.tsx                 // Router + Layout
│   ├── index.css               // Tailwind imports + CSS variables
│   ├── vite-env.d.ts
│   │
│   ├── components/
│   │   ├── ui/                 // shadcn/ui components (auto-generated)
│   │   │   └── ...
│   │   ├── layout/
│   │   │   ├── AppShell.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── ContextPanel.tsx     // Right panel: budget, facts, artifacts, memory
│   │   │   └── Header.tsx
│   │   ├── common/
│   │   │   ├── CopyButton.tsx
│   │   │   ├── LoadingSpinner.tsx
│   │   │   ├── EmptyState.tsx
│   │   │   ├── ErrorDisplay.tsx
│   │   │   └── MarkdownRenderer.tsx
│   │   └── session/
│   │       ├── StageProgressBar.tsx   // Horizontal stage indicator
│   │       ├── StageHeader.tsx        // Current stage name, goal, status
│   │       ├── StagePromptBlock.tsx   // Copy-ready prompt for current stage
│   │       ├── NextActionBlock.tsx    // Suggested next action
│   │       ├── ArtifactCard.tsx
│   │       ├── PinnedFactItem.tsx
│   │       ├── CandidateCard.tsx      // Discussion candidate approach card
│   │       ├── ContextBudgetBar.tsx
│   │       ├── ConversationThread.tsx // Collapsible message thread (secondary)
│   │       └── MessageInput.tsx
│   │
│   ├── pages/
│   │   ├── SettingsPage.tsx
│   │   ├── WorkflowPage.tsx
│   │   ├── RefinerPage.tsx
│   │   └── SessionPage.tsx
│   │
│   ├── features/
│   │   ├── workflow/
│   │   │   ├── WorkflowBuilder.tsx
│   │   │   ├── StageCard.tsx
│   │   │   └── useWorkflowGeneration.ts
│   │   ├── refiner/
│   │   │   ├── PromptRefiner.tsx
│   │   │   ├── RefinerOutput.tsx
│   │   │   └── usePromptRefinement.ts
│   │   ├── session/
│   │   │   ├── SessionWorkspace.tsx       // Stage-first layout orchestrator
│   │   │   ├── StagePanel.tsx             // Primary: stage header + prompt + artifacts + next action
│   │   │   ├── DiscussionPanel.tsx        // Candidate cards + accept/reject flow
│   │   │   ├── ConversationPanel.tsx      // Collapsible conversation thread
│   │   │   └── useSessionChat.ts
│   │   ├── memory/
│   │   │   ├── useContextBudget.ts
│   │   │   ├── useCompression.ts
│   │   │   ├── contextAssembler.ts
│   │   │   └── summaryMerger.ts           // Rolling summary merge logic
│   │   └── settings/
│   │       ├── SettingsForm.tsx
│   │       └── ConnectionTest.tsx
│   │
│   ├── lib/
│   │   ├── llm/
│   │   │   ├── index.ts
│   │   │   ├── client.ts
│   │   │   ├── stream-parser.ts
│   │   │   ├── errors.ts
│   │   │   └── types.ts
│   │   ├── prompts/
│   │   │   ├── index.ts                   // Public API: composeContext(), getTemplate()
│   │   │   ├── registry.ts               // Central PROMPT_REGISTRY map + lookup
│   │   │   ├── types.ts                  // All 7-layer contract types (§4.4)
│   │   │   ├── heading-constants.ts      // Canonical UPPERCASE heading registry
│   │   │   ├── contracts/
│   │   │   │   ├── behavior-contract.ts  // Layer 1: singleton, always included
│   │   │   │   ├── task-contracts.ts     // Layer 2: per task-type
│   │   │   │   ├── stage-contracts.ts    // Layer 3: per stage
│   │   │   │   ├── output-contracts.ts   // Layer 4: FixedSection[] definitions
│   │   │   │   ├── failure-contracts.ts  // Layer 5: per template
│   │   │   │   ├── repair-contracts.ts   // Layer 6: per template
│   │   │   │   └── variant-contracts.ts  // Layer 7: standard/strict/lowCost/minimal
│   │   │   ├── templates/                // One file per template (assembles all 7 layers)
│   │   │   │   ├── workflow-generation.ts
│   │   │   │   ├── prompt-refinement.ts
│   │   │   │   ├── discussion-guidance.ts
│   │   │   │   ├── plan-generation.ts
│   │   │   │   ├── verification-generation.ts
│   │   │   │   ├── memory-compression.ts
│   │   │   │   ├── stage-requirement.ts
│   │   │   │   ├── stage-research.ts
│   │   │   │   ├── stage-discussion.ts
│   │   │   │   ├── stage-plan.ts
│   │   │   │   ├── stage-annotation-loop.ts
│   │   │   │   ├── stage-implement.ts
│   │   │   │   ├── stage-verify.ts
│   │   │   │   └── stage-solidify.ts
│   │   │   ├── repair-templates.ts       // 5 canonical repair prompts
│   │   │   ├── output-parser.ts          // Section extraction (4-strategy)
│   │   │   └── validation.ts             // Build-time template spec checks
│   │   ├── storage/
│   │   │   ├── db.ts
│   │   │   ├── settings-service.ts
│   │   │   ├── session-service.ts
│   │   │   ├── message-service.ts
│   │   │   ├── artifact-service.ts
│   │   │   ├── pinned-fact-service.ts
│   │   │   └── summary-service.ts
│   │   ├── token-estimation/
│   │   │   └── index.ts
│   │   └── utils/
│   │       ├── clipboard.ts
│   │       ├── date.ts
│   │       └── id.ts
│   │
│   ├── stores/
│   │   └── ui-store.ts
│   │
│   ├── types/
│   │   ├── index.ts
│   │   ├── settings.ts
│   │   ├── session.ts
│   │   ├── message.ts
│   │   ├── artifact.ts
│   │   ├── pinned-fact.ts
│   │   └── summary.ts
│   │
│   └── hooks/
│       ├── useSettings.ts
│       ├── useSession.ts
│       ├── useTheme.ts
│       └── useCopyToClipboard.ts
│
└── tests/
    ├── lib/
    │   ├── prompt-registry.test.ts       // 7-layer contract validation (all 14 templates)
    │   ├── output-parser.test.ts         // 4-strategy section extraction
    │   ├── repair-pipeline.test.ts       // 5 repair templates + downgrade chain
    │   ├── context-assembler.test.ts
    │   ├── summary-merger.test.ts        // Rolling summary merge + dedup
    │   ├── memory-compaction.test.ts
    │   ├── pinned-fact-extraction.test.ts
    │   ├── prompt-refinement.test.ts
    │   ├── token-estimation.test.ts
    │   └── workflow-postprocess.test.ts
    └── setup.ts
```

---

## 8. Phased Implementation Plan

### Phase 0: Project Scaffolding ✅ COMPLETED
**Estimated effort: Small**

- [x] Initialize Vite + React + TypeScript project
- [x] Configure Tailwind CSS v3 + PostCSS
- [x] Set up path aliases (`@/`)
- [x] Set up Dexie database with all 7 tables (including candidateApproaches)
- [x] Set up React Router with 4 routes
- [x] Create AppShell layout (sidebar + main)
- [x] Set up theme system (light/dark/system via CSS variables + Tailwind)
- [x] Set up Vitest for testing

### Phase 1: Core Infrastructure ✅ COMPLETED
**Estimated effort: Medium**

- [x] Implement type definitions for all data models (including CandidateApproach)
- [x] Implement Dexie DB with all tables
- [x] Implement token estimation utility
- [x] Implement LLM client (sendChatCompletion, sendChatCompletionStream, testConnection, error normalization)
- [x] Implement SSE stream parser (integrated in client)
- [x] Implement utility functions (cn, generateId, nowISO)
- [x] Write tests for token estimation

### Phase 2: 7-Layer Prompt Contract System ✅ COMPLETED
**Estimated effort: Large**

- [x] Implement all types from §4.4: `PromptTemplateSpec`, `OutputContract`, `FixedSection`, `FailureContract`, `RepairContract`, `VariantContract`, `WeakModelSpec`, `ValidationGates`
- [x] Implement `heading-constants.ts` — canonical UPPERCASE heading registry
- [x] Implement `behavior-contract.ts` — Layer 1 singleton (extraction-first mandate)
- [x] Implement `PROMPT_REGISTRY` map with lookup API
- [x] Implement all 6 task-type templates, each with all 7 contract layers and 4 variants (standard/strict/lowCost/minimal)
- [x] Implement all 8 stage templates, each with all 7 contract layers and 4 variants
- [x] Implement `repair-templates.ts` — 5 canonical repair prompts
- [x] Implement `output-parser.ts` — 4-strategy section extraction
- [x] Implement validation pipeline: `validateOutputStructure()` → `repairOutput()` → `fallbackVariant()`
- [x] Implement `composeContext()` — 7-layer context assembly function
- [x] Implement context budget calculation
- [x] Write `prompt-registry.test.ts` — 204 tests validating all 14 templates
- [x] Write `output-parser.test.ts` — 14 tests for 4 extraction strategies
- [x] Write `memory-compaction.test.ts` — 8 tests for compression logic
- [x] Write `token-estimation.test.ts` — 5 tests for budget calculation

### Phase 3: Settings Page ✅ COMPLETED
**Estimated effort: Small**

- [x] Build Settings form UI (base URL, API key, model, temperature, max tokens, limits, theme, debug mode)
- [x] Implement persist API key toggle
- [x] Implement auto-save settings
- [x] Implement test connection with result display
- [x] Implement theme switching (light/dark/system)
- [x] Handle all settings-related error states

### Phase 4: Workflow Builder ✅ COMPLETED
**Estimated effort: Medium**

- [x] Build Workflow Builder page UI
- [x] Build requirement input form (text area + task type + agent target + has codebase + variant)
- [x] Implement workflow generation (calls LLM with workflow_generation preset)
- [x] Build stage card components with expandable prompts
- [x] Implement copy-to-clipboard for prompts
- [x] Handle loading, error, and empty states

### Phase 5: Prompt Refiner ✅ COMPLETED
**Estimated effort: Medium**

- [x] Build Prompt Refiner page UI
- [x] Build input form (raw prompt, task type, variant selector)
- [x] Implement prompt refinement (calls LLM with prompt_refinement preset)
- [x] Build output display with sections: Diagnosis, Final Prompt, Cheaper Variant, Assumptions, Suggested Pinned Facts
- [x] Implement copy buttons for each section
- [x] Handle loading, error, and empty states

### Phase 6: Session Workspace (Stage-First Core) ✅ COMPLETED
**Estimated effort: Large**

- [x] Build Session Workspace page — stage-first layout
- [x] Build StageProgressBar — horizontal stage indicator
- [x] Build StageHeader — current stage name, goal, editable title
- [x] Build stage artifacts section (above the fold, prominent)
- [x] Build ConversationPanel — collapsible message thread, positioned below stage content
- [x] Build MessageInput with Ctrl+Enter to send
- [x] Implement session creation from sidebar
- [x] Implement stage selector/switcher + advance stage
- [x] Implement session chat (compose context → stream LLM → parse output → save messages)
- [x] Implement streaming response display
- [x] Implement output parsing with validation pipeline
- [x] Build session sidebar list
- [x] Implement session title editing
- [x] Handle session-level error states

### Phase 7: Discussion Stage, Memory & Artifacts ✅ COMPLETED
**Estimated effort: Large**

- [x] Build DiscussionPanel with CandidateCard components (accept/reject/pros/cons)
- [x] Implement [Accept] flow → pinned fact (accepted_decision)
- [x] Implement [Reject] flow → inline reason → pinned fact (rejected_option)
- [x] Build ContextPanel (right) with: Context Budget, Pinned Facts, All Artifacts
- [x] Implement pinned facts list with add/delete
- [x] Implement artifact list with view (expandable)
- [x] Implement "save as artifact" action
- [x] Implement context budget display bar (tokens, soft/hard limit, compression indicator)
- [x] Implement rolling summary merge logic (dedup, section-aware, budget cap)
- [x] Implement compression decision logic (soft/hard limit, recent window retention)
- [x] Write memory compaction tests (8 tests passing)

### Phase 8: Polish & Integration
**Estimated effort: Medium**

- [ ] Implement responsive layout (sidebar collapse, info panel sheet)
- [ ] Implement keyboard shortcuts (Cmd/Ctrl+Enter to send, Escape to cancel, etc.)
- [ ] Implement empty states for all lists
- [ ] Implement loading skeletons where appropriate
- [ ] Implement toast notifications for copy/save/error actions
- [ ] Implement error boundary for app-level crashes
- [ ] Cross-page integration: Workflow → Session, Refiner → Session
- [ ] Session archive/unarchive
- [ ] Final UI polish pass

### Phase 9: Testing & Validation
**Estimated effort: Small**

- [ ] Run all unit tests; fix failures
- [ ] Manual testing of full workflow: Settings → Workflow → Session → all stages
- [ ] Test with different LLM providers (OpenRouter, Ollama)
- [ ] Test theme switching
- [ ] Test responsive layout
- [ ] Test error scenarios (bad API key, timeout, etc.)
- [ ] Generate validation report

---

## 9. Verification Plan

### 9.1 Unit Tests

| Test Suite | What It Covers |
|---|---|
| `prompt-registry.test.ts` | All 14 templates pass 7-layer contract validation (§4B.3): UPPERCASE headings, 4 variants defined, minimal ≤ 100 tokens, lowCost ≤ 60% of standard, repair contracts complete, weak-model specs typed with extraction fields and banned phrases, downgrade chain valid |
| `output-parser.test.ts` | 4-strategy section extraction (uppercase_exact, uppercase_fuzzy, case_insensitive, substring_match); partial/unusable detection; strategy selection logic |
| `repair-pipeline.test.ts` | Each of 5 repair templates (missing_section, invalid_heading, prose_to_structure, trim_to_schema, weak_model_shorten); repair chaining; maxAttempts enforcement; variant downgrade chain (standard → strict → lowCost → minimal) |
| `context-assembler.test.ts` | Context composition priority, budget enforcement, layer ordering, truncation behavior |
| `summary-merger.test.ts` | Rolling summary merge: dedup by section, append-only for decisions/rejections, open question resolution, budget cap enforcement, re-compression trigger |
| `memory-compaction.test.ts` | Message selection for compression, summary generation, stage transition workflow (discard rolling, create stage-end) |
| `pinned-fact-extraction.test.ts` | Parsing assistant output for pinnable facts; conflict detection with existing facts |
| `prompt-refinement.test.ts` | Refinement pipeline output structure validation |
| `token-estimation.test.ts` | Token count accuracy for various input sizes |
| `workflow-postprocess.test.ts` | Parsing LLM workflow output into structured stage cards |

### 9.2 Manual Testing Checklist

- [ ] Fresh start: app loads with no data; empty states display correctly
- [ ] Settings: save LLM config → test connection → success/failure displayed
- [ ] Theme: switch light → dark → system; all pages render correctly
- [ ] Workflow Builder: enter requirement → generate workflow → 8 stages displayed → copy prompts
- [ ] Prompt Refiner: enter raw prompt → refine → 4 sections displayed → copy each
- [ ] Session workspace: stage-first layout renders — stage header, stage prompt, artifacts, next action are visible above conversation
- [ ] Session conversation: send message → receive LLM response → output parsed into sections → action buttons appear
- [ ] Output repair: trigger partial output → missing section banner appears → click regenerate → repair attempt runs
- [ ] Variant downgrade: force failure on standard → system auto-downgrades to strict → then lowCost → then minimal → verify minimal still produces parseable output
- [ ] Repair templates: test each of 5 repair types — missing section, invalid heading, prose-to-structure, trim-to-schema, weak-model-shorten
- [ ] Discussion flow: LLM returns candidate approaches → candidate cards render → accept one → reject others → decision record created → pinned facts created
- [ ] Discussion fallback: LLM returns unstructured discussion → "No structured approaches" prompt appears → user can extract manually or request structure
- [ ] Discussion → Plan transition: advance stage → decision record artifact generated → rolling summary discarded → Plan stage starts with decision context
- [ ] Pinned facts: pin from output → edit → delete → verify priority ordering → verify facts survive stage transitions
- [ ] Memory: send many messages → budget bar updates → soft limit warning → compress → rolling summary created → budget drops
- [ ] Summary merge: compress twice → verify rolling summary is merged (not duplicated) → decisions append-only → open questions resolved
- [ ] Summary vs. facts: pin a fact → compress → verify summary doesn't restate the pinned fact
- [ ] Stage transition: advance stage → stage-end summary generated → rolling summary discarded → stage-end saved as artifact
- [ ] Cross-flow: generate workflow → use prompt in session
- [ ] Error handling: disconnect network → send message → error displayed with suggestion
- [ ] Weak model: test with a cheap/small model → verify output parsing works with imperfect formatting → repair triggers if needed

---

## 10. Risks & Tradeoffs

### 10.1 Accepted Tradeoffs

| Tradeoff | Decision | Rationale |
|---|---|---|
| Token estimation accuracy | Use `gpt-tokenizer` (~50KB), accept 10-30% error | Exact counting per model is impractical without model-specific tokenizers; approximate is good enough for budget display |
| CORS limitations | Document supported providers; don't build a proxy | A proxy would contradict "no backend"; OpenRouter + local models cover most use cases |
| Template storage | Static TypeScript files, not user-editable | Simpler for MVP; user template editing can be added later |
| Streaming vs. non-streaming | Implement both; default to streaming | Some providers may not support streaming; fallback needed |
| Single LLM config | One active provider at a time | Multi-provider adds complexity without clear MVP value |

### 10.2 Open Risks

| Risk | Likelihood | Impact | Monitoring |
|---|---|---|---|
| Weak model fails to follow output format | Medium | Medium — **mitigated** by 4-strategy parser (§6C.2), 5 repair templates (§4B.1), self-check instruction (Layer 6), and auto-downgrade chain to `minimal` variant (§4B.2) |
| Candidate approach extraction fails for weak models | Medium | Medium | Fallback UX (§6B.5) ensures user can always proceed manually |
| Rolling summary merge produces bloated summaries | Low-Medium | Medium | Budget cap at 25% of soft limit (§6.3); re-compression when exceeded |
| Large workflow generation exceeds model output limit | Low-Medium | Medium | Detect incomplete output; offer to regenerate missing stages |
| IndexedDB blocked in private browsing | Low | High | Detect and show clear message; suggest normal browsing mode |
| SSE parsing edge cases across providers | Medium | Low | Test with multiple providers; make parser lenient |

---

## 11. Engineering Judgments (Additions Beyond Spec)

The following decisions are my engineering additions that go beyond what the spec explicitly requires. Each is flagged for your review:

### 11.1 Architecture Decisions

1. **Zustand for UI-only state, Dexie for all persistence** — The spec mentions both Zustand and Dexie but doesn't specify their relationship. I chose to keep them strictly separated: Dexie owns all persistent data, Zustand owns only transient UI state. This avoids sync complexity.

2. **`useLiveQuery()` as the primary read pattern** — Instead of caching data in Zustand and syncing, I use Dexie's reactive hooks directly. This means components re-render when DB data changes, with no manual cache invalidation.

3. **Service layer pattern** — I introduced a thin service layer (`session-service.ts`, `message-service.ts`, etc.) between components and Dexie. This centralizes write logic and validation.

4. **React Router for navigation** — The spec doesn't specify routing. I chose React Router for URL-based navigation, which enables deep linking to specific sessions.

5. **`completedStages` array on Session** — The spec has `currentStage` but I added `completedStages` to track which stages a session has passed through, enabling stage navigation and progress display.

### 11.2 Technical Choices

6. **`gpt-tokenizer` over `js-tiktoken`** — Both are valid; I chose the smaller bundle option since we only need approximation.

7. **`crypto.randomUUID()` for IDs** — The spec doesn't specify ID generation. This is zero-dependency and browser-native.

8. **Streaming support as default with non-streaming fallback** — The spec mentions streaming implicitly through "loading state"; I made it explicit with a proper SSE parser and fallback.

9. **Compound indexes** (`[sessionId+createdAt]`, `[sessionId+stage]`) — Performance optimization for queries that filter by session. Not in spec but important for responsiveness with many messages.

### 11.3 UX Additions

10. **Toast notifications** for copy/save actions — The spec mentions "copy prompt" and "error prompt" but doesn't specify notification mechanism. Toasts are the standard low-friction pattern.

11. **Markdown rendering for LLM responses** — LLM outputs often contain markdown. A renderer makes them readable.

12. **Session archiving** — The spec mentions `archived` status but doesn't detail the UX. I plan to add archive/unarchive to the session list.

13. **Stage navigation in session header** — The spec mentions "切换 current stage" but doesn't specify the UI. I designed a horizontal step progress bar showing completed/current/upcoming stages.

### 11.4 Prompt System Additions (Revisions 2 & 3)

14. **7-layer contract architecture** — Expanded from the spec's 4-layer model (global/task/stage/output) to 7 layers by splitting out Failure Contract, Repair Contract, and Variant Contract as independently typed layers. Each layer has a distinct enforcement purpose and is composed, not nested.

15. **`PromptTemplateSpec` with typed contracts** — Each of the 14 templates is now a fully typed registry entry with 7 contract layers, typed `WeakModelSpec`, typed `ValidationGates`, and 4 variants (standard/strict/lowCost/minimal). The `minimal` variant is my addition — it's the absolute last-resort prompt (~50-100 tokens) that still produces parseable output.

16. **Standardized UPPERCASE headings** — All output headings across the system are uppercase, underscored, fixed labels from a canonical `HEADINGS` constant. This eliminates heading variation as a parse failure mode and makes the 4-strategy section parser more reliable.

17. **5 canonical repair templates** — Missing section, invalid heading, prose-to-structure, trim-to-schema, and weak-model-shorten. Each is a self-contained follow-up prompt stored in `repair-templates.ts`. These are data, not scattered strings.

18. **Variant downgrade chain with auto-downgrade** — When output fails validation, the system can automatically retry with the next variant in the chain (standard → strict → lowCost → minimal). This is my addition beyond the spec's repair flow.

19. **Self-check instructions (Layer 6)** — Each template's Repair Contract includes a `selfCheckInstruction` that is embedded in the initial prompt itself: "Before finishing, verify your output contains: ..." This proactively reduces repair needs, especially for models that are borderline capable.

20. **`FixedSection` with `missingBehavior` and `defaultValue`** — Each output section specifies what happens when it's missing: reject (hard fail), warn (show banner), fill_default (insert a default value), or skip (ignore). This makes partial output handling deterministic per section, not per template.

21. **Build-time template validation test suite** — All 14 templates auto-validated: UPPERCASE headings in canonical registry, 4 variants defined, minimal ≤ 100 tokens, lowCost ≤ 60% of standard, repair contracts with placeholders, weak-model specs with extraction fields and banned phrases, downgrade chains starting with standard and ending with minimal.

### 11.5 Session Workspace Additions (Revision 2)

18. **Stage-first layout** — The spec says "not a chat app" but the original plan's session layout was still chat-dominant. I redesigned: stage header, stage prompt block, artifacts, and next-action block are above the fold. Conversation is collapsible and below.

19. **NextActionBlock component** — Not in spec. Promptor explicitly suggests what the user should do next based on current stage state (e.g., "Finalize decision record and advance to Plan").

20. **CandidateCard interactive component** — Not in spec. Discussion stage candidate approaches are rendered as interactive cards with [Accept] / [Reject] / [Discuss More] buttons, not as passive text.

21. **Discussion → Plan auto-transition** — The spec mentions decision_record but not the automated flow. I designed: accept a candidate → auto-reject others → auto-generate decision_record artifact → auto-create pinned facts → advance to Plan with context pre-loaded.

### 11.6 Memory Additions (Revision 2)

22. **Rolling summary merge algorithm with per-section dedup rules** — The spec says "rolling summary" but doesn't define merge behavior. I specified: union for goals/constraints, append-only for decisions/rejections, resolution for open questions, and a 25% budget cap with re-compression.

23. **Stage-end summary lifecycle** — I formalized: stage-end summaries are immutable artifacts that replace the rolling summary on transition; rolling summary is discarded; new stage starts fresh.

24. **Summary vs. pinned fact conflict resolution rules** — Not in spec. I defined: pinned facts are always authoritative; compression prompt is instructed to not restate pinned facts; stale references are cleaned on next compression.

### 11.7 Testing Choices

25. **Vitest as test runner** — Not specified in the spec. Vitest is the natural choice with Vite, zero extra config.

26. **No E2E tests in MVP** — The spec requires unit tests for core logic. I'm deferring E2E/integration tests to post-MVP to stay within scope.

27. **Two new test suites** — `prompt-registry.test.ts` for template validation and `output-parser.test.ts` for section extraction testing. Also `summary-merger.test.ts` for merge logic. These go beyond the spec's listed test scope.
