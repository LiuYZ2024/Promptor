/**
 * Five canonical repair templates used by the validation pipeline.
 * Each takes template variables via simple {placeholder} substitution.
 */

export const REPAIR_TEMPLATES = {
  missing_section_repair: `Your previous output is missing these required sections: {missingSections}.

Output ONLY the missing sections. Use these EXACT headings:
{missingHeadingsFormatted}

Do not repeat sections already provided. Do not add commentary.`,

  invalid_heading_repair: `Your previous output used incorrect headings. Reformat using EXACTLY these headings:
{correctHeadings}

Keep all existing content. Only change the heading format. Use ## HEADING_NAME format.`,

  prose_to_structure: `Your previous output was unstructured text. Reformat it into sections using these exact headings:
{requiredHeadings}

Extract relevant content from the text and place it under the correct heading. Use ## HEADING_NAME format. Do not add new content.`,

  trim_to_schema: `Your previous output contains sections not in the schema. Remove everything except content under these headings:
{allowedHeadings}

Keep only content under the allowed headings. Output nothing else.`,

  weak_model_shorten: `Your previous output is too long. Shorten it to fit within {tokenBudget} tokens.

Rules:
- Keep all required section headings: {requiredHeadings}
- Use 1-2 sentences per section maximum
- Remove examples, explanations, and commentary
- Keep only essential facts and instructions`,
} as const;

export type RepairTemplateKey = keyof typeof REPAIR_TEMPLATES;

export function renderRepairTemplate(
  key: RepairTemplateKey,
  variables: Record<string, string>,
): string {
  let result: string = REPAIR_TEMPLATES[key];
  for (const [k, v] of Object.entries(variables)) {
    result = result.replaceAll(`{${k}}`, v);
  }
  return result;
}
