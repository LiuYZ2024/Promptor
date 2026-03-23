import type { LLMRequestOptions, LLMResponse, ChatMessage } from '@/types/llm';

export interface LLMClientConfig {
  baseUrl: string;
  apiKey: string;
  defaultModel: string;
  defaultTemperature?: number;
  defaultMaxTokens?: number;
  timeoutMs?: number;
  debugMode?: boolean;
}

export class LLMClientError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly rawError?: unknown,
  ) {
    super(message);
    this.name = 'LLMClientError';
  }
}

export function normalizeError(error: unknown): LLMClientError {
  if (error instanceof LLMClientError) return error;

  if (error instanceof TypeError && String(error.message).includes('fetch')) {
    return new LLMClientError(
      'Network error: Cannot reach the API server. Check your Base URL and network connection.',
      undefined,
      error,
    );
  }

  if (error instanceof DOMException && error.name === 'AbortError') {
    return new LLMClientError('Request was cancelled or timed out.', undefined, error);
  }

  if (error instanceof Error) {
    return new LLMClientError(error.message, undefined, error);
  }

  return new LLMClientError('An unknown error occurred.', undefined, error);
}

function normalizeBaseUrl(url: string): string {
  let normalized = url.trim();
  if (normalized.endsWith('/')) {
    normalized = normalized.slice(0, -1);
  }
  if (!normalized.endsWith('/v1')) {
    if (!normalized.includes('/v1')) {
      normalized += '/v1';
    }
  }
  return normalized;
}

export async function sendChatCompletion(
  config: LLMClientConfig,
  options: LLMRequestOptions,
): Promise<LLMResponse> {
  const baseUrl = normalizeBaseUrl(config.baseUrl);
  const url = `${baseUrl}/chat/completions`;

  const body = {
    model: options.model || config.defaultModel,
    messages: options.messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
    temperature: options.temperature ?? config.defaultTemperature ?? 0.7,
    max_tokens: options.maxTokens ?? config.defaultMaxTokens ?? 4096,
    stream: false,
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    config.timeoutMs ?? 60000,
  );

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(body),
      signal: options.signal ?? controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      throw new LLMClientError(
        getHttpErrorMessage(response.status, errorBody),
        response.status,
        errorBody,
      );
    }

    const data = await response.json();

    if (config.debugMode) {
      console.log('[LLM Debug] Request:', JSON.stringify(body, null, 2));
      console.log('[LLM Debug] Response:', JSON.stringify(data, null, 2));
    }

    const choice = data.choices?.[0];
    if (!choice) {
      throw new LLMClientError('API returned no choices. The response may be empty.');
    }

    return {
      content: choice.message?.content ?? '',
      finishReason: choice.finish_reason ?? 'unknown',
      usage: data.usage
        ? {
            promptTokens: data.usage.prompt_tokens ?? 0,
            completionTokens: data.usage.completion_tokens ?? 0,
            totalTokens: data.usage.total_tokens ?? 0,
          }
        : undefined,
    };
  } catch (error) {
    clearTimeout(timeoutId);
    throw normalizeError(error);
  }
}

export async function sendChatCompletionStream(
  config: LLMClientConfig,
  options: LLMRequestOptions,
  onChunk: (text: string) => void,
  onDone?: () => void,
): Promise<LLMResponse> {
  const baseUrl = normalizeBaseUrl(config.baseUrl);
  const url = `${baseUrl}/chat/completions`;

  const body = {
    model: options.model || config.defaultModel,
    messages: options.messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
    temperature: options.temperature ?? config.defaultTemperature ?? 0.7,
    max_tokens: options.maxTokens ?? config.defaultMaxTokens ?? 4096,
    stream: true,
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    config.timeoutMs ?? 120000,
  );

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(body),
      signal: options.signal ?? controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      throw new LLMClientError(
        getHttpErrorMessage(response.status, errorBody),
        response.status,
        errorBody,
      );
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new LLMClientError('Response body is not readable.');
    }

    const decoder = new TextDecoder();
    let fullContent = '';
    let finishReason = 'unknown';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;
        const data = trimmed.slice(6);
        if (data === '[DONE]') {
          finishReason = 'stop';
          continue;
        }

        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta?.content;
          if (delta) {
            fullContent += delta;
            onChunk(delta);
          }
          const fr = parsed.choices?.[0]?.finish_reason;
          if (fr) finishReason = fr;
        } catch {
          // Skip malformed SSE chunks
        }
      }
    }

    onDone?.();

    return {
      content: fullContent,
      finishReason,
    };
  } catch (error) {
    clearTimeout(timeoutId);
    throw normalizeError(error);
  }
}

export async function testConnection(
  config: LLMClientConfig,
): Promise<{ success: boolean; message: string; model?: string }> {
  try {
    const testMessages: ChatMessage[] = [
      { role: 'user', content: 'Reply with exactly: OK' },
    ];

    const response = await sendChatCompletion(config, {
      messages: testMessages,
      model: config.defaultModel,
      maxTokens: 10,
      temperature: 0,
    });

    return {
      success: true,
      message: `Connected successfully. Model responded: "${response.content.trim()}"`,
      model: config.defaultModel,
    };
  } catch (error) {
    const llmError = normalizeError(error);
    return {
      success: false,
      message: llmError.message,
    };
  }
}

function getHttpErrorMessage(status: number, body: string): string {
  const bodyPreview = body.slice(0, 200);

  switch (status) {
    case 401:
      return 'Authentication failed (401). Check your API key.';
    case 403:
      return 'Access forbidden (403). Your API key may not have permission for this model.';
    case 404:
      return 'Endpoint not found (404). Check your Base URL and model name.';
    case 429:
      return 'Rate limit exceeded (429). Wait a moment and try again, or check your usage quota.';
    case 500:
      return `Server error (500). The API server had an internal error. ${bodyPreview}`;
    case 502:
    case 503:
      return `Service unavailable (${status}). The API server may be overloaded. Try again shortly.`;
    default:
      return `HTTP ${status}: ${bodyPreview || 'Unknown error'}`;
  }
}
