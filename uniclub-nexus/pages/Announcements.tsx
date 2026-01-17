import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/mockFirebase';
import { Announcement } from '../types';
import { Plus, X, Trash2, Megaphone, Loader2, Eraser } from 'lucide-react';

export const Announcements = () => {
  const { canAnnounce, user, isOwner } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [showModal, setShowModal] = useState(false);
  
  // Form State
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isImportant, setIsImportant] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
      const data = await db.getAnnouncements();
      setAnnouncements(data);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
        await db.addAnnouncement({
            id: Date.now().toString(),
            title,
            content,
            isImportant,
            authorName: user.name,
            date: new Date().toISOString()
        });
        
        setShowModal(false);
        setTitle('');
        setContent('');
        setIsImportant(false);
        loadData();
    } catch (error) {
        console.error(error);
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (confirm("Are you sure you want to delete this announcement?")) {
          await db.deleteAnnouncement(id);
          loadData();
      }
  };

  const handleClearAll = async () => {
    if (confirm("DANGER: This will delete ALL announcements and their notifications permanently. This action cannot be undone. Are you sure?")) {
        await db.deleteAllAnnouncements();
        loadData();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-800">Announcements</h1>
        <div className="flex gap-2">
            {isOwner && announcements.length > 0 && (
                <button 
                    onClick={handleClearAll}
                    className="text-red-600 hover:bg-red-50 border border-red-200 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                    title="Delete All Announcements"
                >
                    <Eraser size={18} /> Clear All
                </button>
            )}
            {canAnnounce && (
            <button 
                onClick={() => setShowModal(true)}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700 transition-colors"
            >
                <Plus size={18} /> New Announcement
            </button>
            )}
        </div>
      </div>

      <div className="space-y-4">
        {announcements.length === 0 ? <p className="text-slate-500">No announcements yet.</p> : announcements.map((a) => (
          <div key={a.id} className={`p-6 bg-white rounded-xl shadow-sm border-l-4 relative group transition-all hover:shadow-md ${a.isImportant ? 'border-l-red-500' : 'border-l-indigo-500'}`}>
            {canAnnounce && (
                <button 
                    type="button"
                    onClick={(e) => handleDelete(a.id, e)}
                    className="absolute top-4 right-4 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all z-10 p-2 cursor-pointer bg-white/50 hover:bg-white rounded-full"
                    title="Delete Announcement"
                >
                    <Trash2 size={18} />
                </button>
            )}
            <div className="flex justify-between items-start mb-2 pr-12">
                <div>
                    <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2 flex-wrap">
                        {a.title}
                        {a.clubName && (
                            <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full flex items-center gap-1 font-normal">
                                <Megaphone size={10} /> {a.clubName}
                            </span>
                        )}
                    </h2>
                    <p className="text-xs text-slate-500">
                        Posted by {a.authorName} on {new Date(a.date).toLocaleDateString()}
                    </p>
                </div>
                {a.isImportant && <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-1 rounded whitespace-nowrap">URGENT</span>}
            </div>
            <p className="text-slate-600 whitespace-pre-wrap">{a.content}</p>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 relative">
            <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X size={20} /></button>
            <h2 className="text-2xl font-bold mb-4">Create Announcement</h2>
            
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                <input 
                  type="text" 
                  value={title} 
                  onChange={e => setTitle(e.target.value)} 
                  required
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" 
                />
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-1">
                    <label className="block text-sm font-medium text-slate-700">Content</label>
                </div>
                <textarea 
                  value={content} 
                  onChange={e => setContent(e.target.value)} 
                  required
                  rows={5}
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" 
                />
              </div>

              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="imp" 
                  checked={isImportant} 
                  onChange={e => setIsImportant(e.target.checked)} 
                  className="w-4 h-4 text-indigo-600"
                />
                <label htmlFor="imp" className="text-sm text-slate-700">Mark as Important</label>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
                <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                >
                    {isSubmitting && <Loader2 className="animate-spin" size={16} />}
                    {isSubmitting ? 'Posting...' : 'Post'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};