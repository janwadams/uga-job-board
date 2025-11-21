// pages/faculty/dashboard.tsx
// Updated faculty dashboard with link click tracking - NO quick analytics tab

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
}

// job card component - shows individual job postings
const JobCard = ({ job, onRemove, onReactivate, isArchived }: { 
  job: Job, 
  onRemove?: (jobId: string) => void,
  onReactivate?: (jobId: string) => void,
  isArchived?: boolean 
}) => {
  const statusColors: Record<Job['status'], string> = {
    active: 'bg-green-100 text-green-800',
    pending: 'bg-yellow-100 text-yellow-800',
    removed: 'bg-red-100 text-red-800',
    rejected: 'bg-gray-100 text-gray-800',
    archived: 'bg-gray-100 text-gray-800',
  };

  const isDisabled = job.status === 'removed' || job.status === 'rejected';

  // calculate how many days since the job expired (for archived jobs)
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
        <p className="text-sm text-gray-500 mt-1">
          Posted: {new Date(job.created_at).toLocaleDateString()}
          {' '}({Math.floor((new Date().getTime() - new Date(job.created_at).getTime()) / (1000 * 60 * 60 * 24))} days ago)
        </p>
        {job.location && (
          <p className="text-sm text-gray-500 mt-1">
            Location: {job.location}
          </p>
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
            <Link href={`/faculty/view/${job.id}`}>
              <button className="px-4 py-2 rounded font-semibold text-sm bg-blue-600 text-white hover:bg-blue-700 transition-colors">
                View Details
              </button>
            </Link>
          </>
        ) : (
          <>
            <Link href={`/faculty/edit/${job.id}`}>
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

export default function FacultyDashboard() {
  const router = useRouter();
  // removed analytics from tabs, only active and archived now
  const [activeTab, setActiveTab] = useState<'active' | 'archived' | 'removed'>('active');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [archivedJobs, setArchivedJobs] = useState<Job[]>([]);
  const [removedJobs, setRemovedJobs] = useState<Job[]>([]); // track removed jobs separately
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadingArchived, setLoadingArchived] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest'); // add sort order state
  const [userRole, setUserRole] = useState<string | null>(null);
  
  // state for tracking link clicks - keeping this for the metric card
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
        
      if (roleError || !roleData || roleData.role !== 'faculty') {
          router.push('/unauthorized');
          return;
      }
      
      setUserRole(roleData.role);
      setSession(sessionData.session);
    };
    checkSession();
  }, [router]);

  // function to fetch link clicks count for the metric card
  const fetchLinkClicks = async (userId: string) => {
    // get all job ids created by this faculty
    const { data: facultyJobs, error: jobsError } = await supabase
      .from('jobs')
      .select('id')
      .eq('created_by', userId);

    if (jobsError || !facultyJobs) {
      console.error('error fetching faculty jobs for link clicks:', jobsError);
      return;
    }

    const jobIds = facultyJobs.map(job => job.id);

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
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('created_by', session.user.id)
        .in('status', ['active', 'removed']); // get active and removed regardless of deadline

      if (error) {
        console.error('Error fetching jobs:', error);
      } else {
        setJobs(data || []);
      }
      setLoading(false);
    };

    fetchJobs();
    fetchLinkClicks(session.user.id);
  }, [session]);

  // fetch archived jobs (past deadline)
  useEffect(() => {
    if (!session) return;

    const fetchArchivedJobs = async () => {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('created_by', session.user.id)
        .lt('deadline', today)
        .order('deadline', { ascending: false });

      if (error) {
        console.error('Error fetching archived jobs:', error);
      } else {
        setArchivedJobs(data || []);
      }
      setLoadingArchived(false);
    };

    fetchArchivedJobs();
  }, [session]);

  // fetch removed jobs for the removed tab
  useEffect(() => {
    if (!session) return;

    const fetchRemovedJobs = async () => {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('created_by', session.user.id)
        .eq('status', 'removed')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching removed jobs:', error);
      } else {
        setRemovedJobs(data || []);
      }
    };

    fetchRemovedJobs();
  }, [session]);

  // handle removing a job (soft delete)
  const handleRemove = async (jobId: string) => {
    if (!confirm('Are you sure you want to remove this job?')) return;

    try {
      const { error } = await supabase
        .from('jobs')
        .update({ status: 'removed' })
        .eq('id', jobId);

      if (!error) {
        // remove from active jobs list and add to removed list
        const removedJob = jobs.find(job => job.id === jobId);
        setJobs(jobs.filter(job => job.id !== jobId));
        if (removedJob) {
          setRemovedJobs([...removedJobs, { ...removedJob, status: 'removed' as const }]);
        }
        alert('Job removed successfully.');
      } else {
        alert('Failed to remove job.');
      }
    } catch (error) {
      console.error('Error removing job:', error);
      alert('An error occurred while removing the job.');
    }
  };

  // handle reactivating an expired job with a new deadline
  const handleReactivate = async (jobId: string) => {
    const newDeadline = prompt("Enter new deadline (YYYY-MM-DD):");
    if (!newDeadline) return;

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(newDeadline)) {
      alert('Please enter date in YYYY-MM-DD format');
      return;
    }

    const selectedDate = new Date(newDeadline);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate <= today) {
      alert('Please select a future date');
      return;
    }

    try {
      const { error } = await supabase
        .from('jobs')
        .update({ 
          deadline: newDeadline,
          status: 'active' 
        })
        .eq('id', jobId);

      if (!error) {
        alert('Job reactivated successfully!');
        window.location.reload();
      } else {
        alert('Failed to reactivate job.');
      }
    } catch (error) {
      console.error('Error reactivating job:', error);
      alert('An error occurred while reactivating the job.');
    }
  };
  
  // calculate metrics from the jobs list
  const totalJobs = jobs.length + archivedJobs.length;
  const activeJobs = useMemo(() => jobs.filter(j => j.status === 'active').length, [jobs]);
  const totalArchived = archivedJobs.length;

  // filter and sort jobs based on status filter and sort order
  const filteredAndSortedJobs = useMemo(() => {
    let filtered = statusFilter ? jobs.filter(j => j.status === statusFilter) : jobs;
    
    // sort by created_at date
    const sorted = [...filtered].sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });
    
    return sorted;
  }, [jobs, statusFilter, sortOrder]);

  if (!session || !userRole) {
    return <p className="p-8 text-center">Loading dashboard...</p>;
  }

  return (
    <div className="bg-gray-50 min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-red-800">📚 Faculty Dashboard</h1>
          <div className="flex gap-4">
            <Link href="/profile/settings">
              <button className="bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-700 transition-colors shadow-sm flex items-center gap-2">
                <UserCircleIcon className="h-5 w-5" />
                Account Settings
              </button>
            </Link>
            <Link href="/faculty/analytics">
              <button className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2">
                <ChartBarIcon className="h-5 w-5" />
                View Analytics
              </button>
            </Link>
            <Link href="/faculty/create">
              <button className="bg-red-700 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-800 transition-colors shadow-sm">
                + Post a New Job
              </button>
            </Link>
          </div>
        </div>

        {/* metrics cards - updated to show link clicks instead of applications */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <h3 className="text-gray-500 font-semibold">Total Jobs</h3>
            <p className="text-4xl font-bold text-gray-800 mt-2">{totalJobs}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <h3 className="text-gray-500 font-semibold">Active Jobs</h3>
            <p className="text-4xl font-bold text-green-600 mt-2">{activeJobs}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <h3 className="text-gray-500 font-semibold">Archived</h3>
            <p className="text-4xl font-bold text-gray-600 mt-2">{totalArchived}</p>
          </div>
          
          {/* updated card showing link clicks instead of applications */}
          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 border-l-4 border-l-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-gray-500 font-semibold">Apply Link Clicks</h3>
                <p className="text-4xl font-bold text-purple-600 mt-2">{linkClicksCount}</p>
                <p className="text-xs text-gray-600 mt-1">
                  Student engagement
                </p>
              </div>
              <CursorArrowRaysIcon className="h-10 w-10 text-purple-500" />
            </div>
          </div>
        </div>

        {/* tabs for active and archived jobs - removed analytics tab */}
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
              Jobs ({jobs.length})
            </button>
            <button 
              onClick={() => setActiveTab('removed')} 
              className={`${
                activeTab === 'removed' 
                  ? 'border-red-700 text-red-800' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-lg`}
            >
              Removed ({removedJobs.length})
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

        {/* tab content - shows active or archived jobs */}
        {activeTab === 'active' ? (
          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Your Active Job Postings</h2>
              <div className="flex gap-3">
                <div>
                  <label htmlFor="sortOrder" className="mr-2 font-medium text-sm text-gray-700">Sort by:</label>
                  <select
                    id="sortOrder"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')}
                    className="p-2 border border-gray-300 rounded-md shadow-sm focus:ring-red-500 focus:border-red-500"
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="statusFilter" className="mr-2 font-medium text-sm text-gray-700">Filter by Status:</label>
                  <select
                    id="statusFilter"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="p-2 border border-gray-300 rounded-md shadow-sm focus:ring-red-500 focus:border-red-500"
                  >
                    <option value="">All</option>
                  <option value="active">Active</option>
                  <option value="removed">Removed</option>
                </select>
              </div>
            </div>

            {loading ? (
              <p className="text-center text-gray-500 py-10">Loading your jobs...</p>
            ) : filteredAndSortedJobs.length === 0 ? (
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
                {filteredAndSortedJobs.map((job) => (
                  <JobCard 
                    key={job.id} 
                    job={job} 
                    onRemove={handleRemove}
                    isArchived={false}
                  />
                ))}
              </div>
            )}
          </div>
        ) : activeTab === 'removed' ? (
          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Your Removed Jobs</h2>
              <p className="text-gray-600 mt-2">Jobs you have removed from active listings. These can be reactivated if needed.</p>
            </div>

            {removedJobs.length === 0 ? (
              <div className="text-center py-10 bg-gray-50 rounded-lg">
                <h3 className="text-xl font-semibold text-gray-700">No removed jobs.</h3>
                <p className="text-gray-500 mt-2">Jobs you remove will appear here.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {removedJobs.map((job) => (
                  <JobCard 
                    key={job.id} 
                    job={job} 
                    onReactivate={handleReactivate}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Your Archived Jobs (Past Deadline)</h2>
              <p className="text-gray-600 mt-2">These jobs have passed their deadline. You can reactivate them with a new deadline.</p>
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
