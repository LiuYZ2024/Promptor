import { useState, useCallback } from 'react';
import type { OutputLanguage, Session, Settings, PinnedFact, WorkflowFile, Message } from '@/types/data';
import type { PromptVariant } from '@/types/prompt';
import type { ChatMessage } from '@/types/llm';
import { composeContext, getTemplate } from '@/lib/prompts';
import { sendChatCompletionStream, type LLMClientConfig } from '@/lib/llm';
import { parseTuningOutput } from '@/lib/workflow';
import type { TuningResult } from '@/lib/workflow';
import { cn } from '@/lib/utils';

interface SessionRefinerPanelProps {
  session: Session;
  settings: Settings;
  lang: OutputLanguage;
  pinnedFacts: PinnedFact[];
  workflowFiles: WorkflowFile[];
  recentMessages: Message[];
  rollingSummary?: string;
}

export function SessionRefinerPanel({
  session,
  settings,
  lang,
  pinnedFacts,
  workflowFiles,
  recentMessages,
  rollingSummary,
}: SessionRefinerPanelProps) {
  const [rawPrompt, setRawPrompt] = useState('');
  const [variant, setVariant] = useState<PromptVariant>('standard');
  const [streaming, setStreaming] = useState(false);
  const [streamPhase, setStreamPhase] = useState<'idle' | 'streaming' | 'finalizing'>('idle');
  const [streamContent, setStreamContent] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState<TuningResult | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const isConfigured = settings.baseUrl && settings.apiKey && settings.model;

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  }

  const refine = useCallback(async () => {
    if (!rawPrompt.trim() || !isConfigured || streaming) return;

    setStreaming(true);
    setStreamPhase('streaming');
    setStreamContent('');
    setError('');
    setResult(null);

    try {
      const recentChatMsgs: ChatMessage[] = recentMessages.slice(-8).map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

      const composed = composeContext({
        templateId: 'task:prompt_refinement',
        variant,
        outputLanguage: lang,
        userInput: rawPrompt,
        session,
        pinnedFacts,
        stageArtifacts: [],
        recentMessages: recentChatMsgs,
        workflowFiles,
        rollingSummary: rollingSummary ? { id: '', sessionId: session.id, summaryType: 'rolling', content: rollingSummary, sourceRange: '', createdAt: '' } : undefined,
        templateInputs: {
          rawPrompt,
          taskType: session.taskType,
          mode: variant,
        },
      });

      const config: LLMClientConfig = {
        baseUrl: settings.baseUrl,
        apiKey: settings.apiKey,
        defaultModel: settings.model,
        defaultTemperature: settings.temperature,
        defaultMaxTokens: settings.maxTokens,
        debugMode: settings.debugMode,
      };

      const abortController = new AbortController();
      let fullContent = '';

      await sendChatCompletionStream(
        config,
        {
          messages: composed.messages,
          model: settings.model,
          signal: abortController.signal,
        },
        (chunk) => {
          fullContent += chunk;
          setStreamContent(fullContent);
        },
      );

      setStreamPhase('finalizing');
      const parsed = parseTuningOutput(fullContent);
      setResult(parsed.hasStructuredOutput ? parsed : {
        finalPrompt: fullContent,
        cheaperVariant: null,
        diagnosis: null,
        assumptionsAdded: null,
        suggestedPinnedFacts: null,
        hasStructuredOutput: false,
      });
      setStreamContent('');
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      setError(e instanceof Error ? e.message : 'An error occurred');
    } finally {
      setStreaming(false);
      setStreamPhase('idle');
    }
  }, [rawPrompt, variant, lang, session, settings, pinnedFacts, workflowFiles, recentMessages, rollingSummary, isConfigured, streaming]);

  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const hasDiagnostics = result && (result.diagnosis || result.assumptionsAdded || result.suggestedPinnedFacts);

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="px-4 py-3">
        <h3 className="text-sm font-semibold">
          {lang === 'zh' ? 'Prompt 精炼' : 'Prompt Refiner'}
        </h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {lang === 'zh'
            ? '基于当前会话的上下文、记忆和文件，把粗糙的 prompt 转化为高质量结构化 prompt。'
            : 'Transform a rough prompt into a structured, high-quality one using this session\'s context, memory, and files.'}
        </p>
      </div>

      {/* Context indicators */}
      <div className="flex flex-wrap items-center gap-2 border-y border-border bg-muted/20 px-4 py-2 text-[11px] text-muted-foreground">
        <span className="font-medium">
          {lang === 'zh' ? '上下文：' : 'Context: '}
        </span>
        <span className="rounded bg-muted px-1.5 py-0.5">
          {lang === 'zh' ? `阶段: ${session.currentStage}` : `Stage: ${session.currentStage}`}
        </span>
        {pinnedFacts.length > 0 && (
          <span className="rounded bg-primary/10 px-1.5 py-0.5 text-primary">
            {pinnedFacts.length} {lang === 'zh' ? '条记忆' : 'facts'}
          </span>
        )}
        {workflowFiles.length > 0 && (
          <span className="rounded bg-primary/10 px-1.5 py-0.5 text-primary">
            {workflowFiles.length} {lang === 'zh' ? '个文件' : 'files'}
          </span>
        )}
        {recentMessages.length > 0 && (
          <span className="rounded bg-muted px-1.5 py-0.5">
            {recentMessages.length} {lang === 'zh' ? '条对话' : 'messages'}
          </span>
        )}
      </div>

      {/* Input */}
      <div className="space-y-3 px-4 py-3">
        <div>
          <label className="mb-1 block text-xs font-medium">
            {lang === 'zh' ? '你的原始 prompt' : 'Your raw prompt'}
          </label>
          <textarea
            value={rawPrompt}
            onChange={(e) => setRawPrompt(e.target.value)}
            placeholder={
              lang === 'zh'
                ? '粘贴你的粗糙 prompt，系统会结合当前会话上下文进行精炼...'
                : 'Paste your rough prompt — it will be refined using this session\'s context...'
            }
            rows={5}
            className="input-field w-full resize-y"
          />
        </div>

        <div className="flex items-end gap-3">
          <div>
            <label className="mb-1 block text-[10px] text-muted-foreground">
              {lang === 'zh' ? '变体' : 'Variant'}
            </label>
            <select
              value={variant}
              onChange={(e) => setVariant(e.target.value as PromptVariant)}
              className="input-field text-xs"
            >
              <option value="standard">Standard</option>
              <option value="strict">Strict</option>
              <option value="lowCost">Low Cost</option>
              <option value="minimal">Minimal</option>
            </select>
          </div>

          <button
            onClick={refine}
            disabled={streaming || !rawPrompt.trim() || !isConfigured}
            className="rounded-md bg-primary px-5 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-40"
          >
            {streaming ? '...' : lang === 'zh' ? '精炼' : 'Refine'}
          </button>
        </div>

        {!isConfigured && (
          <p className="text-xs text-warning">
            {lang === 'zh' ? '请先在 Settings 中配置 LLM provider。' : 'Configure LLM provider in Settings first.'}
          </p>
        )}
        {error && (
          <p className="text-xs text-destructive">{error}</p>
        )}
      </div>

      {/* Streaming preview */}
      {streaming && (
        <div className="border-t border-border px-4 py-3">
          <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <div className="h-2 w-2 animate-pulse rounded-full bg-primary" />
            {streamPhase === 'streaming'
              ? (lang === 'zh' ? '精炼中...' : 'Refining...')
              : (lang === 'zh' ? '处理中...' : 'Finalizing...')}
          </div>
          {streamContent && (
            <pre className="whitespace-pre-wrap rounded bg-muted/30 p-3 text-xs">{streamContent}</pre>
          )}
        </div>
      )}

      {/* Results */}
      {result && !streaming && (
        <div className="space-y-3 border-t border-border px-4 py-3">
          {/* Primary: Refined Prompt */}
          {result.finalPrompt && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">
                  {lang === 'zh' ? '精炼后的 Prompt' : 'Refined Prompt'}
                </span>
                <button
                  onClick={() => copy(result.finalPrompt!, 'main')}
                  className="rounded bg-primary px-2.5 py-1 text-[10px] font-medium text-primary-foreground hover:opacity-90"
                >
                  {copiedKey === 'main' ? '✓ Copied' : 'Copy'}
                </button>
              </div>
              <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-md border border-primary/20 bg-primary/[0.03] px-3 py-2.5 text-xs leading-relaxed">
                {result.finalPrompt}
              </pre>
            </div>
          )}

          {/* Secondary: Cheaper Variant */}
          {result.cheaperVariant && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-foreground/70">
                  {lang === 'zh' ? '更省 token 版本' : 'Cheaper Variant'}
                </span>
                <button
                  onClick={() => copy(result.cheaperVariant!, 'cheaper')}
                  className="rounded border border-border px-2 py-0.5 text-[10px] text-muted-foreground hover:bg-muted"
                >
                  {copiedKey === 'cheaper' ? '✓ Copied' : 'Copy'}
                </button>
              </div>
              <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-md border border-border bg-muted/30 px-3 py-2 text-xs leading-relaxed">
                {result.cheaperVariant}
              </pre>
            </div>
          )}

          {/* Tertiary: Diagnostics (collapsed) */}
          {hasDiagnostics && (
            <div className="border-t border-border pt-2">
              <button
                onClick={() => setShowDiagnostics(!showDiagnostics)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                {showDiagnostics ? '▾' : '▸'}{' '}
                {lang === 'zh' ? '诊断信息' : 'Diagnostics'}
              </button>
              {showDiagnostics && (
                <div className="mt-2 space-y-2">
                  {result.diagnosis && (
                    <CollapsedBlock
                      label={lang === 'zh' ? '诊断' : 'Diagnosis'}
                      content={result.diagnosis}
                    />
                  )}
                  {result.assumptionsAdded && (
                    <CollapsedBlock
                      label={lang === 'zh' ? '补充假设' : 'Assumptions'}
                      content={result.assumptionsAdded}
                    />
                  )}
                  {result.suggestedPinnedFacts && (
                    <CollapsedBlock
                      label={lang === 'zh' ? '可加入记忆' : 'Suggested Facts'}
                      content={result.suggestedPinnedFacts}
                    />
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CollapsedBlock({ label, content }: { label: string; content: string }) {
  return (
    <div className="rounded bg-muted/30 px-3 py-2">
      <div className="mb-1 text-[10px] font-medium uppercase text-muted-foreground">{label}</div>
      <pre className="whitespace-pre-wrap text-[11px] text-muted-foreground">{content}</pre>
    </div>
  );
}
