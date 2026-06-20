import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useUI } from '../context/UIContext';
import { db } from '../services/mockFirebase';
import { User, UserRole, Badge, BadgeType } from '../types';
import { 
    ShieldAlert, RefreshCw, UserMinus, Code2, Trash2, CheckSquare, Square, Globe, 
    Database, Search, Key, Eye, EyeOff, Terminal, X, Award, Plus, LayoutList, UploadCloud, Loader2, Sparkles,
    GraduationCap, ArrowRight, Check, XCircle
} from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { DocumentScanner } from '../components/DocumentScanner';

export const AdminPanel = () => {
  const { canAccessAdminPanel, user, refreshUser, isOwner, isDev } = useAuth();
  const { t } = useLanguage();
  const { showToast, confirm } = useUI();
  
  // Tab State
  const [activeTab, setActiveTab] = useState<'users' | 'inspector' | 'scan-import' | 'promotion-reports'>('users');

  // Shared Data
  const [users, setUsers] = useState<User[]>([]);
  const [adminReports, setAdminReports] = useState<any[]>([]);

  // --- User Management State ---
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkRole, setBulkRole] = useState<UserRole | ''>('');

  // --- Inspector/Debug State ---
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [newDebugPass, setNewDebugPass] = useState('');

  // --- Admin Discipline States ---
  const [showDisciplineModal, setShowDisciplineModal] = useState(false);
  const [disciplineUser, setDisciplineUser] = useState<User | null>(null);
  const [deductAmount, setDeductAmount] = useState<number>(10);
  const [deductReason, setDeductReason] = useState<string>('');
  const [suspendHours, setSuspendHours] = useState<string>('48');
  const [suspendReason, setSuspendReason] = useState<string>('');
  const [limitServices, setLimitServices] = useState<string[]>([]);
  const [limitHours, setLimitHours] = useState<string>('48');
  const [limitReason, setLimitReason] = useState<string>('');
  const [disciplineTab, setDisciplineTab] = useState<'standing' | 'deduction' | 'restrictions'>('standing');
  
  // Bulk Import State
  const [isSeeding, setIsSeeding] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Database Resync States
  const [isResyncing, setIsResyncing] = useState(false);
  const [resyncStatus, setResyncStatus] = useState<{ success: boolean; usersCount: number; clubsCount: number; error?: string } | null>(null);

  // Badge State
  const [newBadgeType, setNewBadgeType] = useState<BadgeType>('MENTIONED');
  const [newBadgeName, setNewBadgeName] = useState('');
  const [newBadgeImage, setNewBadgeImage] = useState('');

  // --- Academic Year Promotion & Refresh State ---
  const [promotionPassedMap, setPromotionPassedMap] = useState<Record<string, boolean>>({});
  const [promotionFilterGrade, setPromotionFilterGrade] = useState<string>('');
  const [promotionSearch, setPromotionSearch] = useState<string>('');
  const [isPromoting, setIsPromoting] = useState<boolean>(false);
  const [maintenanceSubTab, setMaintenanceSubTab] = useState<'promotion' | 'reports'>('promotion');
  
  const loadUsers = async () => {
      const data = await db.getAllUsers();
      setUsers(data);
      try {
          const reportsData = await db.getAdminReports();
          setAdminReports(reportsData);
      } catch(e) {}
  };

  const handleDatabaseResync = async () => {
      const confirmed = await confirm({
          title: "Verify Core Database Resync",
          message: "You are about to force a complete, non-reversible database and profile structure realignment. Existing users' and clubs' structures will be safely standardized to the newest platform constraints, mapping points, limits, and rules. Do you wish to continue?",
          confirmText: "Resync Database",
          type: "alert"
      });
      if (!confirmed) return;

      setIsResyncing(true);
      setResyncStatus(null);
      try {
          const res = await db.resyncEntireDatabase();
          setResyncStatus(res);
          if (res.success) {
              showToast("Database structural resync completed successfully!", "success");
              await loadUsers();
          } else {
              showToast(res.error || "Database resync failed.", "error");
          }
      } catch (err: any) {
          showToast(err.message || "An exception occurred.", "error");
          setResyncStatus({ success: false, usersCount: 0, clubsCount: 0, error: err.message });
      } finally {
          setIsResyncing(false);
      }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // Initialize all users promotion statuses to true (Passed) by default
  useEffect(() => {
    if (users.length > 0) {
      setPromotionPassedMap(prev => {
        const next = { ...prev };
        let updated = false;
        users.forEach(u => {
          if (next[u.id] === undefined) {
            next[u.id] = true; // Default: Succeeded
            updated = true;
          }
        });
        return updated ? next : prev;
      });
    }
  }, [users]);

  const handleApplyPromotions = async () => {
    const studentsToPromote = users.filter(u => {
      const g = (u.grade || '').trim().toLowerCase();
      // Only include actual students/members (exclude devs/admins unless they have a grade, but let's filter purely based on grade existence)
      return u.grade !== undefined && u.grade !== '';
    });

    if (studentsToPromote.length === 0) {
      showToast("No students with registered grades found to promote.", "warning");
      return;
    }

    const totalPassed = studentsToPromote.filter(u => promotionPassedMap[u.id] !== false).length;
    const totalFailed = studentsToPromote.length - totalPassed;

    const confirmed = await confirm({
      title: "Confirm Year Promotion & Reset",
      message: `Are you sure you want to run the promotion process for ${studentsToPromote.length} students?\n\n- ${totalPassed} Succeeded (Will advance grade level & reset data)\n- ${totalFailed} Failed (Will stay in current grade & reset data)\n\nAll selected students will leave all their clubs and clear custom leader badges. This is non-reversible.`,
      confirmText: "Promote & Reset",
      type: "alert"
    });

    if (!confirmed) return;

    setIsPromoting(true);
    try {
      const payload = studentsToPromote.map(u => ({
        userId: u.id,
        passed: promotionPassedMap[u.id] !== false
      }));

      const res = await db.bulkPromotionRefresh(payload);
      if (res.success > 0) {
        showToast(`Successfully promoted and refreshed data for ${res.success} accounts!`, "success");
        loadUsers();
      }
      if (res.errors && res.errors.length > 0) {
        showToast(`Warning: ${res.errors.length} accounts had update errors.`, "warning");
      }
    } catch (e: any) {
      console.error(e);
      showToast(e.message || "An error occurred during bulk promotion.", "error");
    } finally {
      setIsPromoting(false);
    }
  };

  // Update Badge Defaults
  useEffect(() => {
        switch(newBadgeType) {
            case 'OWNER':
                setNewBadgeName('System Owner');
                setNewBadgeImage('https://ui-avatars.com/api/?name=OWNER&background=F59E0B&color=fff&size=128');
                break;
            case 'ADMIN':
                setNewBadgeName('System Administrator');
                setNewBadgeImage('https://ui-avatars.com/api/?name=ADMIN&background=DC2626&color=fff&size=128');
                break;
            case 'DEV':
                setNewBadgeName('Lead Developer');
                setNewBadgeImage('https://ui-avatars.com/api/?name=DEV&background=7C3AED&color=fff&size=128');
                break;
            case 'MENTIONED':
                setNewBadgeName('Honorable Mention');
                setNewBadgeImage('https://ui-avatars.com/api/?name=HM&background=3B82F6&color=fff&size=128');
                break;
            default:
                setNewBadgeName('Custom Badge');
                setNewBadgeImage('');
        }
    }, [newBadgeType]);

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

  const canViewSensitiveData = (targetUser: User): boolean => {
      if (!user) return false;
      // Owner and Dev see everything
      if (user.role === UserRole.OWNER || user.role === UserRole.DEV) return true;
      
      // Admin Check: Cannot see data of superior roles (Owner/Dev) or equal roles (Admin)
      if (user.role === UserRole.ADMIN) {
          if (targetUser.role === UserRole.OWNER || targetUser.role === UserRole.DEV || targetUser.role === UserRole.ADMIN) {
              return false;
          }
          return true;
      }
      return false;
  };

  // --- Handlers: User Management ---
  const handleRoleChange = async (targetId: string, newRole: UserRole) => {
    if (!user) return;
    const targetUser = users.find(u => u.id === targetId);
    if (!targetUser || !canManageUser(targetUser)) {
        showToast("Permission Denied.", "error");
        return;
    }

    const success = await db.updateUserRole(user.id, targetId, newRole);
    if (success) {
        showToast("User role updated.", "success");
        loadUsers();
        refreshUser();
    }
  };

  const handleKickUser = async (targetUser: User) => {
    if (!user || !canManageUser(targetUser)) {
        showToast("Permission Denied.", "error");
        return;
    }
    
    const confirmed = await confirm({
        title: "Kick User",
        message: `Are you sure you want to kick ${targetUser.name}? This will remove their account access immediately.`,
        confirmText: "Kick",
        type: "danger"
    });

    if (confirmed) {
        await db.deleteUser(targetUser.id);
        showToast("User kicked successfully.", "success");
        loadUsers();
    }
  };

  const handleAdminDeductMerit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !disciplineUser) return;
    if (deductAmount <= 0) {
      showToast("Deduction amount must be positive.", "error");
      return;
    }
    if (!deductReason.trim()) {
      showToast("Please provide a reason.", "error");
      return;
    }
    const success = await db.adminDeductMerit(disciplineUser.id, deductAmount, deductReason);
    if (success) {
      showToast(`Deducted -${deductAmount} merit from ${disciplineUser.name}.`, "success");
      setDeductAmount(10);
      setDeductReason('');
      setShowDisciplineModal(false);
      setDisciplineUser(null);
      loadUsers();
      refreshUser();
    } else {
      showToast("Deduction failed.", "error");
    }
  };

  const handleAdminSuspendUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !disciplineUser) return;
    if (!suspendReason.trim()) {
      showToast("Please provide a reason.", "error");
      return;
    }
    const hours = suspendHours === 'indefinite' ? 'indefinite' : Number(suspendHours);
    const success = await db.adminSuspendUser(disciplineUser.id, hours, suspendReason);
    if (success) {
      showToast(`User ${disciplineUser.name} suspended successfully.`, "success");
      setSuspendReason('');
      setSuspendHours('48');
      setShowDisciplineModal(false);
      setDisciplineUser(null);
      loadUsers();
      refreshUser();
    } else {
      showToast("Suspension failed.", "error");
    }
  };

  const handleAdminLimitServices = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !disciplineUser) return;
    if (limitServices.length > 0 && !limitReason.trim()) {
      showToast("Please provide a reason.", "error");
      return;
    }
    const hours = limitHours === 'indefinite' ? 'indefinite' : Number(limitHours);
    const success = await db.adminLimitServices(disciplineUser.id, limitServices, hours, limitReason);
    if (success) {
      showToast(`User ${disciplineUser.name} service limits updated.`, "success");
      setLimitServices([]);
      setLimitReason('');
      setLimitHours('48');
      setShowDisciplineModal(false);
      setDisciplineUser(null);
      loadUsers();
      refreshUser();
    } else {
      showToast("Service limit update failed.", "error");
    }
  };

  const handleAdminRestoreMerit = async (targetUser: User) => {
    if (!user) return;
    const confirmed = await confirm({
       title: "Restore Merit Score",
       message: `Are you sure you want to restore merit for ${targetUser.name}? This will restore their score to 100 PT, lift any suspension, and reset strike occurrences.`,
       confirmText: "Restore Fully",
       type: "success"
    });
    if (confirmed) {
       const success = await db.adminRestoreMerit(targetUser.id);
       if (success) {
         showToast(`Successfully restored merit and enrollment standing for ${targetUser.name}!`, "success");
         if (disciplineUser?.id === targetUser.id) {
           setShowDisciplineModal(false);
           setDisciplineUser(null);
         }
         loadUsers();
         refreshUser();
       } else {
         showToast("Restoration failed.", "error");
       }
    }
  };

  // --- Handlers: Bulk Actions ---
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
      
      const confirmed = await confirm({
          title: "Bulk Delete",
          message: `Are you sure you want to delete ${selectedIds.size} users? This is irreversible.`,
          confirmText: "Delete All",
          type: "danger"
      });

      if (confirmed) {
          // Filter out users that the current admin cannot manage
          const idsToDelete = (Array.from(selectedIds) as string[]).filter(id => {
              const u = users.find(user => user.id === id);
              return u && canManageUser(u);
          });

          if (idsToDelete.length !== selectedIds.size) {
              showToast("Some users skipped due to permissions.", "warning");
          }

          if (idsToDelete.length > 0) {
            await db.bulkDeleteUsers(idsToDelete);
            setSelectedIds(new Set());
            showToast("Selected users deleted.", "success");
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
          showToast("Bulk role update successful.", "success");
          loadUsers();
      }
  };

  // --- Handlers: Inspector/Debug ---
  const refreshSelectedUser = async (id: string) => {
      loadUsers();
      const freshUser = await db.getUser(id);
      if (freshUser) setSelectedUser(freshUser);
  };

  const handleForceResetSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedUser || !newDebugPass) return;
      
      if (!canViewSensitiveData(selectedUser)) {
          showToast("Permission Denied: Cannot modify superior user.", "error");
          return;
      }

      try {
          await db.forceUpdatePlainPassword(selectedUser.id, newDebugPass);
          showToast(`Visual Record Updated to "${newDebugPass}"`, "success");
          setShowResetModal(false);
          setNewDebugPass('');
          refreshSelectedUser(selectedUser.id);
      } catch (e) {
          console.error(e);
          showToast("Failed to force reset.", "error");
      }
  };

  const handleGiveBadge = async () => {
      if (!selectedUser) return;
      // Admins can give badges, but let's restrict OWNER badges to Owners
      if (newBadgeType === 'OWNER' && user?.role !== UserRole.OWNER && user?.role !== UserRole.DEV) {
          showToast("Only Owners can grant Owner badges.", "error");
          return;
      }
      
      const badge: Badge = {
          id: `badge-${Date.now()}`,
          type: newBadgeType,
          name: newBadgeName,
          imageUrl: newBadgeImage,
          description: `Awarded via Admin Panel`,
          assignedAt: new Date().toISOString()
      };

      try {
          await db.addBadgeToUser(selectedUser.id, badge);
          showToast("Badge granted!", "success");
          refreshSelectedUser(selectedUser.id);
      } catch (e) {
          console.error(e);
          showToast("Failed to grant badge", "error");
      }
  };

  const handleRemoveBadge = async (badge: Badge) => {
      if (!selectedUser) return;
      try {
          await db.removeBadgeFromUser(selectedUser.id, badge);
          showToast("Badge removed", "success");
          refreshSelectedUser(selectedUser.id);
      } catch (e) {
          console.error(e);
          showToast("Failed to remove badge", "error");
      }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          setImportFile(e.target.files[0]);
      }
  };

  const handleBulkSeed = async () => {
      if (!importFile) return;

      setIsSeeding(true);
      try {
          const text = await importFile.text();
          let json: any;
          try {
            json = JSON.parse(text);
          } catch (e) {
            showToast("Invalid JSON file.", "error");
            setIsSeeding(false);
            return;
          }
          
          let rawUsers: any[] = [];

          // Support structure: { "group_name": [ { ... }, ... ], ... }
          if (typeof json === 'object' && json !== null) {
              if (Array.isArray(json)) {
                  rawUsers = json;
              } else {
                  // Iterate over all keys (like "trans_commun_students") and collect arrays
                  Object.keys(json).forEach(key => {
                      const val = json[key];
                      if (Array.isArray(val)) {
                          rawUsers = [...rawUsers, ...val];
                      }
                  });
              }
          }

          const usersToCreate = rawUsers.map((u: any) => {
              // Infer grade from name or email
              let grade = "Unknown";
              const str = (u.email || '') + (u.name || '');
              const lower = str.toLowerCase();
              
              if (lower.includes('tc') || lower.includes('commun') || lower.includes('trans')) grade = "TC";
              else if (lower.includes('1bac') || lower.includes('b1')) grade = "1 Bac";
              else if (lower.includes('2bac') || lower.includes('b2')) grade = "2 Bac";

              return {
                  email: u.email,
                  password: u.password,
                  name: u.name || u.email?.split('@')[0] || 'Student',
                  grade: grade
              };
          }).filter(u => u.email && u.password); // Simple validation

          if (usersToCreate.length === 0) {
              showToast("No valid users found in JSON.", "error");
              setIsSeeding(false);
              return;
          }

          const confirmed = await confirm({
              title: "Import Accounts",
              message: `Found ${usersToCreate.length} accounts in file. Proceed with creation? Duplicate emails will be skipped.`,
              confirmText: "Import",
              type: "info"
          });

          if (!confirmed) {
              setIsSeeding(false);
              return;
          }

          const result = await db.bulkCreateUsers(usersToCreate);
          showToast(`Imported: ${result.success}. Errors: ${result.errors.length}.`, result.errors.length > 0 ? "warning" : "success");
          
          if (result.errors.length > 0) {
              console.warn("Import errors:", result.errors);
          }

          loadUsers();
          setImportFile(null);
          if (fileInputRef.current) fileInputRef.current.value = '';

      } catch (e) {
          console.error(e);
          showToast("Failed to process file. Check JSON format.", "error");
      } finally {
          setIsSeeding(false);
      }
  };

  const filteredInspectorUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 relative pb-20 h-full flex flex-col">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-800 dark:text-white">{t('adminPanel')}</h1>
        <div className="flex gap-2">
            <button onClick={() => { loadUsers(); showToast("Refreshed", "info"); }} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-700">
                <RefreshCw size={18} /> {t('refresh')}
            </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 dark:bg-slate-800/50 p-1 rounded-xl w-fit flex-wrap">
          <button 
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'users' ? 'bg-white dark:bg-slate-800 shadow-sm text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
          >
              <LayoutList size={16} /> User Management
          </button>
          <button 
            onClick={() => setActiveTab('scan-import')}
            className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'scan-import' ? 'bg-white dark:bg-slate-800 shadow-sm text-emerald-600 dark:text-emerald-400' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
          >
              <Sparkles size={16} className="text-emerald-500" /> Bulk Enroll & Import
          </button>
          <button 
            onClick={() => setActiveTab('inspector')}
            className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'inspector' ? 'bg-white dark:bg-slate-800 shadow-sm text-purple-600 dark:text-purple-400' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
          >
              <Database size={16} /> System Inspector
          </button>
          <button 
            onClick={() => setActiveTab('promotion-reports')}
            className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'promotion-reports' ? 'bg-white dark:bg-slate-800 shadow-sm text-amber-650 text-amber-600 dark:text-amber-500' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
          >
              <GraduationCap size={16} className="text-amber-500" /> Promotion & Reports
          </button>
      </div>

      {/* --- TAB 1: USER MANAGEMENT --- */}
      {activeTab === 'users' && (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex-1 flex flex-col">
            <div className="p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex items-center gap-4">
                <h2 className="text-lg font-bold text-slate-700 dark:text-slate-200">{t('userManagement')}</h2>
                <span className="text-xs text-slate-500 dark:text-slate-400 bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded-full">{users.length} {t('user')}s</span>
            </div>
            <div className="overflow-x-auto flex-1">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs uppercase border-b border-slate-100 dark:border-slate-700 sticky top-0">
                        <tr>
                            <th className="p-4 w-12 text-center">
                                <button onClick={toggleSelectAll} className="text-slate-400 hover:text-blue-600">
                                    {selectedIds.size > 0 && selectedIds.size === users.length ? <CheckSquare size={20}/> : <Square size={20}/>}
                                </button>
                            </th>
                            <th className="p-4">{t('user')}</th>
                            <th className="p-4">{t('grade')}</th>
                            <th className="p-4">{t('role')}</th>
                            <th className="p-4">Merit Standing</th>
                            <th className="p-4">{t('lastLoginIp')}</th>
                            <th className="p-4 text-right">{t('actions')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                        {users.map(u => {
                            const isSelf = u.id === user?.id;
                            const isSelectable = !isSelf;
                            const hasPermission = canManageUser(u);

                            return (
                                <tr key={u.id} className={`hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${selectedIds.has(u.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
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
                                                <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
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
                                                <div className="text-xs text-slate-500 dark:text-slate-400">{u.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4 text-sm text-slate-600 dark:text-slate-400">{u.grade || 'N/A'}</td>
                                    <td className="p-4">
                                        <select 
                                            value={u.role}
                                            onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                                            className={`p-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:border-blue-500 bg-white dark:bg-slate-900 dark:text-slate-200 ${!hasPermission ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                                         <div className="flex flex-col gap-1 select-none">
                                             <div className="flex items-center gap-1.5 font-bold font-mono">
                                                 <span className={`w-2 h-2 rounded-full ${(u.meritScore ?? 20) >= 14 ? 'bg-emerald-500' : (u.meritScore ?? 20) >= 7 ? 'bg-amber-500' : 'bg-rose-500'}`}></span>
                                                 <span className={`${(u.meritScore ?? 20) >= 14 ? 'text-emerald-600 dark:text-emerald-400' : (u.meritScore ?? 20) >= 7 ? 'text-amber-500 dark:text-amber-450' : 'text-rose-600 dark:text-rose-400'}`}>
                                                     {u.meritScore ?? 20} PT
                                                 </span>
                                             </div>
                                             {u.isSuspended && (
                                                 <span className="text-[9px] text-rose-500 dark:text-rose-450 font-extrabold tracking-wider uppercase bg-rose-50/70 dark:bg-rose-955/20 px-1.5 py-0.5 rounded border border-rose-100/60 dark:border-rose-950/40 w-fit">
                                                     {u.isSuspendedIndefinitely ? "Indefinite" : "Suspended"}
                                                 </span>
                                             )}
                                         </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-col gap-1">
                                            <span className="flex items-center gap-1"><Globe size={12}/> {u.ip || 'Unknown IP'}</span>
                                            <span>{u.lastLogin ? new Date(u.lastLogin).toLocaleDateString() : 'Never'}</span>
                                        </div>
                                    </td>
                                    <td className="p-4 text-right">
                                         <div className="flex justify-end gap-1">
                                             {hasPermission && (
                                                 <button 
                                                     onClick={() => {
                                                         setDisciplineUser(u);
                                                         setDeductAmount(10);
                                                         setDeductReason('');
                                                         setSuspendHours('48');
                                                         setSuspendReason('');
                                                         setShowDisciplineModal(true);
                                                     }}
                                                     className="text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/10 p-2 rounded-lg transition-colors"
                                                     title="Manage Standing & Merit"
                                                 >
                                                     <ShieldAlert size={18} />
                                                 </button>
                                             )}
                                             {hasPermission && (
                                                 <button 
                                                     onClick={() => handleKickUser(u)}
                                                     className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 p-2 rounded-lg transition-colors"
                                                     title="Kick User"
                                                 >
                                                     <UserMinus size={18} />
                                                 </button>
                                             )}
                                         </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
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
      )}

      {/* --- TAB 1.5: BULK SCAN & IMPORT --- */}
      {activeTab === 'scan-import' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              {/* Left 2 columns: PDF Document Scanner */}
              <div className="lg:col-span-2">
                  <DocumentScanner 
                      onImportSuccess={loadUsers} 
                      db={db} 
                      showToast={showToast} 
                      confirm={confirm} 
                  />
              </div>

              {/* Right 1 column: JSON Mass Import Seeder */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden p-6 flex flex-col gap-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-150 dark:border-slate-700">
                      <UploadCloud className="text-blue-500" size={20} />
                      <div>
                          <h3 className="text-base font-bold text-slate-800 dark:text-white">JSON Mass Import</h3>
                          <p className="text-[10px] text-slate-400">Instantly seed accounts with pre-formatted rosters</p>
                      </div>
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal">
                      Upload a flat roster array or structured grade maps to create user accounts instantly. Duplicates with existing emails will be safely skipped.
                  </p>

                  <input 
                      type="file" 
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept=".json"
                      className="hidden"
                  />
                  
                  {!importFile ? (
                      <button 
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full bg-slate-50 dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-slate-100/50 dark:hover:bg-slate-900/85 p-8 rounded-xl flex flex-col items-center justify-center gap-3 transition-all cursor-pointer group"
                      >
                          <UploadCloud size={36} className="text-slate-400 group-hover:text-blue-500 transition-colors duration-250"/>
                          <div className="text-center">
                              <span className="font-bold text-xs text-slate-700 dark:text-slate-200 block">Select JSON File</span>
                              <span className="text-[10px] text-slate-400 block mt-1">Format: {"{ \"students\": [...] }"}</span>
                          </div>
                      </button>
                  ) : (
                      <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
                          <div className="flex justify-between items-center mb-3">
                              <span className="text-xs font-mono font-medium text-blue-600 dark:text-blue-300 truncate max-w-[180px]">{importFile.name}</span>
                              <button onClick={() => { setImportFile(null); if(fileInputRef.current) fileInputRef.current.value = ''; }} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                                  <X size={16}/>
                              </button>
                          </div>
                          <button 
                              onClick={handleBulkSeed}
                              disabled={isSeeding}
                              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded-lg flex items-center justify-center gap-2 text-xs transition-colors cursor-pointer"
                          >
                              {isSeeding ? <Loader2 className="animate-spin" size={15}/> : <UploadCloud size={15}/>}
                              {isSeeding ? 'Importing...' : 'Start Roster Import'}
                          </button>
                      </div>
                  )}

                  <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-3 border border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 font-mono space-y-1">
                      <p className="font-bold text-slate-500 uppercase text-[9px] mb-1">JSON Expected format:</p>
                      <pre className="overflow-x-auto text-[9px]">
{`[
  {
    "name": "Alex Mercer",
    "email": "alex@school.edu",
    "password": "pass"
  }
]`}
                      </pre>
                  </div>
              </div>
          </div>
      )}

      {/* --- TAB 2: INSPECTOR --- */}
      {activeTab === 'inspector' && (
           <div className="flex flex-1 gap-6 overflow-hidden h-full min-h-[500px]">
                {/* User List */}
                <div className="w-1/3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden">
                    <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 text-slate-400" size={18}/>
                            <input 
                                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none text-sm dark:text-white"
                                placeholder="Search User..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {filteredInspectorUsers.map(u => (
                            <div 
                                key={u.id}
                                onClick={() => { setSelectedUser(u); setShowPassword(false); }}
                                className={`p-4 border-b border-slate-100 dark:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors ${selectedUser?.id === u.id ? 'bg-purple-50 dark:bg-purple-900/30 border-l-4 border-l-purple-500' : ''}`}
                            >
                                <p className="font-bold text-slate-800 dark:text-white text-sm">{u.name}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">{u.email}</p>
                                <span className="inline-block mt-1 text-[10px] uppercase font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-600">{u.role}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Inspector Detail */}
                <div className="flex-1 bg-slate-900 rounded-xl border border-slate-700 p-6 flex flex-col text-slate-300 font-mono overflow-hidden">
                    {selectedUser ? (
                        <>
                            <div className="flex justify-between items-start mb-6 border-b border-slate-700 pb-4">
                                <div>
                                    <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
                                        <Database size={18} className="text-blue-400"/> {t('inspectUser')}
                                    </h2>
                                    <p className="text-xs text-slate-500">ID: {selectedUser.id}</p>
                                </div>
                                <div className="flex gap-2">
                                    {canViewSensitiveData(selectedUser) && (
                                        <button 
                                            onClick={() => setShowResetModal(true)}
                                            className="bg-red-600/20 text-red-400 border border-red-600/50 px-4 py-2 rounded hover:bg-red-600/30 transition-colors flex items-center gap-2 text-xs font-bold"
                                        >
                                            <ShieldAlert size={14}/> Force Change
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto space-y-6 custom-scrollbar">
                                {/* Password Section */}
                                <div className="bg-slate-950 p-4 rounded border border-slate-800">
                                    <p className="text-xs font-bold text-slate-500 mb-2 uppercase flex items-center gap-2">
                                        <Key size={12}/> Active Password
                                    </p>
                                    <div className="flex items-center gap-4">
                                        {canViewSensitiveData(selectedUser) ? (
                                            <>
                                                <code className={`px-2 py-1 rounded ${showPassword ? 'text-green-400 bg-green-900/20' : 'text-slate-600 bg-slate-800'}`}>
                                                    {showPassword ? (selectedUser.plainPassword || 'N/A') : "••••••••••••"}
                                                </code>
                                                <button onClick={() => setShowPassword(!showPassword)} className="text-slate-500 hover:text-white">
                                                    {showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}
                                                </button>
                                            </>
                                        ) : (
                                            <div className="flex items-center gap-2 text-red-500 text-xs">
                                                <ShieldAlert size={14} />
                                                <span>Restricted: Superior Role</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Badge Management */}
                                <div className="bg-slate-950 p-4 rounded border border-slate-800">
                                    <p className="text-xs font-bold text-slate-500 mb-4 uppercase flex items-center gap-2">
                                        <Award size={12}/> Badge Management
                                    </p>
                                    
                                    {/* Existing Badges */}
                                    <div className="flex flex-wrap gap-2 mb-4">
                                        {selectedUser.badges?.map(b => (
                                            <div key={b.id} className="flex items-center gap-2 bg-slate-800 p-2 rounded border border-slate-700">
                                                <img src={b.imageUrl} className="w-6 h-6 rounded bg-black" alt="" />
                                                <div className="text-xs">
                                                    <div className="text-white font-bold">{b.name}</div>
                                                    <div className="text-[10px] text-slate-500">{b.type}</div>
                                                </div>
                                                <button onClick={() => handleRemoveBadge(b)} className="text-slate-500 hover:text-red-500">
                                                    <Trash2 size={12} />
                                                </button>
                                            </div>
                                        ))}
                                        {(!selectedUser.badges || selectedUser.badges.length === 0) && (
                                            <span className="text-xs text-slate-600 italic">No badges assigned.</span>
                                        )}
                                    </div>

                                    {/* Add Badge Form */}
                                    <div className="border-t border-slate-800 pt-4 flex flex-col gap-3">
                                        <div className="flex gap-2">
                                            <select 
                                                className="bg-slate-800 border border-slate-700 text-white text-xs rounded p-2 outline-none flex-1"
                                                value={newBadgeType}
                                                onChange={e => setNewBadgeType(e.target.value as BadgeType)}
                                            >
                                                <option value="MENTIONED">Mentioned</option>
                                                <option value="OWNER">Owner</option>
                                                <option value="ADMIN">Admin</option>
                                                <option value="DEV">Developer</option>
                                                <option value="CUSTOM">Custom</option>
                                            </select>
                                            <input 
                                                className="bg-slate-800 border border-slate-700 text-white text-xs rounded p-2 outline-none flex-[2]"
                                                placeholder="Badge Name"
                                                value={newBadgeName}
                                                onChange={e => setNewBadgeName(e.target.value)}
                                            />
                                        </div>
                                        <div className="flex gap-2">
                                            <input 
                                                className="bg-slate-800 border border-slate-700 text-white text-xs rounded p-2 outline-none flex-1"
                                                placeholder="Image URL"
                                                value={newBadgeImage}
                                                onChange={e => setNewBadgeImage(e.target.value)}
                                            />
                                            <button 
                                                onClick={handleGiveBadge}
                                                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs font-bold flex items-center gap-1"
                                            >
                                                <Plus size={12}/> Give
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Raw JSON Data */}
                                <div>
                                    <p className="text-xs font-bold text-slate-500 mb-2 uppercase">{t('rawUserData')}</p>
                                    <pre className="text-xs bg-slate-950 p-4 rounded border border-slate-800 overflow-x-auto text-blue-300">
                                        {JSON.stringify(selectedUser, null, 2)}
                                    </pre>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col gap-6 overflow-y-auto">
                            {/* Database Structural Synchronization Card */}
                            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm font-sans">
                                <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-2 font-display">
                                    <Database size={18} className="text-indigo-500" /> Database Structural Migration
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
                                    Forces a system-wide structural re-alignment of both online Cloud Firestore documents and offline local cache records. Crucial after system updates, schema migrations, or when restoring legacy backups to standardize database fields (merit scores, rule scopes, credentials, and constraints) to the latest platform rules.
                                </p>
                                
                                {resyncStatus && (
                                    <div className="mb-4 bg-slate-50 dark:bg-slate-900 p-4 rounded-lg border border-slate-100 dark:border-slate-800 text-xs font-mono">
                                        {resyncStatus.success ? (
                                            <div className="text-emerald-500 font-bold space-y-1">
                                                <p>✓ Database structural migration succeeded!</p>
                                                <p className="text-slate-400 text-[10px] mt-0.5">
                                                    Normalized total of {resyncStatus.usersCount} users and {resyncStatus.clubsCount} clubs across current active nodes.
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="text-rose-500 font-bold">
                                                <p>✗ Database structural migration failed:</p>
                                                <p className="text-slate-400 text-[10px] mt-0.5">{resyncStatus.error}</p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <button
                                    onClick={handleDatabaseResync}
                                    disabled={isResyncing}
                                    className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white disabled:bg-indigo-400 text-xs font-extrabold rounded-lg flex items-center gap-2 shadow-sm transition-all"
                                >
                                    {isResyncing ? (
                                        <>
                                            <RefreshCw size={14} className="animate-spin" /> Normalizing Database Structure...
                                        </>
                                    ) : (
                                        <>
                                            <RefreshCw size={14} /> Resync Entire Database Structure
                                        </>
                                    )}
                                </button>
                            </div>

                            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 bg-slate-50/50 dark:bg-slate-900/40 p-12 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                                <Search size={32} className="mb-3 opacity-30 text-slate-400 dark:text-slate-500"/>
                                <p className="font-bold text-sm text-slate-750 text-slate-700 dark:text-slate-300">No Account Selected</p>
                                <p className="text-xs text-slate-400 dark:text-slate-550 mt-1 max-w-xs font-sans">
                                    Select any student or administrator profile from the left-hand directory list to inspect credentials, bypass parameters, or award unified service badges.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
       )}

      {/* --- TAB 3: MAINTENANCE & REPORTS (PROMOTION/REPORTS) --- */}
      {activeTab === 'promotion-reports' && (
          <div className="flex-1 flex flex-col gap-6 animate-in fade-in duration-200">
              {/* Local Navigation pills */}
              <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700 pb-3">
                  <button
                      onClick={() => setMaintenanceSubTab('promotion')}
                      className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                          maintenanceSubTab === 'promotion'
                          ? 'bg-amber-500 text-slate-950 shadow'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                  >
                      <GraduationCap size={15} /> Academic Year End Promotion
                  </button>
                  <button
                      onClick={() => setMaintenanceSubTab('reports')}
                      className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                          maintenanceSubTab === 'reports'
                          ? 'bg-red-650/15 border border-red-500/30 text-red-650 dark:text-red-400'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-805 dark:hover:text-slate-200'
                      }`}
                  >
                      <ShieldAlert size={15} /> Discipline & Bug Reports
                      {adminReports.filter(r => !r.resolved).length > 0 && (
                          <span className="bg-red-200 text-red-900 text-[10px] font-extrabold px-1.5 py-0.5 rounded-full leading-none ml-1.5">
                              {adminReports.filter(r => !r.resolved).length}
                          </span>
                      )}
                  </button>
              </div>

              {maintenanceSubTab === 'promotion' ? (
                  <div className="flex-1 flex flex-col gap-6">
                      {/* Detailed Explanation Banner */}
                      <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-amber-500/10 border border-amber-500/20 rounded-xl p-6 flex items-start gap-4 shadow-sm">
                          <GraduationCap className="text-amber-500 shrink-0 mt-1" size={32} />
                          <div>
                              <h3 className="text-lg font-bold text-slate-800 dark:text-amber-400 mb-1">Academic Year End Promotion & Data Refresh</h3>
                              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-4xl">
                                  Seamlessly progress students to their next school levels and wipe their old records to start the next academic term on a blank slate. 
                                  Whether a student passes or fails their exams, **their joined clubs lists and custom badges will be safely cleared** so they can register for fresh clubs and receive new achievements.
                              </p>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 text-xs">
                                  <div className="bg-emerald-500/5 border border-emerald-500/20 p-3 rounded-lg">
                                      <span className="font-extrabold text-emerald-600 dark:text-emerald-400 block mb-1">✔️ SUCCEEDED (PASSED):</span>
                                      <ul className="space-y-1 list-disc list-inside text-slate-600 dark:text-slate-400">
                                          <li>TC (Tronc Commun) ➔ <strong className="text-emerald-500">1 Bac</strong></li>
                                          <li>1 Bac ➔ <strong className="text-emerald-500">2 Bac</strong></li>
                                          <li>2 Bac ➔ <strong className="text-rose-500 font-bold">Delete Account (Graduated)</strong></li>
                                          <li>Joined clubs are fully reset (`joinedClubIds: []`)</li>
                                      </ul>
                                  </div>
                                  <div className="bg-rose-500/5 border border-rose-500/20 p-3 rounded-lg">
                                      <span className="font-extrabold text-rose-600 dark:text-rose-400 block mb-1">❌ FAILED (REPEAT):</span>
                                      <ul className="space-y-1 list-disc list-inside text-slate-600 dark:text-slate-400">
                                          <li>Stays in current grade for another year (e.g. TC stays in TC)</li>
                                          <li>Joined clubs are STILL fully reset to ensure brand new start</li>
                                          <li>Roles & badges fully reset to fresh memberships</li>
                                      </ul>
                                  </div>
                              </div>
                          </div>
                      </div>

                      {/* Filtering & Control Bar */}
                      <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-700/80 flex flex-wrap justify-between items-center gap-4">
                          <div className="flex items-center gap-3 flex-wrap">
                              <div className="relative">
                                  <Search className="absolute left-3 top-2.5 text-slate-400" size={18}/>
                                  <input 
                                      className="pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none text-sm dark:text-white w-64"
                                      placeholder="Search student by name or email..."
                                      value={promotionSearch}
                                      onChange={e => setPromotionSearch(e.target.value)}
                                  />
                              </div>

                              <select 
                                  value={promotionFilterGrade}
                                  onChange={e => setPromotionFilterGrade(e.target.value)}
                                  className="p-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 dark:text-slate-200 outline-none"
                              >
                                  <option value="">All Grades</option>
                                  <option value="TC">TC</option>
                                  <option value="1 Bac">1 Bac</option>
                                  <option value="2 Bac">2 Bac</option>
                              </select>
                          </div>

                          <div className="flex items-center gap-2">
                              <button 
                                  onClick={() => {
                                      const filtered = users.filter(u => {
                                          if (u.grade === undefined || u.grade === '') return false;
                                          if (promotionFilterGrade && !(u.grade || '').toLowerCase().includes(promotionFilterGrade.toLowerCase())) return false;
                                          if (promotionSearch && !u.name.toLowerCase().includes(promotionSearch.toLowerCase()) && !u.email.toLowerCase().includes(promotionSearch.toLowerCase())) return false;
                                          return true;
                                      });
                                      setPromotionPassedMap(prev => {
                                          const next = { ...prev };
                                          filtered.forEach(u => { next[u.id] = true; });
                                          return next;
                                      });
                                      showToast(`Marked ${filtered.length} students as Succeeded.`, "success");
                                  }}
                                  className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5"
                              >
                                  <Check size={14} /> Mark All Succeeded
                              </button>
                              <button 
                                  onClick={() => {
                                      const filtered = users.filter(u => {
                                          if (u.grade === undefined || u.grade === '') return false;
                                          if (promotionFilterGrade && !(u.grade || '').toLowerCase().includes(promotionFilterGrade.toLowerCase())) return false;
                                          if (promotionSearch && !u.name.toLowerCase().includes(promotionSearch.toLowerCase()) && !u.email.toLowerCase().includes(promotionSearch.toLowerCase())) return false;
                                          return true;
                                      });
                                      setPromotionPassedMap(prev => {
                                          const next = { ...prev };
                                          filtered.forEach(u => { next[u.id] = false; });
                                          return next;
                                      });
                                      showToast(`Marked ${filtered.length} students as Failed.`, "warning");
                                  }}
                                  className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5"
                              >
                                  <XCircle size={14} /> Mark All Failed
                              </button>
                          </div>
                      </div>

                      {/* Simulation Table List */}
                      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col shadow-sm max-h-[500px]">
                          <div className="overflow-y-auto flex-1">
                              <table className="w-full text-left border-collapse">
                                  <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 text-xs uppercase border-b border-slate-100 dark:border-slate-700 sticky top-0 z-10">
                                      <tr>
                                          <th className="p-4">Student</th>
                                          <th className="p-4">Current Grade</th>
                                          <th className="p-4">Promotion Status (Succeeded?)</th>
                                          <th className="p-4">Next Grade (Simulation)</th>
                                          <th className="p-4">Clubs & Badges Effect</th>
                                      </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50 bg-white dark:bg-slate-900">
                                      {users.filter(u => {
                                          if (u.grade === undefined || u.grade === '') return false;
                                          if (promotionFilterGrade && !(u.grade || '').toLowerCase().includes(promotionFilterGrade.toLowerCase())) return false;
                                          if (promotionSearch && !u.name.toLowerCase().includes(promotionSearch.toLowerCase()) && !u.email.toLowerCase().includes(promotionSearch.toLowerCase())) return false;
                                          return true;
                                      }).map(u => {
                                          const isPassed = promotionPassedMap[u.id] !== false;
                                          const currentGradeNormalized = (u.grade || '').trim().toLowerCase();
                                          let simulatedNext = u.grade || 'TC';

                                          if (currentGradeNormalized.includes('tc') || currentGradeNormalized.includes('tronc')) {
                                            simulatedNext = isPassed ? '1 Bac' : 'TC';
                                          } else if (currentGradeNormalized.includes('1') && currentGradeNormalized.includes('bac')) {
                                            simulatedNext = isPassed ? '2 Bac' : '1 Bac';
                                          } else if (currentGradeNormalized.includes('2') && currentGradeNormalized.includes('bac')) {
                                            simulatedNext = isPassed ? 'DELETE ACCOUNT' : '2 Bac';
                                          } else {
                                            simulatedNext = isPassed ? '1 Bac' : 'TC';
                                          }

                                          const activeClubsCount = u.joinedClubIds ? u.joinedClubIds.length : 0;
                                          const badgesCount = u.badges ? u.badges.length : 0;

                                          return (
                                              <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                                  <td className="p-4">
                                                      <div className="flex items-center gap-3">
                                                          <img 
                                                              src={u.avatarUrl || `https://ui-avatars.com/api/?name=${u.name}&background=random`} 
                                                              alt={u.name} 
                                                              className="w-9 h-9 rounded-full bg-slate-100 object-cover border border-slate-200"
                                                          />
                                                          <div>
                                                              <span className="font-bold text-slate-800 dark:text-white text-sm block">{u.name}</span>
                                                              <span className="text-xs text-slate-400 font-mono">{u.email}</span>
                                                          </div>
                                                      </div>
                                                  </td>
                                                  <td className="p-4">
                                                      <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-extrabold rounded-lg border border-slate-200 dark:border-slate-700">
                                                          {u.grade || 'N/A'}
                                                      </span>
                                                  </td>
                                                  <td className="p-4 flex gap-1.5 items-center">
                                                      <button 
                                                          onClick={() => setPromotionPassedMap(prev => ({ ...prev, [u.id]: true }))}
                                                          className={`px-3 py-1 rounded text-xs font-bold transition-all border ${
                                                              isPassed 
                                                              ? 'bg-emerald-500/15 border-emerald-500/45 text-emerald-600 dark:text-emerald-400 shadow-sm' 
                                                              : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-405'
                                                          }`}
                                                      >
                                                          Passed
                                                      </button>
                                                      <button 
                                                          onClick={() => setPromotionPassedMap(prev => ({ ...prev, [u.id]: false }))}
                                                          className={`px-3 py-1 rounded text-xs font-bold transition-all border ${
                                                              !isPassed 
                                                              ? 'bg-rose-500/15 border-rose-500/45 text-rose-600 dark:text-rose-400 shadow-sm' 
                                                              : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-405'
                                                          }`}
                                                      >
                                                          Failed
                                                      </button>
                                                  </td>
                                                  <td className="p-4">
                                                      <div className="flex items-center gap-2 text-xs">
                                                          <span className="text-slate-400 font-bold">{u.grade}</span>
                                                          <ArrowRight size={10} className="text-slate-405" />
                                                          <span className={`px-2.5 py-1 text-xs font-bold rounded-lg border ${
                                                              isPassed 
                                                              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400' 
                                                              : 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400'
                                                          }`}>
                                                              {simulatedNext} {!isPassed && " (Failed)"}
                                                          </span>
                                                      </div>
                                                  </td>
                                                  <td className="p-4">
                                                      <div className="flex flex-col gap-1 text-xs font-mono text-slate-400 leading-normal">
                                                          <span>Clubs: <strong className="text-rose-500">Leaving {activeClubsCount} clubs</strong></span>
                                                          <span>Badges: {badgesCount > 0 ? (
                                                              <span>Filtered ({badgesCount} ➔ {(u.badges || []).filter((b: any) => b.type === 'OWNER' || b.type === 'ADMIN' || b.type === 'DEV').length} kept)</span>
                                                          ) : (
                                                              <span>None</span>
                                                          )}</span>
                                                      </div>
                                                  </td>
                                              </tr>
                                          );
                                      })}
                                  </tbody>
                              </table>
                          </div>

                          {/* Submit Action Block */}
                          <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
                              <div className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                  <span className="flex h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse"></span>
                                  Ready for Academic End transition
                              </div>
                              <button 
                                  onClick={handleApplyPromotions}
                                  disabled={isPromoting}
                                  className="bg-amber-500 hover:bg-amber-650 disabled:bg-slate-600 text-slate-950 px-6 py-3 rounded-xl font-extrabold flex items-center gap-2 shadow-lg transition-all transform active:scale-95 disabled:cursor-not-allowed cursor-pointer animate-bounce-subtle"
                              >
                                  {isPromoting ? (
                                      <>
                                          <Loader2 className="animate-spin" size={18} /> Promoting Students...
                                      </>
                                  ) : (
                                      <>
                                          <GraduationCap size={18} /> Run Grade Promotion & Reset Data
                                      </>
                                  )}
                              </button>
                          </div>
                      </div>
                  </div>
              ) : (
                  /* Discipline & Bug Reports */
                  <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex-1 flex flex-col">
                      <div className="p-6 border-b border-slate-100 dark:border-slate-700 bg-red-50 dark:bg-rose-950/20 flex justify-between items-center">
                          <div className="flex items-center gap-3">
                              <ShieldAlert className="text-red-500" size={24} />
                              <div>
                                  <h2 className="text-lg font-bold text-red-900 dark:text-red-100">Discipline Reports</h2>
                                  <p className="text-xs text-red-700 dark:text-red-300">Review escalated club ejections and optionally enforce service limits or suspensions.</p>
                              </div>
                          </div>
                          <span className="bg-red-200 text-red-800 dark:bg-red-900 dark:text-red-200 text-xs font-bold px-3 py-1 rounded-full">{adminReports.filter(r => !r.resolved).length} Pending</span>
                      </div>
                      <div className="overflow-y-auto flex-1 p-6">
                          {adminReports.length === 0 ? (
                              <div className="text-center text-slate-500 dark:text-slate-400 py-10 text-sm font-medium">No reports filed.</div>
                          ) : (
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                  {adminReports.map(report => (
                                      <div key={report.id} className={`p-4 rounded-xl border ${report.resolved ? 'bg-slate-50 border-slate-200 dark:bg-slate-800/40 dark:border-slate-700 opacity-60' : 'bg-red-50 border-red-200 dark:bg-rose-950/30 dark:border-rose-900 shadow-sm'}`}>
                                          <div className="flex justify-between items-start mb-3">
                                              <div>
                                                  <h4 className="font-bold text-slate-800 dark:text-slate-100">{report.userName}</h4>
                                                  <span className="text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded font-mono block mt-1 w-max">User ID: {report.userId}</span>
                                              </div>
                                              {report.resolved && <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Resolved</span>}
                                              {!report.resolved && <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Action Req</span>}
                                          </div>
                                          <div className="space-y-4 mb-4">
                                              <div>
                                                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">Source Club</span>
                                                  <div className="text-sm font-medium">{report.clubName}</div>
                                              </div>
                                              <div>
                                                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-505 dark:text-slate-400 block mb-1">Violation</span>
                                                  <div className="text-xs p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg">{report.brokenRule}</div>
                                              </div>
                                              <div>
                                                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-505 dark:text-slate-400 block mb-1">Reason / Context</span>
                                                  <div className="text-xs p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg">{report.reason}</div>
                                              </div>
                                              <div>
                                                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-505 dark:text-slate-400 block mb-1">Club Rule Reference</span>
                                                  <div className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2 italic">
                                                      {report.clubRules?.length ? report.clubRules.join(" • ") : "No explicit club rules defined."}
                                                  </div>
                                              </div>
                                          </div>
                                          {!report.resolved && (
                                              <div className="flex gap-2">
                                                  <button 
                                                      onClick={async () => {
                                                          const success = await db.resolveAdminReport(report.id);
                                                          if (success) { loadUsers(); showToast("Report resolved.", "success") }
                                                      }}
                                                      className="flex-1 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                                                  >
                                                      Dismiss
                                                  </button>
                                                  <button 
                                                      onClick={() => {
                                                          const targetUser = users.find(u => u.id === report.userId);
                                                          if (targetUser) {
                                                              setDisciplineUser(targetUser);
                                                              setShowDisciplineModal(true);
                                                          } else {
                                                              showToast("User not found.", "error");
                                                          }
                                                      }}
                                                      className="flex-[1.5] py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-md card-glow cursor-pointer"
                                                  >
                                                      <ShieldAlert size={14} /> Handle Discipline
                                                  </button>
                                              </div>
                                          )}
                                      </div>
                                  ))}
                              </div>
                          )}
                      </div>
                  </div>
              )}
          </div>
      )}

      {/* Force Reset Modal */}
      {showResetModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 duration-200">
                  <div className="flex justify-between items-center mb-6">
                      <h2 className="text-xl font-bold text-white flex items-center gap-2">
                          <Terminal className="text-red-500" /> Force Password Change
                      </h2>
                      <button onClick={() => setShowResetModal(false)} className="text-slate-500 hover:text-white"><X size={20}/></button>
                  </div>
                  
                  <p className="text-slate-400 text-sm mb-4">
                      Directly override the stored password record for <span className="text-white font-bold">{selectedUser?.email}</span>. 
                  </p>

                  <form onSubmit={handleForceResetSubmit} className="space-y-4">
                      <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-500 uppercase">New Password</label>
                          <input 
                              type="text" 
                              className="w-full p-3 bg-slate-950 border border-slate-700 rounded-lg text-white outline-none focus:border-red-500 font-mono"
                              value={newDebugPass}
                              onChange={e => setNewDebugPass(e.target.value)}
                              placeholder="Enter new password..."
                              required
                          />
                      </div>
                      <button 
                          type="submit" 
                          className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                      >
                          <RefreshCw size={18} /> Update Record
                      </button>
                  </form>
              </div>
          </div>
      )}

      {/* Disciplinary Standing & Merit Control Modal */}
      {showDisciplineModal && disciplineUser && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-slate-900 border border-slate-705/60 rounded-3xl w-full max-w-lg p-6 shadow-2xl animate-in zoom-in-95 duration-200 text-white select-none my-8 max-h-[90vh] overflow-y-auto custom-scrollbar flex flex-col">
                  <div className="flex justify-between items-center mb-4 shrink-0">
                      <h2 className="text-lg font-black uppercase tracking-wide text-amber-500 flex items-center gap-2">
                          <ShieldAlert className="text-amber-500" size={20} /> Discipline Registry
                      </h2>
                      <button onClick={() => { setShowDisciplineModal(false); setDisciplineUser(null); }} className="text-slate-400 hover:text-white p-1 hover:bg-slate-800 rounded-lg transition-colors"><X size={20}/></button>
                  </div>

                  {/* Profile Context Banner */}
                  <div className="p-3 bg-slate-950/60 rounded-2xl border border-slate-800 flex items-center justify-between mb-4 shrink-0">
                      <div className="flex items-center gap-2.5 min-w-0">
                          <img src={disciplineUser.avatarUrl} className="w-9 h-9 rounded-xl object-cover border border-slate-700 shrink-0" />
                          <div className="min-w-0">
                              <div className="font-bold text-xs text-slate-100 truncate">{disciplineUser.name}</div>
                              <div className="text-[10px] text-slate-400 truncate">{disciplineUser.email}</div>
                          </div>
                      </div>
                      <div className="text-right shrink-0">
                          <span className="text-[10px] text-slate-450 block font-bold uppercase tracking-wider">Standing Score</span>
                          <span className={`text-xs font-black font-mono px-2 py-0.5 bg-slate-900 rounded-lg border ${
                              (disciplineUser.meritScore ?? 20) >= 14 ? 'text-emerald-400 border-emerald-950' : 
                              (disciplineUser.meritScore ?? 20) >= 7 ? 'text-amber-400 border-amber-950' : 
                              'text-rose-400 border-rose-950'
                          }`}>
                              {disciplineUser.meritScore ?? 20} / 20 PT
                          </span>
                      </div>
                  </div>

                  {/* Modal Tab Buttons */}
                  <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 mb-4 shrink-0">
                      <button 
                          onClick={() => setDisciplineTab('standing')}
                          className={`py-2 px-1 rounded-lg text-[10px] font-black uppercase tracking-wider flex flex-col sm:flex-row items-center justify-center gap-1 transition-all ${disciplineTab === 'standing' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-450 hover:text-slate-200'}`}
                      >
                          <RefreshCw size={12} /> Status
                      </button>
                      <button 
                          onClick={() => setDisciplineTab('deduction')}
                          className={`py-2 px-1 rounded-lg text-[10px] font-black uppercase tracking-wider flex flex-col sm:flex-row items-center justify-center gap-1 transition-all ${disciplineTab === 'deduction' ? 'bg-rose-600 text-white shadow-md' : 'text-slate-450 hover:text-slate-200'}`}
                      >
                          <UserMinus size={12} /> Deduct
                      </button>
                      <button 
                          onClick={() => setDisciplineTab('restrictions')}
                          className={`py-2 px-1 rounded-lg text-[10px] font-black uppercase tracking-wider flex flex-col sm:flex-row items-center justify-center gap-1 transition-all ${disciplineTab === 'restrictions' ? 'bg-amber-600 text-white shadow-md' : 'text-slate-450 hover:text-slate-200'}`}
                      >
                          <XCircle size={12} /> Restrict
                      </button>
                  </div>

                  {/* Modal Tab Content Panel */}
                  <div className="flex-1 overflow-y-auto pr-1">
                      {disciplineTab === 'standing' && (
                          <div className="space-y-4 animate-in fade-in duration-200">
                              <div className="p-4 bg-emerald-950/20 border border-emerald-900/30 rounded-2xl">
                                  <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-widest font-mono mb-1">
                                      Standing Mitigation & Restoration
                                  </h3>
                                  <p className="text-[11px] text-slate-350 leading-relaxed mb-3">
                                      Completely bypass cooldowns to reset standing score to 20 PT, reset active status, and wipe zero-merit strike counters.
                                  </p>
                                  <button
                                      onClick={() => handleAdminRestoreMerit(disciplineUser)}
                                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950/20"
                                  >
                                      <RefreshCw size={14} /> Full Clearance & Active Restoration
                                  </button>
                              </div>
                          </div>
                      )}

                      {disciplineTab === 'deduction' && (
                          <div className="space-y-4 animate-in fade-in duration-200">
                              <div>
                                  <h3 className="text-xs font-bold text-rose-400 uppercase tracking-widest font-mono mb-2">
                                      Standing Infraction Penalties (Deductions)
                                  </h3>
                                  <form onSubmit={handleAdminDeductMerit} className="space-y-3 p-4 bg-rose-950/15 border border-rose-950/30 rounded-2xl">
                                      <div className="space-y-2">
                                          <div className="space-y-1">
                                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Amount (PT)</label>
                                              <input 
                                                  type="number" 
                                                  min={1} 
                                                  max={20}
                                                  value={deductAmount} 
                                                  onChange={e => setDeductAmount(Number(e.target.value))}
                                                  className="w-full p-2 bg-slate-950 border border-slate-850 rounded-xl text-center text-xs font-bold font-mono text-white outline-none focus:border-rose-500"
                                                  required
                                              />
                                          </div>
                                          <div className="space-y-1">
                                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Broken Rule / Infraction Reasoning</label>
                                              <input 
                                                  type="text" 
                                                  placeholder="e.g. Inappropriate engagement during chat sessions"
                                                  value={deductReason} 
                                                  onChange={e => setDeductReason(e.target.value)}
                                                  className="w-full p-2 bg-slate-950 border border-slate-850 rounded-xl text-xs text-white outline-none focus:border-rose-500"
                                                  required
                                              />
                                          </div>
                                      </div>
                                      <button
                                          type="submit"
                                          className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-2 px-4 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-rose-950/25 mt-2"
                                      >
                                          Enforce Merit Deduction
                                      </button>
                                  </form>
                              </div>
                          </div>
                      )}

                      {disciplineTab === 'restrictions' && (
                          <div className="space-y-4 animate-in fade-in duration-200">
                              {/* INFUSED/COMBINED SECTION: SUSPENSIONS AND SERVICE LIMITS */}
                              <div>
                                  <h3 className="text-xs font-bold text-amber-500 uppercase tracking-widest font-mono mb-2">
                                      Executive Suspension Hold (Full Block)
                                  </h3>
                                  <form onSubmit={handleAdminSuspendUser} className="space-y-3 p-4 bg-amber-950/10 border border-amber-955/20 rounded-2xl">
                                      <div className="flex gap-2">
                                          <div className="w-1/3 space-y-1">
                                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Duration</label>
                                              <select 
                                                  value={suspendHours} 
                                                  onChange={e => setSuspendHours(e.target.value)}
                                                  className="w-full p-2 bg-slate-950 border border-slate-850 rounded-xl text-xs text-white outline-none focus:border-amber-500"
                                              >
                                                  <option value="24">24 Hours</option>
                                                  <option value="48">48 Hours (Standard)</option>
                                                  <option value="72">72 Hours</option>
                                                  <option value="168">1 Week</option>
                                                  <option value="indefinite">Indefinite Hold</option>
                                              </select>
                                          </div>
                                          <div className="flex-1 space-y-1">
                                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Clause Reason</label>
                                              <input 
                                                  type="text" 
                                                  placeholder="e.g. Disciplinary hold"
                                                  value={suspendReason} 
                                                  onChange={e => setSuspendReason(e.target.value)}
                                                  className="w-full p-2 bg-slate-950 border border-slate-850 rounded-xl text-xs text-white outline-none focus:border-amber-500"
                                                  required
                                              />
                                          </div>
                                      </div>
                                      <button
                                          type="submit"
                                          className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-2 px-4 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-amber-950/25"
                                      >
                                          Enforce Account Suspension
                                      </button>
                                  </form>
                              </div>

                              <div>
                                  <h3 className="text-xs font-bold text-orange-500 uppercase tracking-widest font-mono mb-2">
                                      Granular Service Level Restrictions (Partial)
                                  </h3>
                                  <form onSubmit={handleAdminLimitServices} className="space-y-3 p-4 bg-orange-950/10 border border-orange-900/20 rounded-2xl">
                                      <div className="space-y-2">
                                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Select Blocked Features</label>
                                          <div className="grid grid-cols-2 gap-2">
                                              {['chat', 'club_chat', 'create_club', 'join_club'].map(service => (
                                                  <label key={service} className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                                                      <input 
                                                          type="checkbox" 
                                                          checked={limitServices.includes(service)}
                                                          onChange={(e) => {
                                                              if (e.target.checked) {
                                                                  setLimitServices([...limitServices, service]);
                                                              } else {
                                                                  setLimitServices(limitServices.filter(s => s !== service));
                                                              }
                                                          }}
                                                          className="bg-slate-900 border-slate-700 rounded text-orange-500 focus:ring-orange-500"
                                                      />
                                                      <span className="capitalize">{service.replace('_', ' ')}</span>
                                                  </label>
                                              ))}
                                          </div>
                                      </div>
                                      <div className="flex gap-2">
                                          <div className="w-1/3 space-y-1">
                                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Duration</label>
                                              <select 
                                                  value={limitHours} 
                                                  onChange={e => setLimitHours(e.target.value)}
                                                  className="w-full p-2 bg-slate-950 border border-slate-850 rounded-xl text-xs text-white outline-none focus:border-orange-500"
                                              >
                                                  <option value="24">24 Hours</option>
                                                  <option value="48">48 Hours (Standard)</option>
                                                  <option value="72">72 Hours</option>
                                                  <option value="168">1 Week</option>
                                                  <option value="indefinite">Indefinite</option>
                                              </select>
                                          </div>
                                          <div className="flex-1 space-y-1">
                                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Infraction Description</label>
                                              <input 
                                                  type="text" 
                                                  placeholder="e.g. Chat privilege abuse"
                                                  value={limitReason} 
                                                  onChange={e => setLimitReason(e.target.value)}
                                                  className="w-full p-2 bg-slate-950 border border-slate-850 rounded-xl text-xs text-white outline-none focus:border-orange-500"
                                                  required={limitServices.length > 0}
                                              />
                                          </div>
                                      </div>
                                      <button
                                          type="submit"
                                          className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 px-4 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-orange-950/25 mt-2"
                                      >
                                          Update Service Limits
                                      </button>
                                  </form>
                              </div>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};