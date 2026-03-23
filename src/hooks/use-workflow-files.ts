import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/storage/db';
import type { WorkflowFile, WorkflowFileRole } from '@/types/data';
import { generateId, nowISO } from '@/lib/utils';

export function useWorkflowFiles(sessionId: string | undefined) {
  return useLiveQuery(
    () =>
      sessionId
        ? db.workflowFiles.where('sessionId').equals(sessionId).toArray()
        : [],
    [sessionId],
    [],
  );
}

export async function addWorkflowFile(params: {
  sessionId: string;
  fileName: string;
  fileRole: WorkflowFileRole;
  content: string;
  mimeType: string;
}): Promise<string> {
  const id = generateId();
  const now = nowISO();
  await db.workflowFiles.add({
    id,
    sessionId: params.sessionId,
    fileName: params.fileName,
    fileRole: params.fileRole,
    content: params.content,
    mimeType: params.mimeType,
    sizeBytes: new Blob([params.content]).size,
    createdAt: now,
    updatedAt: now,
  });
  return id;
}

export async function updateWorkflowFile(
  id: string,
  updates: Partial<Pick<WorkflowFile, 'fileName' | 'fileRole' | 'content' | 'extractedSummary'>>,
): Promise<void> {
  await db.workflowFiles.update(id, { ...updates, updatedAt: nowISO() });
}

export async function removeWorkflowFile(id: string): Promise<void> {
  await db.workflowFiles.delete(id);
}

export function getWorkflowFilesByRole(
  files: WorkflowFile[],
  ...roles: WorkflowFileRole[]
): WorkflowFile[] {
  return files.filter((f) => roles.includes(f.fileRole));
}
