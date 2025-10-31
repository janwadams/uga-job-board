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
  is_active: boolean; // ADDED: For toggle switch
}

// types for analytics data
interface AnalyticsOverview {
  totalJobs: number;
  totalLinkClicks: number; // changed from totalApplications
  averageClicksPerJob: string; // changed from averageApplicationsPerJob
  totalViews: number;
  engagementRate: string; // changed from conversionRate
  activeJobs: number;
  expiredJobs: number;
  averageDaysToClick: string; // changed from averageDaysToApply
}

interface TrendData {
  date: string;
  clicks: number; // changed from applications
  views: number;
}

interface TopJob {
  id: string;
  title: string;
  company: string;
  clicks: number; // changed from applications
  views: number;
  engagementRate: string; // changed from conversionRate
  status: string;
  daysActive: number;
}

// job card component - shows individual job postings
const JobCard = ({ job, onRemove, onReactivate, isArchived, onToggleActive }: { 
  job: Job, 
  onRemove?: (jobId: string) => void,
  onReactivate?: (jobId: string) => void,
  isArchived?: boolean,
  onToggleActive?: (jobId: string, currentState: boolean) => void // ADDED: toggle handler
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
        
        {/* ADDED: Toggle Switch for Active Jobs Only */}
        {!isArchived && job.status === 'active' && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">
                {job.is_active ? 'Visible to Students' : 'Hidden from Students'}
              </span>
              <button
                onClick={() => onToggleActive && onToggleActive(job.id, job.is_active)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 ${
                  job.is_active ? 'bg-green-600' : 'bg-gray-300'
                }`}
                role="switch"
                aria-checked={job.is_active}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    job.is_active ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            {!job.is_active && (
              <p className="text-xs text-gray-500 mt-1">
                This job is hidden from the student job board
              </p>
            )}
          </div>
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
    averageDaysToClick: '0',
  });
  const [clickTrends, setClickTrends] = useState<TrendData[]>([]);
  const [topPerformingJobs, setTopPerformingJobs] = useState<TopJob[]>([]);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (session) {
      fetchJobs();
      fetchArchivedJobs();
    }
  }, [session, statusFilter]);

  useEffect(() => {
    if (session && activeTab === 'analytics') {
      fetchAnalytics();
    }
  }, [session, activeTab, dateRange]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      router.push('/auth/signin');
      return;
    }

    setSession(session);

    // get user role and check authorization
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', session.user.id)
      .single();

    setUserRole(userData?.role || null);

    if (userData?.role !== 'faculty') {
      router.push('/unauthorized');
      return;
    }
  };

  const fetchJobs = async () => {
    if (!session) return;
    
    try {
      setLoading(true);
      
      // get all active jobs (not archived, based on deadline being in the future)
      let query = supabase
        .from('jobs')
        .select('*')
        .eq('created_by', session.user.id)
        .gte('deadline', new Date().toISOString().split('T')[0])
        .order('created_at', { ascending: false });

      // apply status filter if one is selected
      if (statusFilter) {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      setJobs(data || []);

      // count total link clicks for all jobs
      if (data && data.length > 0) {
        const jobIds = data.map(job => job.id);
        const { count } = await supabase
          .from('link_clicks')
          .select('*', { count: 'exact', head: true })
          .in('job_id', jobIds);

        setLinkClicksCount(count || 0);
      } else {
        setLinkClicksCount(0);
      }
    } catch (error) {
      console.error('Error fetching jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchArchivedJobs = async () => {
    if (!session) return;
    
    try {
      setLoadingArchived(true);
      
      // fetch jobs where deadline has passed (archived)
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('created_by', session.user.id)
        .lt('deadline', new Date().toISOString().split('T')[0])
        .order('deadline', { ascending: false });

      if (error) throw error;

      setArchivedJobs(data || []);
    } catch (error) {
      console.error('Error fetching archived jobs:', error);
    } finally {
      setLoadingArchived(false);
    }
  };

  const fetchAnalytics = async () => {
    if (!session) return;
    
    try {
      setLoadingAnalytics(true);
      const daysAgo = parseInt(dateRange);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);

      // fetch jobs for the faculty member
      const { data: jobsData, error: jobsError } = await supabase
        .from('jobs')
        .select('*')
        .eq('created_by', session.user.id);

      if (jobsError) throw jobsError;

      const jobIds = jobsData?.map(j => j.id) || [];

      // if no jobs, return empty analytics
      if (jobIds.length === 0) {
        setAnalyticsOverview({
          totalJobs: 0,
          totalLinkClicks: 0,
          averageClicksPerJob: '0',
          totalViews: 0,
          engagementRate: '0',
          activeJobs: 0,
          expiredJobs: 0,
          averageDaysToClick: '0'
        });
        setClickTrends([]);
        setTopPerformingJobs([]);
        setLoadingAnalytics(false);
        return;
      }

      // fetch link clicks data (changed from applications)
      const { data: clicksData, error: clicksError } = await supabase
        .from('link_clicks')
        .select('*')
        .in('job_id', jobIds)
        .gte('clicked_at', startDate.toISOString());

      if (clicksError) throw clicksError;

      // fetch views data
      const { data: viewsData, error: viewsError } = await supabase
        .from('job_views')
        .select('*')
        .in('job_id', jobIds)
        .gte('viewed_at', startDate.toISOString());

      if (viewsError) throw viewsError;

      // calculate overview metrics
      const totalClicks = clicksData?.length || 0;
      const totalViews = viewsData?.length || 0;
      const activeJobs = jobsData?.filter(j => 
        j.status === 'active' && new Date(j.deadline) >= new Date()
      ).length || 0;
      const expiredJobs = jobsData?.filter(j => 
        new Date(j.deadline) < new Date()
      ).length || 0;

      // calculate average days to click (like time to apply)
      let totalDaysToClick = 0;
      let clicksWithDays = 0;

      clicksData?.forEach(click => {
        const job = jobsData?.find(j => j.id === click.job_id);
        if (job) {
          const jobCreated = new Date(job.created_at);
          const clickDate = new Date(click.clicked_at);
          const daysDiff = Math.floor((clickDate.getTime() - jobCreated.getTime()) / (1000 * 60 * 60 * 24));
          totalDaysToClick += daysDiff;
          clicksWithDays++;
        }
      });

      const avgDaysToClick = clicksWithDays > 0 
        ? (totalDaysToClick / clicksWithDays).toFixed(1) 
        : '0';

      setAnalyticsOverview({
        totalJobs: jobsData?.length || 0,
        totalLinkClicks: totalClicks,
        averageClicksPerJob: jobsData && jobsData.length > 0 
          ? (totalClicks / jobsData.length).toFixed(1) 
          : '0',
        totalViews: totalViews,
        engagementRate: totalViews > 0 
          ? ((totalClicks / totalViews) * 100).toFixed(1) 
          : '0',
        activeJobs,
        expiredJobs,
        averageDaysToClick: avgDaysToClick
      });

      // generate trend data (last 30 days)
      const trends: TrendData[] = [];
      for (let i = daysAgo - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];

        const dayClicks = clicksData?.filter(c => 
          c.clicked_at.startsWith(dateStr)
        ).length || 0;

        const dayViews = viewsData?.filter(v => 
          v.viewed_at.startsWith(dateStr)
        ).length || 0;

        trends.push({
          date: `${date.getMonth() + 1}/${date.getDate()}`,
          clicks: dayClicks,
          views: dayViews
        });
      }
      setClickTrends(trends);

      // calculate top performing jobs
      const jobPerformance = jobIds.map(jobId => {
        const job = jobsData?.find(j => j.id === jobId);
        const clicks = clicksData?.filter(c => c.job_id === jobId).length || 0;
        const views = viewsData?.filter(v => v.job_id === jobId).length || 0;
        
        const daysActive = Math.floor(
          (new Date().getTime() - new Date(job?.created_at || 0).getTime()) / (1000 * 60 * 60 * 24)
        );

        return {
          id: jobId,
          title: job?.title || '',
          company: job?.company || '',
          clicks,
          views,
          engagementRate: views > 0 ? ((clicks / views) * 100).toFixed(1) : '0',
          status: job?.status || '',
          daysActive
        };
      });

      // sort by clicks and take top 5
      const topJobs = jobPerformance
        .sort((a, b) => b.clicks - a.clicks)
        .slice(0, 5);

      setTopPerformingJobs(topJobs);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  // ADDED: Toggle function to show/hide jobs from students
  const handleToggleActive = async (jobId: string, currentState: boolean) => {
    try {
      const { error } = await supabase
        .from('jobs')
        .update({ is_active: !currentState })
        .eq('id', jobId);

      if (error) throw error;

      // Update local state
      setJobs(prevJobs => 
        prevJobs.map(job => 
          job.id === jobId 
            ? { ...job, is_active: !currentState }
            : job
        )
      );
    } catch (error) {
      console.error('Error toggling job visibility:', error);
      alert('Failed to update job visibility. Please try again.');
    }
  };

  const handleRemove = async (jobId: string) => {
    if (!confirm('Are you sure you want to remove this job? This will change its status to "removed".')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('jobs')
        .update({ status: 'removed' })
        .eq('id', jobId);

      if (error) throw error;

      await fetchJobs();
    } catch (error) {
      console.error('Error removing job:', error);
      alert('Failed to remove job. Please try again.');
    }
  };

  const handleReactivate = async (jobId: string) => {
    router.push(`/faculty/edit/${jobId}?reactivate=true`);
  };

  // filter jobs by status
  const displayedJobs = useMemo(() => {
    if (!statusFilter) return jobs;
    return jobs.filter(job => job.status === statusFilter);
  }, [jobs, statusFilter]);

  if (loading && activeTab === 'active') {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* header */}
      <div className="bg-[#BA0C2F] text-white">
        <div className="container mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">Faculty Dashboard</h1>
              <p className="text-red-100">Manage your job postings</p>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/faculty/create">
                <button className="bg-white text-[#BA0C2F] px-6 py-2 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
                  + Create New Job
                </button>
              </Link>
              <button 
                onClick={() => router.push('/')}
                className="bg-red-800 text-white px-6 py-2 rounded-lg hover:bg-red-900 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4">
          <div className="flex gap-8">
            <button
              onClick={() => setActiveTab('active')}
              className={`py-4 px-2 font-semibold border-b-2 transition-colors ${
                activeTab === 'active'
                  ? 'border-[#BA0C2F] text-[#BA0C2F]'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Active Jobs ({jobs.length})
            </button>
            <button
              onClick={() => setActiveTab('archived')}
              className={`py-4 px-2 font-semibold border-b-2 transition-colors ${
                activeTab === 'archived'
                  ? 'border-[#BA0C2F] text-[#BA0C2F]'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Archived Jobs ({archivedJobs.length})
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`py-4 px-2 font-semibold border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'analytics'
                  ? 'border-[#BA0C2F] text-[#BA0C2F]'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <ChartBarIcon className="w-5 h-5" />
              Analytics
            </button>
          </div>
        </div>
      </div>

      {/* main content */}
      <div className="container mx-auto px-4 py-8">
        {activeTab === 'active' ? (
          // active jobs section
          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <div className="mb-6 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Your Active Job Postings</h2>
                <p className="text-gray-600 mt-2">Total Link Clicks: <span className="font-semibold text-[#BA0C2F]">{linkClicksCount}</span></p>
              </div>
              
              {/* status filter dropdown */}
              <div className="flex items-center gap-3">
                <label htmlFor="status-filter" className="text-sm font-medium text-gray-700">
                  Filter by Status:
                </label>
                <select
                  id="status-filter"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 bg-white"
                >
                  <option value="">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="removed">Removed</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>

            {displayedJobs.length === 0 ? (
              <div className="text-center py-10 bg-gray-50 rounded-lg">
                <h3 className="text-xl font-semibold text-gray-700">No active jobs yet.</h3>
                <p className="text-gray-500 mt-2">Create your first job posting to get started.</p>
                <Link href="/faculty/create">
                  <button className="mt-4 bg-[#BA0C2F] text-white px-6 py-2 rounded-lg hover:bg-red-800 transition-colors">
                    Create Job
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
                    onToggleActive={handleToggleActive}
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
          // analytics section - updated labels
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
                  {/* analytics overview cards - updated labels */}
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

                  {/* simple trend chart - updated labels */}
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

                  {/* top performing jobs table - updated labels */}
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
