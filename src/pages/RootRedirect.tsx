import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { db } from '@/lib/storage/db';
import { getLastActiveSessionId } from '@/lib/utils';
import { useSessions, createSession } from '@/hooks';
import { cn } from '@/lib/utils';

export function RootRedirect() {
  const [checked, setChecked] = useState(false);
  const [restoreId, setRestoreId] = useState<string | null>(null);
  const sessions = useSessions();
  const navigate = useNavigate();

  useEffect(() => {
    checkLastSession().then((id) => {
      setRestoreId(id);
      setChecked(true);
    });
  }, []);

  if (!checked) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Loading...
      </div>
    );
  }

  if (restoreId) {
    return <Navigate to={`/session/${restoreId}`} replace />;
  }

  const activeSessions = sessions.filter((s) => s.status === 'active');

  if (activeSessions.length === 0) {
    return <Navigate to="/workflow" replace />;
  }

  async function handleNewSession() {
    const id = await createSession({
      title: 'New Session',
      taskType: 'coding',
      goal: '',
      hasCodebase: false,
      agentTarget: 'cursor',
    });
    navigate(`/session/${id}`);
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="mb-2 text-xl font-semibold">Welcome back</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Pick up where you left off, or start something new.
      </p>

      <div className="mb-6 flex gap-3">
        <button
          onClick={handleNewSession}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          + New Session
        </button>
        <button
          onClick={() => navigate('/workflow')}
          className="rounded-md border border-border px-4 py-2 text-sm hover:bg-muted"
        >
          Workflow Builder
        </button>
        <button
          onClick={() => navigate('/refiner')}
          className="rounded-md border border-border px-4 py-2 text-sm hover:bg-muted"
        >
          Prompt Refiner
        </button>
      </div>

      <div className="space-y-2">
        <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Recent Sessions ({activeSessions.length})
        </h2>
        {activeSessions.slice(0, 20).map((s) => (
          <button
            key={s.id}
            onClick={() => navigate(`/session/${s.id}`)}
            className={cn(
              'w-full rounded-md border border-border px-4 py-3 text-left transition-colors hover:bg-muted',
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {s.title || 'Untitled'}
              </span>
              <span className="text-xs text-muted-foreground">
                {s.currentStage}
              </span>
            </div>
            {s.goal && (
              <p className="mt-1 truncate text-xs text-muted-foreground">
                {s.goal}
              </p>
            )}
            <p className="mt-0.5 text-[10px] text-muted-foreground/60">
              Updated {new Date(s.updatedAt).toLocaleString()}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}

async function checkLastSession(): Promise<string | null> {
  const lastId = getLastActiveSessionId();
  if (!lastId) return null;

  try {
    const session = await db.sessions.get(lastId);
    if (session && session.status === 'active') {
      return lastId;
    }
  } catch {
    // DB query failed; don't redirect
  }
  return null;
}
