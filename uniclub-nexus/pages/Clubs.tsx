import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useUI } from '../context/UIContext';
import { db } from '../services/mockFirebase';
import { Club, UserRole } from '../types';
import { Plus, Trash2, LogIn, LogOut, EyeOff, Palette, Award } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { JoinAgreementModal } from '../components/JoinAgreementModal';

export const Clubs = () => {
  const { canCreateClub, canDeleteClub, user, refreshUser, isDev, checkServiceLimit } = useAuth();
  const { t } = useLanguage();
  const { showToast, confirm } = useUI();
  const navigate = useNavigate();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [joiningClub, setJoiningClub] = useState<Club | null>(null);
  
  // Club Fields
  const [newClubName, setNewClubName] = useState('');
  const [newClubDesc, setNewClubDesc] = useState('');
  const [newClubLogo, setNewClubLogo] = useState('');
  const [leaderEmail, setLeaderEmail] = useState('');
  const [isHiddenClub, setIsHiddenClub] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<'light' | 'dark' | 'midnight' | 'depressed' | 'cherry' | 'lethal'>('light');
  
  // Leader Badge Fields
  const [badgeName, setBadgeName] = useState('');
  const [badgeDesc, setBadgeDesc] = useState('');
  const [badgeImage, setBadgeImage] = useState('');

  const [loading, setLoading] = useState(false);

  const loadClubs = async () => {
    const data = await db.getClubs();
    setClubs(data);
  };

  useEffect(() => {
    loadClubs();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    const limitCheck = checkServiceLimit('create_club');
    if (limitCheck.limited) {
       showToast(`Action Restricted: ${limitCheck.reason} (Active Until: ${limitCheck.until})`, "error");
       return;
    }

    setLoading(true);
    
    // Call new method with leader email
    const success = await db.createClubWithLeader({
        name: newClubName,
        description: newClubDesc,
        imageUrl: newClubLogo || `https://ui-avatars.com/api/?name=${newClubName}&background=random&size=400`,
        memberIds: [], // Will be handled by service
        leaderId: '', // Will be handled by service
        isHidden: isHiddenClub,
        theme: selectedTheme,
        
        // Leader Badge
        badgeName: badgeName || `${newClubName} Leader`,
        badgeDescription: badgeDesc || `Official leadership badge for ${newClubName}`,
        badgeImageUrl: badgeImage || newClubLogo || `https://ui-avatars.com/api/?name=${newClubName}&background=random&size=400`,
    }, leaderEmail);

    setLoading(false);
    if (success) {
        showToast("Club created successfully!", "success");
        setShowModal(false);
        setNewClubName('');
        setNewClubDesc('');
        setNewClubLogo('');
        setLeaderEmail('');
        
        setBadgeName('');
        setBadgeDesc('');
        setBadgeImage('');
        
        setIsHiddenClub(false);
        setSelectedTheme('light');
        loadClubs();
    } else {
        showToast("Failed to create club. Check if leader email is correct.", "error");
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmed = await confirm({
        title: "Delete Club",
        message: "Are you sure you want to delete this club? This action is irreversible.",
        type: "danger",
        confirmText: "Delete"
    });

    if (confirmed) {
        await db.deleteClub(id);
        showToast("Club deleted.", "success");
        loadClubs();
    }
  };

  const handleJoinClick = (club: Club, e: React.MouseEvent) => {
    e.stopPropagation();
    
    const limitCheck = checkServiceLimit('join_club');
    if (limitCheck.limited) {
       showToast(`Action Restricted: ${limitCheck.reason} (Active Until: ${limitCheck.until})`, "error");
       return;
    }

    setJoiningClub(club);
  };

  const handleJoinConfirm = async (code?: string) => {
    if (user && joiningClub) {
      if (joiningClub.requireRegistrationCode) {
          if (!code) {
              showToast("Registration code is required for this club.", "error");
              return;
          }
          const valid = await db.verifyRegistrationCode(joiningClub.id, code);
          if (!valid) {
              showToast("Registration code is invalid or has expired.", "error");
              return;
          }
          await db.consumeRegistrationCode(joiningClub.id, code, user.id);
      }
      
      await db.joinClub(user.id, joiningClub.id);
      await refreshUser();
      showToast("Pledging agreement registered! You joined the club.", "success");
      setJoiningClub(null);
      loadClubs();
    }
  };

  const handleLeave = async (clubId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmed = await confirm({
        title: "Leave Club",
        message: "Are you sure you want to leave this club?",
        confirmText: "Leave",
        type: "warning"
    });

    if(confirmed && user) {
        await db.leaveClub(user.id, clubId);
        await refreshUser();
        showToast("You left the club.", "info");
        loadClubs();
    }
  }

  const handleCardClick = (clubId: string) => {
    navigate(`/clubs/${clubId}`);
  };

  // Filter clubs based on visibility rules
  const filteredClubs = clubs.filter(club => {
    const normalizeName = club.name.toLowerCase().trim();
    
    // Hardcoded dev check (Legacy)
    if (normalizeName === 'dev team' || normalizeName === 'dev club') {
        return isDev;
    }

    // Hidden Club Logic
    if (club.isHidden) {
        // Visible if user is Admin, Owner, Dev OR is a member of the club
        const isPrivileged = user?.role === UserRole.ADMIN || user?.role === UserRole.OWNER || user?.role === UserRole.DEV;
        const isMember = user?.joinedClubIds?.includes(club.id);
        
        if (!isPrivileged && !isMember) {
            return false;
        }
    }

    return true;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
       <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center shrink-0">
                <Palette size={28} />
            </div>
            <div>
                <h1 className="text-3xl font-black font-display text-slate-800 dark:text-slate-100 tracking-tight">{t('studentClubs')}</h1>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">Explore communities and find your passion.</p>
            </div>
        </div>
        {canCreateClub && (
          <button 
            onClick={() => setShowModal(true)}
            className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-indigo-200 dark:shadow-none flex items-center gap-2 hover:bg-indigo-700 hover:-translate-y-0.5 transition-all w-full sm:w-auto justify-center"
          >
            <Plus size={20} /> {t('registerClub')}
          </button>
        )}
      </div>

      {filteredClubs.length === 0 ? (
          <div className="col-span-full py-20 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800">
              <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Palette size={40} className="text-slate-300 dark:text-slate-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-700 dark:text-slate-200 mb-2">{t('noClubs')}</h3>
              <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto">There are no approved clubs available right now.</p>
          </div>
      ) : (
        /* Fluid Grid Layout */
        <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-8">
            {filteredClubs.map(club => {
                const isMember = user?.joinedClubIds?.includes(club.id);
                return (
                    <div 
                        key={club.id} 
                        onClick={() => handleCardClick(club.id)}
                        className={`group bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-sm hover:shadow-xl hover:shadow-indigo-100 dark:hover:shadow-none transition-all duration-300 border ${club.isHidden ? 'border-dashed border-amber-300 dark:border-amber-700 hover:border-amber-400' : 'border-slate-100 dark:border-slate-800'} flex flex-col relative focus-within:ring-2 focus-within:ring-indigo-500 cursor-pointer`}
                    >
                        <div className="relative h-56 overflow-hidden bg-slate-100 dark:bg-slate-800">
                            <img src={club.imageUrl} alt={club.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-in-out" />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/20 to-transparent"></div>
                            
                            <div className="absolute bottom-4 left-5 right-5">
                                <h3 className="text-white font-black font-display text-2xl leading-tight line-clamp-2 drop-shadow-md">{club.name}</h3>
                            </div>
                            
                            {club.isHidden && (
                                <div className="absolute top-4 left-4 bg-amber-500/90 text-white px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm backdrop-blur-md">
                                    <EyeOff size={12} /> Hidden
                                </div>
                            )}

                            {canDeleteClub && (
                                <div className="absolute top-4 right-4 gap-2 flex">
                                    <button onClick={(e) => handleDelete(club.id, e)} className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md text-rose-500 p-2 rounded-xl hover:bg-white dark:hover:bg-slate-700 transition-colors shadow-sm" title="Delete Club">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            )}
                        </div>
                        <div className="p-6 flex-1 flex flex-col">
                            <p className="text-slate-600 dark:text-slate-400 text-sm mb-6 line-clamp-3 leading-relaxed flex-1">{club.description}</p>
                            
                            <div className="flex items-center justify-between mt-auto">
                                <div className="flex items-center gap-3">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{club.memberIds?.length || 0} {t('members')}</span>
                                </div>
                                
                                <div className="flex gap-2">
                                    {isMember ? (
                                        <button onClick={(e) => handleLeave(club.id, e)} className="flex items-center gap-1.5 text-xs font-bold bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/50 px-4 py-2 rounded-xl transition-colors">
                                            <LogOut size={14}/> {t('leave')}
                                        </button>
                                    ) : (
                                        <button onClick={(e) => handleJoinClick(club, e)} className="flex items-center gap-1.5 text-xs font-bold bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 px-4 py-2 rounded-xl transition-colors">
                                            <LogIn size={14} /> {t('join')}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
      )}

      {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 animate-in zoom-in-95 duration-200 h-[80vh] overflow-y-auto custom-scrollbar">
            <h2 className="text-2xl font-bold mb-4">{t('registerNewClub')}</h2>
            <form onSubmit={handleCreate} className="space-y-6">
                <div className="space-y-4">
                    <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wide border-b pb-2">Club Details</h3>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">{t('clubName')}</label>
                        <input className="w-full p-2 border rounded-lg" value={newClubName} onChange={e => setNewClubName(e.target.value)} required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">{t('clubDesc')}</label>
                        <textarea className="w-full p-2 border rounded-lg" rows={3} value={newClubDesc} onChange={e => setNewClubDesc(e.target.value)} required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">{t('logoUrl')}</label>
                        <input className="w-full p-2 border rounded-lg" value={newClubLogo} onChange={e => setNewClubLogo(e.target.value)} placeholder="https://..." />
                    </div>
                    <div>
                         <label className="block text-sm font-medium text-slate-700 mb-1">{t('leaderEmail')}</label>
                         <input 
                            type="email"
                            className="w-full p-2 border rounded-lg" 
                            value={leaderEmail} 
                            onChange={e => setLeaderEmail(e.target.value)} 
                            placeholder="student@bniyekhlef.edu"
                            required 
                         />
                         <p className="text-xs text-slate-500 mt-1">{t('leaderEmailHint')}</p>
                    </div>
                </div>

                {/* Leader Badge */}
                <div className="space-y-4">
                    <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wide border-b pb-2 flex items-center gap-2">
                        <Award size={16} /> Leader Badge Customization
                    </h3>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Badge Name</label>
                        <input className="w-full p-2 border rounded-lg" value={badgeName} onChange={e => setBadgeName(e.target.value)} placeholder={newClubName ? `${newClubName} Leader` : 'Club Leader'} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Badge Description</label>
                        <input className="w-full p-2 border rounded-lg" value={badgeDesc} onChange={e => setBadgeDesc(e.target.value)} placeholder="Official leadership verification..." />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Badge Image URL</label>
                        <input className="w-full p-2 border rounded-lg" value={badgeImage} onChange={e => setBadgeImage(e.target.value)} placeholder="Leave empty to use Club Logo" />
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wide border-b pb-2">Appearance & Visibility</h3>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2"><Palette size={16}/> Club Theme</label>
                        <select 
                            value={selectedTheme} 
                            onChange={e => setSelectedTheme(e.target.value as any)}
                            className="w-full p-2 border rounded-lg bg-white"
                        >
                            <option value="light">Light (Default)</option>
                            <option value="dark">Dark</option>
                            <option value="midnight">Midnight</option>
                            <option value="depressed">Depressed</option>
                            <option value="cherry">Cherry</option>
                            <option value="lethal">Lethal</option>
                        </select>
                    </div>
                    
                    <div className="flex items-center gap-2 pt-2">
                        <input 
                            type="checkbox" 
                            id="hiddenClub"
                            checked={isHiddenClub}
                            onChange={e => setIsHiddenClub(e.target.checked)}
                            className="w-4 h-4 text-indigo-600 rounded"
                        />
                        <label htmlFor="hiddenClub" className="text-sm font-medium text-slate-700 flex items-center gap-2">
                            <EyeOff size={16} className="text-slate-500" />
                            Hidden Club (Admins only)
                        </label>
                    </div>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t">
                    <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-slate-500">{t('cancel')}</button>
                    <button type="submit" disabled={loading} className="px-4 py-2 bg-indigo-600 text-white rounded-lg disabled:opacity-50">{t('create')}</button>
                </div>
            </form>
          </div>
          </div>
      )}

      <JoinAgreementModal
          isOpen={!!joiningClub}
          club={joiningClub}
          userMerit={user?.meritScore ?? 20}
          onClose={() => setJoiningClub(null)}
          onConfirm={handleJoinConfirm}
      />
    </div>
  );
};