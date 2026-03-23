import type { ArtifactType } from './data';

// ─── Template Identity ───
export type PromptTemplateId =
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

export type PromptVariant = 'standard' | 'strict' | 'lowCost' | 'minimal';

// ─── Complete Template Spec ───
export interface PromptTemplateSpec {
  id: PromptTemplateId;
  layer: 'task' | 'stage';
  purpose: string;
  requiredInputs: PromptInputField[];
  optionalInputs: PromptInputField[];
  taskContract: string;
  stageContract: string;
  outputContract: OutputContract;
  failureContract: FailureContract;
  repairContract: RepairContract;
  variantContract: VariantContract;
  weakModelSpec: WeakModelSpec;
  gates: ValidationGates;
}

export interface PromptInputField {
  name: string;
  type: 'string' | 'string[]' | 'artifact' | 'pinned_facts' | 'messages';
  required: boolean;
  description: string;
}

// ─── Layer 4: Output Contract ───
export interface OutputContract {
  requiredSections: FixedSection[];
  optionalSections: FixedSection[];
  sectionOrder: string[];
  skeletonExample: string;
}

export interface FixedSection {
  key: string;
  heading: string;
  fieldType: SectionFieldType;
  description: string;
  maxTokens?: number;
  savableAs?: ArtifactType;
  pinnable?: boolean;
  missingBehavior: 'reject' | 'warn' | 'fill_default' | 'skip';
  defaultValue?: string;
}

export type SectionFieldType =
  | 'single_line'
  | 'paragraph'
  | 'bullet_list'
  | 'numbered_list'
  | 'table'
  | 'key_value_pairs'
  | 'code_block'
  | 'checklist';

// ─── Layer 5: Failure Contract ───
export interface FailureContract {
  minAcceptableSections: number;
  onPartialOutput: 'warn_and_use' | 'attempt_repair' | 'reject';
  onMalformedOutput: 'attempt_repair' | 'downgrade_and_retry' | 'show_raw';
  onEmptyOutput: 'retry_once' | 'show_error';
  maxRepairAttempts: number;
  criticalSections: string[];
}

// ─── Layer 6: Repair Contract ───
export interface RepairContract {
  selfCheckInstruction: string;
  missingSectionRepair: string;
  invalidHeadingRepair: string;
  proseToStructureRepair: string;
  trimToSchemaRepair: string;
}

// ─── Layer 7: Variant Contract ───
export interface VariantContract {
  standard: VariantSpec;
  strict: VariantSpec;
  lowCost: VariantSpec;
  minimal: VariantSpec;
}

export interface VariantSpec {
  promptText: string;
  tokenBudget: number;
  includeSkeleton: boolean;
  includedSections: string[];
  additionalConstraints: string[];
}

// ─── Weak-Model Compatibility ───
export interface WeakModelSpec {
  maxInstructionWords: number;
  requiredNegativeConstraints: string[];
  extractionFields: ExtractionField[];
  bannedPhrases: string[];
  minimalExecutableTemplate: string;
  fewShotSkeleton: string;
  fieldPreference: 'extraction' | 'generation';
}

export interface ExtractionField {
  label: string;
  format: string;
  section: string;
}

// ─── Validation Gates ───
export interface ValidationGates {
  validateOutputStructure: StructureValidatorConfig;
  repairOutput: RepairPipelineConfig;
  fallbackVariant: VariantDowngradeChain;
}

export interface StructureValidatorConfig {
  headingMatchStrategy: 'uppercase_exact' | 'uppercase_fuzzy' | 'any_heading';
  minSectionsForPartial: number;
  requireCriticalSections: boolean;
}

export interface RepairPipelineConfig {
  repairStrategies: RepairStrategyId[];
  maxAttempts: number;
}

export type RepairStrategyId =
  | 'missing_section_repair'
  | 'invalid_heading_repair'
  | 'prose_to_structure'
  | 'trim_to_schema'
  | 'weak_model_shorten';

export interface VariantDowngradeChain {
  chain: PromptVariant[];
  autoDowngradeOnFailure: boolean;
}
