import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/mockFirebase';
import { Project } from '../types';
import { Plus, CheckCircle, Clock } from 'lucide-react';

export const Projects = () => {
    const { canCreateClub, user } = useAuth(); // Reusing admin perm
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
        loadData();
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-slate-800">Student Projects</h1>
                {canCreateClub && (
                    <button onClick={() => setShowModal(true)} className="bg-teal-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-teal-700">
                        <Plus size={18} /> Add Project
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {projects.length === 0 ? <p className="text-slate-500 col-span-3">No projects showcased yet.</p> : projects.map(p => (
                    <div key={p.id} className="group bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow border border-slate-200 flex flex-col">
                        <div className="relative h-48 overflow-hidden">
                            <img src={p.imageUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={p.title} />
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                                <h3 className="text-white font-bold text-lg">{p.title}</h3>
                            </div>
                             <div className="absolute top-3 right-3">
                                <span className={`px-2 py-1 rounded-md text-xs font-bold flex items-center gap-1 shadow-sm ${
                                    p.status === 'Done' ? 'bg-green-500 text-white' : 'bg-amber-500 text-white'
                                }`}>
                                     {p.status === 'Done' ? <CheckCircle size={12}/> : <Clock size={12}/>}
                                     {p.status || 'In Progress'}
                                </span>
                             </div>
                        </div>
                        <div className="p-4 flex-1">
                            <p className="text-slate-600 text-sm mb-4">{p.description}</p>
                            <div className="flex flex-wrap gap-2 mt-auto">
                                {p.contributors.map((c, i) => (
                                    <span key={i} className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded">{c}</span>
                                ))}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white p-6 rounded-2xl w-full max-w-md">
                        <h2 className="text-2xl font-bold mb-4">Showcase Project</h2>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <input className="w-full p-2 border rounded" placeholder="Project Title" required onChange={e => setFormData({...formData, title: e.target.value})} />
                            <textarea className="w-full p-2 border rounded" placeholder="Short Description" required onChange={e => setFormData({...formData, description: e.target.value})} />
                            <div className="flex justify-end gap-2 pt-2">
                                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-slate-500">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-teal-600 text-white rounded">Add</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};