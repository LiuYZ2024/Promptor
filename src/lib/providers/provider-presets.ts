export type ProviderPresetId =
  | 'custom'
  | 'openai'
  | 'deepseek'
  | 'glm'
  | 'gemini';

export type CompatibilityMode =
  | 'openai-compatible'
  | 'provider-specific'
  | 'compatibility-bridge';

export interface ProviderPreset {
  id: ProviderPresetId;
  displayName: string;
  providerLabel: string;
  baseUrl: string;
  suggestedModels: string[];
  defaultModel: string;
  notes?: string;
  compatibilityMode: CompatibilityMode;
  isFullyPrefillSafe: boolean;
}

export const PROVIDER_PRESETS: ProviderPreset[] = [
  {
    id: 'custom',
    displayName: 'Custom (OpenAI-compatible)',
    providerLabel: 'OpenAI Compatible',
    baseUrl: '',
    suggestedModels: [],
    defaultModel: '',
    notes: 'Use any OpenAI-compatible endpoint and model.',
    compatibilityMode: 'openai-compatible',
    isFullyPrefillSafe: true,
  },
  {
    id: 'openai',
    displayName: 'OpenAI',
    providerLabel: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    suggestedModels: ['gpt-4.1-mini', 'gpt-4.1', 'gpt-5'],
    defaultModel: 'gpt-4.1-mini',
    notes: 'Official OpenAI API endpoint.',
    compatibilityMode: 'openai-compatible',
    isFullyPrefillSafe: true,
  },
  {
    id: 'deepseek',
    displayName: 'DeepSeek',
    providerLabel: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com',
    suggestedModels: ['deepseek-chat', 'deepseek-reasoner'],
    defaultModel: 'deepseek-chat',
    notes: 'DeepSeek also documents https://api.deepseek.com/v1 for OpenAI-compatible usage.',
    compatibilityMode: 'openai-compatible',
    isFullyPrefillSafe: true,
  },
  {
    id: 'glm',
    displayName: 'GLM / Zhipu',
    providerLabel: 'GLM / Zhipu',
    baseUrl: 'https://open.bigmodel.cn/api/coding/paas/v4',
    suggestedModels: ['GLM-4.7', 'GLM-5', 'GLM-4.6', 'GLM-4.5-air'],
    defaultModel: 'GLM-4.7',
    notes: 'Use OpenAI-compatible mode. Model names may be case-sensitive in some tools.',
    compatibilityMode: 'openai-compatible',
    isFullyPrefillSafe: true,
  },
  {
    id: 'gemini',
    displayName: 'Gemini',
    providerLabel: 'Gemini',
    baseUrl: '',
    suggestedModels: ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-3-pro'],
    defaultModel: 'gemini-2.5-flash',
    notes:
      'Gemini supports OpenAI compatibility, but configuration may depend on the API mode/endpoint you are using. Enter the Base URL manually.',
    compatibilityMode: 'compatibility-bridge',
    isFullyPrefillSafe: false,
  },
];

const PRESET_MAP = new Map(PROVIDER_PRESETS.map((p) => [p.id, p]));

export function getProviderPreset(id: ProviderPresetId): ProviderPreset {
  return PRESET_MAP.get(id) ?? PROVIDER_PRESETS[0]!;
}

export function isKnownPresetId(id: string): id is ProviderPresetId {
  return PRESET_MAP.has(id as ProviderPresetId);
}
