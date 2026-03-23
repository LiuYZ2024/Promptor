import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/storage/db';
import { generateId, nowISO, cn } from '@/lib/utils';
import type { CandidateApproach, CandidateStatus } from '@/types/data';
import { useState } from 'react';

interface DiscussionPanelProps {
  sessionId: string;
}

export function DiscussionPanel({ sessionId }: DiscussionPanelProps) {
  const candidates = useLiveQuery(
    () => db.candidateApproaches.where('sessionId').equals(sessionId).toArray(),
    [sessionId],
    [],
  );

  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');

  async function handleAddCandidate() {
    if (!newName.trim()) return;
    await db.candidateApproaches.add({
      id: generateId(),
      sessionId,
      name: newName.trim(),
      description: newDesc.trim(),
      pros: [],
      cons: [],
      status: 'proposed',
      sourceMessageId: '',
      createdAt: nowISO(),
      updatedAt: nowISO(),
    });
    setNewName('');
    setNewDesc('');
    setAdding(false);
  }

  async function handleStatusChange(id: string, status: CandidateStatus, reason?: string) {
    const updates: Partial<CandidateApproach> = { status, updatedAt: nowISO() };
    if (status === 'rejected' && reason) {
      updates.rejectionReason = reason;
    }
    await db.candidateApproaches.update(id, updates);

    if (status === 'accepted') {
      await db.pinnedFacts.add({
        id: generateId(),
        sessionId,
        category: 'accepted_decision',
        content: `Accepted approach: ${candidates.find(c => c.id === id)?.name ?? ''}`,
        priority: 'high',
        createdAt: nowISO(),
        updatedAt: nowISO(),
      });
    } else if (status === 'rejected') {
      await db.pinnedFacts.add({
        id: generateId(),
        sessionId,
        category: 'rejected_option',
        content: `Rejected: ${candidates.find(c => c.id === id)?.name ?? ''}${reason ? ` — ${reason}` : ''}`,
        priority: 'normal',
        createdAt: nowISO(),
        updatedAt: nowISO(),
      });
    }
  }

  async function handleAddPro(id: string) {
    const text = prompt('Add a pro:');
    if (!text) return;
    const candidate = candidates.find(c => c.id === id);
    if (!candidate) return;
    await db.candidateApproaches.update(id, {
      pros: [...candidate.pros, text],
      updatedAt: nowISO(),
    });
  }

  async function handleAddCon(id: string) {
    const text = prompt('Add a con:');
    if (!text) return;
    const candidate = candidates.find(c => c.id === id);
    if (!candidate) return;
    await db.candidateApproaches.update(id, {
      cons: [...candidate.cons, text],
      updatedAt: nowISO(),
    });
  }

  const proposed = candidates.filter(c => c.status === 'proposed');
  const accepted = candidates.filter(c => c.status === 'accepted');
  const rejected = candidates.filter(c => c.status === 'rejected');

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Candidate Approaches</h3>
        <button
          onClick={() => setAdding(!adding)}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          {adding ? 'Cancel' : '+ Add'}
        </button>
      </div>

      {adding && (
        <div className="rounded-md border border-border p-3 space-y-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Approach name"
            className="input-field w-full"
          />
          <textarea
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder="Brief description..."
            rows={2}
            className="input-field w-full resize-none"
          />
          <button
            onClick={handleAddCandidate}
            disabled={!newName.trim()}
            className="rounded-md bg-primary px-3 py-1 text-xs text-primary-foreground disabled:opacity-40"
          >
            Add Approach
          </button>
        </div>
      )}

      {proposed.length > 0 && (
        <div>
          <div className="mb-1 text-xs font-medium uppercase text-muted-foreground">
            Proposed
          </div>
          {proposed.map(c => (
            <CandidateCard
              key={c.id}
              candidate={c}
              onAccept={() => handleStatusChange(c.id, 'accepted')}
              onReject={() => {
                const reason = prompt('Rejection reason (optional):') ?? undefined;
                handleStatusChange(c.id, 'rejected', reason);
              }}
              onAddPro={() => handleAddPro(c.id)}
              onAddCon={() => handleAddCon(c.id)}
            />
          ))}
        </div>
      )}

      {accepted.length > 0 && (
        <div>
          <div className="mb-1 text-xs font-medium uppercase text-success">
            Accepted
          </div>
          {accepted.map(c => (
            <CandidateCard key={c.id} candidate={c} accepted />
          ))}
        </div>
      )}

      {rejected.length > 0 && (
        <div>
          <div className="mb-1 text-xs font-medium uppercase text-destructive">
            Rejected
          </div>
          {rejected.map(c => (
            <CandidateCard key={c.id} candidate={c} rejected />
          ))}
        </div>
      )}

      {candidates.length === 0 && !adding && (
        <p className="text-xs text-muted-foreground">
          No candidate approaches yet. Add one manually or ask the LLM to suggest approaches.
        </p>
      )}
    </div>
  );
}

function CandidateCard({
  candidate,
  onAccept,
  onReject,
  onAddPro,
  onAddCon,
  accepted,
  rejected,
}: {
  candidate: CandidateApproach;
  onAccept?: () => void;
  onReject?: () => void;
  onAddPro?: () => void;
  onAddCon?: () => void;
  accepted?: boolean;
  rejected?: boolean;
}) {
  return (
    <div
      className={cn(
        'mb-2 rounded-md border p-3',
        accepted && 'border-success/30 bg-success/5',
        rejected && 'border-destructive/20 bg-destructive/5 opacity-70',
        !accepted && !rejected && 'border-border',
      )}
    >
      <div className="mb-1 flex items-center justify-between">
        <span className="text-sm font-medium">{candidate.name}</span>
        {!accepted && !rejected && (
          <div className="flex gap-1">
            <button
              onClick={onAccept}
              className="rounded bg-success/10 px-2 py-0.5 text-xs text-success hover:bg-success/20"
            >
              Accept
            </button>
            <button
              onClick={onReject}
              className="rounded bg-destructive/10 px-2 py-0.5 text-xs text-destructive hover:bg-destructive/20"
            >
              Reject
            </button>
          </div>
        )}
      </div>

      {candidate.description && (
        <p className="mb-2 text-xs text-muted-foreground">{candidate.description}</p>
      )}

      <div className="flex gap-4 text-xs">
        {candidate.pros.length > 0 && (
          <div>
            <span className="font-medium text-success">Pros:</span>
            <ul className="mt-0.5">
              {candidate.pros.map((p, i) => (
                <li key={i}>+ {p}</li>
              ))}
            </ul>
          </div>
        )}
        {candidate.cons.length > 0 && (
          <div>
            <span className="font-medium text-destructive">Cons:</span>
            <ul className="mt-0.5">
              {candidate.cons.map((c, i) => (
                <li key={i}>- {c}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {!accepted && !rejected && (
        <div className="mt-2 flex gap-2">
          <button onClick={onAddPro} className="text-xs text-success hover:underline">
            + Pro
          </button>
          <button onClick={onAddCon} className="text-xs text-destructive hover:underline">
            + Con
          </button>
        </div>
      )}

      {rejected && candidate.rejectionReason && (
        <div className="mt-1 text-xs text-destructive/70">
          Reason: {candidate.rejectionReason}
        </div>
      )}
    </div>
  );
}
