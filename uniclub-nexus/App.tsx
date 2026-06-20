import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { UIProvider } from './context/UIContext';
import { ThemeProvider } from './context/ThemeContext';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Home } from './pages/Home';
import { Announcements } from './pages/Announcements';
import { Clubs } from './pages/Clubs';
import { ClubPanel } from './pages/ClubPanel';
import { ClubDetails } from './pages/ClubDetails';
import { Events } from './pages/Events';
import { Projects } from './pages/Projects';
import { AdminPanel } from './pages/AdminPanel';
import { Profile } from './pages/Profile';
import { BugReportPage } from './pages/BugReport';
import { Conversation } from './pages/Conversation';
import { EventPlanningChat } from './pages/EventPlanningChat';
import { GeneralChat } from './pages/GeneralChat';
import { ClubChat } from './pages/ClubChat';
import { Credits } from './pages/Credits';
import { Lock, Clock, Phone, LogOut, Loader2 } from 'lucide-react';

const AppRoutes = () => {
  const { user, loading, logout } = useAuth();
  const [fakeLoading, setFakeLoading] = useState(true);

  useEffect(() => {
      const timer = setTimeout(() => {
          setFakeLoading(false);
      }, 1800);
      return () => clearTimeout(timer);
  }, []);

  if (loading || fakeLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-slate-900 transition-colors p-4">
        <div className="relative mb-6">
            <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100/50 dark:shadow-none animate-pulse relative z-10 border border-indigo-100 dark:border-indigo-800">
                <Loader2 size={28} className="text-indigo-600 dark:text-indigo-400 animate-spin" />
            </div>
            <div className="absolute inset-0 bg-indigo-400 rounded-2xl animate-ping opacity-20"></div>
        </div>
        <h2 className="text-2xl font-black font-display text-slate-800 dark:text-slate-100 tracking-tight">BNI Yekhlef</h2>
        <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mt-3 animate-pulse">Loading</p>
      </div>
    );
  }

  // Determine active suspension status
  const isCurrentlySuspended = !!user?.isSuspended && (
    user.isSuspendedIndefinitely || 
    !user.suspendedUntil || 
    new Date() < new Date(user.suspendedUntil)
  );

  if (user && isCurrentlySuspended) {
    const formattedUntil = user.suspendedUntil 
      ? new Date(user.suspendedUntil).toLocaleString() 
      : 'Indefinite Review';

    return (
      <div className="min-h-screen flex flex-col bg-white text-slate-900 font-sans select-none antialiased">
        {/* Simple top brand header of the app */}
        <header className="border-b border-slate-100 bg-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center font-bold text-white text-xs">
              B
            </div>
            <span className="font-bold text-slate-900 text-sm tracking-tight">BNI Yekhlef</span>
          </div>
          <button
            onClick={() => logout()}
            className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-slate-50 text-slate-600 font-semibold rounded-lg text-xs transition-colors border border-slate-200"
          >
            <LogOut size={13} /> Sign Out
          </button>
        </header>

        {/* Suspended user focus message */}
        <main className="flex-1 flex flex-col items-center justify-center p-6 max-w-xl mx-auto w-full text-center">
          <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center text-rose-500 mb-6 border border-rose-100">
            <Lock size={18} />
          </div>

          <h2 className="text-xl font-black tracking-tight text-slate-900 mb-2 uppercase">
            Membership Status Alert
          </h2>
          
          <p className="text-xs text-slate-500 leading-relaxed mb-6">
            Your university portal clearances are temporarily reserved due to safety/standing enforcement policy.
          </p>

          <div className="w-full text-left bg-slate-50 border border-slate-100 rounded-2xl p-5 mb-8 space-y-4">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block mb-1">
                Disciplinary Reason
              </span>
              <p className="text-xs font-semibold text-slate-700 bg-white border border-slate-100 p-3.5 rounded-xl leading-relaxed">
                you are suspended for reason: {user.suspendedReason || "No custom reason recorded."}
              </p>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block mb-1">
                Unsuspended Schedule
              </span>
              <p className="text-xs font-bold text-indigo-600 bg-indigo-50/50 border border-indigo-100 p-3.5 rounded-xl leading-relaxed">
                {user.isSuspendedIndefinitely 
                  ? "you are gonne get unsuspended after appeal clearance or manual administrative mitigation." 
                  : `you are gonne get unsuspended after ${formattedUntil}`
                }
              </p>
            </div>
          </div>

          <button
            onClick={() => logout()}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm"
          >
            <LogOut size={13} /> Return to Sign In Screen
          </button>
        </main>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public Route: Login */}
      <Route path="/login" element={!user ? <Login /> : <Navigate to="/" replace />} />
      
      {/* Protected Routes */}
      <Route path="/*" element={
        user ? (
          <Layout>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/announcements" element={<Announcements />} />
              <Route path="/clubs" element={<Clubs />} />
              <Route path="/clubs/:clubId" element={<ClubDetails />} />
              <Route path="/clubs/:clubId/chat" element={<ClubChat />} />
              <Route path="/club-panel/:clubId" element={<ClubPanel />} />
              <Route path="/events" element={<Events />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/admin" element={<AdminPanel />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/bugs" element={<BugReportPage />} />
              <Route path="/chat" element={<Conversation />} />
              <Route path="/event-planning" element={<EventPlanningChat />} />
              <Route path="/general-chat" element={<GeneralChat />} />
              <Route path="/credits" element={<Credits />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Layout>
        ) : (
          <Navigate to="/login" replace />
        )
      } />
    </Routes>
  );
};

const App = () => {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <UIProvider>
          <AuthProvider>
            <HashRouter>
              <AppRoutes />
            </HashRouter>
          </AuthProvider>
        </UIProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
};

export default App;