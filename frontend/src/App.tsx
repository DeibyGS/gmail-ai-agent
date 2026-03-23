import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import Navbar from './components/Navbar';
import EmailsPage from './pages/EmailsPage';
import StatsPage from './pages/StatsPage';
import CalendarPage from './pages/CalendarPage';
import SettingsPage from './pages/SettingsPage';
import BriefingPage from './pages/BriefingPage';
import { theme } from './theme';

export default function App() {
  return (
    // BrowserRouter habilita la navegación por URLs (/, /stats, /calendar)
    <BrowserRouter>
      <div style={{ minHeight: '100vh', background: theme.colors.bg }}>
        <Navbar />
        <Routes>
          <Route path="/" element={<EmailsPage />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/briefing" element={<BriefingPage />} />
        </Routes>
        {/* Toast notifications globales — tema dark con acento del design system */}
        <Toaster
          theme="dark"
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#1a2234',
              border: '1px solid rgba(99,102,241,0.25)',
              color: '#E5E7EB',
              fontFamily: "'Inter', sans-serif",
              fontSize: '0.875rem',
            },
          }}
        />
      </div>
    </BrowserRouter>
  );
}
