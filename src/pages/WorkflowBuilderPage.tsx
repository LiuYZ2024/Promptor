import { useState, useCallback } from 'react';
import { useSettings } from '@/hooks';
import { useStreamingGeneration } from '@/hooks';
import { sendChatCompletion, type LLMClientConfig } from '@/lib/llm';
import { composeContext, getTemplate } from '@/lib/prompts';
import type { PromptVariant } from '@/types/prompt';
import type { ChatMessage } from '@/types/llm';
import type { OutputLanguage } from '@/types/data';

interface StageCard {
  name: string;
  purpose: string;
  prompt: string;
  lowCostPrompt: string;
  artifacts: string;
}

interface WorkflowResult {
  goal: string;
  context: string;
  assumptions: string;
  stages: StageCard[];
  suggestedFirstStep: string;
  rawText: string;
}

export function WorkflowBuilderPage() {
  const settings = useSettings();
  const [requirement, setRequirement] = useState('');
  const [taskType, setTaskType] = useState('coding');
  const [agentTarget, setAgentTarget] = useState('cursor');
  const [hasCodebase, setHasCodebase] = useState(false);
  const [variant, setVariant] = useState<PromptVariant>('standard');
  const [outputLang, setOutputLang] = useState<OutputLanguage>(
    settings.outputLanguage || 'zh',
  );
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [result, setResult] = useState<WorkflowResult | null>(null);

  const gen = useStreamingGeneration();
  const isConfigured = settings.baseUrl && settings.apiKey && settings.model;

  const generate = useCallback(async () => {
    if (!requirement.trim() || !isConfigured) return;
    setResult(null);

    const composed = composeContext({
      templateId: 'task:workflow_generation',
      variant,
      outputLanguage: outputLang,
      userInput: requirement,
      templateInputs: {
        userRequirement: requirement,
        taskType,
        agentTarget,
        hasCodebase: hasCodebase ? 'yes' : 'no',
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

    const llmCall = async (messages: ChatMessage[]) => {
      const resp = await sendChatCompletion(config, {
        messages,
        model: settings.model,
      });
      return resp.content;
    };

    const template = getTemplate('task:workflow_generation');

    const validated = await gen.generate({
      config,
      messages: composed.messages,
      model: settings.model,
      template,
      variant,
      llmCallFn: llmCall,
    });

    if (validated) {
      const parsed = parseWorkflowResult(
        validated.finalText,
        validated.finalSections,
      );
      setResult(parsed);
    }
  }, [requirement, taskType, agentTarget, hasCodebase, variant, outputLang, settings, isConfigured, gen]);

  function handleCopy(text: string, idx: number) {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <h1 className="mb-1 text-xl font-semibold">Workflow Builder</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Generate a complete 8-stage workflow from your requirement.
      </p>

      {!isConfigured && (
        <div className="mb-4 rounded-md border border-warning/30 bg-warning/5 px-4 py-3 text-sm text-warning">
          Configure your LLM provider in Settings before generating workflows.
        </div>
      )}

      <div className="mb-6 space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">
            What do you want to build?
          </label>
          <textarea
            value={requirement}
            onChange={(e) => setRequirement(e.target.value)}
            placeholder="Describe your task, project, or research goal..."
            rows={4}
            className="input-field w-full resize-y"
          />
        </div>

        <div className="flex flex-wrap gap-4">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">
              Task Type
            </label>
            <select
              value={taskType}
              onChange={(e) => setTaskType(e.target.value)}
              className="input-field"
            >
              <option value="coding">Coding</option>
              <option value="research">Research</option>
              <option value="mixed">Mixed</option>
              <option value="discussion">Discussion</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs text-muted-foreground">
              Agent Target
            </label>
            <select
              value={agentTarget}
              onChange={(e) => setAgentTarget(e.target.value)}
              className="input-field"
            >
              <option value="cursor">Cursor</option>
              <option value="claude-code">Claude Code</option>
              <option value="cline">Cline</option>
              <option value="roo">Roo</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs text-muted-foreground">
              Variant
            </label>
            <select
              value={variant}
              onChange={(e) => setVariant(e.target.value as PromptVariant)}
              className="input-field"
            >
              <option value="standard">Standard</option>
              <option value="strict">Strict</option>
              <option value="lowCost">Low Cost</option>
              <option value="minimal">Minimal</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs text-muted-foreground">
              Output Language
            </label>
            <select
              value={outputLang}
              onChange={(e) => setOutputLang(e.target.value as OutputLanguage)}
              className="input-field"
            >
              <option value="zh">中文</option>
              <option value="en">English</option>
            </select>
          </div>

          <label className="flex items-center gap-2 self-end text-sm">
            <input
              type="checkbox"
              checked={hasCodebase}
              onChange={(e) => setHasCodebase(e.target.checked)}
              className="rounded"
            />
            Has existing codebase
          </label>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={generate}
            disabled={gen.isActive || !requirement.trim() || !isConfigured}
            className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-40"
          >
            {gen.isActive ? 'Generating...' : 'Generate Workflow'}
          </button>
          {gen.isActive && (
            <button
              onClick={gen.cancel}
              className="rounded-md border border-destructive/30 px-4 py-2 text-sm text-destructive hover:bg-destructive/5"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {gen.error && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {gen.error}
          {gen.rawFallback && (
            <details className="mt-2">
              <summary className="cursor-pointer text-xs font-medium">
                Show raw output
              </summary>
              <pre className="mt-1 max-h-60 overflow-auto whitespace-pre-wrap rounded bg-muted/50 p-2 text-xs text-foreground">
                {gen.rawFallback}
              </pre>
            </details>
          )}
        </div>
      )}

      {/* Streaming preview */}
      {(gen.phase === 'streaming' || gen.phase === 'finalizing') && (
        <div className="mb-4 rounded-md border border-border bg-muted/20 p-4">
          <div className="mb-2 flex items-center gap-2">
            <div className="h-2 w-2 animate-pulse rounded-full bg-primary" />
            <span className="text-xs font-medium text-muted-foreground">
              {gen.phase === 'streaming' ? 'Generating...' : 'Finalizing...'}
            </span>
          </div>
          <pre className="whitespace-pre-wrap text-sm">{gen.streamText}</pre>
        </div>
      )}

      {/* Parsed workflow result */}
      {result && (
        <div className="space-y-4">
          {gen.finalResult?.warnings && gen.finalResult.warnings.length > 0 && (
            <div className="rounded-md border border-warning/30 bg-warning/5 px-4 py-2 text-xs text-warning">
              {gen.finalResult.warnings.map((w, i) => (
                <div key={i}>{w}</div>
              ))}
            </div>
          )}

          {result.goal && (
            <div className="rounded-md border border-border bg-muted/30 px-4 py-3">
              <div className="text-xs font-medium uppercase text-muted-foreground">Goal</div>
              <p className="mt-1 text-sm">{result.goal}</p>
            </div>
          )}

          <div className="space-y-3">
            {result.stages.map((stage, i) => (
              <div
                key={i}
                className="rounded-md border border-border bg-background p-4"
              >
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">
                    Stage {i + 1}: {stage.name}
                  </h3>
                  <button
                    onClick={() => handleCopy(stage.prompt, i)}
                    className="rounded px-2 py-0.5 text-xs text-muted-foreground hover:bg-muted"
                  >
                    {copiedIdx === i ? 'Copied!' : 'Copy Prompt'}
                  </button>
                </div>
                <p className="mb-2 text-sm text-muted-foreground">
                  {stage.purpose}
                </p>
                <details className="text-sm">
                  <summary className="cursor-pointer font-medium text-muted-foreground hover:text-foreground">
                    View prompt
                  </summary>
                  <pre className="mt-2 whitespace-pre-wrap rounded bg-muted/50 p-3 text-xs">
                    {stage.prompt}
                  </pre>
                  {stage.lowCostPrompt && (
                    <>
                      <div className="mt-2 text-xs font-medium text-muted-foreground">
                        Low-cost variant:
                      </div>
                      <pre className="mt-1 whitespace-pre-wrap rounded bg-muted/50 p-3 text-xs">
                        {stage.lowCostPrompt}
                      </pre>
                    </>
                  )}
                </details>
                {stage.artifacts && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    Expected artifacts: {stage.artifacts}
                  </div>
                )}
              </div>
            ))}
          </div>

          {result.suggestedFirstStep && (
            <div className="rounded-md border border-border bg-muted/30 px-4 py-3">
              <div className="text-xs font-medium uppercase text-muted-foreground">
                Suggested First Step
              </div>
              <p className="mt-1 text-sm">{result.suggestedFirstStep}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function parseWorkflowResult(
  text: string,
  sections: Map<string, string>,
): WorkflowResult {
  const stagesText = sections.get('WORKFLOW_STAGES') ?? '';

  const stages: StageCard[] = [];
  const stagePattern = /###?\s*Stage\s*\d+[:\s]+(.+?)(?=\n###?\s*Stage|\n##\s|$)/gs;
  let match;

  while ((match = stagePattern.exec(stagesText)) !== null) {
    const block = match[0] ?? '';
    const nameMatch = /Stage\s*\d+[:\s]+(.+)/.exec(block);
    const name = nameMatch?.[1]?.trim() ?? `Stage ${stages.length + 1}`;

    const purpose = extractField(block, 'Purpose') || extractField(block, 'purpose') || '';
    const prompt = extractField(block, 'Prompt') || extractField(block, 'prompt') || '';
    const lowCostPrompt =
      extractField(block, 'Low-cost prompt') ||
      extractField(block, 'Low cost prompt') ||
      extractField(block, 'low-cost prompt') ||
      '';
    const artifacts =
      extractField(block, 'Artifacts') ||
      extractField(block, 'artifacts') ||
      extractField(block, 'Expected artifacts') ||
      '';

    stages.push({ name, purpose, prompt, lowCostPrompt, artifacts });
  }

  if (stages.length === 0 && stagesText) {
    stages.push({
      name: 'Full Workflow',
      purpose: '',
      prompt: stagesText,
      lowCostPrompt: '',
      artifacts: '',
    });
  }

  return {
    goal: sections.get('GOAL') ?? '',
    context: sections.get('CONTEXT') ?? '',
    assumptions: sections.get('ASSUMPTIONS') ?? '',
    stages,
    suggestedFirstStep: sections.get('SUGGESTED_FIRST_STEP') ?? '',
    rawText: text,
  };
}

function extractField(text: string, fieldName: string): string {
  const pattern = new RegExp(
    `[-•*]\\s*${fieldName}\\s*:\\s*(.+?)(?=\\n[-•*]\\s*\\w|\\n###|$)`,
    'is',
  );
  const match = pattern.exec(text);
  return match?.[1]?.trim() ?? '';
}
