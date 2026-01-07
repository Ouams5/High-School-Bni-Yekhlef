import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/mockFirebase';
import { User, UserRole } from '../types';
import { ShieldAlert, RefreshCw, UserMinus, Code2 } from 'lucide-react';
import { Navigate } from 'react-router-dom';

export const AdminPanel = () => {
  const { canAccessAdminPanel, user, refreshUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  
  const loadUsers = async () => {
      const data = await db.getAllUsers();
      setUsers(data);
  };

  useEffect(() => {
    loadUsers();
  }, []);

  if (!canAccessAdminPanel) {
    return <Navigate to="/" />;
  }

  const handleRoleChange = async (targetId: string, newRole: UserRole) => {
    if (!user) return;
    const success = await db.updateUserRole(user.id, targetId, newRole);
    if (success) {
        loadUsers();
        refreshUser();
    } else {
        alert("Permission Denied: Only Owners can change roles.");
    }
  };

  const handleKickUser = async (targetUser: User) => {
    if (!user || user.role !== UserRole.OWNER) {
        alert("Permission Denied: Only Owners can kick users.");
        return;
    }
    
    if (confirm(`Are you sure you want to kick ${targetUser.name}? This will remove their account access immediately.`)) {
        await db.deleteUser(targetUser.id);
        loadUsers();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-800">Admin Panel</h1>
        <div className="flex gap-2">
            <button onClick={loadUsers} className="bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-slate-50">
                <RefreshCw size={18} /> Refresh
            </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50">
            <h2 className="text-lg font-bold text-slate-700">User Management</h2>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-left">
                <thead className="bg-white text-slate-500 text-xs uppercase border-b border-slate-100">
                    <tr>
                        <th className="p-4">User</th>
                        <th className="p-4">Grade</th>
                        <th className="p-4">Role</th>
                        <th className="p-4 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {users.map(u => (
                        <tr key={u.id} className="hover:bg-slate-50">
                            <td className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden">
                                        <img src={u.avatarUrl} className="w-full h-full object-cover"/>
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-800">{u.name}</div>
                                        <div className="text-xs text-slate-500">{u.email}</div>
                                    </div>
                                    {u.role === UserRole.DEV && (
                                        <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-xs font-bold flex items-center gap-1">
                                            <Code2 size={10} /> DEV
                                        </span>
                                    )}
                                </div>
                            </td>
                            <td className="p-4 text-sm text-slate-600">{u.grade || 'N/A'}</td>
                            <td className="p-4">
                                <select 
                                    value={u.role}
                                    onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                                    className="p-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500 bg-white"
                                    disabled={user?.role !== UserRole.OWNER && user?.role !== UserRole.DEV}
                                >
                                    <option value={UserRole.MEMBER}>Member</option>
                                    <option value={UserRole.CLUB_LEADER}>Club Leader</option>
                                    <option value={UserRole.ADMIN}>Admin</option>
                                    <option value={UserRole.DEV}>Dev Team</option>
                                    <option value={UserRole.OWNER}>Owner</option>
                                </select>
                            </td>
                            <td className="p-4 text-right">
                                {(user?.role === UserRole.OWNER || user?.role === UserRole.DEV) && u.role !== UserRole.OWNER && u.id !== user?.id && (
                                    <button 
                                        onClick={() => handleKickUser(u)}
                                        className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"
                                        title="Kick User"
                                    >
                                        <UserMinus size={18} />
                                    </button>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};