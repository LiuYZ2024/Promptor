import { useState, useRef, useCallback } from 'react';
import { sendChatCompletionStream, type LLMClientConfig } from '@/lib/llm';
import { runValidationPipeline, type ValidationPipelineResult, type LLMCallFn } from '@/lib/prompts';
import type { PromptTemplateSpec, PromptVariant } from '@/types/prompt';
import type { ChatMessage } from '@/types/llm';

export type GenerationPhase =
  | 'idle'
  | 'streaming'
  | 'finalizing'
  | 'parsed'
  | 'repaired'
  | 'failed';

export interface StreamingGenerationState {
  phase: GenerationPhase;
  streamText: string;
  finalResult: ValidationPipelineResult | null;
  error: string;
  rawFallback: string;
}

const INITIAL_STATE: StreamingGenerationState = {
  phase: 'idle',
  streamText: '',
  finalResult: null,
  error: '',
  rawFallback: '',
};

export function useStreamingGeneration() {
  const [state, setState] = useState<StreamingGenerationState>(INITIAL_STATE);
  const abortRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setState(INITIAL_STATE);
  }, []);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setState((s) =>
      s.phase === 'streaming' ? { ...s, phase: 'idle' } : s,
    );
  }, []);

  const generate = useCallback(
    async (params: {
      config: LLMClientConfig;
      messages: ChatMessage[];
      model: string;
      template: PromptTemplateSpec;
      variant: PromptVariant;
      llmCallFn?: LLMCallFn;
    }) => {
      reset();
      const controller = new AbortController();
      abortRef.current = controller;

      setState({
        phase: 'streaming',
        streamText: '',
        finalResult: null,
        error: '',
        rawFallback: '',
      });

      try {
        let accumulated = '';

        const streamResult = await sendChatCompletionStream(
          params.config,
          {
            messages: params.messages,
            model: params.model,
            signal: controller.signal,
          },
          (chunk) => {
            accumulated += chunk;
            setState((s) => ({ ...s, streamText: accumulated }));
          },
        );

        if (controller.signal.aborted) return null;

        setState((s) => ({ ...s, phase: 'finalizing' }));

        const validated = await runValidationPipeline(
          streamResult.content,
          params.template,
          params.variant,
          params.llmCallFn,
          params.messages,
        );

        const finalPhase: GenerationPhase =
          validated.repairSucceeded ? 'repaired' : 'parsed';

        setState({
          phase: finalPhase,
          streamText: '',
          finalResult: validated,
          error: '',
          rawFallback: '',
        });

        return validated;
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') {
          setState((s) => ({ ...s, phase: 'idle' }));
          return null;
        }

        const errorMsg = e instanceof Error ? e.message : 'An error occurred';
        setState((s) => ({
          phase: 'failed',
          streamText: '',
          finalResult: null,
          error: errorMsg,
          rawFallback: s.streamText,
        }));
        return null;
      } finally {
        abortRef.current = null;
      }
    },
    [reset],
  );

  return {
    ...state,
    isActive: state.phase === 'streaming' || state.phase === 'finalizing',
    generate,
    cancel,
    reset,
  };
}
