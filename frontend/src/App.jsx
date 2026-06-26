import { Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import { MainLayout } from './components/layout/MainLayout/MainLayout';
import { ProtectedRoute } from './components/layout/ProtectedRoute/ProtectedRoute';
import { WelcomeTab } from './pages/Dashboard/WelcomeTab/WelcomeTab';
import { FollowsTab } from './pages/Dashboard/FollowsTab/FollowsTab';
import { NotificationsTab } from './pages/Dashboard/NotificationsTab/NotificationsTab';
import { SettingsTab } from './pages/Dashboard/SettingsTab/SettingsTab';
import { Login } from './components/layout/Login/Login';

function App() {
  return (
    <>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<MainLayout />}>
          <Route index element={<WelcomeTab />} />
          
          {/* Các routes bắt buộc đăng nhập */}
          <Route element={<ProtectedRoute />}>
            <Route path="follows" element={<FollowsTab />} />
            <Route path="notifications" element={<NotificationsTab />} />
            <Route path="settings" element={<SettingsTab />} />
          </Route>
        </Route>
      </Routes>
      <Toaster richColors position="top-right" />
    </>
  );
}

export default App;
