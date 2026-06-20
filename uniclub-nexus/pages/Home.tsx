import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useTheme, Theme } from '../context/ThemeContext';
import { useUI } from '../context/UIContext';
import { db } from '../services/mockFirebase';
import { UserRole, BugReport, User } from '../types';
import { 
    LayoutDashboard, Search, MessageCircle, Palette, Megaphone, Plus, X, 
    Sun, Moon, CloudRain, Flower2, Stars, Edit2, Check,
    Bug, ShieldAlert, Code2, Users, Calendar, Settings, Database, StickyNote, Move,
    Terminal, Activity, GripHorizontal, ChevronRight, Maximize2, Rocket
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';

type WidgetType = 'search' | 'themes' | 'chats' | 'announcements' | 'reports' | 'admin_panel' | 'debug_panel' | 'dev_chat' | 'stats' | 'events' | 'actions' | 'my_clubs';

interface WidgetItem {
    id: string;
    type: WidgetType;
    colSpan: number; // 1 to 3
    rowSpan: number; // 1 to 3
}


// --- WIDGET COMPONENTS DEFINED OUTSIDE TO PREVENT RE-RENDER/FOCUS LOSS ---

const AdminPanelWidget = ({ usersList, navigate }: { usersList: User[], navigate: any }) => {
    return (
      <div 
          onClick={() => navigate('/admin')}
          className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 h-full flex flex-col cursor-pointer overflow-hidden group relative shadow-sm hover:shadow-lg transition-all duration-300"
      >
          {/* Decorative glowing gradient top border */}
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-red-500 via-amber-500 to-indigo-500"></div>
          
          <div className="p-3 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-800/80 flex justify-between items-center mt-[3px]">
              <h3 className="text-xs font-black uppercase text-rose-600 dark:text-rose-400 flex items-center gap-2 tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                  <ShieldAlert size={14} /> Admin Directory
              </h3>
              <span className="text-[10px] bg-red-105 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full font-extrabold border border-red-200/40 dark:border-red-900/40">
                  {usersList.length} Active Node User{usersList.length !== 1 ? 's' : ''}
              </span>
          </div>
          
          <div className="flex-1 overflow-hidden p-3 relative">
              <table className="w-full text-left text-[11px] font-sans">
                  <thead>
                      <tr className="text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800 font-bold tracking-wider uppercase text-[9px] pb-2">
                          <th className="pb-2 pl-1 font-semibold">User Profile</th>
                          <th className="pb-2 font-semibold">Security Role</th>
                          <th className="pb-2 font-semibold text-right pr-2">Status</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100/50 dark:divide-slate-800/40">
                      {usersList.slice(0, 5).map(u => {
                          const isDev = u.role === 'DEV' || u.role === 'OWNER';
                          const isAdmin = u.role === 'ADMIN';
                          return (
                              <tr key={u.id} className="group/row hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                                  <td className="py-2 pl-1 flex items-center gap-2">
                                      <div className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden shrink-0 border border-slate-100 dark:border-slate-700">
                                          <img src={u.avatarUrl} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                                      </div>
                                      <span className="font-semibold text-slate-700 dark:text-slate-250 truncate max-w-[90px] group-hover/row:text-red-500 transition-colors">{u.name}</span>
                                  </td>
                                  <td className="py-2.5">
                                      <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-extrabold font-mono tracking-tight ${
                                          isDev ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-350' :
                                          isAdmin ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-350' :
                                          'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                      }`}>
                                          {u.role}
                                      </span>
                                  </td>
                                  <td className="py-2.5 text-right pr-2">
                                      <div className="flex items-center justify-end gap-1.5">
                                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-400"></span>
                                          <span className="text-[9px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-tight font-mono">ok</span>
                                      </div>
                                  </td>
                              </tr>
                          );
                      })}
                  </tbody>
              </table>
              <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white dark:from-slate-900 to-transparent pointer-events-none"></div>
          </div>
      </div>
    );
};

const DebugPanelWidget = ({ navigate }: { navigate: any }) => {
    const [logs, setLogs] = useState<string[]>([]);
    const [stats, setStats] = useState({ cpu: 12, ram: 42 });

    useEffect(() => {
        const interval = setInterval(() => {
            const methods = ['GET', 'POST', 'PUT', 'DELETE'];
            const paths = ['/api/v1/auth/sync', '/api/v1/clubs', '/api/v1/db/realign', '/ws/messenger', '/api/v1/users/inspect'];
            const status = [200, 201, 250, 304, 401];
            const log = `${methods[Math.floor(Math.random()*methods.length)]} ${paths[Math.floor(Math.random()*paths.length)]} -> [${status[Math.floor(Math.random()*status.length)]}] in ${Math.floor(Math.random()*75 + 15)}ms`;
            setLogs(prev => [`${log}`, ...prev].slice(0, 15));
            setStats({
                cpu: Math.floor(Math.random() * 25 + 8),
                ram: Math.floor(Math.random() * 10 + 38)
            });
        }, 1800);
        return () => clearInterval(interval);
    }, []);

    return (
      <div 
          onClick={() => navigate('/debug')}
          className="bg-slate-950 rounded-2xl border border-slate-800 h-full flex flex-col cursor-pointer overflow-hidden font-mono text-[10px] relative group shadow-lg shadow-black/80"
      >
          {/* Cyberpunk accent corner indicator */}
          <div className="absolute top-0 right-0 w-12 h-1 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>
          
          <div className="p-2 bg-slate-900 border-b border-slate-800/80 flex justify-between items-center text-slate-400">
              <span className="flex items-center gap-1.5 font-bold text-emerald-400 tracking-wider">
                  <Terminal size={12} className="animate-pulse" /> SYSTEM_SHELL_DAEMON
              </span>
              <div className="flex items-center gap-2">
                  <span className="text-[8px] opacity-60">CPU: {stats.cpu}%</span>
                  <div className="flex gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-500/80"></div>
                      <div className="w-1.5 h-1.5 rounded-full bg-yellow-500/80"></div>
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/80"></div>
                  </div>
              </div>
          </div>
          
          <div className="flex-1 p-3 overflow-hidden text-emerald-400/95 flex flex-col gap-0.5 select-text">
              {logs.map((l, i) => (
                  <div key={i} className="truncate hover:bg-slate-900/80 py-0.5 pl-1 rounded hover:text-emerald-300 transition-colors flex items-center gap-1">
                      <span className="text-slate-600 font-bold shrink-0">{`>`}</span>
                      <span className="text-slate-500 font-mono text-[9px] shrink-0 font-bold">[{new Date().toLocaleTimeString().split(' ')[0]}]</span>
                      <span className="font-semibold text-[9.5px] truncate">{l}</span>
                  </div>
              ))}
              {logs.length === 0 && (
                  <div className="flex-1 flex flex-col items-center justify-center text-slate-600 gap-1">
                      <span className="animate-spin text-emerald-500">_</span>
                      <span>Spawning shell processes...</span>
                  </div>
              )}
          </div>
          
          <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.15)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.015),rgba(0,0,255,0.03))] z-10 bg-[length:100%_3px,4px_100%] pointer-events-none opacity-40"></div>
      </div>
    );
};

const SimpleWidget = ({ title, icon: Icon, color, children, onClick, subtitle }: any) => (
    <div 
        onClick={onClick} 
        className={`bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 h-full flex flex-col ${onClick ? 'cursor-pointer hover:border-slate-350 dark:hover:border-slate-700/80' : ''} transition-all duration-300 overflow-hidden`}
    >
        <div className={`p-3 bg-slate-50/50 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-800/60 flex items-center justify-between`}>
            <div className="flex items-center gap-2 font-display">
                <div className={`p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 shrink-0 ${color}`}>
                    <Icon size={14} className="stroke-[2.5]" />
                </div>
                <div className="flex flex-col">
                    <span className="text-xs font-black tracking-tight text-slate-800 dark:text-slate-100">{title}</span>
                    {subtitle && <span className="text-[9px] text-slate-400 dark:text-slate-500 font-medium tracking-tight mt-[-2px]">{subtitle}</span>}
                </div>
            </div>
            {onClick && (
                <div className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800/50 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                    <ChevronRight size={12} className="stroke-[3]" />
                </div>
            )}
        </div>
        <div className="flex-1 p-3.5 overflow-y-auto custom-scrollbar relative">
            {children}
        </div>
    </div>
);

export const Home = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { showToast } = useUI();
  const { setTheme, theme } = useTheme();
  const navigate = useNavigate();
  
  // Widget State with Persistence
  const [widgets, setWidgets] = useState<WidgetItem[]>(() => {
      try {
          const saved = localStorage.getItem(`home_widgets_v5_${user?.id}`); // Version bumped
          if (saved) return JSON.parse(saved);
      } catch (e) { console.error("Failed to load widgets", e); }
      
      // Default Layout
      return [
          { id: '1', type: 'stats', colSpan: 2, rowSpan: 1 },
          { id: '2', type: 'actions', colSpan: 2, rowSpan: 1 },
          { id: '3', type: 'search', colSpan: 2, rowSpan: 1 },
          { id: '4', type: 'events', colSpan: 2, rowSpan: 1 },
          { id: '5', type: 'announcements', colSpan: 2, rowSpan: 1 },
          { id: '6', type: 'my_clubs', colSpan: 2, rowSpan: 1 },
      ];
  });

  const [isEditing, setIsEditing] = useState(false);
  const [resizingId, setResizingId] = useState<string | null>(null);
  
  // --- Custom Smooth Drag State ---
  const [dragState, setDragState] = useState<{
      id: string;
      offsetX: number;
      offsetY: number;
      width: number;
      height: number;
  } | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const widgetsRef = useRef(widgets); // Ref to access current widgets in event listeners

  // Data
  const [allData, setAllData] = useState<{clubs: any[], projects: any[], announcements: any[], bugs: BugReport[], events: any[]}>({ 
    clubs: [], 
    projects: [], 
    announcements: [],
    bugs: [], // Initialized correctly to prevent slice error
    events: []
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{clubs: any[], projects: any[], announcements: any[]}>({ clubs: [], projects: [], announcements: [] });
  const [myClubs, setMyClubs] = useState<any[]>([]);
  const [devMessages, setDevMessages] = useState<any[]>([]);
  const [showReportsModal, setShowReportsModal] = useState(false);
  const [usersList, setUsersList] = useState<User[]>([]);

  // Effects
  useEffect(() => {
    localStorage.setItem(`home_widgets_v5_${user?.id}`, JSON.stringify(widgets));
    widgetsRef.current = widgets; // Sync ref
  }, [widgets, user]);

  useEffect(() => {
      const fetchData = async () => {
          const [c, p, a, b, u, e] = await Promise.all([
              db.getClubs(),
              db.getProjects(),
              db.getAnnouncements(),
              (user?.role === UserRole.ADMIN || user?.role === UserRole.OWNER || user?.role === UserRole.DEV) ? db.getBugReports() : Promise.resolve([]),
              (user?.role === UserRole.ADMIN || user?.role === UserRole.OWNER || user?.role === UserRole.DEV) ? db.getAllUsers() : Promise.resolve([]),
              db.getEvents()
          ]);
          setAllData({ clubs: c, projects: p, announcements: a, bugs: b || [], events: e || [] });
          setUsersList(u);
          if (user) setMyClubs(c.filter(club => user.leadingClubId === club.id));
      };
      fetchData();

      if (user?.role === UserRole.DEV || user?.role === UserRole.OWNER) {
          const unsub = db.subscribeToDevChat((msgs) => setDevMessages(msgs.slice(-5)));
          return () => unsub();
      }
  }, [user]);

  // Search Logic
  useEffect(() => {
      if (!searchQuery.trim()) {
          setSearchResults({ clubs: [], projects: [], announcements: [] });
          return;
      }
      const lowerQ = searchQuery.toLowerCase();
      setSearchResults({
          clubs: allData.clubs.filter(c => c.name.toLowerCase().includes(lowerQ)),
          projects: allData.projects.filter(p => p.title.toLowerCase().includes(lowerQ)),
          announcements: allData.announcements.filter(a => a.title.toLowerCase().includes(lowerQ))
      });
  }, [searchQuery, allData]);

  // --- Widget Management ---

  const addWidget = (type: WidgetType) => {
      if (widgets.find(w => w.type === type)) {
          showToast("Widget already active", "info");
          return;
      }
      setWidgets(prev => [...prev, {
          id: Date.now().toString(),
          type,
          colSpan: 1,
          rowSpan: 1
      }]);
      showToast("Widget added", "success");
  };

  const removeWidget = (id: string) => {
      setWidgets(prev => prev.filter(w => w.id !== id));
  };

  const cycleWidgetSize = (id: string) => {
      setWidgets(prev => prev.map(w => {
          if (w.id === id) {
              // Simple Cycle: 1x1 -> 2x1 -> 2x2 -> 1x1
              if (w.colSpan === 1 && w.rowSpan === 1) return { ...w, colSpan: 2, rowSpan: 1 };
              if (w.colSpan === 2 && w.rowSpan === 1) return { ...w, colSpan: 2, rowSpan: 2 };
              return { ...w, colSpan: 1, rowSpan: 1 };
          }
          return w;
      }));
  };

  // --- Smooth Drag Handlers ---

  const handleMouseDown = (e: React.MouseEvent, id: string) => {
      if (!isEditing || resizingId) return;
      // Only allow left click drag
      if (e.button !== 0) return;

      const target = e.currentTarget as HTMLElement;
      // Prevent drag if clicking a button inside the widget
      if ((e.target as HTMLElement).tagName === 'BUTTON') return;

      const rect = target.getBoundingClientRect();

      setDragState({
          id,
          offsetX: e.clientX - rect.left,
          offsetY: e.clientY - rect.top,
          width: rect.width,
          height: rect.height
      });
      setMousePos({ x: e.clientX, y: e.clientY });
  };

  useEffect(() => {
      if (!dragState) return;

      const handleMouseMove = (e: MouseEvent) => {
          setMousePos({ x: e.clientX, y: e.clientY });

          // Detection Logic
          const elements = document.elementsFromPoint(e.clientX, e.clientY);
          // Look for any element that has data-widget-id attribute
          const widgetEl = elements.find(el => el.hasAttribute('data-widget-id'));

          if (widgetEl) {
              const targetId = widgetEl.getAttribute('data-widget-id');
              if (targetId && targetId !== dragState.id) {
                  const currentList = [...widgetsRef.current];
                  const dragIndex = currentList.findIndex(w => w.id === dragState.id);
                  const hoverIndex = currentList.findIndex(w => w.id === targetId);

                  if (dragIndex !== -1 && hoverIndex !== -1) {
                      // Swap items in the list
                      const draggedItem = currentList[dragIndex];
                      currentList.splice(dragIndex, 1);
                      currentList.splice(hoverIndex, 0, draggedItem);
                      setWidgets(currentList);
                  }
              }
          }
      };

      const handleMouseUp = () => {
          setDragState(null);
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);

      return () => {
          window.removeEventListener('mousemove', handleMouseMove);
          window.removeEventListener('mouseup', handleMouseUp);
      };
  }, [dragState]);

  // --- Resize Handler ---
  const handleResizeStart = (e: React.MouseEvent, id: string) => {
      e.preventDefault();
      e.stopPropagation(); // Prevent triggering drag
      setResizingId(id);
      
      const startX = e.clientX;
      const startY = e.clientY;
      const widget = widgets.find(w => w.id === id);
      if (!widget) return;
      
      const startColSpan = widget.colSpan;
      const startRowSpan = widget.rowSpan;
      const COL_STEP = 150; 
      const ROW_STEP = 150; 

      const onMouseMove = (moveEvent: MouseEvent) => {
          const deltaX = moveEvent.clientX - startX;
          const deltaY = moveEvent.clientY - startY;

          const colChange = Math.round(deltaX / COL_STEP);
          const rowChange = Math.round(deltaY / ROW_STEP);

          const newColSpan = Math.max(1, Math.min(3, startColSpan + colChange));
          const newRowSpan = Math.max(1, Math.min(3, startRowSpan + rowChange));

          setWidgets(prev => prev.map(w => {
              if (w.id === id) {
                  return { ...w, colSpan: newColSpan, rowSpan: newRowSpan };
              }
              return w;
          }));
      };

      const onMouseUp = () => {
          setResizingId(null);
          window.removeEventListener('mousemove', onMouseMove);
          window.removeEventListener('mouseup', onMouseUp);
      };

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
  };

  const renderWidgetContent = (w: WidgetItem) => {
      switch(w.type) {
          case 'stats': return (
              <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 rounded-2xl h-full flex flex-col justify-between p-4 text-white hover:shadow-2xl hover:shadow-indigo-500/10 transition-all cursor-pointer overflow-hidden relative border border-slate-805 dark:border-slate-800 font-sans group">
                  <div className="absolute -right-12 -top-12 w-32 h-32 rounded-full bg-indigo-500/10 blur-xl group-hover:bg-indigo-500/20 transition-all duration-500"></div>
                  <div>
                      <div className="flex justify-between items-center mb-4">
                          <span className="text-[9px] font-black uppercase tracking-widest text-indigo-400 font-mono flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></span>
                              Telemetry Dashboard
                          </span>
                          <span className="text-[8px] bg-indigo-500/20 text-indigo-300 font-bold px-1.5 py-0.5 rounded uppercase font-mono tracking-tight">Active Nodes</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 mt-2 font-display">
                          <div className="bg-slate-900/40 p-2.5 rounded-xl border border-slate-800 hover:border-slate-700 transition-colors">
                              <div className="text-xl font-black text-white">{allData.clubs.length}</div>
                              <div className="text-[9px] font-semibold text-slate-400 mt-0.5">Clubs Active</div>
                          </div>
                          <div className="bg-slate-900/40 p-2.5 rounded-xl border border-slate-800 hover:border-slate-700 transition-colors">
                              <div className="text-xl font-black text-white">{allData.projects.length}</div>
                              <div className="text-[9px] font-semibold text-slate-400 mt-0.5">Projects Live</div>
                          </div>
                      </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[9px] font-mono text-indigo-300/80">
                      <span className="flex items-center gap-1">
                          <Activity size={10} className="stroke-[2.5]" />
                          Dynamic syncing active
                      </span>
                      <div className="flex items-center gap-1.5 bg-emerald-950/40 border border-emerald-900/30 text-emerald-400 px-2 py-0.5 rounded font-extrabold uppercase">
                          <span className="w-1 h-1 rounded-full bg-emerald-400 animate-ping shrink-0"></span>
                          Online
                      </div>
                  </div>
              </div>
          );
          case 'events': return (
              <SimpleWidget title={t('events')} icon={Calendar} color="text-emerald-500" subtitle="Campus Agenda">
                  <div className="space-y-3 font-sans">
                      {allData.events && allData.events.length > 0 ? (
                          allData.events.slice(0, Math.max(3, w.rowSpan * 2)).map(e => (
                              <div key={e.id} className="flex gap-3 items-center group cursor-pointer border-b border-slate-100 dark:border-slate-805/60 pb-2.5 last:border-0 last:pb-0">
                                  <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-150 flex flex-col items-center justify-center shrink-0 border border-slate-200 dark:border-slate-750 font-sans shadow-sm group-hover:border-emerald-500/30 transition-all">
                                      <span className="text-[8px] font-extrabold uppercase text-emerald-555 text-emerald-550 text-emerald-500 tracking-wider font-mono">{new Date(e.date).toLocaleString('default', { month: 'short' })}</span>
                                      <span className="text-sm font-black leading-none mt-0.5">{new Date(e.date).getDate()}</span>
                                  </div>
                                  <div className="min-w-0 flex-1">
                                      <div className="font-bold text-xs text-slate-800 dark:text-slate-200 truncate group-hover:text-emerald-500 transition-colors">{e.title}</div>
                                      <div className="text-[9px] text-slate-400 truncate mt-0.5 flex items-center gap-1 font-mono">{e.location}</div>
                                  </div>
                              </div>
                          ))
                      ) : (
                          <div className="text-xs text-slate-400 dark:text-slate-550 text-center py-6 italic font-sans animate-pulse">No upcoming events.</div>
                      )}
                  </div>
              </SimpleWidget>
          );
          case 'actions': return (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-250 dark:border-slate-800 h-full p-4 flex flex-col justify-between shadow-sm hover:shadow-md transition-all">
                  <div>
                      <h3 className="text-[9px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-widest mb-3 font-mono">Quick Access</h3>
                      <div className="grid grid-cols-2 gap-2">
                          <button onClick={(e) => { e.stopPropagation(); navigate('/clubs'); }} className="flex flex-col items-center justify-center p-3 gap-1.5 bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-indigo-950/30 border border-slate-150 dark:border-slate-800/80 hover:border-indigo-500/20 text-slate-705 dark:text-slate-350 rounded-xl transition-all cursor-pointer group">
                              <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-650 dark:text-indigo-400 rounded-lg group-hover:scale-110 transition-transform">
                                  <Users size={16} className="stroke-[2.5]" />
                              </div>
                              <span className="text-[10px] font-extrabold tracking-tight text-slate-700 dark:text-slate-100">Explore Clubs</span>
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); navigate('/projects'); }} className="flex flex-col items-center justify-center p-3 gap-1.5 bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-indigo-955 dark:hover:bg-indigo-950/30 border border-slate-150 dark:border-slate-800/80 hover:border-indigo-500/20 text-slate-705 dark:text-slate-350 rounded-xl transition-all cursor-pointer group">
                              <div className="p-2 bg-purple-50 dark:bg-purple-900/20 text-purple-650 dark:text-purple-400 rounded-lg group-hover:scale-110 transition-transform">
                                  <Rocket size={16} className="stroke-[2.5]" />
                              </div>
                              <span className="text-[10px] font-extrabold tracking-tight text-slate-705 dark:text-slate-100">View Projects</span>
                          </button>
                      </div>
                  </div>
                  <div className="mt-3">
                      {user && (user.role === 'ADMIN' || user.role === 'OWNER') ? (
                          <button onClick={(e) => { e.stopPropagation(); setShowReportsModal(true); }} className="w-full py-2.5 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/25 border border-amber-200/40 dark:border-amber-900/30 text-amber-705 dark:text-amber-400 text-[10px] font-bold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer">
                              <ShieldAlert size={14} className="text-amber-500 stroke-[2.5]" />
                              <span>Support Tickets Queue</span>
                          </button>
                      ) : (
                          <button onClick={(e) => { e.stopPropagation(); navigate('/bugs'); }} className="w-full py-2.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-955 dark:bg-rose-950/25 border border-rose-200/40 dark:border-rose-900/30 text-rose-705 dark:text-rose-400 text-[10px] font-bold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer">
                              <ShieldAlert size={14} className="text-rose-500 stroke-[2.5]" />
                              <span>Submit Support Ticket</span>
                          </button>
                      )}
                  </div>
              </div>
          );
          case 'my_clubs': return (
              <SimpleWidget title="My Managed Clubs" icon={ShieldAlert} color="text-rose-500" subtitle="My Operations">
                  {myClubs.length > 0 ? (
                      <div className="space-y-2 font-sans">
                          {myClubs.map(c => (
                              <div key={c.id} onClick={(e) => { e.stopPropagation(); navigate(`/club-panel/${c.id}`); }} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 hover:border-indigo-500/20 hover:bg-slate-100/30 transition-all cursor-pointer group">
                                  <div className="flex flex-col min-w-0">
                                      <span className="font-bold text-xs text-slate-800 dark:text-slate-200 group-hover:text-rose-600 transition-colors truncate">{c.name}</span>
                                      <span className="text-[9px] text-slate-400 dark:text-slate-500 font-mono tracking-tight mt-0.5">Control Center</span>
                                  </div>
                                  <div className="w-5 h-5 rounded-full bg-slate-200/50 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-rose-500 group-hover:scale-105 transition-all shrink-0">
                                      <ChevronRight size={12} className="stroke-[2.5]" />
                                  </div>
                              </div>
                          ))}
                      </div>
                  ) : (
                      <div className="flex flex-col items-center justify-center text-center py-6 font-sans">
                          <p className="text-[11px] font-bold text-slate-600 dark:text-slate-350">No clubs managed.</p>
                          <p className="text-[9px] text-slate-400 dark:text-slate-505 mt-1 max-w-[150px]">Advisors can override settings and customize layouts.</p>
                      </div>
                  )}
              </SimpleWidget>
          );
          case 'search': return (
              <SimpleWidget title={t('searchResults')} icon={Search} color="text-blue-500" subtitle="Global Catalog">
                  <div className="relative mb-3 font-sans">
                      <Search className="absolute left-3 top-2.5 text-slate-400" size={12}/>
                      <input 
                        type="text" 
                        placeholder={t('searchEverything')}
                        className="w-full pl-8 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all font-semibold"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        onMouseDown={e => e.stopPropagation()}
                      />
                  </div>
                  <div className="space-y-2 overflow-y-auto pr-1 custom-scrollbar font-sans" style={{maxHeight:'calc(100% - 40px)'}}>
                      {searchResults.clubs.map(c => (
                          <div onClick={() => navigate(`/clubs`)} key={c.id} className="text-xs font-bold truncate p-1.5 hover:bg-slate-55 dark:hover:bg-slate-800 rounded-lg cursor-pointer flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                              <span className="text-slate-705 text-slate-700 dark:text-slate-205 font-semibold truncate max-w-[120px]">{c.name}</span>
                              <span className="text-[8px] bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-355 px-1.5 py-0.5 rounded font-mono ml-auto">Club</span>
                          </div>
                      ))}
                      {searchResults.projects.map(p => (
                          <div onClick={() => navigate(`/projects`)} key={p.id} className="text-xs font-bold truncate p-1.5 hover:bg-slate-55 dark:hover:bg-slate-800 rounded-lg cursor-pointer flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse"></span>
                              <span className="text-slate-705 text-slate-700 dark:text-slate-205 font-semibold truncate max-w-[120px]">{p.title}</span>
                              <span className="text-[8px] bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-355 px-1.5 py-0.5 rounded font-mono ml-auto">Proj</span>
                          </div>
                      ))}
                      {!searchQuery && (
                          <div className="text-[10px] text-slate-400 dark:text-slate-505 text-center py-6 font-mono italic">
                              Try typing: "Programming" or "Chess"
                          </div>
                      )}
                  </div>
              </SimpleWidget>
          );
          case 'announcements': return (
              <SimpleWidget title={t('announcements')} icon={Megaphone} color="text-amber-500" subtitle="Board Airwaves" onClick={() => navigate('/announcements')}>
                  <div className="space-y-3 font-sans">
                      {allData.announcements && allData.announcements.length > 0 ? (
                          allData.announcements.slice(0, Math.max(3, w.rowSpan * 2)).map(a => (
                              <div key={a.id} className="text-xs border-b border-slate-100 dark:border-slate-800/60 last:border-0 pb-2.5 relative group pl-3.5">
                                  <div className="absolute left-0 top-1.5 w-1.5 h-1.5 rounded-full bg-amber-500 group-hover:scale-125 transition-transform animate-pulse"></div>
                                  <div className="font-bold text-slate-800 dark:text-slate-100 truncate group-hover:text-amber-500 transition-colors uppercase tracking-tight">{a.title}</div>
                                  <div className="text-slate-500 dark:text-slate-400 truncate mt-0.5 text-[10px] leading-relaxed">{a.content}</div>
                              </div>
                          ))
                      ) : (
                          <div className="text-xs text-slate-400 dark:text-slate-500 text-center py-6 italic">No recent announcements.</div>
                      )}
                  </div>
              </SimpleWidget>
          );
          case 'reports': return (
              <SimpleWidget title="Bug Reports Monitor" icon={Bug} color="text-rose-500" subtitle="Audit Ledger" onClick={() => setShowReportsModal(true)}>
                  <div className="text-[10px] space-y-2 font-mono">
                      {allData.bugs && allData.bugs.length > 0 ? (
                          allData.bugs.slice(0, 3).map(b => {
                              const isOpen = b.status === 'open';
                              return (
                                  <div key={b.id} className="flex justify-between items-center bg-slate-50 dark:bg-slate-900/80 p-1.5 rounded-lg border border-slate-150 dark:border-slate-800/60 font-sans">
                                      <span className="truncate flex-1 font-semibold text-slate-700 dark:text-slate-350 pr-2">{b.title}</span>
                                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase flex items-center gap-1 ${
                                          isOpen 
                                          ? 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400 border border-red-200/40 dark:border-red-900/30' 
                                          : 'bg-green-50 text-green-655 bg-green-100 text-green-600 dark:bg-green-950/45 dark:text-green-405'
                                      }`}>
                                          <span className={`w-1 h-1 rounded-full ${isOpen ? 'bg-red-500 animate-pulse' : 'bg-green-400'}`}></span>
                                          {b.status}
                                      </span>
                                  </div>
                              );
                          })
                      ) : (
                          <div className="text-xs text-slate-400 dark:text-slate-505 text-center py-6 italic font-sans animate-pulse">
                              0 unresolved issues detected.
                          </div>
                      )}
                  </div>
              </SimpleWidget>
          );
          case 'dev_chat': return (
              <SimpleWidget title="Core Developer Desk" icon={Code2} color="text-purple-600" subtitle="Developer Stream" onClick={() => navigate('/chat')}>
                  <div className="space-y-2 text-[10.5px] font-sans">
                      {devMessages && devMessages.length > 0 ? (
                          devMessages.map(m => (
                              <div key={m.id} className="truncate select-text p-1 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg transition-colors flex items-center gap-1">
                                  <span className="font-extrabold text-purple-600 dark:text-purple-400 shrink-0 font-mono">[{m.senderName.substring(0,3).toUpperCase()}]:</span> 
                                  <span className="text-slate-700 dark:text-slate-350 truncate font-semibold">{m.text}</span>
                              </div>
                          ))
                      ) : (
                          <div className="text-xs text-slate-400 dark:text-slate-505 text-center py-6 italic font-mono animate-pulse">
                              Subscribing to active streams...
                          </div>
                      )}
                  </div>
              </SimpleWidget>
          );
          case 'admin_panel': return <AdminPanelWidget usersList={usersList} navigate={navigate} />;
          case 'debug_panel': return <DebugPanelWidget navigate={navigate} />;
          case 'themes': return (
              <SimpleWidget title={t('quickThemes')} icon={Palette} color="text-indigo-500" subtitle="System Layout Align">
                  <div className="grid grid-cols-2 gap-2 mt-0.5 font-sans">
                      {[
                        { id: 'light', label: 'Classic Light', previewCls: 'bg-white border-slate-250 ring-indigo-500' },
                        { id: 'dark', label: 'Space Slate', previewCls: 'bg-slate-900 border-slate-755 ring-indigo-500' },
                        { id: 'midnight', label: 'Cosmic Neon', previewCls: 'bg-slate-950 border-emerald-900 ring-emerald-500' },
                        { id: 'cherry', label: 'Burgundy Velvet', previewCls: 'bg-rose-955 border-rose-900 ring-rose-500' }
                      ].map((th) => {
                          const isActive = theme === th.id;
                          return (
                              <button 
                                  key={th.id} 
                                  onClick={() => setTheme(th.id as Theme)} 
                                  className={`p-2 rounded-xl transition-all cursor-pointer border flex flex-col gap-1 items-start text-left ${
                                      isActive 
                                      ? 'bg-slate-50 dark:bg-slate-800 border-indigo-500 dark:border-indigo-400/80 ring-2 ring-indigo-500/10' 
                                      : 'border-slate-200 dark:border-slate-805 hover:border-slate-300 bg-white/50 dark:bg-slate-900/20'
                                  }`}
                              >
                                  <div className="flex items-center gap-1.5 w-full">
                                      <div className={`w-3.5 h-3.5 rounded-full border shadow-sm shrink-0 flex items-center justify-center ${th.previewCls}`}>
                                          <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                                      </div>
                                      <span className="text-[10px] font-black tracking-tight text-slate-750 dark:text-slate-200 leading-none">{th.label}</span>
                                  </div>
                              </button>
                          );
                      })}
                  </div>
              </SimpleWidget>
          );
          case 'chats': return (
              <SimpleWidget title={t('quickChats')} icon={MessageCircle} color="text-green-500" subtitle="Lobby Rooms" onClick={() => navigate('/clubs')}>
                  <div className="space-y-2.5 font-sans">
                      {allData.clubs && allData.clubs.length > 0 ? (
                          allData.clubs.slice(0, 3).map(c => (
                              <div key={c.id} className="flex items-center gap-2.5 hover:bg-slate-50 dark:hover:bg-slate-850 dark:hover:bg-slate-800/40 p-1 rounded-lg transition-colors cursor-pointer group">
                                  <img src={c.imageUrl || 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=80&auto=format&fit=crop&q=60'} className="w-6 h-6 rounded-lg object-cover shrink-0 border border-slate-105 border-slate-100 dark:border-slate-800" referrerPolicy="no-referrer" />
                                  <div className="flex flex-col min-w-0 flex-1">
                                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-green-500 transition-colors truncate leading-tight">{c.name}</span>
                                      <span className="text-[9px] text-slate-400 dark:text-slate-505 truncate mt-0.5 animate-pulse">Stream active...</span>
                                  </div>
                                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 shadow-[0_0_6px_rgba(16,185,129,0.8)]"></span>
                              </div>
                          ))
                      ) : (
                          <div className="text-xs text-slate-400 dark:text-slate-550 text-center py-6 italic animate-pulse">No active classroom channels.</div>
                      )}
                  </div>
              </SimpleWidget>
          );
          default: return <SimpleWidget title={w.type} icon={Activity} />;
      }
  };

  // --- Render ---

  return (
    <div className="pb-20 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-slate-800 dark:text-white font-display">{t('overview')}</h1>
            <button 
                onClick={() => setIsEditing(!isEditing)}
                className={`px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-all shadow-sm ${
                    isEditing 
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700 ring-2 ring-indigo-200' 
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700'
                }`}
            >
                {isEditing ? <Check size={18} /> : <Edit2 size={18} />}
                {isEditing ? t('doneEditing') : t('editHome')}
            </button>
        </div>

        {/* Widget Gallery (Edit Mode) */}
        {isEditing && (
            <div className="bg-slate-100 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 animate-in slide-in-from-top-2">
                <h3 className="font-bold text-slate-500 uppercase text-xs mb-4">{t('availableWidgets')}</h3>
                <div className="flex flex-wrap gap-3">
                    {[
                        {id:'stats', icon: Activity, label:'Stats'},
                        {id:'actions', icon: LayoutDashboard, label:'Actions'},
                        {id:'events', icon: Calendar, label:'Events'},
                        {id:'my_clubs', icon: ShieldAlert, label:'My Clubs'},
                        {id:'search', icon: Search, label:'Search'},
                        {id:'announcements', icon: Megaphone, label:'News'},
                        {id:'admin_panel', icon: ShieldAlert, label:'Admin', restricted: true, roles: ['ADMIN', 'OWNER', 'DEV']},
                        {id:'reports', icon: Bug, label:'Reports', restricted: true, roles: ['ADMIN', 'OWNER', 'DEV']},
                        {id:'dev_chat', icon: Code2, label:'Dev Chat', restricted: true, roles: ['DEV', 'OWNER']},
                        {id:'debug_panel', icon: Database, label:'Debug', restricted: true, roles: ['ADMIN', 'OWNER', 'DEV']},
                        {id:'themes', icon: Palette, label:'Themes'},
                        {id:'chats', icon: MessageCircle, label:'Chats'}
                    ].filter(item => {
                        if (item.restricted) {
                            return user && item.roles.includes(user.role);
                        }
                        return true;
                    }).map(item => (
                        <button 
                            key={item.id} 
                            onClick={() => addWidget(item.id as WidgetType)}
                            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-705 px-4 py-2 rounded-lg flex items-center gap-2 hover:border-indigo-500 transition-colors shadow-sm"
                        >
                            <item.icon size={16} className="text-slate-400"/> 
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{item.label}</span>
                        </button>
                    ))}
                </div>
            </div>
        )}

        {/* CSS Grid Layout */}
        <div 
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 auto-rows-[200px]"
            style={{ gridAutoFlow: 'dense' }} // Important for packing
        >
            <AnimatePresence mode="popLayout">
                {widgets.filter(widget => {
                    if (widget.type === 'admin_panel' || widget.type === 'debug_panel' || widget.type === 'reports') {
                        return user && ['ADMIN', 'OWNER', 'DEV'].includes(user.role);
                    }
                    if (widget.type === 'dev_chat') {
                        return user && ['OWNER', 'DEV'].includes(user.role);
                    }
                    return true;
                }).map((widget, index) => (
                    <motion.div
                        key={widget.id}
                        layoutId={widget.id}
                        layout
                        initial={{ opacity: 0, scale: 0.9, y: 15 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: -15 }}
                        whileHover={isEditing ? {} : { y: -5, scale: 1.01, transition: { duration: 0.2 } }}
                        transition={{ type: "spring", stiffness: 350, damping: 28 }}
                        data-widget-id={widget.id}
                        onMouseDown={(e) => handleMouseDown(e, widget.id)}
                        className={`relative group transition-all duration-200 ease-out select-none ${isEditing ? 'cursor-grab active:cursor-grabbing ring-2 ring-indigo-500/20 rounded-2xl hover:shadow-xl z-10' : ''}`}
                        style={{
                            gridColumn: `span ${widget.colSpan}`,
                            gridRow: `span ${widget.rowSpan}`,
                            opacity: dragState?.id === widget.id ? 0 : 1 // Hide original if dragging
                        }}
                    >
                        {/* The Widget */}
                        <div className="h-full w-full overflow-hidden">
                            {renderWidgetContent(widget)}
                        </div>

                        {/* Edit Controls */}
                        {isEditing && (
                            <>
                                <button 
                                    onClick={() => removeWidget(widget.id)}
                                    className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-md hover:scale-110 transition-transform z-20"
                                    onMouseDown={(e) => e.stopPropagation()}
                                >
                                    <X size={14} />
                                </button>
                                
                                {/* Resize Button for Mobile/Tablet */}
                                <button 
                                    onClick={() => cycleWidgetSize(widget.id)}
                                    className="absolute bottom-2 left-2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded shadow-md z-20 flex items-center gap-1 active:scale-95 transition-transform"
                                    onMouseDown={(e) => e.stopPropagation()}
                                >
                                    <Maximize2 size={12}/> Size: {widget.colSpan}x{widget.rowSpan}
                                </button>
                                
                                {/* Desktop Resize Handle - Hidden on Touch devices via media query assumption (md:flex) or just keep for desktop convenience */}
                                <div 
                                    onMouseDown={(e) => handleResizeStart(e, widget.id)}
                                    className="hidden md:flex absolute bottom-0 right-0 w-8 h-8 cursor-nwse-resize items-end justify-end p-1 z-20 hover:bg-indigo-100/50 rounded-tl-xl transition-colors"
                                >
                                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-slate-400">
                                        <path d="M11 1L11 11L1 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                    </svg>
                                </div>
                                
                                {/* Resize Indicators Overlay */}
                                <div className="absolute bottom-2 right-8 text-[10px] font-mono bg-black/70 text-white px-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                    {widget.colSpan}x{widget.rowSpan}
                                </div>
                            </>
                        )}
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
        
        {/* Floating Drag Preview Layer */}
        {dragState && isEditing && (
            <div 
                className="fixed z-[999] pointer-events-none shadow-2xl rounded-2xl overflow-hidden ring-4 ring-indigo-500/30"
                style={{
                    left: mousePos.x - dragState.offsetX,
                    top: mousePos.y - dragState.offsetY,
                    width: dragState.width,
                    height: dragState.height,
                    opacity: 0.9,
                    transform: 'scale(1.02)'
                }}
            >
                 {renderWidgetContent(widgets.find(w => w.id === dragState.id)!)}
            </div>
        )}

        {/* Modals */}
        {showReportsModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
              <div className="bg-white dark:bg-slate-900 w-full max-w-5xl h-[80vh] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                  <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                      <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
                          <Bug className="text-amber-500"/> System Bug Reports
                      </h2>
                      <button onClick={() => setShowReportsModal(false)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-500">
                          <X size={24}/>
                      </button>
                  </div>
                  <div className="flex-1 overflow-auto p-0">
                      <table className="w-full text-left text-sm">
                          <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold sticky top-0 shadow-sm">
                              <tr>
                                  <th className="p-4">Status</th>
                                  <th className="p-4">Title</th>
                                  <th className="p-4">Description</th>
                                  <th className="p-4">Submitter</th>
                                  <th className="p-4">IP Address</th>
                                  <th className="p-4">Date</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                              {allData.bugs.length === 0 ? (
                                  <tr><td colSpan={6} className="p-8 text-center text-slate-400">No bugs reported.</td></tr>
                              ) : allData.bugs.map(b => (
                                  <tr key={b.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                      <td className="p-4">
                                          <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${b.status === 'open' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                                              {b.status}
                                          </span>
                                      </td>
                                      <td className="p-4 font-bold text-slate-800 dark:text-slate-200">{b.title}</td>
                                      <td className="p-4 text-slate-600 dark:text-slate-400 max-w-xs truncate" title={b.description}>{b.description}</td>
                                      <td className="p-4">
                                          <div className="flex flex-col">
                                              <span className="font-medium text-slate-700 dark:text-slate-300">{b.submitterName || 'Unknown'}</span>
                                              <span className="text-xs text-slate-400 font-mono">ID: {b.submittedBy}</span>
                                          </div>
                                      </td>
                                      <td className="p-4 font-mono text-xs text-slate-500">{b.submitterIp || 'N/A'}</td>
                                      <td className="p-4 text-slate-500">{new Date(b.createdAt).toLocaleString()}</td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};