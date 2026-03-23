import type { Message, Summary, PinnedFact, WorkflowStage } from '@/types/data';
import { estimateTokens } from '@/lib/token-estimation';

export interface CompressionDecision {
  shouldCompress: boolean;
  reason: 'soft_limit' | 'hard_limit' | 'stage_end' | 'manual' | 'none';
  messagesToCompress: Message[];
  retainedMessages: Message[];
}

const SUMMARY_TOKEN_CAP = 800;

/**
 * Determines if compression is needed and selects which messages to compress.
 *
 * Rules:
 * - Compress when currentTokens >= softLimit (advisory)
 * - Force compress when currentTokens >= hardLimit
 * - Always retain the most recent N messages (recentWindowSize)
 * - Never compress messages from the current stage if they're the only ones
 */
export function shouldCompressHistory(
  messages: Message[],
  currentTokens: number,
  softLimit: number,
  hardLimit: number,
  recentWindowSize: number = 6,
): CompressionDecision {
  if (currentTokens < softLimit) {
    return {
      shouldCompress: false,
      reason: 'none',
      messagesToCompress: [],
      retainedMessages: messages,
    };
  }

  const reason = currentTokens >= hardLimit ? 'hard_limit' : 'soft_limit';
  const result = selectMessagesForCompression(messages, recentWindowSize);

  return {
    shouldCompress: true,
    reason,
    ...result,
  };
}

/**
 * Splits messages into compressible (older) and retained (recent) sets.
 * Retains at least recentWindowSize messages.
 */
export function selectMessagesForCompression(
  messages: Message[],
  recentWindowSize: number = 6,
): { messagesToCompress: Message[]; retainedMessages: Message[] } {
  const sorted = [...messages].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  if (sorted.length <= recentWindowSize) {
    return { messagesToCompress: [], retainedMessages: sorted };
  }

  const splitIdx = sorted.length - recentWindowSize;
  return {
    messagesToCompress: sorted.slice(0, splitIdx),
    retainedMessages: sorted.slice(splitIdx),
  };
}

/**
 * Merges two rolling summaries into one, respecting the token cap.
 *
 * Merge rules per plan §6.3:
 * - Deduplicate by section (goals, constraints, decisions, etc.)
 * - Prefer newer information when conflicts exist
 * - Cap total at SUMMARY_TOKEN_CAP tokens
 * - If pinned facts are provided, omit duplicates from summary
 */
export function mergeRollingSummaries(
  existing: string,
  incoming: string,
  pinnedFacts?: PinnedFact[],
): string {
  const existingSections = parseSummaryText(existing);
  const incomingSections = parseSummaryText(incoming);

  const merged = new Map<string, string[]>();

  // Start with existing, then overlay with incoming
  for (const [key, items] of existingSections) {
    merged.set(key, [...items]);
  }

  for (const [key, items] of incomingSections) {
    const existing = merged.get(key) ?? [];
    const deduped = deduplicateItems([...existing, ...items]);
    merged.set(key, deduped);
  }

  // Remove items that duplicate pinned facts
  if (pinnedFacts && pinnedFacts.length > 0) {
    const factContents = new Set(
      pinnedFacts.map((f) => f.content.toLowerCase().trim()),
    );

    for (const [key, items] of merged) {
      merged.set(
        key,
        items.filter((item) => !factContents.has(item.toLowerCase().trim())),
      );
    }
  }

  // Render back to text
  let result = renderSummaryText(merged);

  // Enforce token cap by trimming from the end of each section
  while (estimateTokens(result) > SUMMARY_TOKEN_CAP && trimLastItem(merged)) {
    result = renderSummaryText(merged);
  }

  return result;
}

/**
 * Generates a stage-end summary prompt input from messages and artifacts.
 * This returns the content to be sent to the LLM for summarization.
 *
 * Stage-end summaries differ from rolling summaries:
 * - They cover an entire stage, not a sliding window
 * - They emphasize outcomes and decisions, not process
 * - They are saved as permanent artifacts
 */
export function generateStageEndSummary(
  stage: WorkflowStage,
  messages: Message[],
  pinnedFacts: PinnedFact[],
): string {
  const stageMessages = messages.filter((m) => m.stage === stage);
  const messageContent = stageMessages
    .map((m) => `[${m.role}] ${m.content.slice(0, 500)}`)
    .join('\n---\n');

  const factsList = pinnedFacts
    .map((f) => `[${f.category}] ${f.content}`)
    .join('\n');

  return [
    `Stage: ${stage}`,
    `Messages: ${stageMessages.length}`,
    '',
    'PINNED FACTS:',
    factsList || '(none)',
    '',
    'CONVERSATION CONTENT:',
    messageContent || '(no messages)',
  ].join('\n');
}

// ─── Internal Helpers ───

const SUMMARY_SECTION_PATTERN = /^(?:#+\s*)?([A-Z_]+(?:\s+[A-Z_]+)*):\s*$/gm;

function parseSummaryText(text: string): Map<string, string[]> {
  const sections = new Map<string, string[]>();
  if (!text.trim()) return sections;

  const lines = text.split('\n');
  let currentSection = 'GENERAL';
  let currentItems: string[] = [];

  for (const line of lines) {
    const sectionMatch = /^(?:#+\s*)?([A-Z_]+(?:\s+[A-Z_]+)*):\s*$/.exec(line.trim());
    if (sectionMatch && sectionMatch[1]) {
      if (currentItems.length > 0) {
        sections.set(currentSection, currentItems);
      }
      currentSection = sectionMatch[1];
      currentItems = [];
    } else {
      const trimmed = line.trim();
      if (trimmed && trimmed !== '-') {
        currentItems.push(trimmed.replace(/^[-•*]\s*/, ''));
      }
    }
  }

  if (currentItems.length > 0) {
    sections.set(currentSection, currentItems);
  }

  return sections;
}

function deduplicateItems(items: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const item of items) {
    const normalized = item.toLowerCase().trim();
    if (!seen.has(normalized)) {
      seen.add(normalized);
      result.push(item);
    }
  }

  return result;
}

function renderSummaryText(sections: Map<string, string[]>): string {
  const parts: string[] = [];
  for (const [key, items] of sections) {
    if (items.length === 0) continue;
    parts.push(`${key}:\n${items.map((i) => `- ${i}`).join('\n')}`);
  }
  return parts.join('\n\n');
}

function trimLastItem(sections: Map<string, string[]>): boolean {
  const keys = [...sections.keys()];
  for (let i = keys.length - 1; i >= 0; i--) {
    const key = keys[i]!;
    const items = sections.get(key)!;
    if (items.length > 1) {
      items.pop();
      return true;
    }
  }
  return false;
}
