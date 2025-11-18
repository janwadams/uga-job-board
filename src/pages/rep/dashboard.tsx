//src/pages/rep/dashboard.tsx - complete file with link clicks tracking

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/router';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import { 
  CursorArrowRaysIcon,
  ChartBarIcon,
  UserCircleIcon
} from '@heroicons/react/24/outline';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  deadline: string;
  job_type: string;
  status: 'active' | 'pending' | 'removed' | 'rejected' | 'archived';
  created_by: string;
  created_at: string;
  rejection_note?: string;
}

// reusable job card component
const JobCard = ({ job, onRemove, onReactivate, onRevise, isArchived, isRejected }: { 
  job: Job, 
  onRemove?: (jobId: string) => void,
  onReactivate?: (jobId: string) => void,
  onRevise?: (jobId: string) => void,
  isArchived?: boolean,
  isRejected?: boolean 
}) => {
  const statusColors: Record<Job['status'], string> = {
    active: 'bg-green-100 text-green-800',
    pending: 'bg-yellow-100 text-yellow-800',
    removed: 'bg-red-100 text-red-800',
    rejected: 'bg-red-100 text-red-800',
    archived: 'bg-gray-100 text-gray-800',
  };

  const isDisabled = job.status === 'removed' || job.status === 'rejected';

  const getDaysSinceExpired = () => {
    const deadlineDate = new Date(job.deadline);
    const today = new Date();
    const diffTime = today.getTime() - deadlineDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-md p-6 flex flex-col h-full">
      <div className="flex-grow">
        <div className="flex justify-between items-start">
          <h2 className="font-bold text-xl text-gray-800">{job.title}</h2>
          <span className={`px-3 py-1 text-xs font-semibold rounded-full ${statusColors[isArchived ? 'archived' : job.status]}`}>
            {isArchived ? 'Archived' : job.status.charAt(0).toUpperCase() + job.status.slice(1)}
          </span>
        </div>
        <p className="text-gray-600 mb-2">{job.company}</p>
        <p className="text-sm text-gray-500">
          {isArchived 
            ? `Expired: ${new Date(job.deadline).toLocaleDateString()} (${getDaysSinceExpired()} days ago)`
            : `Deadline: ${new Date(job.deadline).toLocaleDateString()}`
          }
        </p>
        {job.location && (
          <p className="text-sm text-gray-500 mt-1">
            Location: {job.location}
          </p>
        )}
        
        {isRejected && job.rejection_note && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
            <p className="text-sm font-semibold text-red-800">Admin Feedback:</p>
            <p className="text-sm text-red-700 mt-1">{job.rejection_note}</p>
          </div>
        )}
      </div>

      <div className="mt-6 pt-4 border-t border-gray-200 flex items-center justify-end gap-3">
        {isArchived ? (
          <>
            <button
              onClick={() => onReactivate && onReactivate(job.id)}
              className="px-4 py-2 rounded font-semibold text-sm bg-green-600 text-white hover:bg-green-700 transition-colors"
            >
              Reactivate
            </button>
            <Link href={`/rep/view/${job.id}`}>
              <button className="px-4 py-2 rounded font-semibold text-sm bg-blue-600 text-white hover:bg-blue-700 transition-colors">
                View Details
              </button>
            </Link>
          </>
        ) : isRejected ? (
          <>
            <button
              onClick={() => onRevise && onRevise(job.id)}
              className="px-4 py-2 rounded font-semibold text-sm bg-yellow-600 text-white hover:bg-yellow-700 transition-colors"
            >
              Revise & Resubmit
            </button>
            <Link href={`/rep/view/${job.id}`}>
              <button className="px-4 py-2 rounded font-semibold text-sm bg-blue-600 text-white hover:bg-blue-700 transition-colors">
                View Full Details
              </button>
            </Link>
          </>
        ) : (
          <>
            <Link href={`/rep/edit/${job.id}`}>
              <button
                disabled={isDisabled}
                className={`px-4 py-2 rounded font-semibold text-sm transition-colors ${
                  isDisabled
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                Edit
              </button>
            </Link>
            <button
              onClick={() => onRemove && onRemove(job.id)}
              disabled={isDisabled}
              className={`px-4 py-2 rounded font-semibold text-sm transition-colors ${
                isDisabled
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  : 'bg-gray-600 text-white hover:bg-gray-700'
              }`}
            >
              Remove
            </button>
          </>
        )}
      </div>
    </div>
  );
};

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
  
  // state for tracking how many times students clicked on job application links
  const [linkClicksCount, setLinkClicksCount] = useState(0);

  useEffect(() => {
    const checkSession = async () => {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !sessionData.session) {
        router.push('/login');
        return;
      }

      const user = sessionData.session.user;
      
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();
        
      if (roleError || !roleData || roleData.role !== 'rep') {
          router.push('/unauthorized');
          return;
      }
      
      setUserRole(roleData.role);
      setSession(sessionData.session);
    };
    checkSession();
  }, [router]);

  // function to fetch link clicks count for this rep's jobs
  const fetchLinkClicks = async (userId: string) => {
    // get all job ids created by this rep
    const { data: repJobs, error: jobsError } = await supabase
      .from('jobs')
      .select('id')
      .eq('created_by', userId);

    if (jobsError || !repJobs) {
      console.error('error fetching rep jobs for link clicks:', jobsError);
      return;
    }

    const jobIds = repJobs.map(job => job.id);

    if (jobIds.length === 0) {
      setLinkClicksCount(0);
      return;
    }

    // count total link clicks for all these jobs
    const { data: clicks, error: clicksError } = await supabase
      .from('job_link_clicks')
      .select('id', { count: 'exact' })
      .in('job_id', jobIds);

    if (clicksError) {
      console.error('error fetching link clicks count:', clicksError);
      return;
    }

    // set the total count of link clicks
    setLinkClicksCount(clicks?.length || 0);
  };

  // fetch active jobs (not archived, not fully removed/rejected)
  useEffect(() => {
    if (!session) return;

    const fetchJobs = async () => {
      const userId = session.user.id;
      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('created_by', userId)
        .gte('deadline', today)
        .neq('status', 'removed')
        .neq('status', 'rejected')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('error fetching jobs:', error);
      } else {
        setJobs(data || []);
      }
      setLoading(false);
    };

    fetchJobs();
  }, [session]);

  // fetch archived jobs (jobs past their deadline)
  useEffect(() => {
    if (!session) return;

    const fetchArchivedJobs = async () => {
      const userId = session.user.id;
      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('created_by', userId)
        .lt('deadline', today)
        .neq('status', 'removed')
        .neq('status', 'rejected')
        .order('deadline', { ascending: false });

      if (error) {
        console.error('error fetching archived jobs:', error);
      } else {
        setArchivedJobs(data || []);
      }
      setLoadingArchived(false);
    };

    fetchArchivedJobs();
  }, [session]);

  // fetch rejected jobs (jobs that admin rejected)
  useEffect(() => {
    if (!session) return;

    const fetchRejectedJobs = async () => {
      const userId = session.user.id;

      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('created_by', userId)
        .eq('status', 'rejected')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('error fetching rejected jobs:', error);
      } else {
        setRejectedJobs(data || []);
      }
      setLoadingRejected(false);
    };

    fetchRejectedJobs();
  }, [session]);

  // fetch link clicks count when session is available
  useEffect(() => {
    if (!session) return;
    fetchLinkClicks(session.user.id);
  }, [session]);

  // function to remove a job (change status to removed)
  const handleRemove = async (jobId: string) => {
    const confirmRemove = confirm('are you sure you want to remove this job posting?');
    if (!confirmRemove) return;

    const { error } = await supabase
      .from('jobs')
      .update({ status: 'removed' })
      .eq('id', jobId);

    if (error) {
      alert('error removing job: ' + error.message);
    } else {
      alert('job removed successfully');
      setJobs((prev) => prev.map((job) => (job.id === jobId ? { ...job, status: 'removed' } : job)));
    }
  };

  // function to reactivate an archived job
  const handleReactivate = async (jobId: string) => {
    router.push(`/rep/reactivate/${jobId}`);
  };

  // function to revise a rejected job
  const handleRevise = async (jobId: string) => {
    router.push(`/rep/edit/${jobId}`);
  };

  // filter jobs based on status filter
  const filteredJobs = useMemo(() => {
    if (!statusFilter) return jobs;
    return jobs.filter((job) => job.status === statusFilter);
  }, [jobs, statusFilter]);

  // calculate metrics for the dashboard cards
  const totalJobs = jobs.length;
  const activeJobs = jobs.filter(job => job.status === 'active').length;
  const pendingJobs = jobs.filter(job => job.status === 'pending').length;
  const totalRejected = rejectedJobs.length;

  if (!session || !userRole) {
    return <p className="p-8 text-center">Loading dashboard...</p>;
  }

  return (
    <div className="bg-gray-50 min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-red-800">💼 Rep Dashboard</h1>
          <div className="flex gap-3">
            {/* button to view analytics page */}
            <Link href="/rep/analytics">
              <button className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2">
                <ChartBarIcon className="h-5 w-5" />
                View Analytics
              </button>
            </Link>
            
            {/* button to access profile settings page */}
            <Link href="/profile/settings">
              <button className="bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-700 transition-colors shadow-sm flex items-center gap-2">
                <UserCircleIcon className="h-5 w-5" />
                Account Settings
              </button>
            </Link>
            
            {/* button to create a new job posting */}
            <Link href="/rep/create">
              <button className="bg-red-700 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-800 transition-colors shadow-sm">
                + Post a New Job
              </button>
            </Link>
          </div>
        </div>

        {/* metrics cards showing job statistics */}
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
          {/* card showing total student engagement via link clicks */}
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

        {/* tabs to switch between active, rejected, and archived jobs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            <button 
              onClick={() => setActiveTab('active')} 
              className={`${
                activeTab === 'active' 
                  ? 'border-red-700 text-red-800' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-lg`}
            >
              Current Jobs ({jobs.length})
            </button>
            <button 
              onClick={() => setActiveTab('rejected')} 
              className={`${
                activeTab === 'rejected' 
                  ? 'border-red-700 text-red-800' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-lg relative`}
            >
              Rejected ({rejectedJobs.length})
              {rejectedJobs.length > 0 && (
                <span className="absolute -top-1 -right-2 h-3 w-3 bg-red-500 rounded-full"></span>
              )}
            </button>
            <button 
              onClick={() => setActiveTab('archived')} 
              className={`${
                activeTab === 'archived' 
                  ? 'border-red-700 text-red-800' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-lg`}
            >
              Archived ({archivedJobs.length})
            </button>
          </nav>
        </div>

        {/* tab content - shows different job lists based on selected tab */}
        {activeTab === 'active' ? (
          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Your Active Job Postings</h2>
              <div>
                <label htmlFor="statusFilter" className="mr-2 font-medium text-sm text-gray-700">Filter by Status:</label>
                <select
                  id="statusFilter"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="p-2 border border-gray-300 rounded-md shadow-sm focus:ring-red-500 focus:border-red-500"
                >
                  <option value="">All</option>
                  <option value="pending">Pending</option>
                  <option value="active">Active</option>
                  <option value="removed">Removed</option>
                </select>
              </div>
            </div>

            {loading ? (
              <p className="text-center text-gray-500 py-10">Loading your jobs...</p>
            ) : filteredJobs.length === 0 ? (
              <div className="text-center py-10">
                <h3 className="text-xl font-semibold text-gray-700">No active jobs found.</h3>
                <p className="text-gray-500 mt-2">
                  {statusFilter 
                    ? "Try changing your filter or post a new job."
                    : "Click the 'Post a New Job' button to get started."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredJobs.map((job) => (
                  <JobCard 
                    key={job.id} 
                    job={job} 
                    onRemove={handleRemove}
                    isArchived={false}
                    isRejected={false}
                  />
                ))}
              </div>
            )}
          </div>
        ) : activeTab === 'rejected' ? (
          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Rejected Jobs - Need Revision</h2>
              <p className="text-gray-600 mt-2">
                These jobs were rejected by admin. Review the feedback and revise them before resubmitting.
              </p>
            </div>

            {loadingRejected ? (
              <p className="text-center text-gray-500 py-10">Loading rejected jobs...</p>
            ) : rejectedJobs.length === 0 ? (
              <div className="text-center py-10 bg-green-50 rounded-lg">
                <h3 className="text-xl font-semibold text-green-700">No rejected jobs!</h3>
                <p className="text-gray-600 mt-2">Great job! All your submissions have been approved.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {rejectedJobs.map((job) => (
                  <JobCard 
                    key={job.id} 
                    job={job} 
                    onRevise={handleRevise}
                    isArchived={false}
                    isRejected={true}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Your Archived Jobs (Past Deadline)</h2>
              <p className="text-gray-600 mt-2">
                These jobs have passed their deadline. You can reactivate them with a new deadline (requires admin approval).
              </p>
            </div>

            {loadingArchived ? (
              <p className="text-center text-gray-500 py-10">Loading archived jobs...</p>
            ) : archivedJobs.length === 0 ? (
              <div className="text-center py-10 bg-gray-50 rounded-lg">
                <h3 className="text-xl font-semibold text-gray-700">No archived jobs yet.</h3>
                <p className="text-gray-500 mt-2">Jobs will appear here after their deadline passes.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {archivedJobs.map((job) => (
                  <JobCard 
                    key={job.id} 
                    job={job} 
                    onReactivate={handleReactivate}
                    isArchived={true}
                    isRejected={false}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
