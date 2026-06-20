import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useUI } from '../context/UIContext';
import { db } from '../services/mockFirebase';
import { Project } from '../types';
import { Plus, CheckCircle, Clock, Trash2, Rocket, User as UserIcon } from 'lucide-react';

export const Projects = () => {
    const { canCreateClub, user, isOwner } = useAuth();
    const { t } = useLanguage();
    const { showToast, confirm } = useUI();
    const [projects, setProjects] = useState<Project[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({ title: '', description: '' });

    const loadData = async () => {
        const data = await db.getProjects();
        setProjects(data);
    };

    useEffect(() => { loadData(); }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        await db.addProject({
            id: Date.now().toString(),
            ...formData,
            imageUrl: `https://picsum.photos/seed/${Date.now()}/300/200`,
            contributors: [user?.name || 'Unknown'],
            status: 'In Progress'
        });
        setShowModal(false);
        setFormData({ title: '', description: ''});
        showToast("Project added!", "success");
        loadData();
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation(); // prevent triggering other clicks if any
        const confirmed = await confirm({
            title: "Delete Project",
            message: "Are you sure you want to delete this project?",
            type: "danger"
        });

        if (confirmed) {
            await db.deleteProject(id);
            showToast("Project deleted.", "success");
            loadData();
        }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center shrink-0">
                        <CheckCircle size={28} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black font-display text-slate-800 dark:text-slate-100 tracking-tight">{t('studentProjects')}</h1>
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">Discover what our community is building.</p>
                    </div>
                </div>
                {canCreateClub && (
                    <button onClick={() => setShowModal(true)} className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-indigo-200 dark:shadow-none flex items-center gap-2 hover:bg-indigo-700 hover:-translate-y-0.5 transition-all w-full sm:w-auto justify-center">
                        <Plus size={20} /> {t('addProject')}
                    </button>
                )}
            </div>

            {/* Fluid Grid */}
            <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-8">
                {projects.length === 0 ? (
                    <div className="col-span-full py-20 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800">
                        <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Plus size={40} className="text-slate-300 dark:text-slate-600" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-700 dark:text-slate-200 mb-2">{t('noProjects')}</h3>
                        <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto">Be the first to create and publish a student project here.</p>
                    </div>
                ) : projects.map(p => (
                    <div key={p.id} className="group bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-sm hover:shadow-xl hover:shadow-indigo-100 dark:hover:shadow-none transition-all duration-300 border border-slate-100 dark:border-slate-800 flex flex-col relative focus-within:ring-2 focus-within:ring-indigo-500">
                        <div className="relative h-56 overflow-hidden bg-slate-100 dark:bg-slate-800">
                            <img src={p.imageUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-in-out" alt={p.title} />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/20 to-transparent"></div>
                            
                            <div className="absolute bottom-4 left-5 right-5">
                                <h3 className="text-white font-black font-display text-2xl leading-tight line-clamp-2 drop-shadow-md">{p.title}</h3>
                            </div>
                            
                             <div className="absolute top-4 right-4 flex gap-2">
                                {isOwner && (
                                    <button 
                                        onClick={(e) => handleDelete(p.id, e)}
                                        className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md text-rose-500 p-2 rounded-xl hover:bg-white dark:hover:bg-slate-700 transition-colors shadow-sm"
                                        title="Delete Project"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                )}
                             </div>
                             
                             {/* Status Badge */}
                             <div className="absolute top-4 left-4">
                                <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm backdrop-blur-md ${
                                    p.status === 'Done' ? 'bg-emerald-500/90 text-white' : 'bg-amber-500/90 text-white'
                                }`}>
                                     {p.status === 'Done' ? <CheckCircle size={12}/> : <Clock size={12}/>}
                                     {p.status === 'Done' ? t('done') : t('inProgress')}
                                </span>
                             </div>
                        </div>
                        <div className="p-6 flex-1 flex flex-col">
                            <p className="text-slate-600 dark:text-slate-400 text-sm mb-6 line-clamp-3 leading-relaxed">{p.description}</p>
                            <div className="mt-auto">
                                <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Contributors</div>
                                <div className="flex flex-wrap gap-2">
                                    {p.contributors.map((c, i) => (
                                        <span key={i} className="text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-3 py-1.5 rounded-xl flex items-center gap-1.5 truncate max-w-[150px]">
                                            {c}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200 border border-slate-100 dark:border-slate-800">
                        <div className="mb-6">
                            <h2 className="text-2xl font-black font-display text-slate-800 dark:text-slate-100">{t('showcaseProject')}</h2>
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">Share your team's masterpiece with the community.</p>
                        </div>
                        <form onSubmit={handleCreate} className="space-y-5">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">Project Title</label>
                                <input className="w-full p-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-sm font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/50 transition-all font-sans" placeholder={t('projectTitle')} required onChange={e => setFormData({...formData, title: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">Description</label>
                                <textarea rows={4} className="w-full p-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-sm font-medium text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/50 transition-all resize-none font-sans" placeholder={t('shortDesc')} required onChange={e => setFormData({...formData, description: e.target.value})} />
                            </div>
                            <div className="flex justify-end gap-3 pt-4">
                                <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors w-full sm:w-auto">{t('cancel')}</button>
                                <button type="submit" className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-all shadow-md shadow-indigo-200 dark:shadow-none flex items-center justify-center gap-2 w-full sm:w-auto">
                                    <CheckCircle size={16} /> {t('add')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};