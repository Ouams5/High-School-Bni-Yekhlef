import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/mockFirebase';
import { Announcement } from '../types';
import { Plus, X, Sparkles } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

export const Announcements = () => {
  const { canAnnounce, user } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [showModal, setShowModal] = useState(false);
  
  // Form State
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isImportant, setIsImportant] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

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
  };

  const generateWithAI = async () => {
    if (!process.env.API_KEY) {
        alert("API Key not found in environment. Simulated generation.");
        setContent("This is a simulated AI generated announcement. The system is working perfectly but requires a real API key for dynamic text generation.");
        return;
    }
    
    setIsGenerating(true);
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Write a formal yet engaging university announcement about "${title || 'an upcoming event'}"`,
        });
        if (response.text) {
            setContent(response.text);
        }
    } catch (err) {
        console.error(err);
        setContent("Failed to generate content. Please try again.");
    } finally {
        setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-800">Announcements</h1>
        {canAnnounce && (
          <button 
            onClick={() => setShowModal(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700 transition-colors"
          >
            <Plus size={18} /> New Announcement
          </button>
        )}
      </div>

      <div className="space-y-4">
        {announcements.length === 0 ? <p className="text-slate-500">No announcements yet.</p> : announcements.map((a) => (
          <div key={a.id} className={`p-6 bg-white rounded-xl shadow-sm border-l-4 ${a.isImportant ? 'border-l-red-500' : 'border-l-indigo-500'}`}>
            <div className="flex justify-between items-start mb-2">
                <div>
                    <h2 className="text-xl font-bold text-slate-900">{a.title}</h2>
                    <p className="text-xs text-slate-500">Posted by {a.authorName} on {new Date(a.date).toLocaleDateString()}</p>
                </div>
                {a.isImportant && <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-1 rounded">URGENT</span>}
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
                    <button 
                        type="button" 
                        onClick={generateWithAI}
                        disabled={isGenerating}
                        className="text-xs flex items-center gap-1 text-purple-600 font-bold hover:text-purple-800 disabled:opacity-50"
                    >
                        <Sparkles size={12} /> {isGenerating ? 'Thinking...' : 'AI Draft'}
                    </button>
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
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Post</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};