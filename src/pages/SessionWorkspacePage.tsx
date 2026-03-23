import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  useSession,
  updateSession,
  advanceStage,
  useSettings,
  useWorkflowFiles,
  autoTitleSession,
} from '@/hooks';
import { db } from '@/lib/storage/db';
import { sendChatCompletionStream, type LLMClientConfig } from '@/lib/llm';
import { composeContext, runValidationPipeline, getTemplate } from '@/lib/prompts';
import { estimateTokens, calculateContextBudget } from '@/lib/token-estimation';
import { generateId, nowISO, cn, setLastActiveSessionId } from '@/lib/utils';
import {
  getStageConfig,
  PRIMARY_STAGES,
  SUPPORTING_STAGES,
  buildFileReviewPrompt,
  buildTuningSystemPrompt,
  buildOptimizedPrompt,
  parseTuningOutput,
  enforceImmutableRequirements,
} from '@/lib/workflow';
import { StageWorkArea } from '@/components/workflow/StageWorkArea';
import { SessionRefinerPanel } from '@/components/workflow/SessionRefinerPanel';
import { FileUploadPanel } from '@/components/workflow/FileUploadPanel';
import { DiscussionPanel } from '@/components/session/DiscussionPanel';
import type { WorkflowStage, Message } from '@/types/data';
import type { StageWorkMode } from '@/lib/workflow/stage-config';
import type { PromptTemplateId } from '@/types/prompt';
import type { ChatMessage } from '@/types/llm';
import { WORKFLOW_STAGES } from '@/types/data';

type SessionView = 'workflow' | 'refiner';

export function SessionWorkspacePage() {
  const { id } = useParams<{ id: string }>();
  const sessionQuery = useSession(id);
  const session = sessionQuery.status === 'found' ? sessionQuery.session : null;
  const settings = useSettings();
  const workflowFiles = useWorkflowFiles(id);
  const [streaming, setStreaming] = useState(false);
  const [streamPhase, setStreamPhase] = useState<'idle' | 'streaming' | 'finalizing'>('idle');
  const [streamContent, setStreamContent] = useState('');
  const [error, setError] = useState('');
  const [hasSentFirstMessage, setHasSentFirstMessage] = useState(false);
  const [sessionView, setSessionView] = useState<SessionView>('workflow');
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (id && session) {
      setLastActiveSessionId(id);
    }
  }, [id, session]);

  const messages = useLiveQuery(
    () => (id ? db.messages.where('sessionId').equals(id).sortBy('createdAt') : []),
    [id],
    [],
  );

  const artifacts = useLiveQuery(
    () => (id ? db.artifacts.where('sessionId').equals(id).toArray() : []),
    [id],
    [],
  );

  const pinnedFacts = useLiveQuery(
    () => (id ? db.pinnedFacts.where('sessionId').equals(id).toArray() : []),
    [id],
    [],
  );

  const rollingSummaryRecord = useLiveQuery(
    () =>
      id
        ? db.summaries
            .where('sessionId')
            .equals(id)
            .filter((s) => s.summaryType === 'rolling')
            .last()
        : undefined,
    [id],
  );
  const rollingSummaryText = rollingSummaryRecord?.content;

  const currentStageMessages = messages.filter(
    (m) => m.stage === session?.currentStage,
  );
  const currentStageArtifacts = artifacts.filter(
    (a) => a.stage === session?.currentStage,
  );

  const totalTokens = messages.reduce((sum, m) => sum + m.tokenEstimate, 0);
  const budget = calculateContextBudget(
    totalTokens,
    settings.contextSoftLimit,
    settings.contextHardLimit,
  );

  const currentConfig = session ? getStageConfig(session.currentStage) : null;
  const lang = settings.outputLanguage || 'zh';

  const send = useCallback(async (userInput: string, mode: StageWorkMode, reviewFileId?: string) => {
    if (!id || !session || !userInput.trim() || streaming) return;

    if (!hasSentFirstMessage) {
      setHasSentFirstMessage(true);
      autoTitleSession(id, userInput.trim());
    }

    setStreaming(true);
    setStreamPhase('streaming');
    setStreamContent('');
    setError('');

    const userMsg: Message = {
      id: generateId(),
      sessionId: id,
      role: 'user',
      content: userInput.trim(),
      stage: session.currentStage,
      tokenEstimate: estimateTokens(userInput),
      includedInSummary: false,
      createdAt: nowISO(),
      metadata: { workMode: mode },
    };

    await db.messages.add(userMsg);

    try {
      let composedMessages: ChatMessage[];

      if (mode === 'prompt_tuning') {
        const currentOptimized = buildOptimizedPrompt({
          stage: session.currentStage,
          lang,
          userGoal: session.goal || '',
          session,
          workflowFiles,
          pinnedFacts,
        });
        const tuningSystem = buildTuningSystemPrompt({
          stage: session.currentStage,
          lang,
          userGoal: session.goal || '',
          userTuningRequest: userInput.trim(),
          currentOptimizedPrompt: currentOptimized,
          workflowFiles,
          pinnedFacts,
        });
        composedMessages = [
          { role: 'system', content: tuningSystem },
          { role: 'user', content: userInput.trim() },
        ];
      } else if (mode === 'file_review' && reviewFileId) {
        const reviewFile = workflowFiles.find((f) => f.id === reviewFileId);
        if (reviewFile) {
          const reviewPromptText = buildFileReviewPrompt({
            stage: session.currentStage,
            lang,
            userGoal: session.goal || '',
            reviewFile,
            userComments: userInput.trim(),
            pinnedFacts,
          });
          composedMessages = [
            { role: 'system', content: reviewPromptText },
            { role: 'user', content: userInput.trim() },
          ];
        } else {
          composedMessages = buildDefaultComposedMessages(userInput.trim());
        }
      } else {
        composedMessages = buildDefaultComposedMessages(userInput.trim());
      }

      function buildDefaultComposedMessages(input: string): ChatMessage[] {
        const stageTemplateId = `stage:${session!.currentStage}` as PromptTemplateId;
        const recentMsgs: ChatMessage[] = currentStageMessages.slice(-6).map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        }));
        const composed = composeContext({
          templateId: stageTemplateId,
          variant: 'standard',
          outputLanguage: settings.outputLanguage,
          userInput: input,
          session: session!,
          pinnedFacts,
          stageArtifacts: currentStageArtifacts,
          recentMessages: recentMsgs,
          workflowFiles,
        });
        return composed.messages;
      }

      const llmConfig: LLMClientConfig = {
        baseUrl: settings.baseUrl,
        apiKey: settings.apiKey,
        defaultModel: settings.model,
        defaultTemperature: settings.temperature,
        defaultMaxTokens: settings.maxTokens,
        debugMode: settings.debugMode,
      };

      abortRef.current = new AbortController();
      let fullContent = '';

      await sendChatCompletionStream(
        llmConfig,
        {
          messages: composedMessages,
          model: settings.model,
          signal: abortRef.current.signal,
        },
        (chunk) => {
          fullContent += chunk;
          setStreamContent(fullContent);
        },
      );

      setStreamPhase('finalizing');

      let finalContent = fullContent;

      if (mode === 'prompt_tuning') {
        const stageConf = getStageConfig(session.currentStage);
        const reqs = lang === 'zh'
          ? stageConf.immutableRequirements.zh
          : stageConf.immutableRequirements.en;
        const parsed = parseTuningOutput(fullContent);
        if (parsed.hasStructuredOutput && parsed.finalPrompt) {
          const enforced = enforceImmutableRequirements(parsed.finalPrompt, reqs, lang);
          if (enforced.injected.length > 0) {
            finalContent = fullContent.replace(parsed.finalPrompt, enforced.text);
          }
        }
      } else {
        const stageTemplateId = `stage:${session.currentStage}` as PromptTemplateId;
        const template = getTemplate(stageTemplateId);
        const validated = await runValidationPipeline(fullContent, template, 'standard');
        finalContent = validated.finalText || fullContent;
      }

      const assistantMsg: Message = {
        id: generateId(),
        sessionId: id,
        role: 'assistant',
        content: finalContent,
        stage: session.currentStage,
        tokenEstimate: estimateTokens(fullContent),
        includedInSummary: false,
        createdAt: nowISO(),
        metadata: { workMode: mode },
      };

      await db.messages.add(assistantMsg);
      setStreamContent('');
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      setError(e instanceof Error ? e.message : 'An error occurred');
    } finally {
      setStreaming(false);
      setStreamPhase('idle');
      abortRef.current = null;
    }
  }, [id, session, streaming, settings, currentStageMessages, pinnedFacts, currentStageArtifacts, hasSentFirstMessage, workflowFiles, lang]);

  function handleStageClick(stage: WorkflowStage) {
    if (!id || !session) return;
    updateSession(id, { currentStage: stage });
  }

  async function handleAdvanceStage() {
    if (!id || !session) return;
    const primaryIdx = PRIMARY_STAGES.indexOf(session.currentStage as typeof PRIMARY_STAGES[number]);
    if (primaryIdx >= 0 && primaryIdx < PRIMARY_STAGES.length - 1) {
      await advanceStage(id, PRIMARY_STAGES[primaryIdx + 1]);
    } else {
      const currentIdx = WORKFLOW_STAGES.indexOf(session.currentStage);
      const next = WORKFLOW_STAGES[currentIdx + 1];
      if (next) await advanceStage(id, next);
    }
  }

  async function handleSaveArtifact() {
    if (!id || !session) return;
    const lastAssistant = [...messages]
      .reverse()
      .find((m) => m.role === 'assistant' && m.stage === session.currentStage);
    if (!lastAssistant) return;

    await db.artifacts.add({
      id: generateId(),
      sessionId: id,
      stage: session.currentStage,
      artifactType: 'refined_prompt',
      title: `${session.currentStage} output`,
      content: lastAssistant.content,
      version: 1,
      createdAt: nowISO(),
      updatedAt: nowISO(),
    });
  }

  async function handleAddFact(content: string) {
    if (!id) return;
    await db.pinnedFacts.add({
      id: generateId(),
      sessionId: id,
      category: 'constraint',
      content,
      priority: 'normal',
      createdAt: nowISO(),
      updatedAt: nowISO(),
    });
  }

  async function handleRemoveFact(factId: string) {
    await db.pinnedFacts.delete(factId);
  }

  if (sessionQuery.status === 'loading') {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Loading session...
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        Session not found
      </div>
    );
  }

  const canAdvance = PRIMARY_STAGES.indexOf(session.currentStage as typeof PRIMARY_STAGES[number]) < PRIMARY_STAGES.length - 1
    || WORKFLOW_STAGES.indexOf(session.currentStage) < WORKFLOW_STAGES.length - 1;

  return (
    <div className="flex h-full">
      {/* Main Panel */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Session Title + Actions */}
        <div className="border-b border-border px-4 py-3">
          <div className="flex items-center justify-between">
            <input
              type="text"
              value={session.title}
              onChange={(e) => id && updateSession(id, { title: e.target.value })}
              className="w-full border-none bg-transparent text-base font-semibold outline-none placeholder:text-muted-foreground"
              placeholder="Session title..."
            />
            <div className="flex shrink-0 gap-2 pl-3">
              {sessionView === 'workflow' && (
                <button
                  onClick={handleSaveArtifact}
                  className="rounded-md border border-border px-3 py-1 text-xs hover:bg-muted"
                >
                  Save Artifact
                </button>
              )}
              {canAdvance && sessionView === 'workflow' && (
                <button
                  onClick={handleAdvanceStage}
                  className="rounded-md bg-primary px-3 py-1 text-xs text-primary-foreground hover:opacity-90"
                >
                  {lang === 'zh' ? '下一阶段 →' : 'Next Stage →'}
                </button>
              )}
            </div>
          </div>
          {session.goal && (
            <p className="mt-0.5 text-xs text-muted-foreground">{session.goal}</p>
          )}
        </div>

        {/* Primary session-level view switcher */}
        <div className="flex items-center gap-1 border-b border-border px-4 py-2">
          <button
            onClick={() => setSessionView('workflow')}
            className={cn(
              'rounded-md px-3.5 py-1.5 text-xs font-medium transition-colors',
              sessionView === 'workflow'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            {lang === 'zh' ? '⚡ 阶段工作流' : '⚡ Stage Workflow'}
          </button>
          <button
            onClick={() => setSessionView('refiner')}
            className={cn(
              'rounded-md px-3.5 py-1.5 text-xs font-medium transition-colors',
              sessionView === 'refiner'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            {lang === 'zh' ? '✨ Prompt 精炼' : '✨ Prompt Refiner'}
          </button>
        </div>

        {/* Main content area — switches between Workflow and Refiner */}
        <div className="flex-1 overflow-y-auto">
          {sessionView === 'workflow' ? (
            <>
              {/* Stage Progress Bar — only visible in workflow mode */}
              <div className="border-b border-border px-4 py-2">
                <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  {lang === 'zh' ? '核心流程' : 'Primary Flow'}
                </div>
                <div className="flex items-center gap-1 overflow-x-auto">
                  {PRIMARY_STAGES.map((stage) => {
                    const completed = session.completedStages.includes(stage);
                    const current = stage === session.currentStage;
                    const cfg = getStageConfig(stage);
                    return (
                      <button
                        key={stage}
                        onClick={() => handleStageClick(stage)}
                        className={cn(
                          'shrink-0 rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                          current && 'bg-primary text-primary-foreground',
                          completed && !current && 'bg-success/10 text-success',
                          !completed && !current && 'text-muted-foreground hover:bg-muted',
                        )}
                      >
                        {completed ? '✓' : current ? '●' : '○'} {cfg.label}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-1 flex items-center gap-1">
                  <span className="text-[10px] text-muted-foreground/50">
                    {lang === 'zh' ? '辅助：' : 'Support: '}
                  </span>
                  {SUPPORTING_STAGES.map((stage) => {
                    const current = stage === session.currentStage;
                    const cfg = getStageConfig(stage);
                    return (
                      <button
                        key={stage}
                        onClick={() => handleStageClick(stage)}
                        className={cn(
                          'shrink-0 rounded px-1.5 py-0.5 text-[10px] transition-colors',
                          current ? 'bg-muted font-medium text-foreground' : 'text-muted-foreground/50 hover:text-muted-foreground',
                        )}
                      >
                        {cfg.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {currentConfig && (
                <StageWorkArea
                  config={currentConfig}
                  lang={lang}
                  session={session}
                  settings={settings}
                  workflowFiles={workflowFiles}
                  pinnedFacts={pinnedFacts}
                  stageMessages={currentStageMessages}
                  rollingSummary={rollingSummaryText}
                  streaming={streaming}
                  streamPhase={streamPhase}
                  streamContent={streamContent}
                  error={error}
                  onSend={send}
                  onAbort={() => abortRef.current?.abort()}
                  onCopyPrompt={() => {}}
                />
              )}

              {currentStageArtifacts.length > 0 && (
                <div className="border-t border-border px-4 py-2">
                  <div className="text-xs font-medium uppercase text-muted-foreground">
                    Artifacts ({currentStageArtifacts.length})
                  </div>
                  <div className="mt-1 space-y-1">
                    {currentStageArtifacts.map((a) => (
                      <details key={a.id} className="text-sm">
                        <summary className="cursor-pointer text-xs hover:text-foreground">
                          {a.artifactType} v{a.version} — {a.title}
                        </summary>
                        <pre className="mt-1 whitespace-pre-wrap rounded bg-muted/50 p-2 text-xs">
                          {a.content}
                        </pre>
                      </details>
                    ))}
                  </div>
                </div>
              )}

              {session.currentStage === 'discussion' && (
                <div className="border-t border-border px-4 py-3">
                  <DiscussionPanel sessionId={id!} />
                </div>
              )}
            </>
          ) : (
            <SessionRefinerPanel
              session={session}
              settings={settings}
              lang={lang}
              pinnedFacts={pinnedFacts}
              workflowFiles={workflowFiles}
              allMessages={messages}
              rollingSummary={rollingSummaryText}
            />
          )}
        </div>
      </div>

      {/* Context Panel (Right) */}
      <aside className="hidden w-72 flex-col border-l border-border lg:flex">
        {/* Context Budget */}
        <div className="border-b border-border px-3 py-2">
          <div className="text-xs font-medium uppercase text-muted-foreground">
            Context Budget
          </div>
          <div className="mt-1">
            <div className="h-2 rounded-full bg-muted">
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  budget.mustCompress
                    ? 'bg-destructive'
                    : budget.shouldCompress
                      ? 'bg-warning'
                      : 'bg-success',
                )}
                style={{ width: `${Math.min(budget.usagePercent, 100)}%` }}
              />
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {budget.currentTokens} / {budget.hardLimit} tokens ({budget.usagePercent}%)
            </div>
          </div>
        </div>

        {/* Workflow Files */}
        <div className="border-b border-border px-3 py-2">
          <FileUploadPanel
            sessionId={id!}
            activeFileRoles={currentConfig?.relevantFileRoles}
            defaultRole={currentConfig?.defaultUploadRole}
          />
        </div>

        {/* Pinned Facts */}
        <div className="flex-1 overflow-y-auto border-b border-border px-3 py-2">
          <div className="mb-1 flex items-center justify-between">
            <div className="text-xs font-medium uppercase text-muted-foreground">
              Pinned Facts ({pinnedFacts.length})
            </div>
            <button
              onClick={() => {
                const content = prompt(lang === 'zh' ? '输入要固定的事实：' : 'Enter pinned fact:');
                if (content) handleAddFact(content);
              }}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              + Add
            </button>
          </div>
          <div className="space-y-1">
            {pinnedFacts.map((f) => (
              <div
                key={f.id}
                className="flex items-start gap-1 rounded bg-muted/30 px-2 py-1 text-xs"
              >
                <span
                  className={cn(
                    'mt-0.5 shrink-0 rounded px-1 text-[10px] font-medium',
                    f.priority === 'critical' && 'bg-destructive/10 text-destructive',
                    f.priority === 'high' && 'bg-warning/10 text-warning',
                    f.priority === 'normal' && 'bg-muted text-muted-foreground',
                  )}
                >
                  {f.category}
                </span>
                <span className="flex-1">{f.content}</span>
                <button
                  onClick={() => handleRemoveFact(f.id)}
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* All Artifacts */}
        <div className="overflow-y-auto px-3 py-2">
          <div className="text-xs font-medium uppercase text-muted-foreground">
            All Artifacts ({artifacts.length})
          </div>
          <div className="mt-1 space-y-1">
            {artifacts.map((a) => (
              <details key={a.id} className="text-xs">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                  {a.artifactType} v{a.version}
                </summary>
                <pre className="mt-1 max-h-32 overflow-auto whitespace-pre-wrap rounded bg-muted/50 p-1.5">
                  {a.content.slice(0, 500)}
                  {a.content.length > 500 ? '...' : ''}
                </pre>
              </details>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}
