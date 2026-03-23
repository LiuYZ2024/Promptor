import { useState, useCallback } from 'react';
import { useSettings } from '@/hooks';
import { useStreamingGeneration } from '@/hooks';
import { sendChatCompletion, type LLMClientConfig } from '@/lib/llm';
import { composeContext, getTemplate } from '@/lib/prompts';
import type { PromptVariant } from '@/types/prompt';
import type { ChatMessage } from '@/types/llm';
import type { OutputLanguage } from '@/types/data';

export function PromptRefinerPage() {
  const settings = useSettings();
  const [rawPrompt, setRawPrompt] = useState('');
  const [taskType, setTaskType] = useState('coding');
  const [variant, setVariant] = useState<PromptVariant>('standard');
  const [outputLang, setOutputLang] = useState<OutputLanguage>(
    settings.outputLanguage || 'zh',
  );
  const [copied, setCopied] = useState('');

  const gen = useStreamingGeneration();
  const isConfigured = settings.baseUrl && settings.apiKey && settings.model;

  const refine = useCallback(async () => {
    if (!rawPrompt.trim() || !isConfigured) return;

    const composed = composeContext({
      templateId: 'task:prompt_refinement',
      variant,
      outputLanguage: outputLang,
      userInput: rawPrompt,
      templateInputs: {
        rawPrompt,
        taskType,
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

    const llmCall = async (messages: ChatMessage[]) => {
      const resp = await sendChatCompletion(config, {
        messages,
        model: settings.model,
      });
      return resp.content;
    };

    const template = getTemplate('task:prompt_refinement');

    await gen.generate({
      config,
      messages: composed.messages,
      model: settings.model,
      template,
      variant,
      llmCallFn: llmCall,
    });
  }, [rawPrompt, taskType, variant, outputLang, settings, isConfigured, gen]);

  function handleCopy(key: string, text: string) {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(''), 2000);
  }

  const sections = gen.finalResult?.finalSections;

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <h1 className="mb-1 text-xl font-semibold">Prompt Refiner</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Transform a rough prompt into a high-quality, structured one.
      </p>

      {!isConfigured && (
        <div className="mb-4 rounded-md border border-warning/30 bg-warning/5 px-4 py-3 text-sm text-warning">
          Configure your LLM provider in Settings first.
        </div>
      )}

      <div className="mb-6 space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">
            Your raw prompt
          </label>
          <textarea
            value={rawPrompt}
            onChange={(e) => setRawPrompt(e.target.value)}
            placeholder="Paste your rough, unstructured prompt here..."
            rows={6}
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
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={refine}
            disabled={gen.isActive || !rawPrompt.trim() || !isConfigured}
            className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-40"
          >
            {gen.isActive ? 'Refining...' : 'Refine Prompt'}
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

      {/* Parsed result */}
      {sections && (
        <div className="space-y-4">
          {gen.finalResult?.warnings && gen.finalResult.warnings.length > 0 && (
            <div className="rounded-md border border-warning/30 bg-warning/5 px-4 py-2 text-xs text-warning">
              {gen.finalResult.warnings.map((w, i) => (
                <div key={i}>{w}</div>
              ))}
            </div>
          )}
          <ResultBlock
            title="Prompt Diagnosis"
            content={sections.get('DIAGNOSIS') ?? ''}
            onCopy={(t) => handleCopy('DIAGNOSIS', t)}
            copied={copied === 'DIAGNOSIS'}
          />
          <ResultBlock
            title="Refined Prompt"
            content={sections.get('FINAL_PROMPT') ?? ''}
            onCopy={(t) => handleCopy('FINAL_PROMPT', t)}
            copied={copied === 'FINAL_PROMPT'}
            highlight
          />
          <ResultBlock
            title="Cheaper Variant"
            content={sections.get('CHEAPER_VARIANT') ?? ''}
            onCopy={(t) => handleCopy('CHEAPER_VARIANT', t)}
            copied={copied === 'CHEAPER_VARIANT'}
          />
          <ResultBlock
            title="Assumptions Added"
            content={sections.get('ASSUMPTIONS_ADDED') ?? ''}
            onCopy={(t) => handleCopy('ASSUMPTIONS', t)}
            copied={copied === 'ASSUMPTIONS'}
          />
          <ResultBlock
            title="Suggested Pinned Facts"
            content={sections.get('SUGGESTED_PINNED_FACTS') ?? ''}
            onCopy={(t) => handleCopy('PINNED', t)}
            copied={copied === 'PINNED'}
          />
        </div>
      )}
    </div>
  );
}

function ResultBlock({
  title,
  content,
  onCopy,
  copied,
  highlight,
}: {
  title: string;
  content: string;
  onCopy: (text: string) => void;
  copied: boolean;
  highlight?: boolean;
}) {
  if (!content) return null;
  return (
    <div
      className={`rounded-md border p-4 ${
        highlight ? 'border-primary/30 bg-primary/5' : 'border-border'
      }`}
    >
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold">{title}</h3>
        <button
          onClick={() => onCopy(content)}
          className="rounded px-2 py-0.5 text-xs text-muted-foreground hover:bg-muted"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre className="whitespace-pre-wrap text-sm">{content}</pre>
    </div>
  );
}
