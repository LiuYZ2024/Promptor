// ─── Settings ───
export type OutputLanguage = 'zh' | 'en';

export interface Settings {
  id: string;
  providerPresetId: string;
  providerLabel: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
  contextSoftLimit: number;
  contextHardLimit: number;
  outputLanguage: OutputLanguage;
  theme: 'light' | 'dark' | 'system';
  debugMode: boolean;
  persistApiKey: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Session ───
export type TaskType = 'coding' | 'research' | 'mixed' | 'discussion';
export type SessionStatus = 'active' | 'archived';
export type WorkflowStage =
  | 'requirement'
  | 'research'
  | 'discussion'
  | 'plan'
  | 'annotation_loop'
  | 'implement'
  | 'verify'
  | 'solidify';

export const WORKFLOW_STAGES: readonly WorkflowStage[] = [
  'requirement',
  'research',
  'discussion',
  'plan',
  'annotation_loop',
  'implement',
  'verify',
  'solidify',
] as const;

export interface Session {
  id: string;
  title: string;
  taskType: TaskType;
  goal: string;
  hasCodebase: boolean;
  agentTarget: string;
  currentStage: WorkflowStage;
  completedStages: WorkflowStage[];
  status: SessionStatus;
  createdAt: string;
  updatedAt: string;
}

// ─── Message ───
export type MessageRole = 'user' | 'assistant' | 'system' | 'tool';

export interface Message {
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
export type ArtifactType =
  | 'requirement_brief'
  | 'research_summary'
  | 'discussion_notes'
  | 'decision_record'
  | 'implementation_plan'
  | 'revised_plan'
  | 'implementation_prompt'
  | 'execution_checklist'
  | 'verification_prompt'
  | 'verification_report'
  | 'reusable_rules'
  | 'memory_summary'
  | 'refined_prompt';

export const ARTIFACT_TYPES: readonly ArtifactType[] = [
  'requirement_brief',
  'research_summary',
  'discussion_notes',
  'decision_record',
  'implementation_plan',
  'revised_plan',
  'implementation_prompt',
  'execution_checklist',
  'verification_prompt',
  'verification_report',
  'reusable_rules',
  'memory_summary',
  'refined_prompt',
] as const;

export interface Artifact {
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
export type FactCategory =
  | 'objective'
  | 'constraint'
  | 'preference'
  | 'accepted_decision'
  | 'rejected_option'
  | 'coding_style'
  | 'validation_rule'
  | 'scope_boundary';

export const FACT_CATEGORIES: readonly FactCategory[] = [
  'objective',
  'constraint',
  'preference',
  'accepted_decision',
  'rejected_option',
  'coding_style',
  'validation_rule',
  'scope_boundary',
] as const;

export type FactPriority = 'critical' | 'high' | 'normal';

export const FACT_PRIORITIES: readonly FactPriority[] = [
  'critical',
  'high',
  'normal',
] as const;

export interface PinnedFact {
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
export type SummaryType = 'rolling' | 'stage_end' | 'long_term';

export interface Summary {
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

// ─── Workflow File ───
export type WorkflowFileRole =
  | 'research_output'
  | 'plan_output'
  | 'annotated_plan'
  | 'test_report'
  | 'code_summary'
  | 'general_notes'
  | 'reference_material';

export const WORKFLOW_FILE_ROLES: readonly WorkflowFileRole[] = [
  'research_output',
  'plan_output',
  'annotated_plan',
  'test_report',
  'code_summary',
  'general_notes',
  'reference_material',
] as const;

export const WORKFLOW_FILE_ROLE_LABELS: Record<WorkflowFileRole, string> = {
  research_output: 'Research Output',
  plan_output: 'Plan Output',
  annotated_plan: 'Annotated Plan',
  test_report: 'Test Report',
  code_summary: 'Code Summary',
  general_notes: 'General Notes',
  reference_material: 'Reference Material',
};

export interface WorkflowFile {
  id: string;
  sessionId: string;
  fileName: string;
  fileRole: WorkflowFileRole;
  content: string;
  mimeType: string;
  sizeBytes: number;
  extractedSummary?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Candidate Approach (Discussion stage) ───
export type CandidateStatus = 'proposed' | 'accepted' | 'rejected';

export interface CandidateApproach {
  id: string;
  sessionId: string;
  name: string;
  description: string;
  pros: string[];
  cons: string[];
  status: CandidateStatus;
  rejectionReason?: string;
  sourceMessageId: string;
  createdAt: string;
  updatedAt: string;
}
