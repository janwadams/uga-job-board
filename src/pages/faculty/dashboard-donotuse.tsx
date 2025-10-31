// pages/faculty/dashboard.tsx
// Updated faculty dashboard with link click tracking instead of applications

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

// types for analytics data
interface AnalyticsOverview {
  totalJobs: number;
  totalLinkClicks: number;
  averageClicksPerJob: string;
  totalViews: number;
  engagementRate: string;
  activeJobs: number;
  expiredJobs: number;
  averageDaysToClick: string;
}

interface TrendData {
  date: string;
  clicks: number;
  views: number;
}

interface TopJob {
  id: string;
  title: string;
  company: string;
  clicks: number;
  views: number;
  engagementRate: string;
  status: string;
  daysActive: number;
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
        {job.location && (
          <p className="text-sm text-gray-500 mt-1">
            Location: {job.location}
          </p>
        )}
      </div>

      <div className="mt-6 pt-4 border-t border-gray-200 flex items-center justify-end gap-3">
        {isArchived ? (
          // buttons for archived jobs
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
          // buttons for active jobs
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
  // tab management - active, archived, or analytics view
  const [activeTab, setActiveTab] = useState<'active' | 'archived' | 'analytics'>('active');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [archivedJobs, setArchivedJobs] = useState<Job[]>([]);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadingArchived, setLoadingArchived] = useState(true);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [userRole, setUserRole] = useState<string | null>(null);
  
  // updated state for link clicks count instead of applications
  const [linkClicksCount, setLinkClicksCount] = useState(0);
  
  // analytics state - stores all the data for charts and metrics
  const [dateRange, setDateRange] = useState('30'); // default to 30 days
  const [analyticsOverview, setAnalyticsOverview] = useState<AnalyticsOverview>({
    totalJobs: 0,
    totalLinkClicks: 0,
    averageClicksPerJob: '0',
    totalViews: 0,
    engagementRate: '0',
    activeJobs: 0,
    expiredJobs: 0,
    averageDaysToClick: '0'
  });
  const [clickTrends, setClickTrends] = useState<TrendData[]>([]);
  const [topPerformingJobs, setTopPerformingJobs] = useState<TopJob[]>([]);

  // check authentication and role on mount
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
        router.push('/login');
        return;
      }

      // verify user is faculty
      const { data: userData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .single();

      if (userData?.role !== 'faculty') {
        router.push('/unauthorized');
        return;
      }

      setSession(session);
      setUserRole(userData.role);
    };

    checkAuth();
  }, [router]);

  // fetch active jobs when session is ready
  useEffect(() => {
    if (session) {
      fetchJobs();
      fetchLinkClicksCount();
    }
  }, [session, statusFilter]);

  // fetch archived jobs when switching to archived tab
  useEffect(() => {
    if (session && activeTab === 'archived') {
      fetchArchivedJobs();
    }
  }, [session, activeTab]);

  // fetch analytics when switching to analytics tab or changing date range
  useEffect(() => {
    if (session && activeTab === 'analytics') {
      fetchAnalytics();
    }
  }, [session, activeTab, dateRange]);

  const fetchJobs = async () => {
    if (!session) return;
    
    setLoading(true);
    
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (!currentSession) return;

      // build query parameters
      const params = new URLSearchParams({
        archived: 'false', // only get non-archived jobs
      });

      if (statusFilter) {
        params.append('status', statusFilter);
      }

      const response = await fetch(`/api/faculty/jobs/list?${params}`, {
        headers: {
          'Authorization': `Bearer ${currentSession.access_token}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        setJobs(data.jobs || []);
      } else {
        console.error('Error fetching jobs:', data.error);
      }
    } catch (error) {
      console.error('Error fetching jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchArchivedJobs = async () => {
    if (!session) return;
    
    setLoadingArchived(true);
    
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (!currentSession) return;

      const response = await fetch(`/api/faculty/jobs/list?archived=true`, {
        headers: {
          'Authorization': `Bearer ${currentSession.access_token}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        setArchivedJobs(data.jobs || []);
      } else {
        console.error('Error fetching archived jobs:', data.error);
      }
    } catch (error) {
      console.error('Error fetching archived jobs:', error);
    } finally {
      setLoadingArchived(false);
    }
  };

  const fetchLinkClicksCount = async () => {
    if (!session) return;
    
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (!currentSession) return;

      const response = await fetch('/api/faculty/link-clicks-count', {
        headers: {
          'Authorization': `Bearer ${currentSession.access_token}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        setLinkClicksCount(data.count || 0);
      }
    } catch (error) {
      console.error('Error fetching link clicks count:', error);
    }
  };

  const fetchAnalytics = async () => {
    if (!session) return;
    
    setLoadingAnalytics(true);
    
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (!currentSession) return;

      const response = await fetch(`/api/faculty/analytics?days=${dateRange}`, {
        headers: {
          'Authorization': `Bearer ${currentSession.access_token}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        setAnalyticsOverview(data.overview || {
          totalJobs: 0,
          totalLinkClicks: 0,
          averageClicksPerJob: '0',
          totalViews: 0,
          engagementRate: '0',
          activeJobs: 0,
          expiredJobs: 0,
          averageDaysToClick: '0'
        });
        setClickTrends(data.trends || []);
        setTopPerformingJobs(data.topJobs || []);
      } else {
        console.error('Error fetching analytics:', data.error);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  const handleRemove = async (jobId: string) => {
    if (!window.confirm('Are you sure you want to remove this job posting?')) {
      return;
    }

    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (!currentSession) return;

      const response = await fetch(`/api/faculty/jobs/${jobId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${currentSession.access_token}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        alert('Job removed successfully!');
        fetchJobs(); // refresh the job list
        fetchLinkClicksCount(); // refresh the count
      } else {
        alert(data.error || 'Failed to remove job');
      }
    } catch (error) {
      console.error('Error removing job:', error);
      alert('An unexpected error occurred');
    }
  };

  const handleReactivate = async (jobId: string) => {
    const newDeadline = prompt("Enter new deadline (YYYY-MM-DD):");
    if (!newDeadline) return;

    // validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(newDeadline)) {
      alert('Please enter date in YYYY-MM-DD format');
      return;
    }

    // check if date is in the future
    const selectedDate = new Date(newDeadline);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate <= today) {
      alert('Please select a future date');
      return;
    }

    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (!currentSession) return;

      const response = await fetch(`/api/faculty/jobs/${jobId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${currentSession.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          deadline: newDeadline,
          status: 'active'
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert('Job reactivated successfully!');
        fetchArchivedJobs(); // refresh archived jobs
        fetchJobs(); // refresh active jobs
      } else {
        alert(data.error || 'Failed to reactivate job');
      }
    } catch (error) {
      console.error('Error reactivating job:', error);
      alert('An unexpected error occurred');
    }
  };

  // calculate statistics from the jobs data
  const stats = useMemo(() => {
    const totalJobs = jobs.length;
    const activeJobs = jobs.filter(j => j.status === 'active').length;
    const pendingJobs = jobs.filter(j => j.status === 'pending').length;
    
    return {
      totalJobs,
      activeJobs,
      pendingJobs,
      linkClicks: linkClicksCount
    };
  }, [jobs, linkClicksCount]);

  if (loading && activeTab === 'active') {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-lg">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      {/* header section with welcome message and quick stats */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Faculty Dashboard</h1>
              <p className="text-gray-500 mt-1">Manage your job postings</p>
            </div>
            <Link href="/faculty/create">
              <button className="px-6 py-3 bg-red-700 text-white rounded-lg hover:bg-red-800 font-semibold transition-colors shadow-md">
                + Post New Job
              </button>
            </Link>
          </div>

          {/* quick stats cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600 font-medium">Total Jobs</p>
                  <p className="text-3xl font-bold text-blue-900">{stats.totalJobs}</p>
                </div>
                <div className="bg-blue-200 p-3 rounded-full">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600 font-medium">Active</p>
                  <p className="text-3xl font-bold text-green-900">{stats.activeJobs}</p>
                </div>
                <div className="bg-green-200 p-3 rounded-full">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-4 rounded-lg border border-yellow-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-yellow-600 font-medium">Pending</p>
                  <p className="text-3xl font-bold text-yellow-900">{stats.pendingJobs}</p>
                </div>
                <div className="bg-yellow-200 p-3 rounded-full">
                  <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-600 font-medium">Total Link Clicks</p>
                  <p className="text-3xl font-bold text-purple-900">{stats.linkClicks}</p>
                </div>
                <div className="bg-purple-200 p-3 rounded-full">
                  <CursorArrowRaysIcon className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* main content area with tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        {/* navigation tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('active')}
            className={`px-6 py-3 font-semibold transition-colors ${
              activeTab === 'active'
                ? 'text-red-700 border-b-2 border-red-700'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Active Jobs
          </button>
          <button
            onClick={() => setActiveTab('archived')}
            className={`px-6 py-3 font-semibold transition-colors ${
              activeTab === 'archived'
                ? 'text-red-700 border-b-2 border-red-700'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Archived Jobs
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-6 py-3 font-semibold transition-colors flex items-center gap-2 ${
              activeTab === 'analytics'
                ? 'text-red-700 border-b-2 border-red-700'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <ChartBarIcon className="w-5 h-5" />
            Analytics
          </button>
        </div>

        {/* content based on active tab */}
        {activeTab === 'active' ? (
          // active jobs section
          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Your Active Job Postings</h2>
              {/* status filter dropdown */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
              >
                <option value="">All Statuses</option>
                <option value="active">Active</option>
                <option value="pending">Pending Approval</option>
                <option value="removed">Removed</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            {loading ? (
              <p className="text-center text-gray-500 py-10">Loading jobs...</p>
            ) : jobs.length === 0 ? (
              <div className="text-center py-10 bg-gray-50 rounded-lg">
                <h3 className="text-xl font-semibold text-gray-700">No jobs posted yet.</h3>
                <p className="text-gray-500 mt-2">Get started by creating your first job posting!</p>
                <Link href="/faculty/create">
                  <button className="mt-4 px-6 py-3 bg-red-700 text-white rounded-lg hover:bg-red-800 font-semibold transition-colors">
                    + Post Your First Job
                  </button>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {jobs.map((job) => (
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
        ) : activeTab === 'archived' ? (
          // archived jobs section
          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Your Archived Jobs (Past Deadline)</h2>
              <p className="text-gray-600 mt-2">
                These jobs have passed their deadline. You can reactivate them with a new deadline.
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
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          // analytics section
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-800">Quick Analytics Overview</h2>
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                >
                  <option value="7">Last 7 days</option>
                  <option value="30">Last 30 days</option>
                  <option value="90">Last 90 days</option>
                  <option value="365">Last year</option>
                </select>
              </div>

              {loadingAnalytics ? (
                <p className="text-center text-gray-500 py-10">Loading analytics...</p>
              ) : (
                <>
                  {/* analytics overview cards */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-500">Total Link Clicks</p>
                      <p className="text-2xl font-bold text-gray-800">{analyticsOverview.totalLinkClicks}</p>
                      <p className="text-xs text-gray-600 mt-1">
                        Avg: {analyticsOverview.averageClicksPerJob} per job
                      </p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-500">Total Views</p>
                      <p className="text-2xl font-bold text-blue-600">{analyticsOverview.totalViews}</p>
                      <p className="text-xs text-gray-600 mt-1">
                        Engagement: {analyticsOverview.engagementRate}%
                      </p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-500">Active Jobs</p>
                      <p className="text-2xl font-bold text-green-600">{analyticsOverview.activeJobs}</p>
                      <p className="text-xs text-gray-600 mt-1">
                        of {analyticsOverview.totalJobs} total
                      </p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-500">Avg Days to Click</p>
                      <p className="text-2xl font-bold text-purple-600">{analyticsOverview.averageDaysToClick}</p>
                      <p className="text-xs text-gray-600 mt-1">after posting</p>
                    </div>
                  </div>

                  {/* simple trend chart */}
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-3">Engagement Trends</h3>
                    <div className="overflow-x-auto">
                      <div className="min-w-[600px] h-48 flex items-end justify-between gap-1">
                        {clickTrends.slice(-14).map((day, index) => (
                          <div key={index} className="flex-1 flex flex-col items-center">
                            <div className="w-full flex gap-0.5 items-end h-40">
                              <div 
                                className="flex-1 bg-red-600 rounded-t"
                                style={{ 
                                  height: `${day.clicks > 0 ? (day.clicks / Math.max(...clickTrends.map(d => d.clicks)) * 100) : 0}%`,
                                  minHeight: day.clicks > 0 ? '4px' : '0'
                                }}
                                title={`${day.clicks} clicks`}
                              />
                              <div 
                                className="flex-1 bg-blue-600 rounded-t"
                                style={{ 
                                  height: `${day.views > 0 ? (day.views / Math.max(...clickTrends.map(d => d.views)) * 100) : 0}%`,
                                  minHeight: day.views > 0 ? '4px' : '0'
                                }}
                                title={`${day.views} views`}
                              />
                            </div>
                            <p className="text-xs text-gray-600 mt-1 rotate-45 origin-left whitespace-nowrap">{day.date}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 mt-3 justify-center">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-red-600 rounded"></div>
                        <span className="text-sm text-gray-600">Link Clicks</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-blue-600 rounded"></div>
                        <span className="text-sm text-gray-600">Views</span>
                      </div>
                    </div>
                  </div>

                  {/* top performing jobs table */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Top Performing Jobs</h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Job Title</th>
                            <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Link Clicks</th>
                            <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Views</th>
                            <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Engagement</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {topPerformingJobs.map((job, index) => (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm font-medium text-gray-900">{job.title}</td>
                              <td className="px-4 py-3 text-sm text-center">
                                <span className="font-semibold text-green-600">{job.clicks}</span>
                              </td>
                              <td className="px-4 py-3 text-sm text-center">{job.views}</td>
                              <td className="px-4 py-3 text-sm text-center">
                                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                  {job.engagementRate}%
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
