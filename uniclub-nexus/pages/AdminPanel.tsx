import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/mockFirebase';
import { User, UserRole } from '../types';
import { ShieldAlert, RefreshCw } from 'lucide-react';
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

  return (
    <div className="space-y-8">
      <div className="bg-slate-900 text-white p-8 rounded-2xl shadow-lg">
        <h1 className="text-3xl font-bold flex items-center gap-3">
            <ShieldAlert className="text-red-400" /> Admin Control Center
        </h1>
        <p className="text-slate-400 mt-2">Manage system users and global settings.</p>
      </div>

      <div className="bg-white rounded-xl shadow border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
            <h2 className="text-xl font-bold text-slate-800">User Management</h2>
            <button onClick={loadUsers} className="text-slate-400 hover:text-indigo-600"><RefreshCw size={18}/></button>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                    <tr>
                        <th className="p-4">User</th>
                        <th className="p-4">Current Role</th>
                        <th className="p-4">Actions (Owner Only)</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {users.map(u => (
                        <tr key={u.id} className="hover:bg-slate-50">
                            <td className="p-4">
                                <div className="font-bold text-slate-800">{u.name}</div>
                                <div className="text-xs text-slate-500">{u.email}</div>
                            </td>
                            <td className="p-4">
                                <span className={`text-xs px-2 py-1 rounded font-bold ${
                                    u.role === 'OWNER' ? 'bg-red-100 text-red-700' :
                                    u.role === 'ADMIN' ? 'bg-blue-100 text-blue-700' :
                                    'bg-slate-100 text-slate-700'
                                }`}>
                                    {u.role}
                                </span>
                            </td>
                            <td className="p-4">
                                <select 
                                    value={u.role}
                                    onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                                    disabled={user?.role !== UserRole.OWNER || u.id === user.id}
                                    className="border border-slate-300 rounded px-2 py-1 text-sm disabled:opacity-50"
                                >
                                    <option value={UserRole.MEMBER}>MEMBER</option>
                                    <option value={UserRole.CLUB_LEADER}>CLUB LEADER</option>
                                    <option value={UserRole.ADMIN}>ADMIN</option>
                                    <option value={UserRole.OWNER}>OWNER</option>
                                </select>
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