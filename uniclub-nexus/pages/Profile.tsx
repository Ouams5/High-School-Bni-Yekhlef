import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/mockFirebase';
import { UserCircle, Mail, Award, BookOpen } from 'lucide-react';

export const Profile = () => {
  const { user } = useAuth();
  const [clubs, setClubs] = useState<any[]>([]);

  useEffect(() => {
    const loadData = async () => {
        if(user && user.joinedClubIds && user.joinedClubIds.length > 0) {
            const allClubs = await db.getClubs();
            setClubs(allClubs.filter(c => user.joinedClubIds.includes(c.id)));
        }
    };
    loadData();
  }, [user]);
  
  if (!user) return <div className="p-10 text-center text-slate-500">Please sign in to view profile.</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row items-center gap-8">
        <div className="w-32 h-32 bg-slate-100 rounded-full flex items-center justify-center overflow-hidden ring-4 ring-slate-50">
            {user.avatarUrl ? <img src={user.avatarUrl} alt="avatar" className="w-full h-full object-cover" /> : <UserCircle size={64} className="text-slate-300" />}
        </div>
        <div className="text-center md:text-left flex-1">
            <h1 className="text-3xl font-bold text-slate-900">{user.name}</h1>
            <div className="flex items-center justify-center md:justify-start gap-2 text-slate-500 mt-2">
                <Mail size={16}/>
                <span>{user.email}</span>
            </div>
            <div className="flex flex-wrap gap-2 mt-4 justify-center md:justify-start">
                <span className="bg-indigo-100 text-indigo-700 px-4 py-1 rounded-full text-sm font-bold uppercase tracking-wide">
                    {user.role.replace('_', ' ')}
                </span>
                {user.grade && (
                    <span className="bg-emerald-100 text-emerald-700 px-4 py-1 rounded-full text-sm font-bold">
                        Grade {user.grade}
                    </span>
                )}
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Award className="text-yellow-500"/> Membership Status</h2>
            <div className="space-y-4">
                <div className="flex justify-between border-b border-slate-50 pb-3">
                    <span className="text-slate-500">Account Type</span>
                    <span className="font-medium">Student</span>
                </div>
                <div className="flex justify-between border-b border-slate-50 pb-3">
                    <span className="text-slate-500">Clubs Joined</span>
                    <span className="font-medium">{user.joinedClubIds?.length || 0}</span>
                </div>
                 <div className="flex justify-between">
                    <span className="text-slate-500">Club Leader</span>
                    <span className="font-medium">{user.leadingClubId ? 'Yes' : 'No'}</span>
                </div>
            </div>
        </div>

        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
             <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><BookOpen className="text-blue-500"/> My Clubs</h2>
             {clubs.length > 0 ? (
                 <div className="space-y-3">
                     {clubs.map(c => (
                         <div key={c.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                             <div className="w-10 h-10 bg-slate-200 rounded-md overflow-hidden">
                                 <img src={c.imageUrl} className="w-full h-full object-cover"/>
                             </div>
                             <span className="font-medium text-slate-700">{c.name}</span>
                         </div>
                     ))}
                 </div>
             ) : (
                 <p className="text-slate-400 italic">Not a member of any club yet.</p>
             )}
        </div>
      </div>
    </div>
  );
};