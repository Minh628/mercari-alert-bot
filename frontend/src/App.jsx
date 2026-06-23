import { Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import { MainLayout } from './components/layout/MainLayout/MainLayout';
import { WelcomeTab } from './pages/Dashboard/WelcomeTab/WelcomeTab';
import { CategoryTab } from './pages/Dashboard/CategoryTab/CategoryTab';
import { KeywordTab } from './pages/Dashboard/KeywordTab/KeywordTab';
import { NotificationsTab } from './pages/Dashboard/NotificationsTab/NotificationsTab';
import { SettingsTab } from './pages/Dashboard/SettingsTab/SettingsTab';

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<WelcomeTab />} />
          <Route path="category" element={<CategoryTab />} />
          <Route path="keyword" element={<KeywordTab />} />
          <Route path="notifications" element={<NotificationsTab />} />
          <Route path="settings" element={<SettingsTab />} />
        </Route>
      </Routes>
      <Toaster richColors position="top-right" />
    </>
  );
}

export default App;
