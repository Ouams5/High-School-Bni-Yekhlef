import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Link, useLocation } from 'react-router-dom';
import { db } from '../services/mockFirebase';
import { Notification } from '../types';
import { 
  LayoutDashboard, 
  Briefcase, 
  FileText, 
  CalendarDays, 
  Users, 
  BarChart3, 
  User as UserIcon,
  Search,
  Bell,
  Globe,
  Menu,
  LogOut,
  ChevronDown,
  LogIn,
  X,
  MessageSquareCode
} from 'lucide-react';

export const Layout = ({ children }: React.PropsWithChildren<{}>) => {
  const { user, logout, isDev, isOwner } = useAuth();
  const { t, language, setLanguage, isRTL } = useLanguage();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);

  useEffect(() => {
    const fetchNotifs = async () => {
        if (!user) return;
        const allNotifs = await db.getNotifications();
        const filtered = allNotifs.filter(n => {
            if (!n.clubId) return true;
            return user.joinedClubIds.includes(n.clubId);
        });
        setNotifications(filtered);
    };
    fetchNotifs();
  }, [user, location]);

  const handleDismissNotification = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await db.deleteNotification(id);
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const NavItem = ({ to, icon: Icon, label }: { to: string, icon: any, label: string }) => {
    const isActive = location.pathname === to;
    return (
      <Link 
        to={to} 
        onClick={() => setIsMobileMenuOpen(false)}
        className={`flex items-center gap-4 px-6 py-4 transition-all duration-200 relative group ${
          isActive 
            ? 'text-blue-600 bg-gradient-to-r from-blue-50 to-transparent' 
            : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
        }`}
      >
        {isActive && (
          <div className={`absolute top-0 bottom-0 w-1.5 bg-blue-600 ${isRTL ? 'right-0 rounded-l-md' : 'left-0 rounded-r-md'}`} />
        )}
        <Icon size={22} strokeWidth={1.5} className={isActive ? 'text-blue-600' : 'text-slate-500 group-hover:text-slate-700'} />
        <span className={`font-medium text-base ${isActive ? 'font-semibold' : ''}`}>{label}</span>
      </Link>
    );
  };

  const SidebarContent = () => (
    <>
        {/* Logo Section */}
        <div className="p-8 pb-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-blue-200">
              BY
            </div>
            <div className="flex flex-col">
              <h1 className="text-lg font-bold text-slate-800 leading-tight">BNI Yekhlef<br/>Highschool</h1>
              <span className="text-xs text-slate-400 font-medium mt-0.5">{t('studentPortal')}</span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto space-y-1">
          <NavItem to="/" icon={LayoutDashboard} label={t('dashboard')} />
          <NavItem to="/projects" icon={Briefcase} label={t('projects')} />
          <NavItem to="/announcements" icon={FileText} label={t('announcements')} />
          <NavItem to="/events" icon={CalendarDays} label={t('events')} />
          <NavItem to="/clubs" icon={Users} label={t('clubs')} />
          <NavItem to="/bugs" icon={BarChart3} label={t('reports')} />
          <NavItem to="/profile" icon={UserIcon} label={t('profile')} />
          
          {(isDev || isOwner) && (
             <NavItem to="/chat" icon={MessageSquareCode} label="Dev Chat" />
          )}
          
          {user?.role === 'ADMIN' || user?.role === 'OWNER' || user?.role === 'DEV' ? (
             <NavItem to="/admin" icon={LogOut} label={t('adminPanel')} />
          ) : null}
        </nav>

        {/* Bottom User Section */}
        <div className="p-6 mt-auto">
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 mb-6 flex items-center gap-3">
             <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg text-white overflow-hidden ${user ? 'bg-blue-600' : 'bg-slate-300'}`}>
                {user?.avatarUrl ? <img src={user.avatarUrl} alt="av" className="w-full h-full object-cover" /> : (user ? user.name.charAt(0) : 'GU')}
             </div>
             <div className="overflow-hidden">
                <p className="text-sm font-bold text-slate-800 truncate">{user ? user.name : t('guestUser')}</p>
                <p className="text-xs text-slate-500 truncate capitalize">{user ? user.role.toLowerCase().replace('_', ' ') : t('notSignedIn')}</p>
             </div>
          </div>
          
          {user ? (
            <button 
              onClick={logout}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3.5 rounded-xl transition-colors shadow-lg shadow-blue-200 flex items-center justify-center gap-2"
            >
              <LogOut size={20} />
              {t('logout')}
            </button>
          ) : (
             <Link 
              to="/login"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3.5 rounded-xl transition-colors shadow-lg shadow-blue-200 flex items-center justify-center gap-2"
            >
              <LogIn size={20} />
              {t('login')}
            </Link>
          )}
        </div>
    </>
  );

  return (
    <div className="flex h-screen bg-[#F3F4F6] font-sans text-slate-600">
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar - Desktop & Mobile */}
      <aside className={`
        fixed md:static inset-y-0 z-50 w-[300px] bg-white border-r border-l border-slate-200 flex flex-col transition-transform duration-300 ease-in-out shadow-sm
        ${isMobileMenuOpen ? 'translate-x-0' : (isRTL ? 'translate-x-full md:translate-x-0' : '-translate-x-full md:translate-x-0')}
        ${isRTL ? 'right-0 md:border-l md:border-r-0' : 'left-0 md:border-r'}
      `}>
        <SidebarContent />
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Top Header */}
        <header className="h-20 bg-white sticky top-0 z-30 flex items-center justify-between px-8 border-b border-slate-100">
          <div className="flex items-center gap-4 flex-1">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-lg"
            >
              <Menu size={24} />
            </button>
            
            {/* Search Bar */}
            <div className="hidden md:flex items-center bg-white border border-slate-200 rounded-lg px-4 py-3 w-full max-w-lg shadow-sm focus-within:ring-2 focus-within:ring-blue-100 transition-all">
              <Search size={20} className={`text-slate-400 ${isRTL ? 'ml-3' : 'mr-3'}`} />
              <input 
                type="text" 
                placeholder={t('searchPlaceholder')} 
                className="bg-transparent border-none outline-none text-sm w-full text-slate-600 placeholder-slate-400 font-medium"
              />
            </div>
          </div>

          <div className="flex items-center gap-6">
            {/* Language Switcher */}
            <div className="relative">
                <button 
                    onClick={() => setShowLangMenu(!showLangMenu)} 
                    className="flex items-center gap-2 text-sm font-bold text-slate-600 hover:bg-slate-50 px-3 py-1.5 rounded-lg transition-colors border border-transparent hover:border-slate-200"
                >
                    <Globe size={18} className="text-blue-600" />
                    <span className="uppercase">{language}</span>
                    <ChevronDown size={14} className="opacity-50" />
                </button>
                {showLangMenu && (
                    <div className={`absolute top-full mt-2 w-32 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-50 ${isRTL ? 'left-0' : 'right-0'}`}>
                        <button onClick={() => {setLanguage('en'); setShowLangMenu(false);}} className="w-full text-left px-4 py-2 hover:bg-slate-50 text-sm font-medium">English</button>
                        <button onClick={() => {setLanguage('fr'); setShowLangMenu(false);}} className="w-full text-left px-4 py-2 hover:bg-slate-50 text-sm font-medium">Français</button>
                        <button onClick={() => {setLanguage('ar'); setShowLangMenu(false);}} className="w-full text-left px-4 py-2 hover:bg-slate-50 text-sm font-medium font-arabic">العربية</button>
                    </div>
                )}
            </div>

            <div className="relative">
                <button onClick={() => setShowNotifPanel(!showNotifPanel)} className="relative p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors">
                    <Bell size={24} />
                    {notifications.length > 0 && <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>}
                </button>
                {showNotifPanel && (
                    <div className={`absolute top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-50 ${isRTL ? 'left-0' : 'right-0'}`}>
                        <div className="p-4 border-b border-slate-50 font-bold text-slate-700 flex justify-between items-center">
                            <span>Notifications</span>
                        </div>
                        <div className="max-h-80 overflow-y-auto">
                            {notifications.length === 0 ? (
                                <div className="p-4 text-center text-slate-400 text-sm">No new notifications</div>
                            ) : (
                                notifications.map(n => (
                                    <div key={n.id} className="p-4 border-b border-slate-50 hover:bg-slate-50 text-sm relative group">
                                        <button 
                                            onClick={(e) => handleDismissNotification(n.id, e)}
                                            className="absolute top-2 right-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-1"
                                            title="Dismiss"
                                        >
                                            <X size={14} />
                                        </button>
                                        <div className="font-bold text-slate-800 pr-6">{n.title}</div>
                                        <div className="text-slate-500 mt-1">{n.message}</div>
                                        <div className="text-xs text-slate-400 mt-2">{new Date(n.date).toLocaleDateString()}</div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>
            
            {user ? (
               <div className="text-right hidden sm:block">
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">{t('welcome').split(' ')[0]}</p>
                  <p className="text-sm font-medium text-slate-600">{user.name.split(' ')[0]}</p>
               </div> 
            ) : (
                <div className="text-right hidden sm:block">
                  <p className="text-xs text-blue-600 font-bold uppercase tracking-wider">{t('welcome').split(' ')[0]}</p>
                  <p className="text-sm font-medium text-slate-400">{t('pleaseSignIn')}</p>
               </div>
            )}
          </div>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto p-6 md:p-10 scroll-smooth">
          <div className="max-w-[1400px] mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};