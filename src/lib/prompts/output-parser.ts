import type { FixedSection, OutputContract, StructureValidatorConfig } from '@/types/prompt';

export interface ParsedOutput {
  sections: Map<string, string>;
  missingSections: string[];
  extraSections: string[];
  isComplete: boolean;
  isPartiallyUsable: boolean;
  rawText: string;
}

export interface ValidationResult {
  isValid: boolean;
  isPartial: boolean;
  missingSections: string[];
  missingCriticalSections: string[];
  extraSections: string[];
  parsedSections: Map<string, string>;
  rawText: string;
}

/**
 * 4-strategy lenient section extraction parser.
 * Strategies are tried in priority order — first successful match per section wins.
 *
 * 1. uppercase_exact:    `## HEADING_NAME` exactly
 * 2. uppercase_fuzzy:    `## HEADING NAME` (with spaces instead of underscores)
 * 3. case_insensitive:   `## heading_name` or `## Heading Name` (any case)
 * 4. substring_match:    Any heading containing the key word
 */
export function parseSections(
  rawText: string,
  outputContract: OutputContract,
): ParsedOutput {
  const allSections = [...outputContract.requiredSections, ...outputContract.optionalSections];
  const allKeys = allSections.map((s) => s.key);
  const headingMap = new Map(allSections.map((s) => [s.key, s.heading]));

  const sections = new Map<string, string>();
  const foundKeys = new Set<string>();

  // Strategy 1: uppercase_exact — `## HEADING_NAME`
  for (const section of allSections) {
    const content = extractByExactHeading(rawText, section.heading);
    if (content !== null) {
      sections.set(section.key, content.trim());
      foundKeys.add(section.key);
    }
  }

  // Strategy 2: uppercase_fuzzy — underscores replaced with spaces
  for (const section of allSections) {
    if (foundKeys.has(section.key)) continue;
    const fuzzyHeading = section.heading.replace(/_/g, ' ');
    const content = extractByExactHeading(rawText, fuzzyHeading);
    if (content !== null) {
      sections.set(section.key, content.trim());
      foundKeys.add(section.key);
    }
  }

  // Strategy 3: case_insensitive
  for (const section of allSections) {
    if (foundKeys.has(section.key)) continue;
    const content = extractByCaseInsensitiveHeading(rawText, section.heading);
    if (content !== null) {
      sections.set(section.key, content.trim());
      foundKeys.add(section.key);
    }
  }

  // Strategy 4: substring_match on the primary word(s) of the key
  for (const section of allSections) {
    if (foundKeys.has(section.key)) continue;
    const content = extractBySubstringMatch(rawText, section.heading);
    if (content !== null) {
      sections.set(section.key, content.trim());
      foundKeys.add(section.key);
    }
  }

  const requiredKeys = new Set(outputContract.requiredSections.map((s) => s.key));
  const missingSections = [...requiredKeys].filter((k) => !foundKeys.has(k));

  const extraHeadings = extractAllHeadings(rawText);
  const knownHeadings = new Set([...headingMap.values()].map((h) => h.toUpperCase()));
  const extraSections = extraHeadings.filter((h) => !knownHeadings.has(h.toUpperCase()));

  const isComplete = missingSections.length === 0;
  const isPartiallyUsable = sections.size > 0;

  return { sections, missingSections, extraSections, isComplete, isPartiallyUsable, rawText };
}

export function validateOutput(
  parsed: ParsedOutput,
  outputContract: OutputContract,
  validatorConfig: StructureValidatorConfig,
  criticalSections: string[],
): ValidationResult {
  const missingCritical = criticalSections.filter(
    (key) => !parsed.sections.has(key),
  );

  const isValid =
    parsed.isComplete &&
    missingCritical.length === 0 &&
    parsed.extraSections.length === 0;

  const isPartial =
    !isValid &&
    parsed.sections.size >= validatorConfig.minSectionsForPartial &&
    (validatorConfig.requireCriticalSections ? missingCritical.length === 0 : true);

  return {
    isValid,
    isPartial,
    missingSections: parsed.missingSections,
    missingCriticalSections: missingCritical,
    extraSections: parsed.extraSections,
    parsedSections: parsed.sections,
    rawText: parsed.rawText,
  };
}

/**
 * Apply default values for missing sections that have fill_default behavior.
 */
export function applyDefaults(
  parsed: ParsedOutput,
  outputContract: OutputContract,
): Map<string, string> {
  const result = new Map(parsed.sections);
  const allSections = [...outputContract.requiredSections, ...outputContract.optionalSections];

  for (const section of allSections) {
    if (!result.has(section.key) && section.missingBehavior === 'fill_default' && section.defaultValue) {
      result.set(section.key, section.defaultValue);
    }
  }

  return result;
}

/**
 * Render parsed sections back to structured text in canonical order.
 */
export function renderSections(
  sections: Map<string, string>,
  outputContract: OutputContract,
): string {
  const lines: string[] = [];
  for (const key of outputContract.sectionOrder) {
    const content = sections.get(key);
    if (content !== undefined) {
      const section = findSection(outputContract, key);
      const heading = section?.heading ?? key;
      lines.push(`## ${heading}\n${content}`);
    }
  }
  return lines.join('\n\n');
}

// ─── Internal Helpers ───

function extractByExactHeading(text: string, heading: string): string | null {
  const escapedHeading = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(
    `^#{1,3}\\s+${escapedHeading}\\s*$`,
    'm',
  );
  const match = pattern.exec(text);
  if (!match) return null;
  return extractContentAfterMatch(text, match);
}

function extractByCaseInsensitiveHeading(text: string, heading: string): string | null {
  const escapedHeading = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(
    `^#{1,3}\\s+${escapedHeading}\\s*$`,
    'mi',
  );
  const match = pattern.exec(text);
  if (!match) return null;
  return extractContentAfterMatch(text, match);
}

function extractBySubstringMatch(text: string, heading: string): string | null {
  const words = heading
    .replace(/_/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2);

  if (words.length === 0) return null;

  const longestWord = words.reduce((a, b) => (a.length >= b.length ? a : b));
  const escapedWord = longestWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(
    `^#{1,3}\\s+[^\\n]*${escapedWord}[^\\n]*$`,
    'mi',
  );
  const match = pattern.exec(text);
  if (!match) return null;
  return extractContentAfterMatch(text, match);
}

function extractContentAfterMatch(text: string, match: RegExpExecArray): string {
  const startIndex = match.index + match[0].length;
  const nextHeadingPattern = /^#{1,3}\s+/m;
  const remaining = text.slice(startIndex);
  const nextMatch = nextHeadingPattern.exec(remaining);
  if (nextMatch) {
    return remaining.slice(0, nextMatch.index).trim();
  }
  return remaining.trim();
}

function extractAllHeadings(text: string): string[] {
  const pattern = /^#{1,3}\s+(.+)$/gm;
  const headings: string[] = [];
  let match;
  while ((match = pattern.exec(text)) !== null) {
    headings.push(match[1]?.trim() ?? '');
  }
  return headings;
}

function findSection(
  contract: OutputContract,
  key: string,
): FixedSection | undefined {
  return (
    contract.requiredSections.find((s) => s.key === key) ??
    contract.optionalSections.find((s) => s.key === key)
  );
}
