import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useUI } from '../context/UIContext';
import { db } from '../services/mockFirebase';
import { translateAnnouncement } from '../services/ai';
import { Club, User, Project, Announcement, UserRole, Badge } from '../types';
import { UserMinus, Plus, CheckCircle, Clock, Trash2, Loader2, Languages, IdCard, QrCode, Skull } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export const ClubPanel = () => {
  const { clubId } = useParams<{ clubId: string }>();
  const { canManageClub, canAccessAdminPanel, user, refreshUser } = useAuth();
  const { t, language } = useLanguage();
  const { showToast, confirm } = useUI();
  const [club, setClub] = useState<Club | null>(null);
  const [members, setMembers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  
  const [activeTab, setActiveTab] = useState<'members' | 'announcements' | 'projects' | 'badge' | 'settings' | 'admin'>('members');
  const [showProjModal, setShowProjModal] = useState(false);
  const [showAnnounceModal, setShowAnnounceModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Settings states
  const [requiredMeritSettings, setRequiredMeritSettings] = useState<number>(60);
  const [rulesSettings, setRulesSettings] = useState<string[]>([]);
  const [newRuleInput, setNewRuleInput] = useState<string>('');
  const [chatRulesSettings, setChatRulesSettings] = useState<string[]>([]);
  const [newChatRuleInput, setNewChatRuleInput] = useState<string>('');
  
  const [requireRegistrationCode, setRequireRegistrationCode] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');
  const [codeHours, setCodeHours] = useState(1);

  // Staff and Leading Roles States
  const [presidentName, setPresidentName] = useState('');
  const [presidentAvatar, setPresidentAvatar] = useState('');
  const [vicePresidentName, setVicePresidentName] = useState('');
  const [vicePresidentAvatar, setVicePresidentAvatar] = useState('');
  const [teacherName, setTeacherName] = useState('');
  const [teacherAvatar, setTeacherAvatar] = useState('');
  
  // Super Admin Editor States
  const [adminTempName, setAdminTempName] = useState("");
  const [adminTempDesc, setAdminTempDesc] = useState("");
  const [adminTempLogo, setAdminTempLogo] = useState("");
  const [adminTempLeaderEmail, setAdminTempLeaderEmail] = useState("");

  // Disciplinary states
  const [kickingMember, setKickingMember] = useState<User | null>(null);
  const [expulsionPenalty, setExpulsionPenalty] = useState(15);
  const [expulsionReason, setExpulsionReason] = useState('');
  const [expulsionBrokenRule, setExpulsionBrokenRule] = useState('');
  const [hasValidReason, setHasValidReason] = useState(true);

  // Forms
  const [newProj, setNewProj] = useState({ title: '', desc: '', logo: '', status: 'In Progress' as const });
  const [newAnnounce, setNewAnnounce] = useState({ title: '', content: '', autoTranslate: false });
  const [reportToAdmin, setReportToAdmin] = useState(false);

  useEffect(() => {
    loadAllData();
  }, [clubId]);

  const loadAllData = async () => {
    if (clubId) {
        const allClubs = await db.getClubs();
        const foundClub = allClubs.find(c => c.id === clubId);
        setClub(foundClub || null);
        
        if (foundClub) {
            setRequiredMeritSettings(foundClub.requiredMerit ?? 60);
            setRulesSettings(foundClub.rules ?? []);
            setChatRulesSettings(foundClub.chatRules ?? []);
            setRequireRegistrationCode(foundClub.requireRegistrationCode ?? false);
            setAdminTempName(foundClub.name);
            setAdminTempDesc(foundClub.description);
            setAdminTempLogo(foundClub.logoUrl || foundClub.imageUrl || "");
            
            if (foundClub.memberIds) {
                const allUsers = await db.getAllUsers();
                setMembers(allUsers.filter(u => foundClub.memberIds.includes(u.id)));
                const leader = allUsers.find(u => u.id === foundClub.leaderId);
                if (leader) setAdminTempLeaderEmail(leader.email);
            }

            // Populate staff and leading roles
            setPresidentName(foundClub.presidentName ?? '');
            setPresidentAvatar(foundClub.presidentAvatar ?? '');
            setVicePresidentName(foundClub.vicePresidentName ?? '');
            setVicePresidentAvatar(foundClub.vicePresidentAvatar ?? '');
            setTeacherName(foundClub.teacherName ?? '');
            setTeacherAvatar(foundClub.teacherAvatar ?? '');
        }

        const clubProjects = await db.getProjects(clubId);
        setProjects(clubProjects);

        const clubAnnouncements = await db.getAnnouncements(clubId);
        setAnnouncements(clubAnnouncements);
    }
  };

  if (!clubId || !canManageClub(clubId)) {
    return <div className="text-center p-10 text-red-500">Access Denied: You do not have permission to manage this club.</div>;
  }

  if (!club) return <div>Loading...</div>;

  const handleKick = async (member: User) => {
    if (member.role === UserRole.OWNER) {
        showToast("You cannot kick an Owner from the club.", "error");
        return;
    }
    setKickingMember(member);
    setReportToAdmin(false);
    if (club && club.rules && club.rules.length > 0) {
      setExpulsionBrokenRule(club.rules[0]);
    } else {
      setExpulsionBrokenRule("Violation of General Primordial Server Covenant.");
    }
  };

  const handleKickSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kickingMember || !club || !user) return;

    const reason = expulsionReason.trim() || "No detailed explanation provided.";
    const brokenRule = expulsionBrokenRule || "Violation of General Primordial Server Covenant.";

    if (!brokenRule) {
      showToast("You must select or declare a broken rule broken in order to enforce expulsion.", "error");
      return;
    }

    const success = await db.kickMemberWithRecord(
      user.id,
      club.id,
      kickingMember.id,
      reason,
      brokenRule,
      reportToAdmin
    );

    if (success) {
      setMembers(prev => prev.filter(m => m.id !== kickingMember.id));
      showToast(`${kickingMember.name} has been kicked and a disciplinary record was added.`, "success");
      setKickingMember(null);
      setExpulsionReason('');
      setExpulsionBrokenRule('');
      setReportToAdmin(false);
      refreshUser();
    } else {
      showToast("Failed to complete disciplinary kick.", "error");
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
      e.preventDefault();
      if (isSubmitting) return;

      setIsSubmitting(true);
      try {
        await db.addProject({
            id: Date.now().toString(),
            title: newProj.title,
            description: newProj.desc,
            imageUrl: newProj.logo || `https://ui-avatars.com/api/?name=${newProj.title}&background=random`,
            status: newProj.status,
            contributors: [club.name],
            clubId: club.id
        });
        setShowProjModal(false);
        setNewProj({ title: '', desc: '', logo: '', status: 'In Progress' });
        showToast("Project created!", "success");
        loadAllData();
      } catch (e) {
          console.error(e);
          showToast("Failed to create project", "error");
      } finally {
          setIsSubmitting(false);
      }
  };

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
      e.preventDefault();
      if (isSubmitting) return;

      setIsSubmitting(true);
      try {
        let translations = undefined;
        if (newAnnounce.autoTranslate) {
            translations = await translateAnnouncement(newAnnounce.title, newAnnounce.content);
        }

        const announcementData: any = {
            id: Date.now().toString(),
            title: newAnnounce.title,
            content: newAnnounce.content,
            date: new Date().toISOString(),
            isImportant: true,
            authorName: user?.name || 'Club Leader',
            clubId: club.id,
            clubName: club.name
        };

        if (translations) {
            announcementData.translations = translations;
        }

        await db.addAnnouncement(announcementData);
        setShowAnnounceModal(false);
        setNewAnnounce({ title: '', content: '', autoTranslate: false });
        showToast("Announcement posted!", "success");
        loadAllData();
      } catch (e) {
          console.error(e);
          showToast("Failed to post announcement", "error");
      } finally {
          setIsSubmitting(false);
      }
  };

  const handleDeleteProject = async (id: string) => {
      const confirmed = await confirm({
          title: "Delete Project",
          message: "Delete this project?",
          type: "danger"
      });
      if(confirmed) {
          await db.deleteProject(id);
          showToast("Project deleted.", "success");
          loadAllData();
      }
  };

  const handleDeleteAnnouncement = async (id: string) => {
      const confirmed = await confirm({
          title: "Delete Announcement",
          message: "Delete this announcement?",
          type: "danger"
      });
      if(confirmed) {
          await db.deleteAnnouncement(id);
          showToast("Announcement deleted.", "success");
          loadAllData();
      }
  };

  const toggleProjectStatus = async (p: Project) => {
      const newStatus = p.status === 'Done' ? 'In Progress' : 'Done';
      await db.updateProject(p.id, { status: newStatus });
      loadAllData();
  };

  const handleClaimBadge = async () => {
    if (!user) return;
    setIsSubmitting(true);
    try {
        const badge: Badge = {
            id: `club-leader-${club.id}-${user.id}`,
            clubId: club.id,
            type: 'CLUB_LEADER',
            name: club.badgeName || `${club.name} Leader`,
            imageUrl: club.badgeImageUrl || club.imageUrl,
            description: club.badgeDescription || "Official Leadership Verification",
            assignedAt: new Date().toISOString()
        };
        await db.addBadgeToUser(user.id, badge);
        await refreshUser();
        showToast("Official Club Badge Claimed!", "success");
    } catch (e) {
        console.error(e);
        showToast("Failed to claim badge.", "error");
    } finally {
        setIsSubmitting(false);
    }
  };

  const hasClaimedBadge = user?.badges?.some(b => b.clubId === club.id && b.type === 'CLUB_LEADER');

  const displayBadgeName = club.badgeName || `${club.name} Leader`;
  const displayBadgeImage = club.badgeImageUrl || club.imageUrl;
  const displayBadgeDesc = club.badgeDescription || "Official Leadership Verification";

  return (
    <div className="space-y-8">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-purple-100 rounded-xl">
                <span className="material-symbols-rounded text-purple-600 text-3xl">settings_account_box</span>
            </div>
            <div>
                <h1 className="text-3xl font-bold text-slate-800 font-display">{club.name} Dashboard</h1>
                <p className="text-slate-500">Manage members, projects, and announcements</p>
            </div>
        </div>
        
        <div className="flex gap-4 mt-8 border-b border-slate-100 overflow-x-auto">
            <button onClick={() => setActiveTab('members')} className={`pb-3 px-2 font-medium transition-colors whitespace-nowrap ${activeTab === 'members' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500'}`}>Members</button>
            <button onClick={() => setActiveTab('announcements')} className={`pb-3 px-2 font-medium transition-colors whitespace-nowrap ${activeTab === 'announcements' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500'}`}>Announcements</button>
            <button onClick={() => setActiveTab('projects')} className={`pb-3 px-2 font-medium transition-colors whitespace-nowrap ${activeTab === 'projects' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500'}`}>Projects</button>
            <button onClick={() => setActiveTab('badge')} className={`pb-3 px-2 font-medium transition-colors whitespace-nowrap ${activeTab === 'badge' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500'}`}>Club Badge</button>
            <button onClick={() => setActiveTab('settings')} className={`pb-3 px-2 font-medium transition-colors whitespace-nowrap ${activeTab === 'settings' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500'}`}>Club Settings</button>
            {canAccessAdminPanel && (
                <button onClick={() => setActiveTab('admin')} className={`pb-3 px-2 font-bold transition-colors whitespace-nowrap ${activeTab === 'admin' ? 'text-rose-600 border-b-2 border-rose-600' : 'text-rose-400 hover:text-rose-500'}`}>Super Admin</button>
            )}
        </div>
      </div>

      {activeTab === 'members' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h2 className="text-lg font-bold flex items-center gap-2 font-display text-slate-700">
                    <span className="material-symbols-rounded text-indigo-500">group</span>
                    Members Directory
                </h2>
                <span className="bg-white border border-slate-200 text-slate-600 px-3 py-1 rounded-full text-xs font-bold shadow-sm">{members.length} Active</span>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                        <tr>
                            <th className="p-4 font-semibold">Name</th>
                            <th className="p-4 font-semibold">Email</th>
                            <th className="p-4 font-semibold">Role</th>
                            <th className="p-4 text-right font-semibold">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {members.map(member => (
                            <tr key={member.id} className="hover:bg-slate-50 transition-colors">
                                <td className="p-4 font-medium text-slate-800">{member.name}</td>
                                <td className="p-4 text-slate-500">{member.email}</td>
                                <td className="p-4">
                                    <span className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-600 border border-slate-200 font-medium">{member.role}</span>
                                </td>
                                <td className="p-4 text-right">
                                    {member.id !== user?.id && member.role !== UserRole.OWNER && (
                                        <button 
                                            onClick={() => handleKick(member)}
                                            className="text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg text-sm font-medium inline-flex items-center gap-1 transition-colors"
                                        >
                                            <UserMinus size={16}/> Kick
                                        </button>
                                    )}
                                    {member.role === UserRole.OWNER && (
                                        <span className="text-xs text-slate-400 italic flex items-center justify-end gap-1">
                                            <span className="material-symbols-rounded text-sm">lock</span> Protected
                                        </span>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {members.length === 0 && (
                            <tr><td colSpan={4} className="p-8 text-center text-slate-400 italic">No members yet.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
      )}

      {activeTab === 'announcements' && (
          <div className="space-y-4">
             <div className="flex justify-between items-center">
                 <h2 className="text-xl font-bold text-slate-800 font-display">Club Announcements</h2>
                 <button onClick={() => setShowAnnounceModal(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700 transition-colors shadow-sm font-medium">
                     <Plus size={18} /> New Post
                 </button>
             </div>
             {announcements.length === 0 ? <p className="text-slate-500 text-center py-10 bg-white rounded-xl border border-slate-200 border-dashed">No announcements posted.</p> : announcements.map(a => {
                 const hasTranslation = a.translations && a.translations[language];
                 const displayTitle = hasTranslation ? a.translations[language]!.title : a.title;
                 const displayContent = hasTranslation ? a.translations[language]!.content : a.content;
                 
                 return (
                 <div key={a.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative group hover:shadow-md transition-all">
                     <button 
                        onClick={() => handleDeleteAnnouncement(a.id)} 
                        className="absolute top-4 right-4 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 p-2 bg-white/80 hover:bg-white rounded-full transition-all border border-transparent hover:border-slate-100 shadow-sm"
                        title="Delete Announcement"
                     >
                        <Trash2 size={18}/>
                     </button>
                     <div className="flex justify-between mb-3 pr-8">
                         <h3 className="font-bold text-lg flex items-center gap-2 font-display text-slate-800">
                             {displayTitle}
                             {hasTranslation && (
                                <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full flex items-center gap-1 font-normal border border-blue-100" title="Translated automatically">
                                    <Languages size={10} /> Translated
                                </span>
                            )}
                         </h3>
                         <span className="text-xs text-slate-400 font-medium">{new Date(a.date).toLocaleDateString()}</span>
                     </div>
                     <div className="text-slate-600 markdown-body text-sm">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{displayContent}</ReactMarkdown>
                     </div>
                 </div>
                 );
             })}
          </div>
      )}

      {activeTab === 'projects' && (
           <div className="space-y-4">
               <div className="flex justify-between items-center">
                 <h2 className="text-xl font-bold text-slate-800 font-display">Club Projects</h2>
                 <button onClick={() => setShowProjModal(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700 transition-colors shadow-sm font-medium">
                     <Plus size={18} /> New Project
                 </button>
             </div>
             <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
                {projects.length === 0 ? <p className="col-span-2 text-slate-500 text-center py-10 bg-white rounded-xl border border-slate-200 border-dashed">No projects started.</p> : projects.map(p => (
                    <div key={p.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-5 relative group hover:shadow-md transition-all">
                        <button 
                            onClick={() => handleDeleteProject(p.id)} 
                            className="absolute top-2 right-2 text-white bg-black/50 hover:bg-red-500 rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-all z-10"
                            title="Delete Project"
                        >
                            <Trash2 size={14}/>
                        </button>
                        <img src={p.imageUrl} className="w-16 h-16 rounded-lg object-cover bg-slate-100 border border-slate-100 shrink-0" />
                        <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-slate-800 font-display mb-1 truncate">{p.title}</h3>
                            <p className="text-sm text-slate-500 mb-3 line-clamp-2">{p.description}</p>
                            <button 
                                onClick={() => toggleProjectStatus(p)}
                                className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 w-fit transition-colors border ${
                                    p.status === 'Done' ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                                }`}>
                                {p.status === 'Done' ? <CheckCircle size={12}/> : <Clock size={12}/>}
                                {p.status || 'In Progress'}
                            </button>
                        </div>
                    </div>
                ))}
             </div>
           </div>
      )}

      {activeTab === 'badge' && (
          <div className="grid md:grid-cols-2 gap-8 items-start">
              <div className="space-y-6">
                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                      <h2 className="text-xl font-bold text-slate-800 mb-2 flex items-center gap-2">
                          <IdCard className="text-indigo-600"/> Official Club Badge
                      </h2>
                      <p className="text-slate-600 text-sm mb-6">
                          As the leader of <span className="font-bold">{club.name}</span>, you can claim your official digital badge. 
                          This badge verifies your leadership status.
                      </p>
                      
                      {hasClaimedBadge ? (
                           <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3 text-green-800">
                               <CheckCircle size={24} className="text-green-600" />
                               <div>
                                   <p className="font-bold text-sm">Badge Claimed!</p>
                                   <p className="text-xs opacity-80">This badge is now visible on your profile.</p>
                               </div>
                           </div>
                      ) : (
                          <button 
                            onClick={handleClaimBadge}
                            disabled={isSubmitting}
                            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2"
                          >
                              {isSubmitting ? <Loader2 className="animate-spin" /> : <CheckCircle />}
                              Claim My Badge
                          </button>
                      )}
                  </div>
              </div>

              {/* Badge Preview */}
              <div className="flex justify-center">
                  <div className="w-[320px] h-[480px] bg-white rounded-2xl shadow-2xl overflow-hidden relative border border-slate-200 flex flex-col items-center">
                      {/* Lanyard Hole */}
                      <div className="absolute top-4 left-1/2 -translate-x-1/2 w-16 h-3 bg-slate-200 rounded-full z-20"></div>
                      <div className="absolute top-3 left-1/2 -translate-x-1/2 w-2 h-2 bg-white rounded-full z-30"></div>

                      {/* Header Pattern */}
                      <div className="w-full h-32 bg-gradient-to-br from-indigo-600 to-purple-700 relative overflow-hidden">
                           <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_1px_1px,#fff_1px,transparent_0)] bg-[length:10px_10px]"></div>
                           <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-white to-transparent"></div>
                      </div>

                      {/* Avatar */}
                      <div className="w-28 h-28 rounded-full border-4 border-white shadow-lg -mt-14 z-10 bg-slate-100 overflow-hidden">
                          {user?.avatarUrl ? <img src={user.avatarUrl} className="w-full h-full object-cover" /> : <Plus size={40} className="text-slate-400 m-auto mt-8"/>}
                      </div>

                      {/* Content */}
                      <div className="text-center mt-4 px-6 flex-1 flex flex-col items-center w-full">
                          <h3 className="text-xl font-bold text-slate-800 font-display mb-1">{user?.name}</h3>
                          <p className="text-indigo-600 font-bold text-sm uppercase tracking-widest mb-4">Club Leader</p>
                          
                          <div className="w-full h-px bg-slate-100 mb-4"></div>
                          
                          <div className="flex items-center gap-3 mb-6 bg-slate-50 p-2 rounded-xl pr-4 border border-slate-100">
                               <img src={displayBadgeImage} className="w-10 h-10 rounded-lg object-cover bg-white shadow-sm" />
                               <div className="text-left">
                                   <p className="text-xs text-slate-400 font-bold uppercase">Badge</p>
                                   <p className="text-sm font-bold text-slate-800 line-clamp-1">{displayBadgeName}</p>
                               </div>
                          </div>
                          
                          <div className="text-xs text-slate-500 px-4 italic mb-6">
                              {displayBadgeDesc}
                          </div>

                          <div className="mt-auto mb-8">
                               <QrCode size={64} className="text-slate-800 mx-auto opacity-80" />
                               <p className="text-[10px] text-slate-400 mt-2 font-mono uppercase tracking-widest">Authorized Personnel</p>
                          </div>
                      </div>
                      
                      {/* Holographic Overlay for Claimed State */}
                      {hasClaimedBadge && (
                          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent pointer-events-none z-50 mix-blend-overlay"></div>
                      )}
                  </div>
              </div>
          </div>
      )}

      {activeTab === 'settings' && (
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 space-y-8 animate-in fade-in duration-200">
              <div>
                  <h2 className="text-xl font-bold font-display text-slate-800 mb-1">
                      Club Enrollment & Agreement Settings
                  </h2>
                  <p className="text-sm text-slate-500">
                      Configure join thresholds and covenant parameters for your student organization members.
                  </p>
              </div>

              {/* Requirement Threshold Section */}
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-4">
                  <div className="flex justify-between items-center">
                      <div>
                          <label className="block text-sm font-bold text-slate-705 mb-1">
                              Minimum Merit Score Hurdles
                          </label>
                          <p className="text-xs text-slate-400">
                              Students with a lower merit standing than this threshold will be blocked from enrolling.
                          </p>
                      </div>
                      <span className="text-xl font-extrabold font-mono text-indigo-600 bg-white px-4 py-1.5 rounded-xl border border-slate-100 shadow-sm">
                          {requiredMeritSettings} PT
                      </span>
                  </div>

                  <input 
                      type="range" 
                      min="0" 
                      max="100" 
                      step="5"
                      className="w-full accent-indigo-600 cursor-pointer animate-none"
                      value={requiredMeritSettings} 
                      onChange={e => {
                          const val = Number(e.target.value);
                          setRequiredMeritSettings(val > 100 ? 100 : val);
                      }}
                  />
                  <div className="flex justify-between text-xs text-slate-400 font-mono">
                      <span>0 (No limits)</span>
                      <span>100 (Flawless profile required)</span>
                  </div>
              </div>

              {/* Custom Agreements Section */}
              <div className="space-y-4">
                  <div>
                      <h3 className="text-sm font-bold text-slate-705 uppercase tracking-wider mb-1">
                          Dynamic Club Covenant Rules ({rulesSettings.length})
                      </h3>
                      <p className="text-xs text-slate-400">
                          These mandates are listed in the enrollment checklist interface. Members must pledge compliance during subscription.
                      </p>
                  </div>

                  {/* List of rules */}
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                      {rulesSettings.length > 0 ? (
                          rulesSettings.map((rule, idx) => (
                              <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-start gap-3 justify-between">
                                  <div className="flex gap-2 min-w-0">
                                      <span className="font-mono text-xs font-bold text-slate-400 mt-0.5">
                                          {(idx + 1).toString().padStart(2, '0')}
                                      </span>
                                      <p className="text-xs font-medium text-slate-700 leading-relaxed break-words">
                                          {rule}
                                      </p>
                                  </div>
                                  <button 
                                      type="button"
                                      onClick={() => {
                                          setRulesSettings(prev => prev.filter((_, rIdx) => rIdx !== idx));
                                      }}
                                      className="text-slate-400 hover:text-rose-600 p-1 rounded-lg hover:bg-slate-100 transition-colors flex-shrink-0"
                                      title="Delete agreement"
                                  >
                                      <Trash2 size={14} />
                                  </button>
                              </div>
                          ))
                      ) : (
                          <div className="p-8 text-center text-slate-400 text-xs italic bg-slate-50 border border-dashed border-slate-200 rounded-xl">
                              No custom rules yet. Using primordial university covenant only.
                          </div>
                      )}
                  </div>

                  {/* Add new agreement rule */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider font-mono">
                          Add Custom Covenant Agreement / Rule
                      </label>
                      <div className="flex gap-2">
                          <input 
                              type="text" 
                              className="flex-1 p-2.5 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500 font-sans text-slate-800"
                              placeholder="e.g., Attend mandatory weekly Friday 6 PM reunions."
                              value={newRuleInput}
                              onChange={e => setNewRuleInput(e.target.value)}
                              onKeyDown={e => {
                                  if (e.key === 'Enter') {
                                      e.preventDefault();
                                      if (newRuleInput.trim()) {
                                          setRulesSettings(prev => [...prev, newRuleInput.trim()]);
                                          setNewRuleInput('');
                                      }
                                  }
                              }}
                          />
                          <button 
                              type="button"
                              onClick={() => {
                                  if (newRuleInput.trim()) {
                                      setRulesSettings(prev => [...prev, newRuleInput.trim()]);
                                      setNewRuleInput('');
                                  }
                              }}
                              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md shadow-indigo-200"
                          >
                              <Plus size={14} /> Add
                          </button>
                      </div>
                      <p className="text-[10px] text-slate-400">
                          Examples: "Mandatory attendance of physical reunions", "A minimum of 5 weekly chatroom interactions", "Strict scientific citation guidelines."
                      </p>
                  </div>
              </div>

              {/* Club Chat Protocol & Rules */}
              <div className="space-y-4 pt-4 border-t border-slate-100">
                  <div>
                      <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-1">
                          Club Chat Board Protocol & Rules ({chatRulesSettings.length})
                      </h3>
                      <p className="text-xs text-slate-400">
                          These regulations define expected behavioral etiquette on the official club chat.
                      </p>
                  </div>

                  {/* List of chat rules */}
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                      {chatRulesSettings.length > 0 ? (
                          chatRulesSettings.map((rule, idx) => (
                              <div key={idx} className="p-3 bg-slate-50 relative rounded-xl border border-slate-100 flex items-start gap-3 justify-between">
                                  <div className="flex gap-2 min-w-0">
                                      <span className="font-mono text-xs font-bold text-slate-400 mt-0.5">
                                          {(idx + 1).toString().padStart(2, '0')}
                                      </span>
                                      <p className="text-xs font-medium text-slate-700 leading-relaxed break-words pr-6">
                                          {rule}
                                      </p>
                                  </div>
                                  <button 
                                      type="button"
                                      onClick={() => {
                                          setChatRulesSettings(prev => prev.filter((_, rIdx) => rIdx !== idx));
                                      }}
                                      className="text-slate-400 hover:text-rose-600 p-1 rounded-lg hover:bg-slate-100 transition-colors flex-shrink-0"
                                      title="Delete chat rule"
                                  >
                                      <Trash2 size={14} />
                                  </button>
                              </div>
                          ))
                      ) : (
                          <div className="p-8 text-center text-slate-400 text-xs italic bg-slate-50 border border-dashed border-slate-200 rounded-xl">
                              No custom chat rules configured yet. Let's make some!
                          </div>
                      )}
                  </div>

                  {/* Add new chat rule input */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider font-mono">
                          Add Custom Chat Code / Rule
                      </label>
                      <div className="flex gap-2">
                          <input 
                              type="text" 
                              className="flex-1 p-2.5 bg-white border border-slate-205 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500 font-sans text-slate-800"
                              placeholder="e.g., No excessive messaging caps, keep posts mutually helpful."
                              value={newChatRuleInput}
                              onChange={e => setNewChatRuleInput(e.target.value)}
                              onKeyDown={e => {
                                  if (e.key === 'Enter') {
                                      e.preventDefault();
                                      if (newChatRuleInput.trim()) {
                                          setChatRulesSettings(prev => [...prev, newChatRuleInput.trim()]);
                                          setNewChatRuleInput('');
                                      }
                                  }
                              }}
                          />
                          <button 
                              type="button"
                              onClick={() => {
                                  if (newChatRuleInput.trim()) {
                                      setChatRulesSettings(prev => [...prev, newChatRuleInput.trim()]);
                                      setNewChatRuleInput('');
                                  }
                              }}
                              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md shadow-indigo-200"
                          >
                              <Plus size={14} /> Add
                          </button>
                      </div>
                  </div>
              </div>

              {/* Registration Code Privacy */}
              {canAccessAdminPanel && (
              <div className="space-y-4 pt-4 border-t border-slate-100">
                  <div>
                      <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-1">
                          Privacy & Registration Code
                      </h3>
                      <p className="text-xs text-slate-400">
                          Enable this to force students to input a valid, temporary registration code before joining. 
                          Only Admins/Higher-Ups can toggle this feature.
                      </p>
                  </div>
                  <label className="flex items-center gap-3 cursor-pointer select-none">
                      <div className="relative">
                          <input type="checkbox" className="sr-only" checked={requireRegistrationCode} onChange={async (e) => {
                              const checked = e.target.checked;
                              setRequireRegistrationCode(checked);
                              await db.saveClubRegistrationOption(club.id, checked);
                              showToast(`Registration code requirement ${checked ? 'enabled' : 'disabled'}.`, 'success');
                          }} />
                          <div className={`block w-10 h-6 rounded-full transition-colors ${requireRegistrationCode ? 'bg-indigo-500' : 'bg-slate-300'}`}></div>
                          <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${requireRegistrationCode ? 'transform translate-x-4' : ''}`}></div>
                      </div>
                      <div className="text-sm font-bold text-slate-700">Require Registration Code</div>
                  </label>
              </div>
              )}

              {requireRegistrationCode && (
                 <div className="space-y-4 pt-4 border-t border-slate-100 bg-indigo-50/50 p-4 rounded-xl">
                      <div>
                          <h3 className="text-sm font-bold text-indigo-900 uppercase tracking-wider mb-1">
                              Generate Registration Code
                          </h3>
                          <p className="text-xs text-indigo-700">
                              Generate a time-limited pass-code for students. Min 1 hr, Max 48 hrs.
                          </p>
                      </div>
                      <div className="flex gap-2 items-center">
                          <input type="number" min="1" max="48" value={codeHours} onChange={e => setCodeHours(Number(e.target.value))} className="w-20 p-2.5 bg-white border border-indigo-200 rounded-xl text-sm font-bold text-center" />
                          <span className="text-xs font-bold text-indigo-600">Hours</span>
                          <button 
                              onClick={async () => {
                                  if (!user) return;
                                  setIsSubmitting(true);
                                  const code = await db.generateRegistrationCode(club.id, codeHours, user.id);
                                  setGeneratedCode(code);
                                  setIsSubmitting(false);
                                  showToast("Code generated!", "success");
                                  loadAllData();
                              }}
                              disabled={isSubmitting}
                              className="ml-auto px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg text-xs"
                          >
                              Generate Code
                          </button>
                      </div>
                      
                      {generatedCode && (
                          <div className="p-3 bg-white border border-indigo-200 rounded-xl flex justify-between items-center mt-2">
                              <div>
                                  <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">New Code:</div>
                                  <div className="text-lg tracking-widest font-mono font-black text-indigo-700">{generatedCode}</div>
                              </div>
                              <button onClick={() => { navigator.clipboard.writeText(generatedCode); showToast("Copied!", "info"); }} className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100">Copy</button>
                          </div>
                      )}
                      
                      {club.registrationCodes && club.registrationCodes.length > 0 && (
                          <div className="mt-4 space-y-2">
                              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Codes</h4>
                              {club.registrationCodes.map(c => (
                                  <div key={c.code} className="flex justify-between items-center text-xs p-2 bg-white rounded border border-slate-200">
                                      <span className="font-mono font-bold text-slate-700">{c.code}</span>
                                      <span className="text-[10px] text-slate-400">Exp: {new Date(c.expiresAt).toLocaleString()}</span>
                                  </div>
                              ))}
                          </div>
                      )}

                      {club.usedRegistrationCodes && club.usedRegistrationCodes.length > 0 && (
                          <div className="mt-4 space-y-2">
                              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Recently Used Codes</h4>
                              {club.usedRegistrationCodes.map(c => (
                                  <div key={`${c.code}-${c.usedAt}`} className="flex justify-between items-center text-xs p-2 bg-slate-100 rounded border border-slate-200 opacity-70">
                                      <span className="font-mono font-bold text-slate-500 line-through">{c.code}</span>
                                      <span className="text-[10px] text-slate-500">By: {c.userName}</span>
                                  </div>
                              ))}
                          </div>
                      )}
                 </div>
              )}

              {/* Leadership Profile settings */}
              <div className="space-y-6 pt-6 border-t border-slate-100 animate-in fade-in duration-200">
                  <div>
                      <h3 className="text-sm font-bold text-slate-750 uppercase tracking-wider mb-1 font-display">
                          Club Leadership & Handling Teacher Roles
                      </h3>
                      <p className="text-xs text-slate-400">
                          Define profiles for the President, Vice-President, and handling Teacher to be displayed beautifully on the club main details page.
                      </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* President settings */}
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
                          <div className="flex items-center gap-2 text-indigo-700 font-bold text-xs uppercase font-mono">
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                              Club President
                          </div>
                          <div className="space-y-2">
                              <label className="block text-[10px] font-mono font-semibold text-slate-400 uppercase">President Name</label>
                              <input 
                                  type="text" 
                                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
                                  placeholder="e.g., Alex Johnson"
                                  value={presidentName}
                                  onChange={e => setPresidentName(e.target.value)}
                              />
                          </div>
                          <div className="space-y-2">
                              <label className="block text-[10px] font-mono font-semibold text-slate-400 uppercase">Avatar / Photo URL</label>
                              <input 
                                  type="url" 
                                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
                                  placeholder="Photo web URL or leave blank"
                                  value={presidentAvatar}
                                  onChange={e => setPresidentAvatar(e.target.value)}
                              />
                          </div>
                      </div>

                      {/* Vice President settings */}
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
                          <div className="flex items-center gap-2 text-indigo-700 font-bold text-xs uppercase font-mono">
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                              Club Vice-President
                          </div>
                          <div className="space-y-2">
                              <label className="block text-[10px] font-mono font-semibold text-slate-400 uppercase">Vice-President Name</label>
                              <input 
                                  type="text" 
                                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
                                  placeholder="e.g., Sam Smith"
                                  value={vicePresidentName}
                                  onChange={e => setVicePresidentName(e.target.value)}
                              />
                          </div>
                          <div className="space-y-2">
                              <label className="block text-[10px] font-mono font-semibold text-slate-400 uppercase">Avatar / Photo URL</label>
                              <input 
                                  type="url" 
                                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
                                  placeholder="Photo web URL or leave blank"
                                  value={vicePresidentAvatar}
                                  onChange={e => setVicePresidentAvatar(e.target.value)}
                              />
                          </div>
                      </div>

                      {/* Handling Teacher settings */}
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
                          <div className="flex items-center gap-2 text-indigo-700 font-bold text-xs uppercase font-mono">
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                              Handling Teacher / Advisor
                          </div>
                          <div className="space-y-2">
                              <label className="block text-[10px] font-mono font-semibold text-slate-400 uppercase">Teacher Name</label>
                              <input 
                                  type="text" 
                                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
                                  placeholder="e.g., Dr. Mary Williams"
                                  value={teacherName}
                                  onChange={e => setTeacherName(e.target.value)}
                              />
                          </div>
                          <div className="space-y-2">
                              <label className="block text-[10px] font-mono font-semibold text-slate-400 uppercase">Avatar / Photo URL</label>
                              <input 
                                  type="url" 
                                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
                                  placeholder="Photo web URL or leave blank"
                                  value={teacherAvatar}
                                  onChange={e => setTeacherAvatar(e.target.value)}
                              />
                          </div>
                      </div>
                  </div>
              </div>

              {/* Action save button */}
              <div className="pt-6 border-t border-slate-100 flex justify-end">
                  <button 
                      type="button"
                      disabled={isSubmitting}
                      onClick={async () => {
                          setIsSubmitting(true);
                          try {
                              const successSettings = await db.updateClubSettings(club.id, requiredMeritSettings, rulesSettings, chatRulesSettings);
                              const successDetails = await db.updateClub(club.id, {
                                  presidentName,
                                  presidentAvatar,
                                  vicePresidentName,
                                  vicePresidentAvatar,
                                  teacherName,
                                  teacherAvatar
                              });

                              if (successSettings && successDetails) {
                                  showToast("Club settings and leadership profiles successfully saved!", "success");
                                  await loadAllData();
                              } else {
                                  showToast("Failed to save settings.", "error");
                              }
                          } catch (err) {
                              showToast("Error updating club parameters.", "error");
                          } finally {
                              setIsSubmitting(false);
                          }
                      }}
                      className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold px-6 py-2.5 rounded-xl text-xs shadow-lg shadow-indigo-100 transition-all flex items-center gap-2"
                  >
                      {isSubmitting ? <Loader2 className="animate-spin" size={14} /> : <CheckCircle size={14} />}
                      Save Settings & Covenant Updates
                  </button>
              </div>
          </div>
      )}

      {/* Admin Editor Tab */}
      {activeTab === 'admin' && canAccessAdminPanel && (
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-rose-200 animate-in fade-in duration-200">
              <div className="mb-6 flex items-center justify-between border-b border-rose-100 pb-4">
                  <div>
                      <h2 className="text-xl font-bold font-display text-rose-800">Super Admin Controls</h2>
                      <p className="text-xs text-rose-500 font-bold uppercase tracking-wider">Override Core Properties</p>
                  </div>
              </div>
              <div className="space-y-4">
                  <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Club Name</label>
                      <input type="text" value={adminTempName} onChange={e => setAdminTempName(e.target.value)} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-rose-500" />
                  </div>
                  <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Club Description</label>
                      <textarea rows={3} value={adminTempDesc} onChange={e => setAdminTempDesc(e.target.value)} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-rose-500" />
                  </div>
                  <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Logo / Photo URL</label>
                      <input type="url" value={adminTempLogo} onChange={e => setAdminTempLogo(e.target.value)} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-rose-500" />
                  </div>
                  <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Leader Email Override</label>
                      <input type="email" value={adminTempLeaderEmail} onChange={e => setAdminTempLeaderEmail(e.target.value)} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-rose-500 font-mono" placeholder="Enter new leader email" />
                  </div>
              </div>
              <div className="pt-6 mt-6 border-t border-rose-100 flex justify-end">
                  <button 
                      onClick={async () => {
                          setIsSubmitting(true);
                          try {
                              let realLeaderId = club.leaderId;
                              if (adminTempLeaderEmail && adminTempLeaderEmail.trim() !== "") {
                                  const allUsers = await db.getAllUsers();
                                  const foundNewLeader = allUsers.find(u => u.email.toLowerCase() === adminTempLeaderEmail.toLowerCase().trim());
                                  if (foundNewLeader) {
                                      realLeaderId = foundNewLeader.id;
                                  } else {
                                      showToast("Leader email not found. Existing leader retained.", "error");
                                  }
                              }

                              const success = await db.updateClub(club.id, {
                                  name: adminTempName,
                                  description: adminTempDesc,
                                  imageUrl: adminTempLogo,
                                  logoUrl: adminTempLogo,
                                  leaderId: realLeaderId
                              });

                              if (success) {
                                  showToast("Club core parameters forcefully overridden.", "success");
                                  await loadAllData();
                              } else {
                                  showToast("Update failed.", "error");
                              }
                          } catch (e) {
                              showToast("Fatal error attempting to override club traits.", "error");
                          } finally {
                              setIsSubmitting(false);
                          }
                      }}
                      disabled={isSubmitting}
                      className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-300 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-md shadow-rose-200"
                  >
                      {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />} 
                      Force Update Parameters
                  </button>
              </div>
          </div>
      )}

      {/* Modals omitted for brevity as they are unchanged */}
      {showAnnounceModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white p-6 rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
                <h2 className="text-xl font-bold mb-4 font-display">Post Announcement</h2>
                <form onSubmit={handleCreateAnnouncement} className="space-y-4">
                    <input className="w-full p-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all" placeholder="Title" value={newAnnounce.title} onChange={e => setNewAnnounce({...newAnnounce, title: e.target.value})} required/>
                    <div>
                        <textarea className="w-full p-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-sans" rows={4} placeholder="Message to members... (Markdown supported)" value={newAnnounce.content} onChange={e => setNewAnnounce({...newAnnounce, content: e.target.value})} required/>
                        <p className="text-xs text-slate-400 mt-1 text-right">Markdown is supported</p>
                    </div>
                    
                    <div className="flex items-center gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <input 
                        type="checkbox" 
                        id="trans" 
                        checked={newAnnounce.autoTranslate} 
                        onChange={e => setNewAnnounce({...newAnnounce, autoTranslate: e.target.checked})} 
                        className="w-4 h-4 text-indigo-600 rounded"
                        />
                        <label htmlFor="trans" className="text-sm font-medium text-slate-700 flex items-center gap-2">
                            Auto-translate <Languages size={14} className="text-blue-500"/>
                        </label>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <button type="button" onClick={() => setShowAnnounceModal(false)} className="text-slate-600 px-4 py-2 hover:bg-slate-50 rounded-lg font-medium">Cancel</button>
                        <button 
                            type="submit" 
                            disabled={isSubmitting}
                            className="bg-indigo-600 text-white px-4 py-2 rounded-lg disabled:opacity-50 flex items-center gap-2 font-bold shadow-md shadow-indigo-200"
                        >
                            {isSubmitting && <Loader2 className="animate-spin" size={16} />}
                            {isSubmitting ? (newAnnounce.autoTranslate ? 'Translating...' : 'Post') : 'Post'}
                        </button>
                    </div>
                </form>
            </div>
          </div>
      )}
      
      {/* Project Modal also unchanged... */}
       {showProjModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white p-6 rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
                <h2 className="text-xl font-bold mb-4 font-display">Start New Project</h2>
                <form onSubmit={handleCreateProject} className="space-y-4">
                    <input className="w-full p-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all" placeholder="Project Name" value={newProj.title} onChange={e => setNewProj({...newProj, title: e.target.value})} required/>
                    <input className="w-full p-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all" placeholder="Logo URL (Optional)" value={newProj.logo} onChange={e => setNewProj({...newProj, logo: e.target.value})}/>
                    <textarea className="w-full p-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-sans" rows={3} placeholder="Description" value={newProj.desc} onChange={e => setNewProj({...newProj, desc: e.target.value})} required/>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Initial Status</label>
                        <div className="relative">
                            <select className="w-full p-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all appearance-none bg-white" value={newProj.status} onChange={e => setNewProj({...newProj, status: e.target.value as any})}>
                                <option value="In Progress">In Progress</option>
                                <option value="Done">Done</option>
                            </select>
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                        <button type="button" onClick={() => setShowProjModal(false)} className="text-slate-600 px-4 py-2 hover:bg-slate-50 rounded-lg font-medium">Cancel</button>
                        <button 
                            type="submit" 
                            disabled={isSubmitting}
                            className="bg-indigo-600 text-white px-4 py-2 rounded-lg disabled:opacity-50 flex items-center gap-2 font-bold shadow-md shadow-indigo-200"
                        >
                            {isSubmitting && <Loader2 className="animate-spin" size={16} />}
                            {isSubmitting ? 'Creating...' : 'Create'}
                        </button>
                    </div>
                </form>
            </div>
          </div>
      )}

      {/* Disciplinary Kick & Penalty Modal */}
      {kickingMember && (
         <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
             <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl w-full max-w-md border border-slate-200 dark:border-slate-700 shadow-2xl animate-in zoom-in-95 duration-200">
                 <div className="flex items-center gap-2 mb-2 text-rose-600 dark:text-rose-400">
                     <Skull size={22} className="animate-pulse" />
                     <h2 className="text-xl font-bold font-display">Disciplinary Expulsion</h2>
                 </div>
                 <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 font-medium">
                     You are initiating a punitive members kick of <span className="font-bold text-slate-705 dark:text-slate-200">{kickingMember.name}</span>. This acts under the server covenant and deducts merit points.
                 </p>
                 
                 <form onSubmit={handleKickSubmit} className="space-y-4">
                     {/* Broken Rule Dropdown */}
                     <div>
                         <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 font-mono">Broken Regulation / Clause</label>
                         <select 
                             className="w-full p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-sans text-xs text-slate-800 dark:text-slate-100"
                             value={expulsionBrokenRule} 
                             onChange={e => setExpulsionBrokenRule(e.target.value)}
                         >
                             {club.rules && club.rules.length > 0 ? (
                                 club.rules.map((rule, idx) => (
                                     <option key={idx} value={rule}>{rule}</option>
                                 ))
                             ) : (
                                 <option value="Violation of general student conduct and integrity protocols.">General Conduct Violation</option>
                             )}
                             <option value="Violation of Primordial Server Covenant Section I: Mutuality of collegiate standing.">Covenant Section I: Misconduct</option>
                             <option value="Violation of Primordial Server Covenant Section II: Systematic credentials spamming.">Covenant Section II: Botting/Spam</option>
                         </select>
                     </div>

                     {/* Report to Admin Toggle */}
                     <div className="p-3 bg-red-50 dark:bg-rose-950/20 rounded-xl border border-red-200 dark:border-rose-900/30 space-y-2">
                         <label className="flex items-start gap-2.5 cursor-pointer">
                             <input 
                                 type="checkbox" 
                                 checked={reportToAdmin}
                                 onChange={e => setReportToAdmin(e.target.checked)}
                                 className="mt-0.5 h-4 w-4 text-rose-600 rounded bg-slate-100 border-slate-300 focus:ring-rose-500 cursor-pointer"
                             />
                             <div className="select-none">
                                 <span className="text-xs font-bold text-rose-800 dark:text-rose-300">Report to Higher-Ups (Admin)</span>
                                 <p className="text-[10px] text-rose-600/80 dark:text-rose-400 mt-0.5">They will review the club rules, reason for kick, and may limit services or suspend this user.</p>
                             </div>
                         </label>
                     </div>

                     {/* Explanation text */}
                     <div>
                         <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 font-mono">Explanation & Proof</label>
                         <textarea 
                             className="w-full p-3 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-sans text-xs text-slate-800 dark:text-slate-100 resize-none"
                             rows={3} 
                             placeholder="Provide clear breach details. This is written directly into their historic audit profile..."
                             value={expulsionReason} 
                             onChange={e => setExpulsionReason(e.target.value)}
                             required
                         />
                     </div>

                     <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
                         <button 
                             type="button" 
                             onClick={() => setKickingMember(null)} 
                             className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg font-mono"
                         >
                             Dismiss Action
                         </button>
                         <button 
                             type="submit"
                             className="bg-red-650 hover:bg-red-700 hover:shadow-lg text-white px-5 py-2 rounded-xl font-bold text-xs shadow-md shadow-red-250 dark:shadow-none transition-all font-mono"
                         >
                             Enforce Expulsion & Penalty
                         </button>
                     </div>
                 </form>
             </div>
         </div>
      )}
    </div>
  );
};