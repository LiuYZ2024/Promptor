import { useState } from 'react';
import type { OutputLanguage, WorkflowFile, WorkflowFileRole } from '@/types/data';
import type { StageConfig } from '@/lib/workflow/stage-config';
import { cn } from '@/lib/utils';

interface StageCardProps {
  config: StageConfig;
  lang: OutputLanguage;
  optimizedPrompt?: string;
  readinessWarning?: string;
  workflowFiles: WorkflowFile[];
  onCopyPrompt: (text: string) => void;
}

export function StageCard({
  config,
  lang,
  optimizedPrompt,
  readinessWarning,
  workflowFiles,
  onCopyPrompt,
}: StageCardProps) {
  const [showBase, setShowBase] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    onCopyPrompt(text);
    setTimeout(() => setCopiedKey(null), 1500);
  }

  const relevantFiles = workflowFiles.filter((f) =>
    config.relevantFileRoles.includes(f.fileRole),
  );

  return (
    <div className="space-y-3 rounded-lg border border-border bg-background p-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold">{config.label}</h3>
            {config.isPrimary ? (
              <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                核心阶段
              </span>
            ) : (
              <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                辅助
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {lang === 'zh' ? config.intro.zh : config.intro.en}
          </p>
        </div>
      </div>

      {/* Why it matters */}
      <div className="rounded bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        <span className="font-medium text-foreground/70">
          {lang === 'zh' ? '为什么重要：' : 'Why: '}
        </span>
        {lang === 'zh' ? config.whyItMatters.zh : config.whyItMatters.en}
      </div>

      {/* Deliverable */}
      <div className="flex items-center gap-2 text-xs">
        <span className="font-medium text-muted-foreground">
          {lang === 'zh' ? '预期产物：' : 'Deliverable: '}
        </span>
        <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-foreground">
          {lang === 'zh' ? config.deliverable.zh : config.deliverable.en}
        </code>
      </div>

      {/* Readiness Warning */}
      {readinessWarning && (
        <div className="rounded border border-warning/30 bg-warning/5 px-3 py-2 text-xs text-warning">
          ⚠ {readinessWarning}
        </div>
      )}

      {/* Referenced files */}
      {relevantFiles.length > 0 && (
        <div className="text-xs">
          <span className="font-medium text-muted-foreground">
            {lang === 'zh' ? '关联文件：' : 'Referenced files: '}
          </span>
          {relevantFiles.map((f) => (
            <span
              key={f.id}
              className="ml-1 inline-block rounded bg-primary/5 px-1.5 py-0.5 text-primary"
            >
              {f.fileName}
            </span>
          ))}
        </div>
      )}

      {/* Optimized Prompt */}
      {optimizedPrompt && (
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-foreground/70">
              {lang === 'zh' ? '优化后的 Prompt' : 'Optimized Prompt'}
            </span>
            <button
              onClick={() => copy(optimizedPrompt, 'opt')}
              className="rounded border border-border px-2 py-0.5 text-[10px] text-muted-foreground hover:bg-muted"
            >
              {copiedKey === 'opt' ? '✓ Copied' : 'Copy'}
            </button>
          </div>
          <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded bg-muted/50 px-3 py-2 text-xs">
            {optimizedPrompt}
          </pre>
        </div>
      )}

      {/* Base Prompt (collapsible) */}
      <div>
        <button
          onClick={() => setShowBase(!showBase)}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          {showBase ? '▾' : '▸'}{' '}
          {lang === 'zh' ? '通用基础 Prompt' : 'Base Prompt Template'}
        </button>
        {showBase && (
          <div className="mt-1 space-y-1">
            <div className="flex justify-end">
              <button
                onClick={() =>
                  copy(
                    lang === 'zh' ? config.basePrompt.zh : config.basePrompt.en,
                    'base',
                  )
                }
                className="rounded border border-border px-2 py-0.5 text-[10px] text-muted-foreground hover:bg-muted"
              >
                {copiedKey === 'base' ? '✓ Copied' : 'Copy'}
              </button>
            </div>
            <pre className="whitespace-pre-wrap rounded bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              {lang === 'zh' ? config.basePrompt.zh : config.basePrompt.en}
            </pre>
          </div>
        )}
      </div>

      {/* Next-step hint */}
      <div className="border-t border-border pt-2 text-xs text-muted-foreground">
        <span className="font-medium">
          {lang === 'zh' ? '下一步：' : 'Next: '}
        </span>
        {lang === 'zh' ? config.nextStepHint.zh : config.nextStepHint.en}
      </div>
    </div>
  );
}
