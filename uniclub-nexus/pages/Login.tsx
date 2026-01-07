import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { Loader2, CheckCircle } from 'lucide-react';

export const Login = () => {
  const { login, register } = useAuth();
  const { t, isRTL } = useLanguage();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [isLoading, setIsLoading] = useState(false);
  
  // Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [grade, setGrade] = useState('');
  const [error, setError] = useState('');
  const [showVerificationMsg, setShowVerificationMsg] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    const result = await login(email, password, rememberMe);
    setIsLoading(false);
    if (result.success) {
        navigate('/');
    } else {
        setError('Invalid email or password.');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!grade) {
        setError(t('selectGrade'));
        return;
    }
    setError('');
    setIsLoading(true);
    try {
        await register(email, password, firstName, lastName, grade);
        setShowVerificationMsg(true);
        setMode('login'); // Switch back to login view but show success message
    } catch (e: any) {
        if (e.code === 'auth/email-already-in-use') {
            setError('Email already in use.');
        } else if (e.code === 'auth/weak-password') {
            setError('Password should be at least 6 characters.');
        } else {
            setError('Failed to register. Please try again.');
        }
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#F3F4F6]" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="w-full max-w-[600px] bg-white rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-8 pb-4 flex items-center justify-center border-b border-slate-100">
            <h1 className="text-2xl font-bold text-[#1e3a8a]">{t('welcome')}</h1>
        </div>

        <div className="px-8 pb-8 pt-6">
            {showVerificationMsg ? (
                 <div className="text-center py-10">
                    <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-slate-800 mb-2">Registration Successful!</h2>
                    <p className="text-slate-600 mb-6">We have sent a verification email to <b>{email}</b>.<br/>Please verify your account before logging in.</p>
                    <button 
                        onClick={() => setShowVerificationMsg(false)}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        Go to Login
                    </button>
                 </div>
            ) : mode === 'login' ? (
                // --- LOGIN FORM ---
                <form onSubmit={handleLogin} className="space-y-6">
                    {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg">{error}</div>}
                    
                    <div className="space-y-1">
                        <label className="block text-[#1e3a8a] font-bold text-base">{t('email')}</label>
                        <input 
                            type="email"
                            placeholder="student@bniyekhlef.edu"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            required
                            className="w-full p-3.5 border border-slate-200 rounded-lg text-slate-700 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all placeholder:text-slate-300"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="block text-[#1e3a8a] font-bold text-base">{t('password')}</label>
                        <input 
                            type="password"
                            placeholder="........"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="w-full p-3.5 border border-slate-200 rounded-lg text-slate-700 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all placeholder:text-slate-300 tracking-widest"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <input 
                            type="checkbox" 
                            id="remember" 
                            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" 
                            checked={rememberMe}
                            onChange={e => setRememberMe(e.target.checked)}
                        />
                        <label htmlFor="remember" className="text-slate-600 text-sm">{t('rememberMe')}</label>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <button 
                            type="button" 
                            onClick={() => { setMode('register'); setError(''); }}
                            className="w-full py-2.5 px-4 rounded-lg border border-slate-200 text-[#1e3a8a] font-semibold text-sm hover:bg-slate-50 transition-colors"
                        >
                            {t('noAccount')}
                        </button>
                        <button 
                            type="button" 
                            className="w-full py-2.5 px-4 rounded-lg border border-slate-200 text-[#1e3a8a] font-semibold text-sm hover:bg-slate-50 transition-colors"
                        >
                            {t('forgotPassword')}
                        </button>
                    </div>
                    
                    <div className="w-full h-px bg-slate-100 my-4"></div>

                    <div className="pt-2">
                        <button 
                            type="submit"
                            disabled={isLoading}
                            className="w-full px-8 py-3 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-bold transition-colors shadow-lg shadow-blue-200 disabled:opacity-70 flex items-center justify-center gap-2"
                        >
                            {isLoading && <Loader2 className="animate-spin" size={18} />}
                            {t('login')}
                        </button>
                    </div>
                </form>
            ) : (
                // --- REGISTER FORM ---
                <form onSubmit={handleRegister} className="space-y-6">
                     {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg">{error}</div>}

                    <div className="space-y-1">
                        <label className="block text-[#1e3a8a] font-bold text-base">{t('email')}</label>
                        <input 
                            type="email"
                            placeholder="student@bniyekhlef.edu"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            required
                            className="w-full p-3.5 border border-slate-200 rounded-lg text-slate-700 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all placeholder:text-slate-300"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="block text-[#1e3a8a] font-bold text-base">{t('password')}</label>
                        <input 
                            type="password"
                            placeholder="........"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            required
                            minLength={6}
                            className="w-full p-3.5 border border-slate-200 rounded-lg text-slate-700 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all placeholder:text-slate-300 tracking-widest"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="block text-[#1e3a8a] font-bold text-base">{t('firstName')}</label>
                            <input 
                                type="text"
                                placeholder="John"
                                value={firstName}
                                onChange={e => setFirstName(e.target.value)}
                                required
                                className="w-full p-3.5 border border-slate-200 rounded-lg text-slate-700 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all placeholder:text-slate-300"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="block text-[#1e3a8a] font-bold text-base">{t('lastName')}</label>
                            <input 
                                type="text"
                                placeholder="Doe"
                                value={lastName}
                                onChange={e => setLastName(e.target.value)}
                                required
                                className="w-full p-3.5 border border-slate-200 rounded-lg text-slate-700 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all placeholder:text-slate-300"
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="block text-[#1e3a8a] font-bold text-base">{t('grade')}</label>
                        <div className="relative">
                            <select 
                                value={grade}
                                onChange={e => setGrade(e.target.value)}
                                className="w-full p-3.5 border border-slate-200 rounded-lg text-slate-700 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all appearance-none bg-white"
                            >
                                <option value="" disabled>{t('selectGrade')}</option>
                                <option value="TC">TC</option>
                                <option value="BAC 1">BAC 1</option>
                                <option value="BAC 2">BAC 2</option>
                                <option value="Dev Team">Dev Team (Access Request)</option>
                            </select>
                            <div className={`absolute top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 ${isRTL ? 'left-4' : 'right-4'}`}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                            </div>
                        </div>
                    </div>

                     <div className="grid grid-cols-2 gap-4">
                        <button 
                            type="button" 
                            onClick={() => { setMode('login'); setError(''); }}
                            className="w-full py-2.5 px-4 rounded-lg border border-slate-200 text-[#1e3a8a] font-semibold text-sm hover:bg-slate-50 transition-colors"
                        >
                            {t('haveAccount')}
                        </button>
                    </div>

                    <div className="w-full h-px bg-slate-100 my-4"></div>

                    <div className="pt-2">
                        <button 
                            type="submit"
                            disabled={isLoading}
                            className="w-full px-8 py-3 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-bold transition-colors shadow-lg shadow-blue-200 disabled:opacity-70 flex items-center justify-center gap-2"
                        >
                            {isLoading && <Loader2 className="animate-spin" size={18} />}
                            {t('login')}
                        </button>
                    </div>
                </form>
            )}
        </div>
      </div>
    </div>
  );
};