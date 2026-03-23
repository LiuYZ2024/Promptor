/**
 * Lightweight section extractor for prompt tuning output.
 * Pulls FINAL_PROMPT, CHEAPER_VARIANT, and secondary metadata
 * from raw LLM text without requiring the full output contract.
 *
 * Also provides enforceImmutableRequirements to re-inject any
 * immutable stage requirements that the LLM dropped.
 */

export interface TuningResult {
  finalPrompt: string | null;
  cheaperVariant: string | null;
  diagnosis: string | null;
  assumptionsAdded: string | null;
  suggestedPinnedFacts: string | null;
  hasStructuredOutput: boolean;
}

const SECTION_KEYS = [
  'FINAL_PROMPT',
  'CHEAPER_VARIANT',
  'DIAGNOSIS',
  'ASSUMPTIONS_ADDED',
  'SUGGESTED_PINNED_FACTS',
] as const;

export function parseTuningOutput(rawText: string): TuningResult {
  const sections = extractSections(rawText, [...SECTION_KEYS]);
  const finalPrompt = sections.get('FINAL_PROMPT') ?? null;
  const cheaperVariant = sections.get('CHEAPER_VARIANT') ?? null;
  const diagnosis = sections.get('DIAGNOSIS') ?? null;
  const assumptionsAdded = sections.get('ASSUMPTIONS_ADDED') ?? null;
  const suggestedPinnedFacts = sections.get('SUGGESTED_PINNED_FACTS') ?? null;

  const hasStructuredOutput = finalPrompt !== null;

  return {
    finalPrompt,
    cheaperVariant,
    diagnosis,
    assumptionsAdded,
    suggestedPinnedFacts,
    hasStructuredOutput,
  };
}

function extractSections(
  text: string,
  keys: string[],
): Map<string, string> {
  const result = new Map<string, string>();

  for (const key of keys) {
    const content =
      extractByExact(text, key) ??
      extractByExact(text, key.replace(/_/g, ' ')) ??
      extractCaseInsensitive(text, key);

    if (content !== null && content.trim().length > 0) {
      result.set(key, content.trim());
    }
  }

  return result;
}

function extractByExact(text: string, heading: string): string | null {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`^#{1,3}\\s+${escaped}\\s*$`, 'm');
  const match = pattern.exec(text);
  if (!match) return null;
  return contentAfterMatch(text, match);
}

function extractCaseInsensitive(text: string, heading: string): string | null {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`^#{1,3}\\s+${escaped}\\s*$`, 'mi');
  const match = pattern.exec(text);
  if (!match) return null;
  return contentAfterMatch(text, match);
}

function contentAfterMatch(text: string, match: RegExpExecArray): string {
  const start = match.index + match[0].length;
  const rest = text.slice(start);
  const nextHeading = /^#{1,3}\s+/m.exec(rest);
  return nextHeading ? rest.slice(0, nextHeading.index).trim() : rest.trim();
}

/**
 * Check which immutable requirements are missing from a prompt text.
 * Normalizes both sides (removes punctuation, collapses whitespace)
 * and checks each requirement's key phrases against the prompt.
 */
export function findMissingRequirements(
  promptText: string,
  requirements: string[],
): string[] {
  const normalizedPrompt = normalizeText(promptText);
  return requirements.filter((req) => {
    const phrases = extractKeyPhrases(req);
    return !phrases.some((phrase) => normalizedPrompt.includes(normalizeText(phrase)));
  });
}

/**
 * Re-inject any missing immutable requirements into the prompt.
 * Appends a clearly marked requirements block at the end.
 */
export function enforceImmutableRequirements(
  promptText: string,
  requirements: string[],
  lang: 'zh' | 'en',
): { text: string; injected: string[] } {
  const missing = findMissingRequirements(promptText, requirements);
  if (missing.length === 0) {
    return { text: promptText, injected: [] };
  }

  const header = lang === 'zh' ? '要求：' : 'Requirements:';
  const block = missing.map((r) => `- ${r}`).join('\n');
  const text = `${promptText}\n\n${header}\n${block}`;
  return { text, injected: missing };
}

function normalizeText(text: string): string {
  return text
    .replace(/[，。、；：""''（）【】\[\],;:.()!?！？\-—]/g, ' ')
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .trim();
}

function extractKeyPhrases(requirement: string): string[] {
  return requirement
    .replace(/[，。、；：""''（）\[\]【】]/g, ',')
    .split(/[,;:()]+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 3);
}
