import Dexie, { type Table } from 'dexie';
import type {
  Settings,
  Session,
  Message,
  Artifact,
  PinnedFact,
  Summary,
  CandidateApproach,
  WorkflowFile,
} from '@/types/data';

export class PromptoDb extends Dexie {
  settings!: Table<Settings>;
  sessions!: Table<Session>;
  messages!: Table<Message>;
  artifacts!: Table<Artifact>;
  pinnedFacts!: Table<PinnedFact>;
  summaries!: Table<Summary>;
  candidateApproaches!: Table<CandidateApproach>;
  workflowFiles!: Table<WorkflowFile>;

  constructor() {
    super('promptor');
    this.version(1).stores({
      settings: 'id',
      sessions: 'id, status, updatedAt',
      messages: 'id, sessionId, [sessionId+createdAt], stage',
      artifacts: 'id, sessionId, [sessionId+stage], artifactType',
      pinnedFacts: 'id, sessionId, category, priority',
      summaries: 'id, sessionId, summaryType',
      candidateApproaches: 'id, sessionId, status',
    });

    this.version(2).stores({}).upgrade((tx) => {
      return tx.table('settings').toCollection().modify((s) => {
        if (!('providerPresetId' in s)) {
          (s as Record<string, unknown>).providerPresetId = 'custom';
        }
      });
    });

    this.version(3).stores({}).upgrade((tx) => {
      return tx.table('settings').toCollection().modify((s) => {
        if (!('outputLanguage' in s)) {
          (s as Record<string, unknown>).outputLanguage = 'zh';
        }
      });
    });

    this.version(4).stores({
      workflowFiles: 'id, sessionId, fileRole, [sessionId+fileRole]',
    });
  }
}

export const db = new PromptoDb();

export const DEFAULT_SETTINGS: Settings = {
  id: 'default',
  providerPresetId: 'custom',
  providerLabel: 'OpenAI Compatible',
  baseUrl: '',
  apiKey: '',
  model: '',
  temperature: 0.7,
  maxTokens: 4096,
  contextSoftLimit: 6000,
  contextHardLimit: 8000,
  outputLanguage: 'zh',
  theme: 'system',
  debugMode: false,
  persistApiKey: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};
