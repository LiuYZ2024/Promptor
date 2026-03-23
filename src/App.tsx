import { HashRouter, Routes, Route } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { DbProvider } from '@/components/DbProvider';
import { RootRedirect } from '@/pages/RootRedirect';
import { SettingsPage } from '@/pages/SettingsPage';
import { WorkflowBuilderPage } from '@/pages/WorkflowBuilderPage';
import { SessionWorkspacePage } from '@/pages/SessionWorkspacePage';

export function App() {
  return (
    <DbProvider>
      <HashRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/" element={<RootRedirect />} />
            <Route path="/workflow" element={<WorkflowBuilderPage />} />
            <Route path="/session/:id" element={<SessionWorkspacePage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </HashRouter>
    </DbProvider>
  );
}
