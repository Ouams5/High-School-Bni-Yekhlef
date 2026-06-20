import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useUI } from '../context/UIContext';
import { useTheme, Theme } from '../context/ThemeContext';
import { db, updateUserPassword, auth } from '../services/mockFirebase';
import { UserRole } from '../types';
import { UserCircle, Mail, Award, BookOpen, Settings, Moon, Sun, Lock, X, Eye, EyeOff, ShieldCheck, KeyRound, CloudRain, Flower2, Stars, Skull, IdCard, Sunrise, Flame, Gem, Infinity, Landmark, RefreshCw, LogOut } from 'lucide-react';

export const Profile = () => {
  const { user, refreshUser, syncAccount } = useAuth();
  const { t } = useLanguage();
  const { showToast, confirm } = useUI();
  const { theme, setTheme } = useTheme();
  const [clubs, setClubs] = useState<any[]>([]);
  
  // Settings Modal State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'appearance' | 'security' | 'account'>('appearance');

  // Password State
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [oldestPass, setOldestPass] = useState('');
  const [recoveryNewPass, setRecoveryNewPass] = useState('');
  const [showPass, setShowPass] = useState(false);
  
  // Recovery Flow State
  const [isRecoveryVerified, setIsRecoveryVerified] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  
  // Sync State
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const loadData = async () => {
        if(user && user.joinedClubIds && user.joinedClubIds.length > 0) {
            const allClubs = await db.getClubs();
            setClubs(allClubs.filter(c => user.joinedClubIds.includes(c.id)));
        } else {
            setClubs([]);
        }
    };
    loadData();
  }, [user]);

  const handleLeaveClub = async (clubId: string) => {
    if (!user) return;
    const confirmed = await confirm({
      title: "Leave Club",
      message: "Are you sure you want to leave this club?",
      confirmText: "Leave",
      type: "warning"
    });

    if (confirmed) {
      await db.leaveClub(user.id, clubId);
      await refreshUser();
      showToast("You left the club.", "info");
    }
  };



  const handleChangePassword = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!auth.currentUser) return;
      try {
          await updateUserPassword(auth.currentUser, newPass);
          showToast("Password updated successfully.", "success");
          setNewPass('');
          setCurrentPass('');
      } catch (error: any) {
          console.error(error);
          if (error.code === 'auth/requires-recent-login') {
            showToast("Please re-login to change password.", "error");
          } else {
            showToast("Failed to update password.", "error");
          }
      }
  };

  const handleOldestPasswordRecovery = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!oldestPass) return;
      
      setIsVerifying(true);
      // Simulate verification delay for the "Oldest Password" check
      setTimeout(() => {
          setIsVerifying(false);
          setIsRecoveryVerified(true);
          showToast("Identity verified via history check.", "success");
      }, 1500);
  };

  const handleRecoveryReset = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!auth.currentUser) return;
      try {
          await updateUserPassword(auth.currentUser, recoveryNewPass);
          showToast("Password reset successfully.", "success");
          setRecoveryNewPass('');
          setOldestPass('');
          setIsRecoveryVerified(false);
          setIsSettingsOpen(false);
      } catch (error: any) {
          console.error(error);
          showToast("Failed to reset password. Please try re-logging in.", "error");
      }
  };
  
  const handleSyncAccount = async () => {
      setIsSyncing(true);
      try {
          await syncAccount();
          showToast(t('syncSuccess'), "success");
      } catch (e) {
          showToast("Sync failed.", "error");
      } finally {
          setIsSyncing(false);
      }
  };
  
  const ThemeOption = ({ id, label, icon: Icon, color }: { id: Theme, label: string, icon: any, color: string }) => (
      <button 
        onClick={() => setTheme(id)} 
        className={`flex items-center justify-between p-4 rounded-xl border transition-all hover:scale-[1.02] ${theme === id ? `border-${color}-500 bg-${color}-50 text-${color}-700 dark:bg-${color}-900/30 dark:text-${color}-300` : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'}`}
      >
          <div className="flex items-center gap-3">
              <Icon size={20} /> {label}
          </div>
          {theme === id && <div className={`w-4 h-4 rounded-full bg-${color}-500`}></div>}
      </button>
  );

  if (!user) return <div className="p-10 text-center text-slate-500 dark:text-slate-400">{t('pleaseSignIn')}</div>;

  const canAccessLethal = user.role === UserRole.ADMIN || user.role === UserRole.OWNER || user.role === UserRole.DEV;

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Header Profile Card */}
      <div className="bg-white dark:bg-slate-900 p-8 sm:p-10 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col md:flex-row items-center gap-8 relative">
        <button 
            onClick={() => setIsSettingsOpen(true)}
            className="absolute top-6 right-6 p-2.5 text-slate-400 hover:text-indigo-600 dark:text-slate-500 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-xl transition-all"
            title={t('settings')}
        >
            <Settings size={24} />
        </button>

        <div className="w-32 h-32 bg-slate-100 dark:bg-slate-800 rounded-3xl flex items-center justify-center overflow-hidden border border-slate-200 dark:border-slate-700 shadow-inner shrink-0 rotate-3 hover:rotate-0 transition-transform">
            {user.avatarUrl ? <img src={user.avatarUrl} alt="avatar" className="w-full h-full object-cover" /> : <UserCircle size={64} className="text-slate-300 dark:text-slate-600" />}
        </div>
        <div className="text-center md:text-left flex-1 min-w-0">
            <h1 className="text-3xl sm:text-4xl font-black font-display text-slate-800 dark:text-slate-100 tracking-tight flex items-center justify-center md:justify-start gap-3 flex-wrap">
                {user.name}
            </h1>
            <div className="flex items-center justify-center md:justify-start gap-2 text-slate-500 dark:text-slate-400 mt-3 font-medium">
                <Mail size={16}/>
                <span className="truncate">{user.email}</span>
            </div>
            <div className="flex flex-wrap gap-2 mt-5 justify-center md:justify-start">
                <span className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800/50 px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider shadow-sm">
                    {user.role.replace('_', ' ')}
                </span>
                {user.grade && (
                    <span className="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/50 px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider shadow-sm">
                        {user.grade}
                    </span>
                )}
            </div>
        </div>
      </div>

      {/* Account Record & Merit Score Section */}
      <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800">
          <div className="flex flex-col lg:flex-row gap-8">
              {/* Merit Score Dial / Gauge Column */}
              <div className="flex-1 lg:max-w-[320px] flex flex-col items-center text-center justify-between p-8 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700/50">
                  <div className="w-full">
                      <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-6 flex items-center justify-center gap-2">
                          <Award size={16} className="text-amber-500" /> Account Merit Score
                      </h3>
                      
                      <div className="relative w-36 h-36 mx-auto flex items-center justify-center bg-white dark:bg-slate-800 rounded-full shadow-inner ring-4 ring-slate-100/50 dark:ring-slate-700/50">
                          {/* Circle Progress SVG */}
                          <svg className="absolute inset-0 w-full h-full -rotate-90">
                              <circle 
                                  cx="72" cy="72" r="62" 
                                  className="stroke-slate-100 dark:stroke-slate-700 fill-none" 
                                  strokeWidth="10"
                              />
                              <circle 
                                  cx="72" cy="72" r="62" 
                                  className={`fill-none transition-all duration-500 ${
                                      (user.meritScore ?? 20) >= 14 ? 'stroke-emerald-500' :
                                      (user.meritScore ?? 20) >= 7 ? 'stroke-amber-500' : 'stroke-rose-500'
                                  }`} 
                                  strokeWidth="10"
                                  strokeDasharray={2 * Math.PI * 62}
                                  strokeDashoffset={2 * Math.PI * 62 * (1 - Math.min(20, Math.max(0, user.meritScore ?? 20)) / 20)}
                                  strokeLinecap="round"
                              />
                          </svg>
                          <div className="text-center z-10 w-full">
                              <span className="text-4xl font-extrabold text-slate-800 dark:text-white font-mono">
                                  {user.meritScore ?? 20}
                              </span>
                              <span className="text-xs text-slate-400 block font-medium mt-0.5">/ 20 Max</span>
                          </div>
                      </div>
                      
                      <p className="text-xs text-slate-500 dark:text-slate-400 px-4 mt-6 leading-relaxed">
                          Maintain high merit to join student clubs. Violations or club dismissals deduct from your record.
                      </p>
                  </div>
                  
                  {/* Merit Recovery Notice */}
                  <div className="w-full mt-6 pt-6 border-t border-slate-200 dark:border-slate-700/60 text-center">
                      <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-700/40 text-left">
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                              Merit Score & Administrative Regulations
                          </span>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                              Free merit recovery has been decommissioned. Any merit adjustments or suspension lifts must be formally requested and processed through the Office of Student Registry. Kicks and disciplinary penalties apply directly from community leading teams.
                          </p>
                      </div>
                  </div>
              </div>

              {/* Merit Audit Trail / History Logs Column */}
              <div className="flex-1 flex flex-col min-w-0">
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                       <Landmark size={18} className="text-indigo-500" /> Integrity Audit & Notifications log
                  </h3>
                  
                  <div className="flex-1 overflow-y-auto max-h-[290px] space-y-3 pr-1">
                      {user.meritHistory && user.meritHistory.length > 0 ? (
                          [...user.meritHistory].reverse().map((record) => (
                              <div key={record.id} className="p-4 bg-slate-50 dark:bg-slate-700/40 border border-slate-100 dark:border-slate-700 rounded-xl flex items-start gap-4">
                                  <div className={`p-2 rounded-lg flex-shrink-0 ${
                                      record.action === 'GAIN' ? 'bg-emerald-100 dark:bg-emerald-950/45 text-emerald-600 dark:text-emerald-400' :
                                      record.action === 'DEDUCTION' ? 'bg-rose-100 dark:bg-rose-950/45 text-rose-600 dark:text-rose-400' :
                                      'bg-blue-100 dark:bg-blue-950/45 text-blue-600 dark:text-blue-400'
                                  }`}>
                                      <span className="font-mono text-sm font-bold">
                                          {record.amount > 0 ? `+${record.amount}` : record.amount}
                                      </span>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                      <div className="flex items-center justify-between gap-2">
                                          <p className="text-xs font-bold text-slate-700 dark:text-slate-205">
                                              {record.action === 'GAIN' ? 'Merit Redeemed' : 
                                               record.action === 'DEDUCTION' ? 'Penalty Inflicted' : 'System Setup'}
                                          </p>
                                          <span className="text-[10px] text-slate-400">
                                              {new Date(record.date).toLocaleDateString()}
                                          </span>
                                      </div>
                                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed break-words">
                                          {record.reason}
                                      </p>
                                      {record.brokenRule && (
                                          <div className="inline-block mt-2 bg-red-50 dark:bg-red-950/20 text-[10px] text-red-600 dark:text-red-400 px-2 py-0.5 rounded border border-red-100 dark:border-red-900/30 font-medium">
                                              Broken Rule: {record.brokenRule}
                                          </div>
                                      )}
                                  </div>
                              </div>
                          ))
                      ) : (
                          <div className="h-44 flex flex-col items-center justify-center text-slate-400 italic text-sm">
                              No history logged yet.
                          </div>
                      )}
                  </div>
              </div>
          </div>
      </div>

      {/* Claimed Badges Section */}
      {user.badges && user.badges.length > 0 && (
          <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-slate-800 dark:text-white">
                  <IdCard className="text-purple-500"/> Official Badges
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {user.badges.map((badge, idx) => (
                      <div key={idx} className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-br from-slate-50 to-white dark:from-slate-700 dark:to-slate-800 border border-slate-200 dark:border-slate-600 shadow-sm relative overflow-hidden group">
                           {/* Shine Effect */}
                           <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none transform -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] duration-1000"></div>
                           
                           <img src={badge.imageUrl} alt={badge.name} className="w-12 h-12 rounded-lg object-cover shadow-sm bg-white" />
                           <div className="flex-1 min-w-0">
                               <p className="text-xs text-indigo-500 font-bold uppercase tracking-wider">
                                   {(badge.type || 'CUSTOM').replace('_', ' ')}
                               </p>
                               <p className="font-bold text-slate-800 dark:text-white truncate" title={badge.name}>{badge.name}</p>
                               <p className="text-[10px] text-slate-400">Claimed {new Date(badge.assignedAt).toLocaleDateString()}</p>
                           </div>
                      </div>
                  ))}
              </div>
          </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-slate-800 dark:text-white"><Award className="text-yellow-500"/> {t('membershipStatus')}</h2>
            <div className="space-y-4">
                <div className="flex justify-between border-b border-slate-50 dark:border-slate-700 pb-3">
                    <span className="text-slate-500 dark:text-slate-400">{t('clubsJoined')}</span>
                    <span className="font-medium text-slate-900 dark:text-slate-200">{user.joinedClubIds?.length || 0}</span>
                </div>
                 <div className="flex justify-between text-slate-900 dark:text-slate-200">
                    <span className="text-slate-500 dark:text-slate-400">{t('clubLeader')}</span>
                    <span className="font-medium">{user.leadingClubId ? t('yes') : t('no')}</span>
                </div>
            </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
             <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-slate-800 dark:text-white"><BookOpen className="text-blue-500"/> {t('myClubs')}</h2>
             {clubs.length > 0 ? (
                 <div className="space-y-3">
                     {clubs.map(c => (
                         <div key={c.id} className="flex items-center justify-between gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                             <div className="flex items-center gap-3">
                                 <div className="w-10 h-10 bg-slate-200 dark:bg-slate-600 rounded-md overflow-hidden">
                                     <img src={c.imageUrl} className="w-full h-full object-cover"/>
                                 </div>
                                 <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">{c.name}</span>
                             </div>
                             <button
                                 onClick={() => handleLeaveClub(c.id)}
                                 className="text-xs bg-rose-50 hover:bg-rose-105 hover:text-rose-700 dark:bg-rose-950/20 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-extrabold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all shadow-sm"
                                 title="Leave Club"
                             >
                                 <LogOut size={12} /> {t('leave') || 'Leave'}
                             </button>
                         </div>
                     ))}
                 </div>
             ) : (
                 <p className="text-slate-400 italic">{t('noClubsJoined')}</p>
             )}
        </div>
      </div>

      {/* Settings Modal */}
      {isSettingsOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
              <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-700">
                  <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                      <h2 className="text-xl font-bold flex items-center gap-2 text-slate-800 dark:text-white">
                          <Settings className="text-indigo-600" /> {t('settings')}
                      </h2>
                      <button onClick={() => setIsSettingsOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                          <X size={24} />
                      </button>
                  </div>
                  
                  <div className="flex h-[450px]">
                      {/* Sidebar Tabs */}
                      <div className="w-1/3 bg-slate-50 dark:bg-slate-800/50 border-r border-slate-200 dark:border-slate-700 p-4 space-y-2">
                          <button 
                            onClick={() => setSettingsTab('appearance')}
                            className={`w-full text-left px-4 py-3 rounded-xl font-medium transition-all flex items-center gap-2 ${settingsTab === 'appearance' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                          >
                              {theme === 'dark' ? <Moon size={18}/> : <Sun size={18}/>} {t('appearance')}
                          </button>
                          <button 
                            onClick={() => setSettingsTab('security')}
                            className={`w-full text-left px-4 py-3 rounded-xl font-medium transition-all flex items-center gap-2 ${settingsTab === 'security' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                          >
                              <Lock size={18}/> {t('security')}
                          </button>
                          <button 
                            onClick={() => setSettingsTab('account')}
                            className={`w-full text-left px-4 py-3 rounded-xl font-medium transition-all flex items-center gap-2 ${settingsTab === 'account' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                          >
                              <UserCircle size={18}/> {t('account')}
                          </button>
                      </div>

                      {/* Content */}
                      <div className="w-2/3 p-6 overflow-y-auto bg-white dark:bg-slate-900">
                          {settingsTab === 'appearance' && (
                              <div className="space-y-6">
                                  <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">{t('theme')}</h3>
                                  <div className="flex flex-col gap-3">
                                      <ThemeOption id="light" label={t('lightMode')} icon={Sun} color="indigo" />
                                      <ThemeOption id="dark" label={t('darkMode')} icon={Moon} color="indigo" />
                                      <ThemeOption id="midnight" label="Midnight" icon={Stars} color="blue" />
                                      <ThemeOption id="depressed" label="Depressed" icon={CloudRain} color="gray" />
                                      <ThemeOption id="cherry" label="Cherry Blossom" icon={Flower2} color="pink" />
                                      {canAccessLethal && (
                                          <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                                              <p className="text-xs font-bold text-red-500 uppercase mb-2">Admin Zone</p>
                                              <ThemeOption id="lethal" label="Lethal Mode" icon={Skull} color="red" />
                                              <div className="mt-4 space-y-3">
                                                  <ThemeOption id="coming-of-age" label="Coming of Age" icon={Sunrise} color="orange" />
                                                  <ThemeOption id="devils-gate" label="The Devil's Gate" icon={Flame} color="red" />
                                                  <ThemeOption id="rare-gems" label="Rare Gems" icon={Gem} color="cyan" />
                                                  <ThemeOption id="infinite-void" label="Infinite Void" icon={Infinity} color="purple" />
                                                  <ThemeOption id="malevolent-shrine" label="Malevolent Shrine" icon={Landmark} color="red" />
                                              </div>
                                          </div>
                                      )}
                                  </div>
                              </div>
                          )}

                          {settingsTab === 'security' && (
                              <div className="space-y-8">
                                  {/* Standard Password Change */}
                                  <div>
                                      <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                                          <Lock size={18}/> {t('changePassword')}
                                      </h3>
                                      <form onSubmit={handleChangePassword} className="space-y-3">
                                        <div className="relative">
                                            <input 
                                                type={showPass ? "text" : "password"} 
                                                placeholder={t('newPassword')}
                                                className="w-full p-3 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                                value={newPass}
                                                onChange={e => setNewPass(e.target.value)}
                                            />
                                            <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-3 text-slate-400 hover:text-slate-600">
                                                {showPass ? <EyeOff size={18}/> : <Eye size={18}/>}
                                            </button>
                                        </div>
                                        <button 
                                            type="submit" 
                                            disabled={!newPass}
                                            className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium text-sm hover:bg-indigo-700 disabled:opacity-50 w-full"
                                        >
                                            {t('updatePassword')}
                                        </button>
                                      </form>
                                  </div>
                              </div>
                          )}

                          {settingsTab === 'account' && (
                              <div className="space-y-6">
                                  <div>
                                      <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                                          <RefreshCw size={18}/> {t('syncData')}
                                      </h3>
                                      <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700 mb-4">
                                          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                                              {t('syncDataDesc')}
                                          </p>
                                      </div>
                                      <button 
                                          onClick={handleSyncAccount}
                                          disabled={isSyncing}
                                          className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-xl font-bold shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                                      >
                                          <RefreshCw size={20} className={isSyncing ? "animate-spin" : ""} />
                                          {isSyncing ? "Syncing..." : t('syncData')}
                                      </button>
                                  </div>
                              </div>
                          )}
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};