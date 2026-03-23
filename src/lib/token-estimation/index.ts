/**
 * Approximate token estimation.
 * Uses a simple character-to-token ratio (~4 chars per token for English).
 * For more precise counts we can use gpt-tokenizer, but this is sufficient
 * for budget display and compression thresholds.
 */

const CHARS_PER_TOKEN = 4;
const MESSAGE_OVERHEAD = 4;

export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

export function estimateMessagesTokens(
  messages: Array<{ content: string }>,
): number {
  let total = 0;
  for (const msg of messages) {
    total += estimateTokens(msg.content) + MESSAGE_OVERHEAD;
  }
  return total;
}

export interface ContextBudget {
  currentTokens: number;
  softLimit: number;
  hardLimit: number;
  usagePercent: number;
  shouldCompress: boolean;
  mustCompress: boolean;
}

export function calculateContextBudget(
  currentTokens: number,
  softLimit: number,
  hardLimit: number,
): ContextBudget {
  const usagePercent = hardLimit > 0 ? (currentTokens / hardLimit) * 100 : 0;
  return {
    currentTokens,
    softLimit,
    hardLimit,
    usagePercent: Math.round(usagePercent * 10) / 10,
    shouldCompress: currentTokens >= softLimit,
    mustCompress: currentTokens >= hardLimit,
  };
}
