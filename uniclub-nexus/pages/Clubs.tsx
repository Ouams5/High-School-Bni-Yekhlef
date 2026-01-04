import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/mockFirebase';
import { Club } from '../types';
import { Plus, Trash2, LogIn, LogOut } from 'lucide-react';

export const Clubs = () => {
  const { canCreateClub, canDeleteClub, user, refreshUser } = useAuth();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [newClubName, setNewClubName] = useState('');
  const [newClubDesc, setNewClubDesc] = useState('');
  const [newClubLogo, setNewClubLogo] = useState('');
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
    setLoading(true);
    await db.addClub({
      name: newClubName,
      description: newClubDesc,
      leaderId: 'pending', 
      memberIds: [],
      imageUrl: newClubLogo || `https://ui-avatars.com/api/?name=${newClubName}&background=random&size=400`
    });
    setLoading(false);
    setShowModal(false);
    setNewClubName('');
    setNewClubDesc('');
    setNewClubLogo('');
    loadClubs();
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure? This action is irreversible.")) {
        await db.deleteClub(id);
        loadClubs();
    }
  };

  const handleJoin = async (clubId: string) => {
    if(user) {
        await db.joinClub(user.id, clubId);
        await refreshUser();
        loadClubs();
    }
  }

  const handleLeave = async (clubId: string) => {
    if(user) {
        await db.leaveClub(user.id, clubId);
        await refreshUser();
        loadClubs();
    }
  }

  return (
    <div className="space-y-6">
       <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-800">Student Clubs</h1>
        {canCreateClub && (
          <button 
            onClick={() => setShowModal(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700 transition-colors"
          >
            <Plus size={18} /> Register Club
          </button>
        )}
      </div>

      {clubs.length === 0 ? (
          <div className="text-center py-20 text-slate-400">No clubs created yet.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {clubs.map(club => {
                const isMember = user?.joinedClubIds?.includes(club.id);
                return (
                    <div key={club.id} className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-200 flex flex-col">
                        <div className="h-48 overflow-hidden bg-slate-200">
                            <img src={club.imageUrl} alt={club.name} className="w-full h-full object-cover" />
                        </div>
                        <div className="p-6 flex-1 flex flex-col">
                            <h3 className="text-xl font-bold text-slate-900 mb-2">{club.name}</h3>
                            <p className="text-slate-500 mb-4 flex-1 line-clamp-3">{club.description}</p>
                            <div className="flex items-center justify-between mt-auto">
                                <span className="text-xs font-medium text-slate-400">{club.memberIds?.length || 0} Members</span>
                                
                                <div className="flex gap-2">
                                    {isMember ? (
                                        <button onClick={() => handleLeave(club.id)} className="flex items-center gap-1 text-sm bg-red-50 text-red-600 hover:bg-red-100 px-3 py-1 rounded-lg">
                                            <LogOut size={14}/> Leave
                                        </button>
                                    ) : (
                                        <button onClick={() => handleJoin(club.id)} className="text-sm bg-indigo-50 text-indigo-600 hover:bg-indigo-100 px-3 py-1 rounded-lg">
                                            Join
                                        </button>
                                    )}

                                    {canDeleteClub && (
                                        <button onClick={() => handleDelete(club.id)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg">
                                            <Trash2 size={16} />
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
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <h2 className="text-2xl font-bold mb-4">Register New Club</h2>
            <form onSubmit={handleCreate} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Club Name</label>
                    <input className="w-full p-2 border rounded-lg" value={newClubName} onChange={e => setNewClubName(e.target.value)} required />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Logo URL</label>
                    <input className="w-full p-2 border rounded-lg" value={newClubLogo} onChange={e => setNewClubLogo(e.target.value)} placeholder="https://..." />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                    <textarea className="w-full p-2 border rounded-lg" rows={4} value={newClubDesc} onChange={e => setNewClubDesc(e.target.value)} required />
                </div>
                
                <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-slate-500">Cancel</button>
                    <button type="submit" disabled={loading} className="px-4 py-2 bg-indigo-600 text-white rounded-lg disabled:opacity-50">Create</button>
                </div>
            </form>
          </div>
          </div>
      )}
    </div>
  );
};