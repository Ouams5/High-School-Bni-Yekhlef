import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { db } from '../services/mockFirebase';
import { User, UserRole } from '../types';
import { ShieldAlert, RefreshCw, UserMinus, Code2, Trash2, CheckSquare, Square, Globe } from 'lucide-react';
import { Navigate } from 'react-router-dom';

export const AdminPanel = () => {
  const { canAccessAdminPanel, user, refreshUser } = useAuth();
  const { t } = useLanguage();
  const [users, setUsers] = useState<User[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkRole, setBulkRole] = useState<UserRole | ''>('');
  
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

  // --- Helpers ---
  const canManageUser = (targetUser: User): boolean => {
      if (!user) return false;
      if (user.role === UserRole.OWNER || user.role === UserRole.DEV) return true;
      // Admins can manage Members and Club Leaders, but not other Admins/Owners/Devs
      if (user.role === UserRole.ADMIN) {
          return targetUser.role === UserRole.MEMBER || targetUser.role === UserRole.CLUB_LEADER;
      }
      return false;
  };

  // --- Handlers ---
  const handleRoleChange = async (targetId: string, newRole: UserRole) => {
    if (!user) return;
    const targetUser = users.find(u => u.id === targetId);
    if (!targetUser || !canManageUser(targetUser)) {
        alert("Permission Denied.");
        return;
    }

    const success = await db.updateUserRole(user.id, targetId, newRole);
    if (success) {
        loadUsers();
        refreshUser();
    }
  };

  const handleKickUser = async (targetUser: User) => {
    if (!user || !canManageUser(targetUser)) {
        alert("Permission Denied.");
        return;
    }
    
    if (confirm(`Are you sure you want to kick ${targetUser.name}? This will remove their account access immediately.`)) {
        await db.deleteUser(targetUser.id);
        loadUsers();
    }
  };

  // --- Bulk Actions ---
  const toggleSelectAll = () => {
      if (selectedIds.size === users.length) {
          setSelectedIds(new Set());
      } else {
          // Do not select self
          const allIds = users.filter(u => u.id !== user?.id).map(u => u.id);
          setSelectedIds(new Set(allIds));
      }
  };

  const toggleSelect = (id: string) => {
      if (id === user?.id) return; // Cannot select self
      const newSet = new Set(selectedIds);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      setSelectedIds(newSet);
  };

  const handleBulkDelete = async () => {
      if (selectedIds.size === 0) return;
      if (confirm(`Are you sure you want to delete ${selectedIds.size} users? This is irreversible.`)) {
          // Filter out users that the current admin cannot manage
          const idsToDelete = (Array.from(selectedIds) as string[]).filter(id => {
              const u = users.find(user => user.id === id);
              return u && canManageUser(u);
          });

          if (idsToDelete.length !== selectedIds.size) {
              alert(`Some users were skipped because you don't have permission to manage them.`);
          }

          if (idsToDelete.length > 0) {
            await db.bulkDeleteUsers(idsToDelete);
            setSelectedIds(new Set());
            loadUsers();
          }
      }
  };

  const handleBulkRoleUpdate = async () => {
      if (!bulkRole || selectedIds.size === 0) return;
      
      const idsToUpdate = (Array.from(selectedIds) as string[]).filter(id => {
          const u = users.find(user => user.id === id);
          return u && canManageUser(u);
      });

      if (idsToUpdate.length > 0) {
          await db.bulkUpdateUserRole(idsToUpdate, bulkRole);
          setSelectedIds(new Set());
          setBulkRole('');
          loadUsers();
      }
  };

  return (
    <div className="space-y-6 relative pb-20">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-800">{t('adminPanel')}</h1>
        <div className="flex gap-2">
            <button onClick={loadUsers} className="bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-slate-50">
                <RefreshCw size={18} /> {t('refresh')}
            </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center gap-4">
            <h2 className="text-lg font-bold text-slate-700">{t('userManagement')}</h2>
            <span className="text-xs text-slate-500 bg-slate-200 px-2 py-1 rounded-full">{users.length} {t('user')}s</span>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead className="bg-white text-slate-500 text-xs uppercase border-b border-slate-100">
                    <tr>
                        <th className="p-4 w-12 text-center">
                            <button onClick={toggleSelectAll} className="text-slate-400 hover:text-blue-600">
                                {selectedIds.size > 0 && selectedIds.size === users.length ? <CheckSquare size={20}/> : <Square size={20}/>}
                            </button>
                        </th>
                        <th className="p-4">{t('user')}</th>
                        <th className="p-4">{t('grade')}</th>
                        <th className="p-4">{t('role')}</th>
                        <th className="p-4">{t('lastLoginIp')}</th>
                        <th className="p-4 text-right">{t('actions')}</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {users.map(u => {
                        const isSelf = u.id === user?.id;
                        const isSelectable = !isSelf;
                        const hasPermission = canManageUser(u);

                        return (
                            <tr key={u.id} className={`hover:bg-slate-50 transition-colors ${selectedIds.has(u.id) ? 'bg-blue-50' : ''}`}>
                                <td className="p-4 text-center">
                                    <button 
                                        onClick={() => toggleSelect(u.id)} 
                                        disabled={!isSelectable}
                                        className={`${selectedIds.has(u.id) ? 'text-blue-600' : 'text-slate-300'} ${isSelectable ? 'hover:text-blue-500' : 'opacity-20 cursor-not-allowed'}`}
                                    >
                                        {selectedIds.has(u.id) ? <CheckSquare size={20}/> : <Square size={20}/>}
                                    </button>
                                </td>
                                <td className="p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden">
                                            <img src={u.avatarUrl} className="w-full h-full object-cover"/>
                                        </div>
                                        <div>
                                            <div className="font-bold text-slate-800 flex items-center gap-2">
                                                {u.name}
                                                {u.role === UserRole.DEV && (
                                                    <span className="bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-1">
                                                        <Code2 size={10} /> DEV
                                                    </span>
                                                )}
                                                {u.role === UserRole.OWNER && (
                                                    <span className="bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded text-[10px] font-bold">OWNER</span>
                                                )}
                                            </div>
                                            <div className="text-xs text-slate-500">{u.email}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-4 text-sm text-slate-600">{u.grade || 'N/A'}</td>
                                <td className="p-4">
                                    <select 
                                        value={u.role}
                                        onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                                        className={`p-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500 bg-white ${!hasPermission ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        disabled={!hasPermission}
                                    >
                                        <option value={UserRole.MEMBER}>Member</option>
                                        <option value={UserRole.CLUB_LEADER}>Club Leader</option>
                                        <option value={UserRole.ADMIN}>Admin</option>
                                        <option value={UserRole.DEV}>Dev Team</option>
                                        {user?.role === UserRole.OWNER && <option value={UserRole.OWNER}>Owner</option>}
                                    </select>
                                </td>
                                <td className="p-4">
                                    <div className="text-xs text-slate-500 flex flex-col gap-1">
                                        <span className="flex items-center gap-1"><Globe size={12}/> {u.ip || 'Unknown IP'}</span>
                                        <span>{u.lastLogin ? new Date(u.lastLogin).toLocaleDateString() : 'Never'}</span>
                                    </div>
                                </td>
                                <td className="p-4 text-right">
                                    {hasPermission && (
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
                        );
                    })}
                </tbody>
            </table>
        </div>
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-800 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-6 z-50 animate-in slide-in-from-bottom-5">
              <span className="font-bold">{selectedIds.size} {t('selected')}</span>
              
              <div className="h-6 w-px bg-slate-600"></div>

              <div className="flex items-center gap-2">
                  <select 
                    value={bulkRole} 
                    onChange={e => setBulkRole(e.target.value as UserRole)}
                    className="bg-slate-700 text-white border-none rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                      <option value="">{t('setRole')}</option>
                      <option value={UserRole.MEMBER}>Member</option>
                      <option value={UserRole.CLUB_LEADER}>Club Leader</option>
                      <option value={UserRole.ADMIN}>Admin</option>
                      <option value={UserRole.DEV}>Dev Team</option>
                  </select>
                  <button 
                    onClick={handleBulkRoleUpdate}
                    disabled={!bulkRole}
                    className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors"
                  >
                      {t('apply')}
                  </button>
              </div>

              <div className="h-6 w-px bg-slate-600"></div>

              <button 
                onClick={handleBulkDelete}
                className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors"
              >
                  <Trash2 size={16}/> {t('deleteAll')}
              </button>
              
              <button 
                onClick={() => setSelectedIds(new Set())}
                className="ml-2 text-slate-400 hover:text-white"
              >
                  {t('cancel')}
              </button>
          </div>
      )}
    </div>
  );
};