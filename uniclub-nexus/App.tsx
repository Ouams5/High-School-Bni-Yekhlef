import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Home } from './pages/Home';
import { Announcements } from './pages/Announcements';
import { Clubs } from './pages/Clubs';
import { ClubPanel } from './pages/ClubPanel';
import { ClubDetails } from './pages/ClubDetails'; // Import new page
import { Events } from './pages/Events';
import { Projects } from './pages/Projects';
import { AdminPanel } from './pages/AdminPanel';
import { Profile } from './pages/Profile';
import { BugReportPage } from './pages/BugReport';

const App = () => {
  return (
    <AuthProvider>
      <HashRouter>
        <Layout>
          <Routes>
            <Route path="/login" element={<Login />} />
            
            {/* Protected Routes inside Layout */}
            <Route path="/" element={<Home />} />
            <Route path="/announcements" element={<Announcements />} />
            <Route path="/clubs" element={<Clubs />} />
            <Route path="/clubs/:clubId" element={<ClubDetails />} /> {/* New Route */}
            <Route path="/club-panel/:clubId" element={<ClubPanel />} />
            <Route path="/events" element={<Events />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/admin" element={<AdminPanel />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/bugs" element={<BugReportPage />} />
            
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </HashRouter>
    </AuthProvider>
  );
};

export default App;