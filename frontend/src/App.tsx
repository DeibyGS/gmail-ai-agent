import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import EmailsPage from './pages/EmailsPage';
import StatsPage from './pages/StatsPage';
import CalendarPage from './pages/CalendarPage';
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
        </Routes>
      </div>
    </BrowserRouter>
  );
}
