import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useUI } from '../context/UIContext';
import { db } from '../services/mockFirebase';
import { AppEvent } from '../types';
import { Plus, Calendar as CalIcon, MapPin, Trash2 } from 'lucide-react';

export const Events = () => {
  const { canAnnounce, user, isOwner } = useAuth();
  const { t } = useLanguage();
  const { showToast, confirm } = useUI();
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ title: '', description: '', location: '', date: '' });

  const loadData = async () => {
      const data = await db.getEvents();
      setEvents(data);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await db.addEvent({
        id: Date.now().toString(),
        ...formData,
        organizer: user?.name || 'Admin'
    });
    setShowModal(false);
    setFormData({ title: '', description: '', location: '', date: '' });
    showToast("Event created successfully!", "success");
    loadData();
  };

  const handleDelete = async (id: string) => {
      const confirmed = await confirm({
          title: "Delete Event",
          message: "Are you sure you want to delete this event?",
          type: "danger"
      });

      if (confirmed) {
          await db.deleteEvent(id);
          showToast("Event deleted.", "success");
          loadData();
      }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center shrink-0">
                    <CalIcon size={28} />
                </div>
                <div>
                    <h1 className="text-3xl font-black font-display text-slate-800 dark:text-slate-100 tracking-tight">{t('upcomingEvents')}</h1>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">Join the next campus activities and workshops.</p>
                </div>
            </div>
            {canAnnounce && (
                <button onClick={() => setShowModal(true)} className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-emerald-200 dark:shadow-none flex items-center gap-2 hover:bg-emerald-700 hover:-translate-y-0.5 transition-all w-full sm:w-auto justify-center">
                    <Plus size={20} /> {t('addEvent')}
                </button>
            )}
        </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {events.length === 0 ? (
            <div className="col-span-full py-20 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800">
                <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CalIcon size={40} className="text-slate-300 dark:text-slate-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-700 dark:text-slate-200 mb-2">{t('noEvents')}</h3>
                <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto">There are no scheduled events at the moment. Check back later.</p>
            </div>
        ) : events.map(ev => (
            <div key={ev.id} className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-xl hover:shadow-emerald-100 dark:hover:shadow-none transition-all duration-300 relative group flex flex-col h-full focus-within:ring-2 focus-within:ring-emerald-500">
                {isOwner && (
                    <button 
                        onClick={() => handleDelete(ev.id)}
                        className="absolute top-4 right-4 text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 p-2 rounded-xl transition-all opacity-0 group-hover:opacity-100 z-10"
                        title="Delete Event"
                    >
                        <Trash2 size={16} />
                    </button>
                )}
                <div className="flex gap-4 items-start mb-6">
                    <div className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 p-3 rounded-2xl text-center min-w-[70px] shrink-0 border border-emerald-100 dark:border-emerald-800 flex flex-col items-center justify-center shadow-inner">
                        <span className="block text-[10px] font-bold uppercase tracking-widest leading-none mb-1">{new Date(ev.date).toLocaleString('default', { month: 'short' })}</span>
                        <span className="block text-2xl font-black font-display leading-none">{new Date(ev.date).getDate()}</span>
                    </div>
                    <div className="flex-1 min-w-0 pr-6">
                        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 leading-tight mb-2 line-clamp-2">{ev.title}</h3>
                        <div className="flex flex-col gap-1.5 text-slate-500 dark:text-slate-400 text-xs font-medium">
                            <span className="flex items-center gap-1.5"><CalIcon size={14} className="text-emerald-500"/> {new Date(ev.date).toLocaleTimeString([], {timeStyle: 'short'})}</span>
                            <span className="flex items-center gap-1.5 truncate"><MapPin size={14} className="text-emerald-500"/> {ev.location}</span>
                        </div>
                    </div>
                </div>
                <div className="flex-1 flex flex-col">
                    <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed line-clamp-4">{ev.description}</p>
                </div>
            </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200 border border-slate-100 dark:border-slate-800">
                <div className="mb-6">
                    <h2 className="text-2xl font-black font-display text-slate-800 dark:text-slate-100">{t('createEvent')}</h2>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">Schedule a new gathering or academic milestone.</p>
                </div>
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">Event Title</label>
                        <input className="w-full p-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-sm font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500/50 transition-all font-sans" placeholder={t('eventTitle')} required onChange={e => setFormData({...formData, title: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">Description</label>
                        <textarea rows={4} className="w-full p-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-sm font-medium text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500/50 transition-all font-sans resize-none" placeholder={t('description')} required onChange={e => setFormData({...formData, description: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">Location</label>
                            <input className="w-full p-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-sm font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500/50 transition-all font-sans" placeholder={t('location')} required onChange={e => setFormData({...formData, location: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">Date & Time</label>
                            <input type="datetime-local" className="w-full p-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-sm font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500/50 transition-all font-sans" required onChange={e => setFormData({...formData, date: e.target.value})} />
                        </div>
                    </div>
                    
                    <div className="flex justify-end gap-3 pt-4">
                        <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors w-full sm:w-auto">{t('cancel')}</button>
                        <button type="submit" className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl transition-all shadow-md shadow-emerald-200 dark:shadow-none flex items-center justify-center gap-2 w-full sm:w-auto">
                            {t('create')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};