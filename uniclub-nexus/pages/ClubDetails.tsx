import React, { useEffect, useState } from 'react';
import { useParams, Navigate, Link } from 'react-router-dom';
import { db } from '../services/mockFirebase';
import { Club, Announcement, Project } from '../types';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Megaphone, FolderGit2, CheckCircle, Clock } from 'lucide-react';

export const ClubDetails = () => {
  const { clubId } = useParams<{ clubId: string }>();
  const { user } = useAuth();
  const [club, setClub] = useState<Club | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
          if (!clubId) return;
          setLoading(true);
          const clubData = await db.getClub(clubId);
          setClub(clubData);

          if (clubData) {
            // Fetch club specific announcements and projects
            const [allAnnounce, allProjects] = await Promise.all([
                 db.getAnnouncements(clubId),
                 db.getProjects(clubId)
            ]);
            setAnnouncements(allAnnounce);
            setProjects(allProjects);
          }
      } catch (err) {
          console.error("Failed to load club details:", err);
          setError("Failed to load club information.");
      } finally {
          setLoading(false);
      }
    };
    fetchData();
  }, [clubId]);

  if (loading) return <div className="p-10 text-center">Loading Club Details...</div>;
  if (error) return <div className="p-10 text-center text-red-500">{error}</div>;
  if (!club) return <div className="p-10 text-center text-red-500">Club not found.</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Back Button */}
      <Link to="/clubs" className="inline-flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-medium">
        <ArrowLeft size={18} /> Back to Clubs
      </Link>

      {/* Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden relative">
        <div className="h-48 bg-slate-100 relative">
            <img src={club.imageUrl} className="w-full h-full object-cover opacity-50 blur-sm" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        </div>
        <div className="relative px-8 pb-8 -mt-16 flex flex-col md:flex-row items-end gap-6">
            <div className="w-32 h-32 bg-white rounded-xl shadow-lg p-1">
                <img src={club.imageUrl} className="w-full h-full object-cover rounded-lg" />
            </div>
            <div className="flex-1 text-white md:text-slate-900 mb-2">
                <h1 className="text-4xl font-bold">{club.name}</h1>
                <p className="opacity-90 md:text-slate-500 font-medium mt-1">{club.description}</p>
            </div>
            {/* If user is leader of this club, show manage button */}
            {user?.leadingClubId === club.id && (
                <Link to={`/club-panel/${club.id}`} className="mb-4 bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700">
                    Manage Club
                </Link>
            )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Announcements Section */}
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <Megaphone className="text-orange-500" /> Leader Announcements
            </h2>
            {announcements.length === 0 ? (
                <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-400">
                    No announcements yet.
                </div>
            ) : (
                <div className="space-y-4">
                    {announcements.map(a => (
                        <div key={a.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                            <h3 className="text-lg font-bold text-slate-800">{a.title}</h3>
                            <p className="text-xs text-slate-400 mt-1 mb-3">Posted by {a.authorName} on {new Date(a.date).toLocaleDateString()}</p>
                            <p className="text-slate-600 whitespace-pre-wrap">{a.content}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>

        {/* Projects Section */}
        <div className="space-y-6">
             <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <FolderGit2 className="text-blue-500" /> Club Projects
            </h2>
            {projects.length === 0 ? (
                <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-400">
                    No active projects.
                </div>
            ) : (
                <div className="grid gap-4">
                    {projects.map(p => (
                        <div key={p.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                             <div className="w-16 h-16 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0">
                                <img src={p.imageUrl} className="w-full h-full object-cover" />
                             </div>
                             <div className="flex-1">
                                <h3 className="font-bold text-slate-800">{p.title}</h3>
                                <p className="text-sm text-slate-500 line-clamp-1">{p.description}</p>
                             </div>
                             <div className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${
                                 p.status === 'Done' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                             }`}>
                                 {p.status === 'Done' ? <CheckCircle size={12}/> : <Clock size={12}/>}
                                 {p.status || 'In Progress'}
                             </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
      </div>
    </div>
  );
};