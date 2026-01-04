import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/mockFirebase';
import { Briefcase, Users, Activity, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Home = () => {
  const { user } = useAuth();
  const [counts, setCounts] = useState({
    projects: 0,
    clubs: 0,
    activity: 0
  });

  const fetchStats = async () => {
      const [projects, events] = await Promise.all([
          db.getProjects(),
          db.getEvents()
      ]);
      setCounts({
          projects: projects.length,
          clubs: user?.joinedClubIds?.length || 0,
          activity: events.length
      });
  }

  useEffect(() => {
    fetchStats();
  }, [user]);

  const StatCard = ({ icon: Icon, label, value, subtext, linkTo }: any) => (
    <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] hover:shadow-lg transition-all duration-300 group">
      <div className="flex items-start gap-4 mb-8">
        <div className="p-3.5 rounded-xl bg-blue-50 text-blue-600 group-hover:scale-110 transition-transform duration-300">
          <Icon size={26} strokeWidth={1.5} />
        </div>
        <h3 className="text-lg font-bold text-slate-700 mt-2">{label}</h3>
      </div>
      
      <div>
        <span className="text-5xl font-bold text-blue-900 tracking-tight block mb-3">{value}</span>
        <Link to={linkTo} className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors">
          {subtext}
        </Link>
      </div>
    </div>
  );

  return (
    <div className="space-y-10">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-blue-900">Dashboard Overview</h2>
        <button onClick={fetchStats} className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-white rounded-full transition-all border border-transparent hover:border-slate-200 hover:shadow-sm">
          <RefreshCw size={20} />
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        <StatCard 
          icon={Briefcase} 
          label="My Projects" 
          value={counts.projects} 
          subtext="Active projects"
          linkTo="/projects"
        />
        <StatCard 
          icon={Users} 
          label="Clubs Joined" 
          value={counts.clubs} 
          subtext="Active memberships"
          linkTo="/clubs"
        />
        <StatCard 
          icon={Activity} 
          label="Activity" 
          value={counts.activity} 
          subtext="This week"
          linkTo="/events"
        />
      </div>

      <div className="space-y-6">
        <h3 className="text-2xl font-bold text-blue-900">Recent Activity</h3>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm min-h-[300px] flex flex-col items-center justify-center p-12">
           <div className="text-center">
             <p className="text-slate-400 text-lg font-medium mb-8">No recent activity</p>
             <div className="w-48 h-1.5 bg-slate-900 rounded-full mx-auto opacity-80"></div>
           </div>
        </div>
      </div>
    </div>
  );
};