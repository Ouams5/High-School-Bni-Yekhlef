import React, { useEffect, useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/mockFirebase';
import { Club, User, Project, Announcement, UserRole } from '../types';
import { UserMinus, Users, Settings, Megaphone, FolderGit2, Plus, CheckCircle, Clock, Trash2 } from 'lucide-react';

export const ClubPanel = () => {
  const { clubId } = useParams<{ clubId: string }>();
  const { canManageClub, user } = useAuth();
  const [club, setClub] = useState<Club | null>(null);
  const [members, setMembers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  
  const [activeTab, setActiveTab] = useState<'members' | 'announcements' | 'projects'>('members');
  const [showProjModal, setShowProjModal] = useState(false);
  const [showAnnounceModal, setShowAnnounceModal] = useState(false);

  // Forms
  const [newProj, setNewProj] = useState({ title: '', desc: '', logo: '', status: 'In Progress' as const });
  const [newAnnounce, setNewAnnounce] = useState({ title: '', content: '' });

  useEffect(() => {
    loadAllData();
  }, [clubId]);

  const loadAllData = async () => {
    if (clubId) {
        const allClubs = await db.getClubs();
        const foundClub = allClubs.find(c => c.id === clubId);
        setClub(foundClub || null);
        
        if (foundClub && foundClub.memberIds) {
            const allUsers = await db.getAllUsers();
            setMembers(allUsers.filter(u => foundClub.memberIds.includes(u.id)));
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
    // SECURITY: Prevent kicking Owners
    if (member.role === UserRole.OWNER) {
        alert("You cannot kick an Owner from the club.");
        return;
    }

    if (user && await db.kickMember(user.id, club.id, member.id)) {
        setMembers(prev => prev.filter(m => m.id !== member.id));
    } else {
        alert("Failed to kick member. Ensure you are the leader.");
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
      e.preventDefault();
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
      loadAllData();
  };

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
      e.preventDefault();
      await db.addAnnouncement({
          id: Date.now().toString(),
          title: newAnnounce.title,
          content: newAnnounce.content,
          date: new Date().toISOString(),
          isImportant: true,
          authorName: user?.name || 'Club Leader',
          clubId: club.id,
          clubName: club.name // IMPORTANT: Added to display in main feed
      });
      setShowAnnounceModal(false);
      setNewAnnounce({ title: '', content: '' });
      loadAllData();
  };

  const handleDeleteProject = async (id: string) => {
      if(confirm("Delete this project?")) {
          await db.deleteProject(id);
          loadAllData();
      }
  };

  const handleDeleteAnnouncement = async (id: string) => {
      if(confirm("Delete this announcement?")) {
          await db.deleteAnnouncement(id);
          loadAllData();
      }
  };

  const toggleProjectStatus = async (p: Project) => {
      const newStatus = p.status === 'Done' ? 'In Progress' : 'Done';
      await db.updateProject(p.id, { status: newStatus });
      loadAllData();
  };

  return (
    <div className="space-y-8">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-purple-100 rounded-lg">
                <Settings className="text-purple-600 w-8 h-8" />
            </div>
            <div>
                <h1 className="text-3xl font-bold text-slate-800">{club.name} Dashboard</h1>
                <p className="text-slate-500">Manage members, projects, and announcements</p>
            </div>
        </div>
        
        {/* Tabs */}
        <div className="flex gap-4 mt-6 border-b border-slate-100">
            <button onClick={() => setActiveTab('members')} className={`pb-3 px-2 font-medium transition-colors ${activeTab === 'members' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500'}`}>Members</button>
            <button onClick={() => setActiveTab('announcements')} className={`pb-3 px-2 font-medium transition-colors ${activeTab === 'announcements' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500'}`}>Announcements</button>
            <button onClick={() => setActiveTab('projects')} className={`pb-3 px-2 font-medium transition-colors ${activeTab === 'projects' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500'}`}>Projects</button>
        </div>
      </div>

      {activeTab === 'members' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h2 className="text-xl font-bold flex items-center gap-2"><Users size={20}/> Members Directory</h2>
                <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-bold">{members.length} Active</span>
            </div>
            <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                    <tr>
                        <th className="p-4">Name</th>
                        <th className="p-4">Email</th>
                        <th className="p-4">Role</th>
                        <th className="p-4 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {members.map(member => (
                        <tr key={member.id} className="hover:bg-slate-50">
                            <td className="p-4 font-medium text-slate-800">{member.name}</td>
                            <td className="p-4 text-slate-500">{member.email}</td>
                            <td className="p-4">
                                <span className="text-xs bg-slate-200 px-2 py-1 rounded text-slate-600">{member.role}</span>
                            </td>
                            <td className="p-4 text-right">
                                {member.id !== user?.id && member.role !== UserRole.OWNER && (
                                    <button 
                                        onClick={() => handleKick(member)}
                                        className="text-red-500 hover:text-red-700 text-sm font-medium flex items-center justify-end gap-1 w-full"
                                    >
                                        <UserMinus size={16}/> Kick
                                    </button>
                                )}
                                {member.role === UserRole.OWNER && (
                                    <span className="text-xs text-slate-400 italic">Protected</span>
                                )}
                            </td>
                        </tr>
                    ))}
                    {members.length === 0 && (
                        <tr><td colSpan={4} className="p-8 text-center text-slate-400">No members yet.</td></tr>
                    )}
                </tbody>
            </table>
        </div>
      )}

      {activeTab === 'announcements' && (
          <div className="space-y-4">
             <div className="flex justify-between items-center">
                 <h2 className="text-xl font-bold text-slate-800">Club Announcements</h2>
                 <button onClick={() => setShowAnnounceModal(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700">
                     <Plus size={16} /> New Post
                 </button>
             </div>
             {announcements.length === 0 ? <p className="text-slate-500 text-center py-10 bg-white rounded-xl">No announcements posted.</p> : announcements.map(a => (
                 <div key={a.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative group">
                     <button 
                        onClick={() => handleDeleteAnnouncement(a.id)} 
                        className="absolute top-4 right-4 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 p-2 bg-white/50 hover:bg-white rounded-full transition-all"
                        title="Delete Announcement"
                     >
                        <Trash2 size={18}/>
                     </button>
                     <div className="flex justify-between mb-2 pr-8">
                         <h3 className="font-bold text-lg">{a.title}</h3>
                         <span className="text-xs text-slate-400">{new Date(a.date).toLocaleDateString()}</span>
                     </div>
                     <p className="text-slate-600">{a.content}</p>
                 </div>
             ))}
          </div>
      )}

      {activeTab === 'projects' && (
           <div className="space-y-4">
               <div className="flex justify-between items-center">
                 <h2 className="text-xl font-bold text-slate-800">Club Projects</h2>
                 <button onClick={() => setShowProjModal(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700">
                     <Plus size={16} /> New Project
                 </button>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {projects.length === 0 ? <p className="col-span-2 text-slate-500 text-center py-10 bg-white rounded-xl">No projects started.</p> : projects.map(p => (
                    <div key={p.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4 relative group">
                        <button 
                            onClick={() => handleDeleteProject(p.id)} 
                            className="absolute top-2 right-2 text-white bg-black/50 hover:bg-red-500 rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-all z-10"
                            title="Delete Project"
                        >
                            <Trash2 size={14}/>
                        </button>
                        <img src={p.imageUrl} className="w-16 h-16 rounded-lg object-cover bg-slate-100" />
                        <div className="flex-1">
                            <h3 className="font-bold text-slate-800">{p.title}</h3>
                            <p className="text-sm text-slate-500 mb-2">{p.description}</p>
                            <button 
                                onClick={() => toggleProjectStatus(p)}
                                className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 w-fit transition-colors ${
                                    p.status === 'Done' ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
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

      {/* Modals */}
      {showAnnounceModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white p-6 rounded-2xl w-full max-w-md">
                <h2 className="text-xl font-bold mb-4">Post Announcement</h2>
                <form onSubmit={handleCreateAnnouncement} className="space-y-4">
                    <input className="w-full p-2 border rounded" placeholder="Title" value={newAnnounce.title} onChange={e => setNewAnnounce({...newAnnounce, title: e.target.value})} required/>
                    <textarea className="w-full p-2 border rounded" rows={4} placeholder="Message to members..." value={newAnnounce.content} onChange={e => setNewAnnounce({...newAnnounce, content: e.target.value})} required/>
                    <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => setShowAnnounceModal(false)} className="text-slate-500 px-4 py-2">Cancel</button>
                        <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-lg">Post</button>
                    </div>
                </form>
            </div>
          </div>
      )}

      {showProjModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white p-6 rounded-2xl w-full max-w-md">
                <h2 className="text-xl font-bold mb-4">Start New Project</h2>
                <form onSubmit={handleCreateProject} className="space-y-4">
                    <input className="w-full p-2 border rounded" placeholder="Project Name" value={newProj.title} onChange={e => setNewProj({...newProj, title: e.target.value})} required/>
                    <input className="w-full p-2 border rounded" placeholder="Logo URL (Optional)" value={newProj.logo} onChange={e => setNewProj({...newProj, logo: e.target.value})}/>
                    <textarea className="w-full p-2 border rounded" rows={3} placeholder="Description" value={newProj.desc} onChange={e => setNewProj({...newProj, desc: e.target.value})} required/>
                    <div>
                        <label className="block text-sm text-slate-700 mb-1">Initial Status</label>
                        <select className="w-full p-2 border rounded" value={newProj.status} onChange={e => setNewProj({...newProj, status: e.target.value as any})}>
                            <option value="In Progress">In Progress</option>
                            <option value="Done">Done</option>
                        </select>
                    </div>
                    <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => setShowProjModal(false)} className="text-slate-500 px-4 py-2">Cancel</button>
                        <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-lg">Create</button>
                    </div>
                </form>
            </div>
          </div>
      )}

    </div>
  );
};