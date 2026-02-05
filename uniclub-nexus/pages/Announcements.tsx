import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { db } from '../services/mockFirebase';
import { translateAnnouncement } from '../services/ai';
import { Announcement } from '../types';
import { Plus, X, Trash2, Megaphone, Loader2, Eraser, Languages, Globe } from 'lucide-react';

export const Announcements = () => {
  const { canAnnounce, user, isOwner } = useAuth();
  const { t, language } = useLanguage();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [showModal, setShowModal] = useState(false);
  
  // Form State
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isImportant, setIsImportant] = useState(false);
  const [autoTranslate, setAutoTranslate] = useState(false);
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
        let translations = undefined;
        
        if (autoTranslate) {
            translations = await translateAnnouncement(title, content);
        }

        await db.addAnnouncement({
            id: Date.now().toString(),
            title,
            content,
            isImportant,
            authorName: user.name,
            date: new Date().toISOString(),
            translations
        });
        
        setShowModal(false);
        setTitle('');
        setContent('');
        setIsImportant(false);
        setAutoTranslate(false);
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
      if (confirm(t('deleteAnnouncementConfirm'))) {
          await db.deleteAnnouncement(id);
          loadData();
      }
  };

  const handleClearAll = async () => {
    if (confirm(t('clearAllConfirm'))) {
        await db.deleteAllAnnouncements();
        loadData();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-800">{t('announcements')}</h1>
        <div className="flex gap-2">
            {isOwner && announcements.length > 0 && (
                <button 
                    onClick={handleClearAll}
                    className="text-red-600 hover:bg-red-50 border border-red-200 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                    title={t('clearAll')}
                >
                    <Eraser size={18} /> {t('clearAll')}
                </button>
            )}
            {canAnnounce && (
            <button 
                onClick={() => setShowModal(true)}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700 transition-colors"
            >
                <Plus size={18} /> {t('newAnnouncement')}
            </button>
            )}
        </div>
      </div>

      <div className="space-y-4">
        {announcements.length === 0 ? <p className="text-slate-500">{t('noAnnouncements')}</p> : announcements.map((a) => {
          // Determine content based on current language
          const hasTranslation = a.translations && a.translations[language];
          const displayTitle = hasTranslation ? a.translations[language]!.title : a.title;
          const displayContent = hasTranslation ? a.translations[language]!.content : a.content;
          
          return (
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
                            {displayTitle}
                            {a.clubName && (
                                <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full flex items-center gap-1 font-normal">
                                    <Megaphone size={10} /> {a.clubName}
                                </span>
                            )}
                            {hasTranslation && (
                                <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full flex items-center gap-1 font-normal" title="Translated automatically">
                                    <Languages size={10} /> Translated
                                </span>
                            )}
                        </h2>
                        <p className="text-xs text-slate-500">
                            {t('postedBy')} {a.authorName} on {new Date(a.date).toLocaleDateString()}
                        </p>
                    </div>
                    {a.isImportant && <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-1 rounded whitespace-nowrap">{t('urgent')}</span>}
                </div>
                <p className="text-slate-600 whitespace-pre-wrap">{displayContent}</p>
            </div>
          );
        })}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 relative">
            <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X size={20} /></button>
            <h2 className="text-2xl font-bold mb-4">{t('createAnnouncement')}</h2>
            
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('title')}</label>
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
                    <label className="block text-sm font-medium text-slate-700">{t('content')}</label>
                </div>
                <textarea 
                  value={content} 
                  onChange={e => setContent(e.target.value)} 
                  required
                  rows={5}
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" 
                />
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                    <input 
                    type="checkbox" 
                    id="imp" 
                    checked={isImportant} 
                    onChange={e => setIsImportant(e.target.checked)} 
                    className="w-4 h-4 text-indigo-600"
                    />
                    <label htmlFor="imp" className="text-sm text-slate-700">{t('markImportant')}</label>
                </div>
                <div className="flex items-center gap-2">
                    <input 
                    type="checkbox" 
                    id="trans" 
                    checked={autoTranslate} 
                    onChange={e => setAutoTranslate(e.target.checked)} 
                    className="w-4 h-4 text-indigo-600"
                    />
                    <label htmlFor="trans" className="text-sm text-slate-700 flex items-center gap-2">
                        Auto-translate to user's language <Globe size={14} className="text-blue-500"/>
                    </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">{t('cancel')}</button>
                <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                >
                    {isSubmitting && <Loader2 className="animate-spin" size={16} />}
                    {isSubmitting ? (autoTranslate ? 'Translating & Posting...' : t('posting')) : t('post')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};