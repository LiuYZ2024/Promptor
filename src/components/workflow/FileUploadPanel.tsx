import { useRef, useState } from 'react';
import {
  useWorkflowFiles,
  addWorkflowFile,
  updateWorkflowFile,
  removeWorkflowFile,
} from '@/hooks';
import type { WorkflowFileRole } from '@/types/data';
import { WORKFLOW_FILE_ROLES, WORKFLOW_FILE_ROLE_LABELS } from '@/types/data';
import { cn } from '@/lib/utils';

const ACCEPTED_EXTENSIONS = '.md,.txt,.json';

interface FileUploadPanelProps {
  sessionId: string;
  activeFileRoles?: WorkflowFileRole[];
  defaultRole?: WorkflowFileRole;
}

export function FileUploadPanel({ sessionId, activeFileRoles, defaultRole }: FileUploadPanelProps) {
  const files = useWorkflowFiles(sessionId);
  const inputRef = useRef<HTMLInputElement>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    for (const file of Array.from(fileList)) {
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (!ext || !['md', 'txt', 'json'].includes(ext)) continue;

      const content = await file.text();
      const role = defaultRole || inferRole(file.name);
      await addWorkflowFile({
        sessionId,
        fileName: file.name,
        fileRole: role,
        content,
        mimeType: file.type || 'text/plain',
      });
    }

    if (inputRef.current) inputRef.current.value = '';
  }

  function inferRole(name: string): WorkflowFileRole {
    const lower = name.toLowerCase();
    if (lower.includes('research')) return 'research_output';
    if (lower.includes('plan') && lower.includes('annot')) return 'annotated_plan';
    if (lower.includes('plan')) return 'plan_output';
    if (lower.includes('test') || lower.includes('report') || lower.includes('verify')) return 'test_report';
    if (lower.includes('summary') || lower.includes('code')) return 'code_summary';
    return 'general_notes';
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-xs font-medium uppercase text-muted-foreground">
          Workflow Files ({files.length})
        </div>
        <button
          onClick={() => inputRef.current?.click()}
          className="rounded border border-border px-2 py-0.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          + Upload
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_EXTENSIONS}
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {files.length === 0 && (
        <p className="text-xs text-muted-foreground/60">
          Upload research.md, plan.md, or other workflow files.
        </p>
      )}

      <div className="space-y-1">
        {files.map((f) => {
          const isActive = activeFileRoles?.includes(f.fileRole);
          return (
            <div
              key={f.id}
              className={cn(
                'group flex items-start gap-1.5 rounded px-2 py-1.5 text-xs',
                isActive ? 'bg-primary/5 ring-1 ring-primary/20' : 'bg-muted/30',
              )}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  <span className="truncate font-medium" title={f.fileName}>
                    {f.fileName}
                  </span>
                  {isActive && (
                    <span className="shrink-0 rounded bg-primary/10 px-1 text-[10px] text-primary">
                      in use
                    </span>
                  )}
                </div>

                {editingId === f.id ? (
                  <select
                    value={f.fileRole}
                    onChange={async (e) => {
                      await updateWorkflowFile(f.id, {
                        fileRole: e.target.value as WorkflowFileRole,
                      });
                      setEditingId(null);
                    }}
                    onBlur={() => setEditingId(null)}
                    autoFocus
                    className="mt-0.5 rounded border border-border bg-background px-1 py-0.5 text-[10px]"
                  >
                    {WORKFLOW_FILE_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {WORKFLOW_FILE_ROLE_LABELS[r]}
                      </option>
                    ))}
                  </select>
                ) : (
                  <button
                    onClick={() => setEditingId(f.id)}
                    className="mt-0.5 text-[10px] text-muted-foreground hover:text-foreground"
                  >
                    {WORKFLOW_FILE_ROLE_LABELS[f.fileRole]}
                  </button>
                )}
              </div>

              <button
                onClick={() => removeWorkflowFile(f.id)}
                className="shrink-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                title="Remove"
              >
                ×
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
