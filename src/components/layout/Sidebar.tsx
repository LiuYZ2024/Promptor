import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useSessions, createSession } from '@/hooks';
import { cn, setLastActiveSessionId } from '@/lib/utils';
import { NewSessionModal } from '@/components/workflow/NewSessionModal';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const NAV_ITEMS = [
  { to: '/workflow', label: 'Workflow', icon: '⚡' },
  { to: '/refiner', label: 'Refiner', icon: '✨' },
  { to: '/settings', label: 'Settings', icon: '⚙' },
];

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const sessions = useSessions();
  const navigate = useNavigate();
  const [showNewSessionModal, setShowNewSessionModal] = useState(false);

  async function handleCreateSession() {
    const id = await createSession({
      taskType: 'coding',
      goal: '',
      hasCodebase: false,
      agentTarget: 'cursor',
    });
    setLastActiveSessionId(id);
    navigate(`/session/${id}`);
  }

  function handleNewSession() {
    const dismissed = localStorage.getItem('promptor:dismissIntroModal') === 'true';
    if (dismissed) {
      handleCreateSession();
    } else {
      setShowNewSessionModal(true);
    }
  }

  return (
    <aside
      className={cn(
        'flex flex-col border-r border-border bg-background transition-all duration-200',
        collapsed ? 'w-14' : 'w-56',
      )}
    >
      <div className="flex items-center justify-between border-b border-border px-3 py-3">
        {!collapsed && (
          <span className="text-sm font-semibold tracking-tight">
            Promptor
          </span>
        )}
        <button
          onClick={onToggle}
          className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? '→' : '←'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-2">
        <div className="mb-3">
          <button
            onClick={handleNewSession}
            className="w-full rounded-md border border-border px-3 py-1.5 text-left text-sm text-foreground hover:bg-muted"
          >
            {collapsed ? '+' : '+ New Session'}
          </button>
        </div>

        {!collapsed && sessions.length > 0 && (
          <div className="mb-3 space-y-0.5">
            <div className="px-2 pb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Sessions
            </div>
            {sessions
              .filter((s) => s.status === 'active')
              .slice(0, 20)
              .map((s) => (
                <NavLink
                  key={s.id}
                  to={`/session/${s.id}`}
                  onClick={() => setLastActiveSessionId(s.id)}
                  className={({ isActive }) =>
                    cn(
                      'block truncate rounded-md px-2 py-1.5 text-sm',
                      isActive
                        ? 'bg-muted font-medium text-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    )
                  }
                >
                  {s.title || 'Untitled'}
                </NavLink>
              ))}
          </div>
        )}
      </div>

      <nav className="border-t border-border px-2 py-2 space-y-0.5">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm',
                isActive
                  ? 'bg-muted font-medium text-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                collapsed && 'justify-center',
              )
            }
          >
            <span>{item.icon}</span>
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {showNewSessionModal && (
        <NewSessionModal
          onConfirm={() => {
            setShowNewSessionModal(false);
            handleCreateSession();
          }}
          onDismissForever={() => {
            localStorage.setItem('promptor:dismissIntroModal', 'true');
            setShowNewSessionModal(false);
            handleCreateSession();
          }}
          onClose={() => setShowNewSessionModal(false)}
        />
      )}
    </aside>
  );
}
