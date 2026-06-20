import React, { useState } from 'react';
import { db } from '../services/mockFirebase';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { 
  Bug, CheckCircle, ArrowLeft, AlertTriangle, ShieldAlert, Info, HelpCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const BugReportPage = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [category, setCategory] = useState('Clubs');
  const [severity, setSeverity] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [submitted, setSubmitted] = useState(false);

  if (!user) {
      return (
          <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
               <ShieldAlert className="mx-auto text-amber-500 mb-4" size={48} />
               <h2 className="text-2xl font-bold mb-2 text-slate-800 dark:text-white">Authentication Required</h2>
               <p className="text-slate-500 dark:text-slate-400 mb-6 font-medium">Please log in to submit a bug report.</p>
               <Link to="/login" className="inline-block bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-indigo-700 transition-all">{t('login') || 'Log In'}</Link>
          </div>
      );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await db.addBugReport({
        id: Date.now().toString(),
        title: `[${category}] ${title}`,
        description: desc,
        severity,
        status: 'open',
        submittedBy: user.id,
        submitterName: user.name,
        submitterIp: user.ip || 'Unknown',
        createdAt: new Date().toISOString()
    });
    setSubmitted(true);
  };

  if (submitted) {
    return (
        <div className="max-w-2xl mx-auto text-center py-16 px-6 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in-95 duration-200">
            <div className="mx-auto w-16 h-16 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mb-6">
                <CheckCircle size={36}/>
            </div>
            <h2 className="text-3xl font-bold text-slate-800 dark:text-white mb-2">{t('reportSubmitted') || 'Bug Report Submitted!'}</h2>
            <p className="text-slate-500 dark:text-slate-400 max-w-lg mx-auto mb-8 font-medium">
              Thank you for helping us improve our platform. The engineering team has received your report and will look into it shortly.
            </p>
            <div className="flex justify-center gap-4">
              <button 
                onClick={() => {
                  setTitle('');
                  setDesc('');
                  setSubmitted(false);
                }}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 font-bold rounded-xl text-slate-755  dark:text-slate-200 transition-all"
              >
                Submit Another Report
              </button>
              <Link to="/" className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-md">
                Back to Home
              </Link>
            </div>
        </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-300">
      <Link to="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-medium">
        <ArrowLeft size={18} /> Back to Home
      </Link>

      <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-700 pb-5 mb-6">
              <div className="p-3 bg-rose-500/10 rounded-xl text-rose-500">
                  <Bug size={24} />
              </div>
              <div>
                  <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
                      {t('reportBug') || 'Report a Bug'}
                  </h1>
                  <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                      Spotted an error? Submit details below so our development team can resolve it.
                  </p>
              </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                      <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                        Category
                      </label>
                      <select 
                        value={category}
                        onChange={e => setCategory(e.target.value)}
                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-slate-800 dark:text-slate-100 font-bold focus:ring-2 focus:ring-indigo-100 transition-all cursor-pointer"
                      >
                        <option value="Clubs">Clubs & Members</option>
                        <option value="Events">Clubs Events</option>
                        <option value="Chat">Chat & Messages</option>
                        <option value="Profile">User Account & Profile</option>
                        <option value="Admin">Admin Control Dashboard</option>
                        <option value="UI & Design">Appearance & Styling</option>
                        <option value="Other">Other Issues</option>
                      </select>
                  </div>

                  <div>
                      <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                        Severity Level
                      </label>
                      <div className="grid grid-cols-4 gap-2">
                        {(['low', 'medium', 'high', 'critical'] as const).map(lev => {
                          const isSelected = severity === lev;
                          const labels: Record<string, string> = {
                            low: 'Low',
                            medium: 'Med',
                            high: 'High',
                            critical: 'Crit',
                          };
                          const colors: Record<string, string> = {
                            low: 'bg-emerald-50 text-emerald-750 border-emerald-200 ring-emerald-100',
                            medium: 'bg-indigo-50 text-indigo-755 border-indigo-200 ring-indigo-100',
                            high: 'bg-amber-50 text-amber-755 border-amber-200 ring-amber-100',
                            critical: 'bg-rose-50 text-rose-755 border-rose-200 ring-rose-100'
                          };
                          const selectedColors: Record<string, string> = {
                            low: 'bg-emerald-500 text-white border-emerald-500 shadow-emerald-100',
                            medium: 'bg-indigo-500 text-white border-indigo-500 shadow-indigo-100',
                            high: 'bg-amber-500 text-white border-amber-500 shadow-amber-100',
                            critical: 'bg-rose-500 text-white border-rose-500 shadow-rose-100'
                          };
                          return (
                            <button
                              key={lev}
                              type="button"
                              onClick={() => setSeverity(lev)}
                              className={`py-2 text-xs font-extrabold capitalize rounded-xl border text-center transition-all ${
                                isSelected ? selectedColors[lev] : `${colors[lev]} border-slate-200 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800`
                              }`}
                            >
                              {labels[lev]}
                            </button>
                          );
                        })}
                      </div>
                  </div>
              </div>

              <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                    {t('issueTitle') || 'Issue Title'}
                  </label>
                  <input 
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-100 outline-none text-slate-800 dark:text-white transition-all font-medium placeholder-slate-400" 
                    value={title} 
                    onChange={e => setTitle(e.target.value)} 
                    required 
                    placeholder="Short, descriptive summary..." 
                  />
              </div>

              <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                    {t('description') || 'Steps to Reproduce / Description'}
                  </label>
                  <textarea 
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl h-40 focus:ring-2 focus:ring-indigo-100 outline-none text-slate-800 dark:text-white transition-all font-medium placeholder-slate-400 leading-relaxed" 
                    value={desc} 
                    onChange={e => setDesc(e.target.value)} 
                    required 
                    placeholder="Describe step-by-step how the bug occurred, what you expected, and what actually happened..." 
                  />
              </div>

              <button 
                type="submit" 
                className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white py-3.5 rounded-xl font-extrabold shadow-md transition-all active:scale-[0.98]"
              >
                  {t('submitReport') || 'Submit Bug Report'}
              </button>
          </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-indigo-50/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl flex items-start gap-3">
          <Info className="text-indigo-500 shrink-0 mt-0.5" size={18} />
          <div>
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">Clear Client Cache</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
              Facing visual style or loading glitches? Try resetting your browser local storage or refreshing the page.
            </p>
          </div>
        </div>

        <div className="p-4 bg-orange-50/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl flex items-start gap-3">
          <AlertTriangle className="text-orange-505 shrink-0 mt-0.5" size={18} />
          <div>
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">Reproduction Details</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
              Including steps and any console errors helps our engineering team resolve bugs much faster.
            </p>
          </div>
        </div>

        <div className="p-4 bg-emerald-50/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl flex items-start gap-3">
          <HelpCircle className="text-emerald-505 shrink-0 mt-0.5" size={18} />
          <div>
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">Triage Priority</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
              High or critical severity bugs will immediately notify site administrators for instant remediation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
