import { useLiveQuery } from 'dexie-react-hooks';
import { db, DEFAULT_SETTINGS } from '@/lib/storage/db';
import type { Settings } from '@/types/data';

export function useSettings(): Settings {
  const settings = useLiveQuery(() => db.settings.get('default'));
  return settings ?? DEFAULT_SETTINGS;
}

export async function saveSettings(updates: Partial<Settings>): Promise<void> {
  const existing = await db.settings.get('default');
  const now = new Date().toISOString();

  if (existing) {
    await db.settings.update('default', { ...updates, updatedAt: now });
  } else {
    await db.settings.put({
      ...DEFAULT_SETTINGS,
      ...updates,
      id: 'default',
      createdAt: now,
      updatedAt: now,
    });
  }
}
