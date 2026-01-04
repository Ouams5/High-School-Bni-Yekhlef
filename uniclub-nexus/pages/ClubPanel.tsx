import React, { useEffect, useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/mockFirebase';
import { Club, User } from '../types';
import { UserMinus, Users, Settings } from 'lucide-react';

export const ClubPanel = () => {
  const { clubId } = useParams<{ clubId: string }>();
  const { canManageClub, user } = useAuth();
  const [club, setClub] = useState<Club | null>(null);
  const [members, setMembers] = useState<User[]>([]);

  useEffect(() => {
    const loadClubData = async () => {
        if (clubId) {
            const allClubs = await db.getClubs();
            const foundClub = allClubs.find(c => c.id === clubId);
            setClub(foundClub || null);
            if (foundClub && foundClub.memberIds) {
                const allUsers = await db.getAllUsers();
                setMembers(allUsers.filter(u => foundClub.memberIds.includes(u.id)));
            }
        }
    };
    loadClubData();
  }, [clubId]);

  if (!clubId || !canManageClub(clubId)) {
    return <div className="text-center p-10 text-red-500">Access Denied: You do not have permission to manage this club.</div>;
  }

  if (!club) return <div>Loading...</div>;

  const handleKick = async (memberId: string) => {
    if (user && await db.kickMember(user.id, club.id, memberId)) {
        setMembers(prev => prev.filter(m => m.id !== memberId));
    } else {
        alert("Failed to kick member. Ensure you are the leader.");
    }
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
                <p className="text-slate-500">Manage members and settings</p>
            </div>
        </div>
      </div>

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
                            {member.id !== user?.id && (
                                <button 
                                    onClick={() => handleKick(member.id)}
                                    className="text-red-500 hover:text-red-700 text-sm font-medium flex items-center justify-end gap-1 w-full"
                                >
                                    <UserMinus size={16}/> Kick
                                </button>
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
    </div>
  );
};