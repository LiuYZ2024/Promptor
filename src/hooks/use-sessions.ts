import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/storage/db';
import type { Session, WorkflowStage, TaskType } from '@/types/data';
import { generateId, nowISO } from '@/lib/utils';

export function useSessions() {
  return useLiveQuery(
    () => db.sessions.orderBy('updatedAt').reverse().toArray(),
    [],
    [],
  );
}

const SESSION_LOADING = Symbol('session-loading');

export type SessionQueryResult =
  | { status: 'loading' }
  | { status: 'found'; session: Session }
  | { status: 'not-found' };

export function useSession(id: string | undefined): SessionQueryResult {
  const result = useLiveQuery(
    () => (id ? db.sessions.get(id).then((s) => s ?? null) : null),
    [id],
    SESSION_LOADING as unknown as Session | null,
  );

  if ((result as unknown) === SESSION_LOADING) {
    return { status: 'loading' };
  }
  if (result) {
    return { status: 'found', session: result };
  }
  return { status: 'not-found' };
}

function generateTimestampTitle(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function extractSessionTitle(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return generateTimestampTitle();
  const first = trimmed.split('\n')[0].replace(/^[#\-*>\s]+/, '').trim();
  if (!first || first.length < 2) return generateTimestampTitle();
  return first.length > 40 ? first.slice(0, 40) + '…' : first;
}

export async function createSession(params: {
  title?: string;
  taskType: TaskType;
  goal: string;
  hasCodebase: boolean;
  agentTarget: string;
}): Promise<string> {
  const id = generateId();
  const now = nowISO();
  await db.sessions.add({
    id,
    title: params.title || generateTimestampTitle(),
    taskType: params.taskType,
    goal: params.goal,
    hasCodebase: params.hasCodebase,
    agentTarget: params.agentTarget,
    currentStage: 'research',
    completedStages: [],
    status: 'active',
    createdAt: now,
    updatedAt: now,
  });
  return id;
}

export async function autoTitleSession(
  sessionId: string,
  firstInput: string,
): Promise<void> {
  const session = await db.sessions.get(sessionId);
  if (!session) return;
  const isTimestampTitle = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(session.title);
  if (!isTimestampTitle) return;
  const newTitle = extractSessionTitle(firstInput);
  if (newTitle !== session.title) {
    await db.sessions.update(sessionId, { title: newTitle, updatedAt: nowISO() });
  }
}

export async function updateSession(
  id: string,
  updates: Partial<Session>,
): Promise<void> {
  await db.sessions.update(id, { ...updates, updatedAt: nowISO() });
}

export async function advanceStage(
  id: string,
  nextStage: WorkflowStage,
): Promise<void> {
  const session = await db.sessions.get(id);
  if (!session) return;

  const completedStages = session.completedStages.includes(session.currentStage)
    ? session.completedStages
    : [...session.completedStages, session.currentStage];

  await db.sessions.update(id, {
    currentStage: nextStage,
    completedStages,
    updatedAt: nowISO(),
  });
}

export async function archiveSession(id: string): Promise<void> {
  await db.sessions.update(id, { status: 'archived', updatedAt: nowISO() });
}
