import React, { useState } from 'react';
import { db } from '../services/mockFirebase';
import { useAuth } from '../context/AuthContext';
import { Bug, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';

export const BugReportPage = () => {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [submitted, setSubmitted] = useState(false);

  // Restrict access for guests
  if (!user) {
      return (
          <div className="max-w-md mx-auto mt-20 text-center bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
              <div className="mx-auto w-16 h-16 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center mb-4">
                  <Lock size={32}/>
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Access Restricted</h2>
              <p className="text-slate-500 mb-6">You must be logged in to submit a bug report.</p>
              <Link to="/login" className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700">Login</Link>
          </div>
      );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await db.addBugReport({
        id: Date.now().toString(),
        title,
        description: desc,
        severity: 'medium',
        status: 'open',
        submittedBy: user.id
    });
    setSubmitted(true);
  };

  if (submitted) {
    return (
        <div className="text-center py-20 bg-white rounded-2xl shadow-sm">
            <div className="mx-auto w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
                <Bug size={32}/>
            </div>
            <h2 className="text-2xl font-bold text-slate-800">Report Submitted</h2>
            <p className="text-slate-500">Thank you for helping us improve Nexus.</p>
            <button onClick={() => {setSubmitted(false); setTitle(''); setDesc('');}} className="mt-6 text-indigo-600 font-medium">Report another</button>
        </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
            <h1 className="text-2xl font-bold flex items-center gap-2 mb-6 text-slate-800">
                <Bug className="text-red-500" /> Report a Bug
            </h1>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Issue Title</label>
                    <input className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-red-200 outline-none" value={title} onChange={e => setTitle(e.target.value)} required />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                    <textarea className="w-full p-2 border rounded-lg h-32 focus:ring-2 focus:ring-red-200 outline-none" value={desc} onChange={e => setDesc(e.target.value)} required placeholder="Steps to reproduce..." />
                </div>
                <button type="submit" className="w-full bg-slate-900 text-white py-3 rounded-lg hover:bg-slate-800 transition-colors">Submit Report</button>
            </form>
        </div>
    </div>
  );
};