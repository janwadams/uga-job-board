//src/pages/rep/dashboard.tsx - updated with link clicks instead of applications

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/router';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import { 
  CursorArrowRaysIcon,
  ChartBarIcon 
} from '@heroicons/react/24/outline';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ... [Keep the existing interfaces and JobCard component as they are] ...

export default function RepDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'active' | 'archived' | 'rejected'>('active');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [archivedJobs, setArchivedJobs] = useState<Job[]>([]);
  const [rejectedJobs, setRejectedJobs] = useState<Job[]>([]);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadingArchived, setLoadingArchived] = useState(true);
  const [loadingRejected, setLoadingRejected] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [userRole, setUserRole] = useState<string | null>(null);
  
  // updated state for link clicks count instead of applications
  const [linkClicksCount, setLinkClicksCount] = useState(0);

  // ... [Keep the checkSession useEffect as is] ...

  // Updated function to fetch link clicks count
  const fetchLinkClicksCount = async () => {
    if (!session) return;
    
    try {
      const { data: jobs } = await supabase
        .from('jobs')
        .select('id')
        .eq('created_by', session.user.id);
      
      if (jobs && jobs.length > 0) {
        const { count } = await supabase
          .from('job_link_clicks')
          .select('*', { count: 'exact', head: true })
          .in('job_id', jobs.map(j => j.id));
        
        setLinkClicksCount(count || 0);
      } else {
        setLinkClicksCount(0);
      }
    } catch (error) {
      console.error('Error fetching link clicks count:', error);
    }
  };

  // Update the useEffect that fetches jobs
  useEffect(() => {
    const fetchJobs = async () => {
      // ... [Keep existing fetchJobs logic] ...
    };

    if (session) {
      fetchJobs();
      fetchLinkClicksCount(); // Changed from fetchApplicationsCount
    }
  }, [session, statusFilter]);

  // ... [Keep all other useEffects and functions as they are] ...

  return (
    <div className="bg-gray-50 min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-red-800">💼 Rep Dashboard</h1>
          <div className="flex gap-3">
            {/* Updated button - removed applications view */}
            <Link href="/rep/analytics">
              <button className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2">
                <ChartBarIcon className="h-5 w-5" />
                View Analytics
              </button>
            </Link>
            <Link href="/rep/create">
              <button className="bg-red-700 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-800 transition-colors shadow-sm">
                + Post a New Job
              </button>
            </Link>
          </div>
        </div>

        {/* Updated metrics cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <h3 className="text-gray-500 font-semibold">Total Posted</h3>
            <p className="text-4xl font-bold text-gray-800 mt-2">{totalJobs}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <h3 className="text-gray-500 font-semibold">Active</h3>
            <p className="text-4xl font-bold text-green-600 mt-2">{activeJobs}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <h3 className="text-gray-500 font-semibold">Pending</h3>
            <p className="text-4xl font-bold text-yellow-500 mt-2">{pendingJobs}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <h3 className="text-gray-500 font-semibold">Rejected</h3>
            <p className="text-4xl font-bold text-red-600 mt-2">{totalRejected}</p>
          </div>
          {/* Updated card showing link clicks instead of applications */}
          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 border-l-4 border-l-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-gray-500 font-semibold">Link Clicks</h3>
                <p className="text-4xl font-bold text-purple-600 mt-2">{linkClicksCount}</p>
                <p className="text-xs text-gray-600 mt-1">Student engagement</p>
              </div>
              <CursorArrowRaysIcon className="h-10 w-10 text-purple-500" />
            </div>
          </div>
        </div>

        {/* ... [Keep the rest of the component as is - tabs and content sections] ... */}
      </div>
    </div>
  );
}