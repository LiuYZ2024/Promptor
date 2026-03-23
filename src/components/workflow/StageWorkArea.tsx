import { useState, useRef, useCallback, useMemo } from 'react';
import type { OutputLanguage, WorkflowFile, PinnedFact, Message, Session, Settings } from '@/types/data';
import type { StageConfig, StageWorkMode } from '@/lib/workflow/stage-config';
import { buildOptimizedPrompt, getReadinessWarning, parseTuningOutput } from '@/lib/workflow';
import type { TuningResult } from '@/lib/workflow';
import { addWorkflowFile } from '@/hooks/use-workflow-files';
import { WORKFLOW_FILE_ROLE_LABELS } from '@/types/data';
import { cn } from '@/lib/utils';

const ACCEPTED_EXTENSIONS = '.md,.txt,.json';

interface StageWorkAreaProps {
  config: StageConfig;
  lang: OutputLanguage;
  session: Session;
  settings: Settings;
  workflowFiles: WorkflowFile[];
  pinnedFacts: PinnedFact[];
  stageMessages: Message[];
  rollingSummary?: string;
  streaming: boolean;
  streamPhase: 'idle' | 'streaming' | 'finalizing';
  streamContent: string;
  error: string;
  onSend: (input: string, mode: StageWorkMode, reviewFileId?: string) => void;
  onAbort: () => void;
  onCopyPrompt: (text: string) => void;
}

export function StageWorkArea({
  config,
  lang,
  session,
  settings,
  workflowFiles,
  pinnedFacts,
  stageMessages,
  rollingSummary,
  streaming,
  streamPhase,
  streamContent,
  error,
  onSend,
  onAbort,
  onCopyPrompt,
}: StageWorkAreaProps) {
  const [mode, setMode] = useState<StageWorkMode>('prompt_tuning');
  const [userInput, setUserInput] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const relevantFiles = workflowFiles.filter((f) =>
    config.relevantFileRoles.includes(f.fileRole),
  );
  const stageDeliverableFiles = workflowFiles.filter(
    (f) => f.fileRole === config.defaultUploadRole,
  );

  const readinessWarning = useMemo(
    () => getReadinessWarning(config.id, lang, workflowFiles),
    [config.id, lang, workflowFiles],
  );

  const computedPrompt = useMemo(
    () =>
      buildOptimizedPrompt({
        stage: config.id,
        lang,
        userGoal: session.goal || '',
        session,
        workflowFiles,
        pinnedFacts,
        rollingSummary,
      }),
    [config.id, lang, session, workflowFiles, pinnedFacts, rollingSummary],
  );

  const latestTuningResult = useMemo((): TuningResult | null => {
    const tuningMessages = stageMessages.filter(
      (m) =>
        m.role === 'assistant' &&
        m.metadata &&
        (m.metadata as Record<string, unknown>).workMode === 'prompt_tuning',
    );
    if (tuningMessages.length === 0) return null;
    const latest = tuningMessages[tuningMessages.length - 1];
    const parsed = parseTuningOutput(latest.content);
    return parsed.hasStructuredOutput ? parsed : null;
  }, [stageMessages]);

  const activePrompt = latestTuningResult?.finalPrompt || computedPrompt;
  const activeCheaper = latestTuningResult?.cheaperVariant || null;
  const isRefined = latestTuningResult?.hasStructuredOutput === true;

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    onCopyPrompt(text);
    setTimeout(() => setCopiedKey(null), 1500);
  }

  const handleSend = useCallback(() => {
    if (!userInput.trim() || streaming) return;
    onSend(
      userInput.trim(),
      mode,
      mode === 'file_review' ? stageDeliverableFiles[0]?.id : undefined,
    );
    setUserInput('');
  }, [userInput, streaming, mode, stageDeliverableFiles, onSend]);

  async function handleFileUploadInArea(e: React.ChangeEvent<HTMLInputElement>) {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    for (const file of Array.from(fileList)) {
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (!ext || !['md', 'txt', 'json'].includes(ext)) continue;
      const content = await file.text();
      await addWorkflowFile({
        sessionId: session.id,
        fileName: file.name,
        fileRole: config.defaultUploadRole,
        content,
        mimeType: file.type || 'text/plain',
      });
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  const isConfigured = settings.baseUrl && settings.apiKey && settings.model;

  const modeMessages = stageMessages.filter((m) => {
    if (!m.metadata) return true;
    const meta = m.metadata as Record<string, unknown>;
    return meta.workMode === mode || !meta.workMode;
  });

  return (
    <div className="flex flex-col">
      {/* Stage header info */}
      <div className="space-y-2 px-4 py-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">{config.label}</h3>
          {config.isPrimary ? (
            <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
              {lang === 'zh' ? '核心阶段' : 'Primary'}
            </span>
          ) : (
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              {lang === 'zh' ? '辅助' : 'Support'}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {lang === 'zh' ? config.intro.zh : config.intro.en}
        </p>

        <div className="flex flex-wrap items-center gap-3 text-xs">
          <span className="text-muted-foreground">
            {lang === 'zh' ? '预期产物：' : 'Deliverable: '}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-foreground">
              {lang === 'zh' ? config.deliverable.zh : config.deliverable.en}
            </code>
          </span>
        </div>
        {readinessWarning && (
          <div className="rounded border border-warning/30 bg-warning/5 px-3 py-2 text-xs text-warning">
            ⚠ {readinessWarning}
          </div>
        )}
      </div>

      {/* Mode Tabs */}
      <div className="border-y border-border">
        <div className="flex">
          <button
            onClick={() => setMode('prompt_tuning')}
            className={cn(
              'flex-1 border-b-2 px-4 py-2 text-xs font-medium transition-colors',
              mode === 'prompt_tuning'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {lang === 'zh' ? '优化本阶段 Prompt' : 'Tune Stage Prompt'}
          </button>
          <button
            onClick={() => setMode('file_review')}
            className={cn(
              'flex-1 border-b-2 px-4 py-2 text-xs font-medium transition-colors',
              mode === 'file_review'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {lang === 'zh' ? '审阅并修改阶段文件' : 'Review & Revise File'}
          </button>
        </div>
        <div className="bg-muted/30 px-4 py-1.5 text-[11px] text-muted-foreground">
          {mode === 'prompt_tuning'
            ? (lang === 'zh'
              ? '根据你的补充要求和上下文，微调当前阶段给外部 agent 的 prompt。'
              : 'Refine the optimized prompt for external agents based on your constraints and context.')
            : (lang === 'zh'
              ? '上传这个阶段的产物文件，讨论其中的问题，并生成修改该文件的 prompt。'
              : 'Upload the stage deliverable file, discuss issues, and generate a revision prompt.')}
        </div>
      </div>

      {/* Mode-specific content */}
      <div className="flex-1 overflow-y-auto">
        {mode === 'prompt_tuning' ? (
          <PromptTuningView
            config={config}
            lang={lang}
            activePrompt={activePrompt}
            activeCheaper={activeCheaper}
            isRefined={isRefined}
            tuningResult={latestTuningResult}
            copiedKey={copiedKey}
            onCopy={copy}
            relevantFiles={relevantFiles}
          />
        ) : (
          <FileReviewView
            config={config}
            lang={lang}
            deliverableFiles={stageDeliverableFiles}
            fileInputRef={fileInputRef}
            onFileUpload={handleFileUploadInArea}
          />
        )}

        {/* Streaming output */}
        {streaming && (
          <div className="border-t border-border px-4 py-3">
            <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <div className="h-2 w-2 animate-pulse rounded-full bg-primary" />
              {streamPhase === 'streaming'
                ? (lang === 'zh' ? '优化中...' : 'Refining...')
                : (lang === 'zh' ? '处理中...' : 'Finalizing...')}
            </div>
            {streamContent && (
              <pre className="whitespace-pre-wrap rounded bg-muted/30 p-3 text-xs">{streamContent}</pre>
            )}
          </div>
        )}

        {/* Collapsed history */}
        {modeMessages.length > 0 && (
          <div className="border-t border-border">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="w-full px-4 py-2 text-left text-xs font-medium text-muted-foreground hover:bg-muted/50"
            >
              {lang === 'zh' ? '交互记录' : 'Interaction Log'} ({modeMessages.length}) {showHistory ? '▾' : '▸'}
            </button>
            {showHistory && (
              <div className="space-y-2 px-4 pb-3">
                {modeMessages.map((m) => (
                  <div
                    key={m.id}
                    className={cn(
                      'rounded-md px-3 py-2 text-xs',
                      m.role === 'user' ? 'bg-muted/50' : 'border border-border',
                    )}
                  >
                    <div className="mb-1 text-[10px] font-medium uppercase text-muted-foreground">
                      {m.role}
                    </div>
                    <pre className="whitespace-pre-wrap">{m.content}</pre>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Next-step hint */}
      <div className="border-t border-border px-4 py-1.5 text-[11px] text-muted-foreground">
        <span className="font-medium">{lang === 'zh' ? '下一步：' : 'Next: '}</span>
        {lang === 'zh' ? config.nextStepHint.zh : config.nextStepHint.en}
      </div>

      {/* Input Area */}
      <div className="border-t border-border px-4 py-3">
        {!isConfigured && (
          <p className="mb-2 text-xs text-warning">
            {lang === 'zh' ? '请先在 Settings 中配置 LLM provider。' : 'Configure LLM provider in Settings first.'}
          </p>
        )}
        {error && (
          <p className="mb-2 text-xs text-destructive">{error}</p>
        )}
        <div className="flex gap-2">
          <textarea
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={
              mode === 'prompt_tuning'
                ? (lang === 'zh'
                  ? '补充约束、偏好或上下文，微调 prompt...'
                  : 'Add constraints, preferences, or context to tune the prompt...')
                : (lang === 'zh'
                  ? '描述文件中的问题、遗漏或需要修改的部分...'
                  : 'Describe issues, gaps, or changes needed in the file...')
            }
            rows={2}
            className="input-field flex-1 resize-none"
          />
          <div className="flex flex-col gap-1">
            <button
              onClick={handleSend}
              disabled={!userInput.trim() || streaming || !isConfigured}
              className="rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-40"
            >
              {streaming
                ? '...'
                : mode === 'prompt_tuning'
                  ? (lang === 'zh' ? '优化' : 'Tune')
                  : (lang === 'zh' ? '审阅' : 'Review')}
            </button>
            {streaming && (
              <button
                onClick={onAbort}
                className="rounded-md border border-destructive/30 px-4 py-1.5 text-xs text-destructive hover:bg-destructive/5"
              >
                {lang === 'zh' ? '停止' : 'Stop'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Prompt Tuning Sub-view ─── */

function PromptTuningView({
  config,
  lang,
  activePrompt,
  activeCheaper,
  isRefined,
  tuningResult,
  copiedKey,
  onCopy,
  relevantFiles,
}: {
  config: StageConfig;
  lang: OutputLanguage;
  activePrompt: string;
  activeCheaper: string | null;
  isRefined: boolean;
  tuningResult: TuningResult | null;
  copiedKey: string | null;
  onCopy: (text: string, key: string) => void;
  relevantFiles: WorkflowFile[];
}) {
  const [showBase, setShowBase] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  const hasDiagnostics =
    tuningResult &&
    (tuningResult.diagnosis || tuningResult.assumptionsAdded || tuningResult.suggestedPinnedFacts);

  return (
    <div className="space-y-3 px-4 py-3">
      {/* Referenced files */}
      {relevantFiles.length > 0 && (
        <div className="text-xs">
          <span className="font-medium text-muted-foreground">
            {lang === 'zh' ? '引用文件：' : 'Referenced: '}
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

      {/* ── PRIMARY: Current optimized prompt ── */}
      {activePrompt && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-foreground">
                {lang === 'zh' ? '优化后的 Prompt' : 'Optimized Prompt'}
              </span>
              {isRefined && (
                <span className="rounded bg-success/10 px-1.5 py-0.5 text-[10px] font-medium text-success">
                  {lang === 'zh' ? '已优化' : 'Refined'}
                </span>
              )}
            </div>
            <button
              onClick={() => onCopy(activePrompt, 'main')}
              className="rounded bg-primary px-2.5 py-1 text-[10px] font-medium text-primary-foreground hover:opacity-90"
            >
              {copiedKey === 'main' ? '✓ Copied' : 'Copy'}
            </button>
          </div>
          <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-md border border-primary/20 bg-primary/[0.03] px-3 py-2.5 text-xs leading-relaxed">
            {activePrompt}
          </pre>
        </div>
      )}

      {/* ── PRIMARY: Cheaper variant ── */}
      {activeCheaper && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-foreground/70">
              {lang === 'zh' ? '更省 token 版本' : 'Cheaper Variant'}
            </span>
            <button
              onClick={() => onCopy(activeCheaper, 'cheaper')}
              className="rounded border border-border px-2 py-0.5 text-[10px] text-muted-foreground hover:bg-muted"
            >
              {copiedKey === 'cheaper' ? '✓ Copied' : 'Copy'}
            </button>
          </div>
          <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-md border border-border bg-muted/30 px-3 py-2 text-xs leading-relaxed">
            {activeCheaper}
          </pre>
        </div>
      )}

      {/* ── SECONDARY: Diagnostics (collapsed) ── */}
      {hasDiagnostics && (
        <div className="border-t border-border pt-2">
          <button
            onClick={() => setShowDiagnostics(!showDiagnostics)}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            {showDiagnostics ? '▾' : '▸'}{' '}
            {lang === 'zh' ? '优化说明' : 'Optimization Details'}
          </button>
          {showDiagnostics && (
            <div className="mt-2 space-y-2">
              {tuningResult!.diagnosis && (
                <DiagnosticBlock
                  label={lang === 'zh' ? '诊断信息' : 'Diagnosis'}
                  content={tuningResult!.diagnosis}
                />
              )}
              {tuningResult!.assumptionsAdded && (
                <DiagnosticBlock
                  label={lang === 'zh' ? '补充假设' : 'Assumptions Added'}
                  content={tuningResult!.assumptionsAdded}
                />
              )}
              {tuningResult!.suggestedPinnedFacts && (
                <DiagnosticBlock
                  label={lang === 'zh' ? '可加入记忆' : 'Suggested Pinned Facts'}
                  content={tuningResult!.suggestedPinnedFacts}
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Base prompt (collapsible) ── */}
      <div className={cn(!hasDiagnostics && 'border-t border-border pt-2')}>
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
                  onCopy(
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
    </div>
  );
}

function DiagnosticBlock({ label, content }: { label: string; content: string }) {
  return (
    <div className="rounded bg-muted/30 px-3 py-2">
      <div className="mb-1 text-[10px] font-medium uppercase text-muted-foreground">{label}</div>
      <pre className="whitespace-pre-wrap text-[11px] text-muted-foreground">{content}</pre>
    </div>
  );
}

/* ─── File Review Sub-view ─── */

function FileReviewView({
  config,
  lang,
  deliverableFiles,
  fileInputRef,
  onFileUpload,
}: {
  config: StageConfig;
  lang: OutputLanguage;
  deliverableFiles: WorkflowFile[];
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="space-y-3 px-4 py-3">
      {/* Review guidance */}
      <div className="rounded bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        <span className="font-medium text-foreground/70">
          {lang === 'zh' ? '审阅重点：' : 'Review focus: '}
        </span>
        {lang === 'zh' ? config.fileReviewGuide.zh : config.fileReviewGuide.en}
      </div>

      {/* Stage deliverable files */}
      {deliverableFiles.length > 0 ? (
        <div className="space-y-2">
          <div className="text-xs font-medium text-foreground/70">
            {lang === 'zh' ? '已上传的阶段文件：' : 'Uploaded stage files:'}
          </div>
          {deliverableFiles.map((f) => (
            <div key={f.id} className="rounded border border-border bg-muted/20 px-3 py-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">{f.fileName}</span>
                <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">
                  {WORKFLOW_FILE_ROLE_LABELS[f.fileRole]}
                </span>
              </div>
              <pre className="mt-1 max-h-32 overflow-auto whitespace-pre-wrap text-[11px] text-muted-foreground">
                {f.content.length > 500
                  ? f.content.slice(0, 500) + '\n...'
                  : f.content}
              </pre>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded border border-dashed border-border bg-muted/10 px-4 py-6 text-center">
          <p className="text-xs text-muted-foreground">
            {lang === 'zh'
              ? `请先上传 ${config.deliverable.zh}，然后在下方描述需要修改的内容。`
              : `Upload ${config.deliverable.en} first, then describe what needs to change below.`}
          </p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="mt-2 rounded-md bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20"
          >
            {lang === 'zh' ? '上传文件' : 'Upload File'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_EXTENSIONS}
            multiple
            onChange={onFileUpload}
            className="hidden"
          />
        </div>
      )}

      {/* Expected output format */}
      <div className="rounded bg-muted/20 px-3 py-2 text-[11px] text-muted-foreground">
        <span className="font-medium text-foreground/60">
          {lang === 'zh' ? '预期输出格式：' : 'Expected output: '}
        </span>
        REVIEW_SUMMARY · KEY_ISSUES · REVISION_PROMPT · CHEAPER_REVISION_PROMPT
      </div>
    </div>
  );
}
