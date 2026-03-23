import { useState, useCallback } from 'react';
import { useSettings, saveSettings } from '@/hooks';
import { testConnection } from '@/lib/llm';
import { db } from '@/lib/storage/db';
import {
  PROVIDER_PRESETS,
  getProviderPreset,
  type ProviderPresetId,
} from '@/lib/providers';
import type { Settings } from '@/types/data';

export function SettingsPage() {
  const settings = useSettings();
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);

  const currentPreset = getProviderPreset(
    settings.providerPresetId as ProviderPresetId,
  );

  const update = useCallback(
    async (field: keyof Settings, value: Settings[keyof Settings]) => {
      setSaving(true);
      await saveSettings({ [field]: value });
      setSaving(false);
    },
    [],
  );

  const handlePresetChange = useCallback(
    async (presetId: string) => {
      const preset = getProviderPreset(presetId as ProviderPresetId);
      const updates: Partial<Settings> = {
        providerPresetId: preset.id,
        providerLabel: preset.providerLabel,
      };

      if (preset.isFullyPrefillSafe) {
        updates.baseUrl = preset.baseUrl;
        updates.model = preset.defaultModel;
      } else {
        // For non-safe presets (e.g. Gemini): fill label + model, leave baseUrl editable
        updates.model = preset.defaultModel;
      }

      setSaving(true);
      await saveSettings(updates);
      setSaving(false);
    },
    [],
  );

  async function handleTestConnection() {
    setTesting(true);
    setTestResult(null);
    const result = await testConnection({
      baseUrl: settings.baseUrl,
      apiKey: settings.apiKey,
      defaultModel: settings.model,
      defaultTemperature: settings.temperature,
      defaultMaxTokens: settings.maxTokens,
      debugMode: settings.debugMode,
    });
    setTestResult(result);
    setTesting(false);
  }

  const showCompatibilityWarning =
    currentPreset.compatibilityMode === 'compatibility-bridge';

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <h1 className="mb-6 text-xl font-semibold">Settings</h1>

      {/* LLM Provider */}
      <Section title="LLM Provider">
        {/* Provider Preset */}
        <Field label="Provider Preset">
          <select
            value={settings.providerPresetId || 'custom'}
            onChange={(e) => handlePresetChange(e.target.value)}
            className="input-field w-full"
          >
            {PROVIDER_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.displayName}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-xs text-muted-foreground">
            Choose a common provider preset or keep using a fully custom
            OpenAI-compatible configuration.
          </p>

          {currentPreset.id !== 'custom' && currentPreset.notes && (
            <div
              className={`mt-2 rounded-md px-3 py-2 text-xs ${
                showCompatibilityWarning
                  ? 'border border-warning/30 bg-warning/5 text-warning'
                  : 'bg-muted/50 text-muted-foreground'
              }`}
            >
              {showCompatibilityWarning && (
                <span className="mr-1 font-medium">Compatibility note:</span>
              )}
              {currentPreset.notes}
              {currentPreset.isFullyPrefillSafe && (
                <span className="ml-1 text-muted-foreground/70">
                  — Values below can still be edited manually.
                </span>
              )}
            </div>
          )}
        </Field>

        {/* Provider Label */}
        <Field label="Provider Label">
          <input
            type="text"
            value={settings.providerLabel}
            onChange={(e) => update('providerLabel', e.target.value)}
            placeholder="OpenAI Compatible"
            className="input-field w-full"
          />
        </Field>

        {/* Base URL */}
        <Field label="Base URL">
          <input
            type="text"
            value={settings.baseUrl}
            onChange={(e) => update('baseUrl', e.target.value)}
            placeholder={
              currentPreset.baseUrl ||
              'https://api.openai.com/v1'
            }
            className="input-field w-full"
          />
          {showCompatibilityWarning && !settings.baseUrl && (
            <p className="mt-1 text-xs text-warning">
              This provider requires a manually configured Base URL.
            </p>
          )}
        </Field>

        {/* API Key */}
        <Field label="API Key">
          <input
            type="password"
            value={settings.apiKey}
            onChange={(e) => update('apiKey', e.target.value)}
            placeholder="sk-..."
            className="input-field w-full"
          />
          <label className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={settings.persistApiKey}
              onChange={(e) => update('persistApiKey', e.target.checked)}
              className="rounded"
            />
            Save API key to local storage
          </label>
        </Field>

        {/* Model */}
        <Field label="Model">
          {currentPreset.suggestedModels.length > 0 ? (
            <div className="space-y-1.5">
              <input
                type="text"
                value={settings.model}
                onChange={(e) => update('model', e.target.value)}
                placeholder={currentPreset.defaultModel || 'gpt-4o-mini'}
                className="input-field w-full"
              />
              <div className="flex flex-wrap gap-1">
                {currentPreset.suggestedModels.map((m) => (
                  <button
                    key={m}
                    onClick={() => update('model', m)}
                    className={`rounded-md px-2 py-0.5 text-xs transition-colors ${
                      settings.model === m
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <input
              type="text"
              value={settings.model}
              onChange={(e) => update('model', e.target.value)}
              placeholder="gpt-4o-mini"
              className="input-field w-full"
            />
          )}
        </Field>

        {/* Test Connection */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleTestConnection}
            disabled={
              testing ||
              !settings.baseUrl ||
              !settings.apiKey ||
              !settings.model
            }
            className="rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-40"
          >
            {testing ? 'Testing...' : 'Test Connection'}
          </button>
          {testResult && (
            <span
              className={`text-sm ${
                testResult.success ? 'text-success' : 'text-destructive'
              }`}
            >
              {testResult.message}
            </span>
          )}
        </div>
      </Section>

      {/* Generation */}
      <Section title="Generation">
        <Field label="Output Language">
          <select
            value={settings.outputLanguage || 'zh'}
            onChange={(e) =>
              update('outputLanguage', e.target.value as Settings['outputLanguage'])
            }
            className="input-field w-40"
          >
            <option value="zh">中文</option>
            <option value="en">English</option>
          </select>
          <p className="mt-1 text-xs text-muted-foreground">
            Generated prompt content and structured output language.
          </p>
        </Field>

        <Field label={`Temperature: ${settings.temperature}`}>
          <input
            type="range"
            min="0"
            max="2"
            step="0.1"
            value={settings.temperature}
            onChange={(e) =>
              update('temperature', parseFloat(e.target.value))
            }
            className="w-full accent-primary"
          />
        </Field>

        <Field label="Max Tokens">
          <input
            type="number"
            value={settings.maxTokens}
            onChange={(e) =>
              update('maxTokens', parseInt(e.target.value) || 4096)
            }
            className="input-field w-32"
          />
        </Field>
      </Section>

      {/* Context Limits */}
      <Section title="Context Limits">
        <Field label="Soft Limit (tokens)">
          <input
            type="number"
            value={settings.contextSoftLimit}
            onChange={(e) =>
              update('contextSoftLimit', parseInt(e.target.value) || 6000)
            }
            className="input-field w-32"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Compression suggested when context exceeds this
          </p>
        </Field>

        <Field label="Hard Limit (tokens)">
          <input
            type="number"
            value={settings.contextHardLimit}
            onChange={(e) =>
              update('contextHardLimit', parseInt(e.target.value) || 8000)
            }
            className="input-field w-32"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Forced compression when context exceeds this
          </p>
        </Field>
      </Section>

      {/* Appearance */}
      <Section title="Appearance">
        <Field label="Theme">
          <select
            value={settings.theme}
            onChange={(e) =>
              update('theme', e.target.value as Settings['theme'])
            }
            className="input-field w-40"
          >
            <option value="system">System</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </Field>
      </Section>

      {/* Debug */}
      <Section title="Advanced">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={settings.debugMode}
            onChange={(e) => update('debugMode', e.target.checked)}
            className="rounded"
          />
          Debug mode (log raw LLM requests/responses to console)
        </label>
      </Section>

      {/* Data Management */}
      <Section title="Data">
        <DataManagement />
      </Section>

      {saving && (
        <p className="mt-4 text-xs text-muted-foreground">Saving...</p>
      )}
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-muted-foreground">
        {title}
      </h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium">{label}</label>
      {children}
    </div>
  );
}

function DataManagement() {
  const [counts, setCounts] = useState<Record<string, number> | null>(null);
  const [exportStatus, setExportStatus] = useState('');

  async function checkDb() {
    const result = {
      settings: await db.settings.count(),
      sessions: await db.sessions.count(),
      messages: await db.messages.count(),
      artifacts: await db.artifacts.count(),
      pinnedFacts: await db.pinnedFacts.count(),
      summaries: await db.summaries.count(),
      candidateApproaches: await db.candidateApproaches.count(),
    };
    setCounts(result);
    console.log('[Promptor] DB record counts:', result);
  }

  async function handleExport() {
    try {
      const data = {
        exportedAt: new Date().toISOString(),
        version: 3,
        settings: await db.settings.toArray(),
        sessions: await db.sessions.toArray(),
        messages: await db.messages.toArray(),
        artifacts: await db.artifacts.toArray(),
        pinnedFacts: await db.pinnedFacts.toArray(),
        summaries: await db.summaries.toArray(),
        candidateApproaches: await db.candidateApproaches.toArray(),
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `promptor-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setExportStatus('Exported successfully');
      setTimeout(() => setExportStatus(''), 3000);
    } catch (e) {
      setExportStatus(e instanceof Error ? e.message : 'Export failed');
    }
  }

  async function handleImport() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);

        if (!data.sessions || !data.messages) {
          setExportStatus('Invalid backup file: missing sessions or messages');
          return;
        }

        await db.transaction(
          'rw',
          [
            db.settings,
            db.sessions,
            db.messages,
            db.artifacts,
            db.pinnedFacts,
            db.summaries,
            db.candidateApproaches,
          ],
          async () => {
            if (data.settings?.length) {
              for (const s of data.settings) await db.settings.put(s);
            }
            if (data.sessions?.length) {
              for (const s of data.sessions) await db.sessions.put(s);
            }
            if (data.messages?.length) {
              for (const m of data.messages) await db.messages.put(m);
            }
            if (data.artifacts?.length) {
              for (const a of data.artifacts) await db.artifacts.put(a);
            }
            if (data.pinnedFacts?.length) {
              for (const f of data.pinnedFacts) await db.pinnedFacts.put(f);
            }
            if (data.summaries?.length) {
              for (const s of data.summaries) await db.summaries.put(s);
            }
            if (data.candidateApproaches?.length) {
              for (const c of data.candidateApproaches)
                await db.candidateApproaches.put(c);
            }
          },
        );

        setExportStatus(
          `Imported: ${data.sessions.length} sessions, ${data.messages.length} messages`,
        );
        setTimeout(() => setExportStatus(''), 5000);
      } catch (e) {
        setExportStatus(e instanceof Error ? e.message : 'Import failed');
      }
    };
    input.click();
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button
          onClick={checkDb}
          className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-muted"
        >
          Check DB
        </button>
        <button
          onClick={handleExport}
          className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-muted"
        >
          Export All Data
        </button>
        <button
          onClick={handleImport}
          className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-muted"
        >
          Import Data
        </button>
      </div>

      {counts && (
        <div className="rounded-md bg-muted/50 px-3 py-2 text-xs font-mono">
          {Object.entries(counts).map(([table, count]) => (
            <div key={table}>
              {table}: {count} records
            </div>
          ))}
        </div>
      )}

      {exportStatus && (
        <p className="text-xs text-muted-foreground">{exportStatus}</p>
      )}

      <p className="text-xs text-muted-foreground">
        All data is stored in your browser&apos;s IndexedDB. Export regularly
        for backup.
      </p>
    </div>
  );
}
