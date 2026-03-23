import { useEffect, useState, type ReactNode } from 'react';
import { db, DEFAULT_SETTINGS } from '@/lib/storage/db';

interface DbProviderProps {
  children: ReactNode;
}

export function DbProvider({ children }: DbProviderProps) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initializeDb()
      .then(() => setReady(true))
      .catch((err) => {
        console.error('[Promptor] Database initialization failed:', err);
        setError(err instanceof Error ? err.message : 'Failed to open database');
      });
  }, []);

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-background p-8 text-foreground">
        <div className="max-w-md rounded-md border border-destructive/30 bg-destructive/5 p-6">
          <h2 className="mb-2 text-lg font-semibold text-destructive">
            Database Error
          </h2>
          <p className="mb-3 text-sm">{error}</p>
          <p className="text-xs text-muted-foreground">
            Possible causes: browser privacy mode blocking IndexedDB, storage
            quota exceeded, or corrupted database. Try clearing site data and
            reloading.
          </p>
        </div>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-muted-foreground">
        <span className="text-sm">Loading...</span>
      </div>
    );
  }

  return <>{children}</>;
}

async function initializeDb(): Promise<void> {
  await db.open();

  const existing = await db.settings.get('default');
  if (!existing) {
    const now = new Date().toISOString();
    await db.settings.put({
      ...DEFAULT_SETTINGS,
      id: 'default',
      createdAt: now,
      updatedAt: now,
    });
    if (import.meta.env.DEV) {
      console.log('[Promptor] Seeded default settings into IndexedDB');
    }
  }

  if (import.meta.env.DEV) {
    const counts = {
      settings: await db.settings.count(),
      sessions: await db.sessions.count(),
      messages: await db.messages.count(),
      artifacts: await db.artifacts.count(),
      pinnedFacts: await db.pinnedFacts.count(),
      summaries: await db.summaries.count(),
      candidateApproaches: await db.candidateApproaches.count(),
    };
    console.log('[Promptor] DB initialized. Record counts:', counts);
  }
}
