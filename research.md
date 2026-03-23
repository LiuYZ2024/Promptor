# Promptor — Research Document

## 1. Product Understanding

### 1.1 Core Identity

Promptor is a **local-first, single-user, browser-based Prompt Operating System**. It sits *upstream* of AI coding agents (Cursor, Claude Code, Cline, Roo) and transforms fuzzy human intent into structured, stage-aware, token-efficient prompts and workflows.

It is **not** a chat interface, prompt polisher, or agent runtime. Its value chain is:

```
User's fuzzy need
  → Promptor structures & stages it
    → High-quality prompt/workflow/artifact
      → User copies to external agent
        → Agent executes with less waste
```

### 1.2 Core Value Propositions

| Value | Why It Matters |
|---|---|
| Stage-aware workflow | Prevents users from jumping to implementation without research/discussion/planning |
| Strong prompt templates | Compensates for weak models; reduces ambiguity |
| Memory layering & compression | Controls token cost across multi-turn sessions |
| Structured output formats | Every output is copy-ready for external agents |
| Discussion as first-class stage | Forces deliberate decision-making before implementation |

### 1.3 Target Users

- Developers using AI coding agents who waste tokens on poorly structured prompts
- Researchers using LLMs for scientific discussion who need structured exploration
- Budget-conscious users on weaker/cheaper models who need prompt quality to compensate
- Process-oriented users who want repeatable AI collaboration workflows

---

## 2. Module Decomposition

### 2.1 Primary Modules

| Module | Responsibility |
|---|---|
| **Settings** | LLM provider config, theme, context limits, API key management |
| **Workflow Builder** | Generate 8-stage workflow from user requirement |
| **Prompt Refiner** | Transform raw prompts into structured, high-quality prompts |
| **Session Workspace** | Multi-turn session with stage tracking, memory, artifacts |
| **Memory System** | 4-layer memory: raw history, rolling summary, pinned facts, stage artifacts |
| **Prompt Template System** | 4-layer template hierarchy: global, task-type, stage, output format |
| **LLM Client** | Thin OpenAI-compatible chat completion abstraction |
| **Storage Layer** | Dexie.js/IndexedDB persistence + localStorage for light settings |
| **Token Estimation** | Approximate token counting for context budget display |

### 2.2 Module Dependency Graph

```
Settings ──────────────────────────────────────────┐
                                                    ▼
Prompt Template System ──► LLM Client ◄──── Token Estimation
        │                     ▲
        ▼                     │
Workflow Builder ─────────────┤
Prompt Refiner ───────────────┤
Session Workspace ────────────┘
        │
        ▼
Memory System ──► Storage Layer (Dexie/IndexedDB)
```

### 2.3 Cross-Cutting Concerns

- **Copy-to-clipboard**: Every substantial output needs one-click copy
- **Save-as-artifact**: LLM outputs can be saved as stage artifacts
- **Error handling**: Unified user-facing error messages with repair hints
- **Theme**: Light/dark/system propagated through Tailwind + CSS variables
- **Responsive layout**: Three-column layout collapses gracefully

---

## 3. Technical Stack Analysis

### 3.1 Confirmed Stack

| Layer | Technology | Rationale |
|---|---|---|
| Build | Vite | Fast HMR, modern ESM, excellent TS support |
| UI | React 18+ | Mature ecosystem, good for complex SPA |
| Language | TypeScript (strict) | Required by spec |
| Styling | Tailwind CSS v4 | Utility-first, great dark mode, small CSS output |
| Components | shadcn/ui | Copy-paste components, no heavy library lock-in |
| State | Zustand | Lightweight, TS-friendly, no boilerplate |
| Persistence | Dexie.js + IndexedDB | Structured local DB, reactive queries, mature |
| Light storage | localStorage | Theme, last-used provider/model only |

### 3.2 Key Library Choices

**Dexie.js v4 + dexie-react-hooks**
- `useLiveQuery()` provides reactive data binding — components auto-update when IndexedDB data changes
- Schema versioning built-in for future migrations
- Only indexed fields need to be declared in schema; all other fields are stored automatically
- Well-suited for the 6-table data model (settings, sessions, messages, artifacts, pinnedFacts, summaries)

**Zustand (UI-only state)**
- Use Zustand for transient UI state: current session ID, sidebar collapse, active stage, loading states, modal visibility
- Do NOT use Zustand persist middleware for data — Dexie handles all persistence
- This avoids dual-write complexity and keeps data flow clear

**Token Estimation: `gpt-tokenizer`**
- ~50KB bundle, pure JS, fastest for small texts
- Good enough for approximate token counting (which is all we need)
- No WASM dependency, works in all browsers
- Caveat: not accurate for Claude tokenization, but spec only requires approximation

**Streaming: Native fetch + ReadableStream**
- No need for an SDK; the OpenAI-compatible `/v1/chat/completions` endpoint with `stream: true` returns Server-Sent Events
- Parse SSE manually using a lightweight utility
- This keeps the LLM client thin and provider-agnostic

### 3.3 Component Library Strategy (shadcn/ui)

shadcn/ui is not installed as a dependency — components are copied into the project. For Promptor's MVP, we need:

- Button, Input, Textarea, Select, Card, Dialog, Tabs, Badge, Toast, Tooltip, ScrollArea, Separator, Sheet (for mobile sidebar), DropdownMenu, Collapsible, Switch

These will be initialized via `npx shadcn@latest add ...` during setup.

---

## 4. Risk Analysis

### 4.1 High Risk

| Risk | Impact | Mitigation |
|---|---|---|
| **CORS blocking** | Browser → LLM API calls may be blocked by CORS policies of some providers | Document which providers work (OpenRouter, local Ollama, etc.); suggest CORS proxy for others; provide clear error message with instructions |
| **Memory compression quality** | Compression relies on the same LLM the user configures — if it's a weak model, compression quality degrades | Ship strong compression prompts with explicit structure; do structural extraction (goals, constraints, decisions) rather than open-ended summarization |
| **Prompt template maintenance** | 4-layer × 8 stages × multiple task types = many templates to get right | Start with the most impactful templates; use a modular template composition system so templates share building blocks |
| **Scope creep during implementation** | The spec is comprehensive; risk of getting bogged down in details | Strictly phase the implementation; get core flow working before polishing edge cases |

### 4.2 Medium Risk

| Risk | Impact | Mitigation |
|---|---|---|
| **Token estimation inaccuracy** | Different models use different tokenizers; our estimate may be off by 10-30% | Clearly label as "estimated"; use conservative soft/hard limits; explain in UI that counts are approximate |
| **IndexedDB storage limits** | Browsers may throttle IndexedDB storage (typically 50-100MB before prompting) | Monitor storage usage; implement session archiving/deletion; this is unlikely to be hit in normal use |
| **Weak model output parsing** | Weak models may not follow output format instructions | Use very explicit format instructions with examples; implement lenient parsing that extracts what it can |
| **Streaming compatibility** | Not all OpenAI-compatible APIs implement SSE identically | Support both streaming and non-streaming modes; fall back to non-streaming on errors |

### 4.3 Low Risk

| Risk | Impact | Mitigation |
|---|---|---|
| **Bundle size** | shadcn/ui + Tailwind + Dexie + gpt-tokenizer could grow | Tree-shaking is effective; monitor bundle; lazy-load non-critical pages |
| **Browser compatibility** | IndexedDB and modern APIs well-supported in evergreen browsers | Set browserslist to last 2 versions; no IE11 concern |

---

## 5. Memory System Design Deep-Dive

This is one of the three critical design goals. Getting it right is essential.

### 5.1 Four-Layer Architecture

```
┌─────────────────────────────────────────────────┐
│  Layer 4: Stage Artifacts                       │
│  Formal outputs of each workflow stage           │
│  Immutable once saved; versioned                 │
├─────────────────────────────────────────────────┤
│  Layer 3: Pinned Facts                          │
│  User-confirmed critical information             │
│  Never auto-compressed; manually managed         │
├─────────────────────────────────────────────────┤
│  Layer 2: Rolling Summary                       │
│  Compressed representation of older conversation │
│  Updated incrementally as context grows          │
├─────────────────────────────────────────────────┤
│  Layer 1: Raw History                           │
│  Complete message log                            │
│  Older messages excluded from LLM context        │
│  Kept for re-summarization and audit             │
└─────────────────────────────────────────────────┘
```

### 5.2 Context Assembly Algorithm

When preparing a message for the LLM, the context is assembled in this priority order:

1. **System preset** (global + task-type + stage) — always included, ~500-800 tokens
2. **Pinned facts** — always included, user controls count
3. **Session metadata** (title, goal, task type, current stage) — always included, small
4. **Current stage artifact** (if exists) — included when relevant
5. **Rolling summary** — included to bridge older context
6. **Recent raw messages** — as many as fit within budget
7. **Current user input** — always the last message

Budget allocation strategy:
- Reserve fixed slots for layers 1-4 (~30% of budget)
- Fill remaining 70% with rolling summary + recent messages
- Recent messages get priority over rolling summary when space is tight

### 5.3 Compression Triggers

| Trigger | Action |
|---|---|
| Estimated context reaches soft limit (e.g., 70%) | Show UI warning; suggest compression; offer one-click compress |
| Estimated context reaches hard limit (e.g., 90%) | Auto-compress oldest unconsumed messages into rolling summary |
| Stage transition | Generate stage-end summary; save as stage artifact |
| User explicit request | Compress on demand |

### 5.4 Compression Prompt Design

The compression prompt must be *structural*, not *narrative*. It should extract:

- Confirmed goals (not paraphrased — preserved verbatim if short)
- Confirmed constraints
- Accepted decisions (with brief rationale)
- Rejected options (with brief reason)
- Open questions
- Current stage and what's next

This structured approach works well even with weaker models because it asks for extraction, not creative summarization.

### 5.5 Pinned Facts Management

- Users can manually pin/unpin facts
- System can suggest pinnable facts from LLM output (structured extraction)
- Each fact has a category (objective, constraint, preference, accepted_decision, etc.)
- Facts are never auto-compressed
- Facts have priority levels to help with display ordering

---

## 6. Prompt Template System Design Deep-Dive

This is the second critical design goal. The template system IS the product.

### 6.1 Four-Layer Template Hierarchy

```
Layer 1: Global System Preset
  └─ Always included
  └─ Defines Promptor's identity and behavior rules
  └─ ~400-600 tokens

Layer 2: Task-Type Preset
  └─ Selected per task type (workflow_generation, prompt_refinement, etc.)
  └─ Adds task-specific instructions
  └─ ~200-400 tokens

Layer 3: Stage Preset
  └─ Selected per workflow stage (requirement, research, discussion, etc.)
  └─ Adds stage-specific focus and constraints
  └─ ~200-400 tokens

Layer 4: Output Format Preset
  └─ Selected per expected output type
  └─ Defines exact structure the model should follow
  └─ ~100-300 tokens
```

### 6.2 Template Composition

Templates are composed, not nested. Each layer is an independent block that gets concatenated into the system message:

```
system_message = join([
  global_preset,
  task_type_preset,
  stage_preset,
  output_format_preset,
  pinned_facts_block,
  session_context_block
])
```

### 6.3 Template Storage

Templates are **static code assets** (TypeScript files), not database records. This means:
- Templates are version-controlled with the codebase
- No risk of corruption or loss
- Easy to review, test, and iterate
- Future: could allow user overrides stored in IndexedDB

### 6.4 Template Design Principles for Weak Models

Every template must:
1. Use short, declarative sentences
2. Use explicit section headers (XML-style tags or markdown headers)
3. Include at least one structural example of expected output
4. Avoid open-ended instructions like "be creative" or "feel free to..."
5. Specify what NOT to do (negative constraints are powerful for weak models)
6. Use numbered lists for multi-step instructions
7. Put the most important constraint first

### 6.5 Multi-Variant Support

Each prompt output should have variants:
- **Standard**: Full quality, moderate token cost
- **Strict**: Maximum constraints, slightly more tokens but more predictable
- **Low-cost**: Minimal context, shorter instructions, for budget-conscious usage

---

## 7. Discussion Stage Design Deep-Dive

This is the third critical design goal. Discussion must be distinct from both Research and Plan.

### 7.1 What Makes Discussion Unique

| Aspect | Research | Discussion | Plan |
|---|---|---|---|
| Goal | Understand what exists | Explore what's possible | Decide what to do |
| Output | Facts, context, summaries | Options, tradeoffs, recommendations | Steps, files, code sketches |
| Tone | Observational | Deliberative | Prescriptive |
| Key question | "What do we know?" | "What should we do and why?" | "How exactly do we do it?" |

### 7.2 Discussion Preset Requirements

The Discussion stage preset must:
1. Explicitly instruct the model to NOT produce implementation details
2. Require listing at least 2 candidate approaches
3. Require pros/cons for each approach
4. Require explicit "open questions" section
5. Require a "recommended direction" with rationale
6. Track what enters the plan vs. what remains open

### 7.3 Discussion → Plan Transition

When transitioning from Discussion to Plan:
- Auto-generate a `decision_record` artifact summarizing choices made
- Carry forward accepted decisions as pinned facts
- Carry forward rejected options as pinned facts (so they don't resurface)
- Open questions become explicit items in the plan's "risks" section

---

## 8. LLM Client Design

### 8.1 Architecture

```
┌────────────────────────────────────┐
│         LLM Client Layer           │
├────────────────────────────────────┤
│  buildMessages(context)            │  → Assembles the message array
│  sendChatCompletion(messages, cfg) │  → Calls the API
│  streamChatCompletion(messages, cfg)│ → SSE streaming variant
│  testConnection(cfg)               │  → Validates config works
│  normalizeError(error)             │  → User-friendly error messages
└────────────────────────────────────┘
              │
              ▼
    OpenAI-compatible HTTP API
    (fetch, no SDK dependency)
```

### 8.2 Key Design Decisions

1. **No SDK dependency**: Use raw `fetch()` with proper headers. The OpenAI chat completion API is simple enough that an SDK adds more complexity than value for this use case.

2. **Streaming support**: Parse SSE responses using a lightweight parser. Benefits:
   - User sees output progressively
   - Can abort mid-stream if output is off-track
   - Better perceived performance

3. **Error normalization**: Map HTTP status codes and common error patterns to user-friendly messages:
   - 401 → "API key is invalid or expired"
   - 403 → "Access denied. Check your API key permissions"
   - 404 → "Model not found. Check the model name"
   - 429 → "Rate limited. Wait a moment and try again"
   - CORS → "Request blocked by CORS policy. [See troubleshooting guide]"
   - Timeout → "Request timed out. Check your network or try a shorter prompt"

4. **Debug mode**: When enabled, log full request/response to console and optionally display in UI.

### 8.3 CORS Reality

Most commercial LLM APIs (OpenAI, Anthropic, Google) do NOT set `Access-Control-Allow-Origin` for browser requests. This is a fundamental constraint for a pure frontend app.

**Providers that work from browser:**
- OpenRouter (explicitly supports browser CORS)
- Local Ollama (localhost, no CORS issue)
- LM Studio (localhost)
- Any self-hosted endpoint with CORS configured

**Mitigation for others:**
- Document clearly which providers work
- Suggest using OpenRouter as a universal proxy
- Provide instructions for running a simple local CORS proxy if needed
- Give clear, actionable error messages when CORS is detected

---

## 9. Data Model Considerations

### 9.1 Dexie Schema Design

Dexie only needs indexed fields in the schema declaration. All other fields are stored automatically.

```typescript
db.version(1).stores({
  settings:    'id',
  sessions:    'id, status, updatedAt',
  messages:    'id, sessionId, stage, createdAt',
  artifacts:   'id, sessionId, stage, artifactType',
  pinnedFacts: 'id, sessionId, category, priority',
  summaries:   'id, sessionId, summaryType'
});
```

Compound indexes on `[sessionId+stage]` or `[sessionId+createdAt]` could improve query performance for message retrieval.

### 9.2 ID Strategy

Use `crypto.randomUUID()` for all IDs. It's built into modern browsers, no dependency needed, and produces standard UUIDs.

### 9.3 Settings Security

- API key stored in IndexedDB by default (with user consent toggle)
- Option to use sessionStorage for API key (cleared on tab close)
- API key display uses password field with show/hide toggle
- Never log API key in debug output

---

## 10. Potential Implementation Challenges

### 10.1 Context Assembly Complexity

The 8-layer context assembly (system preset → provider rules → pinned facts → session meta → stage artifact → rolling summary → recent messages → user input) requires careful budget accounting. Each layer needs a token estimate, and the algorithm must gracefully handle cases where the budget is too tight.

**Approach**: Implement a `ContextBuilder` class that:
1. Reserves minimum slots for system preset and user input
2. Fills remaining budget in priority order
3. Truncates lower-priority layers if needed
4. Reports what was included/excluded for debugging

### 10.2 Streaming + Artifact Extraction

When the LLM streams a response, the user needs to:
1. See the response as it arrives
2. After completion, optionally extract artifacts or pinned facts from it

This means we need a two-phase UX: streaming display → post-completion action bar.

### 10.3 Workflow Card Generation

The Workflow Builder calls the LLM to generate an 8-stage workflow with 3 prompt variants per stage. This is a large output. Options:
- Single large request (simpler, but may hit token limits on weaker models)
- Generate stages in batches (more API calls, but more reliable)
- Generate skeleton first, then fill details on demand

**Recommended**: Single request with strong output format constraints. If the model fails to produce all stages, detect and regenerate missing ones.

### 10.4 State Synchronization

Zustand (UI state) and Dexie (persisted data) need to stay in sync. Pattern:
- Dexie is the source of truth for all persisted data
- Zustand stores only transient UI state (current session ID, loading flags, UI panel states)
- Use `useLiveQuery()` from dexie-react-hooks to reactively bind UI to DB
- Write operations go through service functions that update Dexie directly

This avoids the complexity of syncing two state stores for the same data.

---

## 11. Technology Tradeoffs Summary

| Decision | Choice | Alternative Considered | Rationale |
|---|---|---|---|
| State for persisted data | Dexie useLiveQuery | Zustand + persist middleware | Cleaner separation; no dual-write; reactive out of box |
| Token estimation | gpt-tokenizer | js-tiktoken | Smaller bundle (~50KB vs ~200KB); fast enough for estimates |
| LLM client | Raw fetch | openai SDK | Thinner; no dependency; we only need chat completions |
| Streaming | Native SSE parsing | Third-party stream lib | Minimal dependency; SSE format is simple |
| Component library | shadcn/ui (copy-paste) | Radix UI directly | shadcn gives styled defaults; reduces design decisions |
| Template storage | Static TS files | Database records | Version-controlled; no corruption risk; simpler MVP |
| ID generation | crypto.randomUUID() | nanoid / uuid | Zero dependency; built into browsers |
| CSS | Tailwind v4 | CSS modules | Spec requirement; good dark mode; utility-first fits rapid dev |

---

## 12. MVP Scope Clarity

### Must Have (P0)
- Settings page with LLM config and test connection
- Workflow Builder: input → 8-stage workflow generation
- Prompt Refiner: raw prompt → refined + diagnosis + cheaper variant
- Session Workspace: multi-turn chat with stage awareness
- IndexedDB persistence for all data models
- 4-layer memory system with manual pin/unpin
- Context budget display (estimated tokens)
- Rolling summary generation (LLM-assisted compression)
- Stage artifact save/view
- Copy-to-clipboard on all outputs
- Light/dark/system theme
- Responsive layout

### Should Have (P1) — include if time permits
- Auto-compression when hitting soft limit
- Stage-end auto-summary
- Pinned fact suggestion from LLM output
- Debug mode with raw request/response display
- Streaming responses
- Keyboard shortcuts

### Nice to Have (P2) — defer to post-MVP
- Session export/import
- Template customization UI
- Batch workflow generation
- Advanced token estimation per model family
- PWA offline support
