// pages/faculty/dashboard.tsx
// faculty dashboard with link click tracking and job posting permission control

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
  
  // permission check state - tracks if faculty can currently post jobs
  const [canPostJobs, setCanPostJobs] = useState(true);
  const [checkingPermission, setCheckingPermission] = useState(true);
  
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

  // check if faculty can post jobs by looking at app settings
  useEffect(() => {
    checkPostingPermission();
  }, []);

  const checkPostingPermission = async () => {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('setting_value')
        .eq('setting_key', 'faculty_can_post_jobs')
        .single();

      if (data && !error) {
        setCanPostJobs(data.setting_value);
      }
    } catch (error) {
      console.error('error checking posting permission:', error);
      // default to true if there's an error so faculty isn't blocked
      setCanPostJobs(true);
    } finally {
      setCheckingPermission(false);
    }
  };

  // verify user is logged in and is a faculty member
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session: userSession } } = await supabase.auth.getSession();
      
      if (!userSession) {
        router.push('/login');
        return;
      }

      setSession(userSession);

      // get user role from database
      const { data: userData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userSession.user.id)
        .single();

      if (userData?.role !== 'faculty') {
        router.push('/');
        return;
      }

      setUserRole(userData.role);
      setLoading(false);
    };

    checkAuth();
  }, [router]);

  // load jobs when we have a session
  useEffect(() => {
    if (session) {
      fetchJobs();
      fetchArchivedJobs();
    }
  }, [session]);

  // load analytics when date range changes or tab switches to analytics
  useEffect(() => {
    if (session && activeTab === 'analytics') {
      fetchAnalytics();
    }
  }, [session, dateRange, activeTab]);

  const fetchJobs = async () => {
    if (!session) return;

    try {
      setLoading(true);
      const today = new Date().toISOString();

      // get all active jobs posted by this faculty member
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('created_by', session.user.id)
        .gte('deadline', today)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setJobs(data || []);

      // count total link clicks across all jobs
      const { count } = await supabase
        .from('link_clicks')
        .select('*', { count: 'exact', head: true })
        .in('job_id', (data || []).map(job => job.id));

      setLinkClicksCount(count || 0);
    } catch (error) {
      console.error('error fetching jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchArchivedJobs = async () => {
    if (!session) return;

    try {
      setLoadingArchived(true);
      const today = new Date().toISOString();

      // get all expired jobs (past deadline) posted by this faculty member
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('created_by', session.user.id)
        .lt('deadline', today)
        .order('deadline', { ascending: false });

      if (error) throw error;

      setArchivedJobs(data || []);
    } catch (error) {
      console.error('error fetching archived jobs:', error);
    } finally {
      setLoadingArchived(false);
    }
  };

  const fetchAnalytics = async () => {
    if (!session) return;

    try {
      setLoadingAnalytics(true);

      // calculate date range for analytics
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(dateRange));

      // get all jobs created by this faculty member
      const { data: allJobs } = await supabase
        .from('jobs')
        .select('*')
        .eq('created_by', session.user.id);

      if (!allJobs || allJobs.length === 0) {
        setAnalyticsOverview({
          totalJobs: 0,
          totalLinkClicks: 0,
          averageClicksPerJob: '0',
          totalViews: 0,
          engagementRate: '0',
          activeJobs: 0,
          expiredJobs: 0,
          averageDaysToClick: '0',
        });
        setClickTrends([]);
        setTopPerformingJobs([]);
        setLoadingAnalytics(false);
        return;
      }

      const jobIds = allJobs.map(j => j.id);

      // get link clicks within date range
      const { data: clicksData } = await supabase
        .from('link_clicks')
        .select('*')
        .in('job_id', jobIds)
        .gte('clicked_at', startDate.toISOString())
        .lte('clicked_at', endDate.toISOString());

      // get job views within date range
      const { data: viewsData } = await supabase
        .from('job_views')
        .select('*')
        .in('job_id', jobIds)
        .gte('viewed_at', startDate.toISOString())
        .lte('viewed_at', endDate.toISOString());

      const totalClicks = clicksData?.length || 0;
      const totalViews = viewsData?.length || 0;

      // count active vs expired jobs
      const today = new Date().toISOString();
      const activeJobsCount = allJobs.filter(j => j.deadline >= today && j.status === 'active').length;
      const expiredJobsCount = allJobs.filter(j => j.deadline < today).length;

      // calculate average clicks per job
      const avgClicksPerJob = allJobs.length > 0 
        ? (totalClicks / allJobs.length).toFixed(1) 
        : '0';

      // calculate engagement rate (clicks / views)
      const engagementRate = totalViews > 0 
        ? ((totalClicks / totalViews) * 100).toFixed(1)
        : '0';

      // calculate average days to first click
      let totalDaysToClick = 0;
      let jobsWithClicks = 0;

      for (const job of allJobs) {
        const { data: firstClick } = await supabase
          .from('link_clicks')
          .select('clicked_at')
          .eq('job_id', job.id)
          .order('clicked_at', { ascending: true })
          .limit(1)
          .single();

        if (firstClick) {
          const jobCreatedDate = new Date(job.created_at);
          const firstClickDate = new Date(firstClick.clicked_at);
          const daysDiff = Math.floor((firstClickDate.getTime() - jobCreatedDate.getTime()) / (1000 * 60 * 60 * 24));
          totalDaysToClick += daysDiff;
          jobsWithClicks++;
        }
      }

      const avgDaysToClick = jobsWithClicks > 0 
        ? (totalDaysToClick / jobsWithClicks).toFixed(1)
        : '0';

      setAnalyticsOverview({
        totalJobs: allJobs.length,
        totalLinkClicks: totalClicks,
        averageClicksPerJob: avgClicksPerJob,
        totalViews: totalViews,
        engagementRate: engagementRate,
        activeJobs: activeJobsCount,
        expiredJobs: expiredJobsCount,
        averageDaysToClick: avgDaysToClick,
      });

      // build trend data (daily clicks and views)
      const trendMap = new Map<string, { clicks: number; views: number }>();
      
      // initialize all dates in range with 0
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        trendMap.set(dateStr, { clicks: 0, views: 0 });
      }

      // add actual click counts
      clicksData?.forEach(click => {
        const dateStr = new Date(click.clicked_at).toISOString().split('T')[0];
        if (trendMap.has(dateStr)) {
          trendMap.get(dateStr)!.clicks++;
        }
      });

      // add actual view counts
      viewsData?.forEach(view => {
        const dateStr = new Date(view.viewed_at).toISOString().split('T')[0];
        if (trendMap.has(dateStr)) {
          trendMap.get(dateStr)!.views++;
        }
      });

      // convert map to array for chart
      const trends: TrendData[] = Array.from(trendMap.entries()).map(([date, data]) => ({
        date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        clicks: data.clicks,
        views: data.views,
      }));

      setClickTrends(trends);

      // calculate top performing jobs
      const jobPerformance = await Promise.all(
        allJobs.map(async (job) => {
          const { count: clickCount } = await supabase
            .from('link_clicks')
            .select('*', { count: 'exact', head: true })
            .eq('job_id', job.id)
            .gte('clicked_at', startDate.toISOString());

          const { count: viewCount } = await supabase
            .from('job_views')
            .select('*', { count: 'exact', head: true })
            .eq('job_id', job.id)
            .gte('viewed_at', startDate.toISOString());

          const clicks = clickCount || 0;
          const views = viewCount || 0;
          const engRate = views > 0 ? ((clicks / views) * 100).toFixed(1) : '0';

          // calculate how many days the job has been active
          const jobCreated = new Date(job.created_at);
          const now = new Date();
          const daysActive = Math.floor((now.getTime() - jobCreated.getTime()) / (1000 * 60 * 60 * 24));

          return {
            id: job.id,
            title: job.title,
            company: job.company,
            clicks,
            views,
            engagementRate: engRate,
            status: job.status,
            daysActive,
          };
        })
      );

      // sort by clicks and take top 5
      const topJobs = jobPerformance
        .sort((a, b) => b.clicks - a.clicks)
        .slice(0, 5);

      setTopPerformingJobs(topJobs);
    } catch (error) {
      console.error('error fetching analytics:', error);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  // soft delete a job (mark as removed)
  const handleRemove = async (jobId: string) => {
    if (!confirm('are you sure you want to remove this job posting?')) return;

    try {
      const { error } = await supabase
        .from('jobs')
        .update({ status: 'removed' })
        .eq('id', jobId);

      if (error) throw error;

      alert('job removed successfully');
      fetchJobs();
    } catch (error) {
      console.error('error removing job:', error);
      alert('failed to remove job');
    }
  };

  // reactivate an archived job with a new deadline
  const handleReactivate = async (jobId: string) => {
    const newDeadline = prompt('enter a new deadline for this job (YYYY-MM-DD):');
    
    if (!newDeadline) return;

    // validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(newDeadline)) {
      alert('invalid date format. please use YYYY-MM-DD');
      return;
    }

    // make sure new deadline is in the future
    const newDeadlineDate = new Date(newDeadline);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (newDeadlineDate <= today) {
      alert('deadline must be in the future');
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

      if (error) throw error;

      alert('job reactivated successfully with new deadline');
      fetchJobs();
      fetchArchivedJobs();
    } catch (error) {
      console.error('error reactivating job:', error);
      alert('failed to reactivate job');
    }
  };

  // filter jobs based on status
  const filteredJobs = useMemo(() => {
    if (!statusFilter) return jobs;
    return jobs.filter(job => job.status === statusFilter);
  }, [jobs, statusFilter]);

  // show loading spinner while checking auth and permissions
  if (loading || checkingPermission) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* header */}
      <div className="bg-red-600 text-white py-8 shadow-md">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl font-bold">faculty dashboard</h1>
          <p className="text-red-100 mt-2">manage your job postings and view analytics</p>
        </div>
      </div>

      {/* main content */}
      <div className="container mx-auto px-4 py-8">
        {/* stats overview cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">total jobs</p>
                <p className="text-3xl font-bold text-gray-800">{jobs.length}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">active jobs</p>
                <p className="text-3xl font-bold text-green-600">
                  {jobs.filter(j => j.status === 'active').length}
                </p>
              </div>
              <div className="bg-green-100 p-3 rounded-full">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">pending review</p>
                <p className="text-3xl font-bold text-yellow-600">
                  {jobs.filter(j => j.status === 'pending').length}
                </p>
              </div>
              <div className="bg-yellow-100 p-3 rounded-full">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">total link clicks</p>
                <p className="text-3xl font-bold text-purple-600">{linkClicksCount}</p>
              </div>
              <div className="bg-purple-100 p-3 rounded-full">
                <CursorArrowRaysIcon className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* post job button or disabled message */}
        <div className="mb-8">
          {canPostJobs ? (
            <Link href="/faculty/create">
              <button className="bg-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                post a new job
              </button>
            </Link>
          ) : (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-700">
                    <strong>job posting is temporarily disabled.</strong> please contact the admin team if you need to post a position.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* tabs navigation */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('active')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'active'
                  ? 'border-red-600 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              active jobs
            </button>
            <button
              onClick={() => setActiveTab('archived')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'archived'
                  ? 'border-red-600 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              archived jobs
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2 ${
                activeTab === 'analytics'
                  ? 'border-red-600 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <ChartBarIcon className="w-5 h-5" />
              analytics
            </button>
          </nav>
        </div>

        {/* tab content */}
        {activeTab === 'active' ? (
          // active jobs section
          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">your active job postings</h2>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
              >
                <option value="">all statuses</option>
                <option value="active">active</option>
                <option value="pending">pending</option>
                <option value="removed">removed</option>
                <option value="rejected">rejected</option>
              </select>
            </div>

            {loading ? (
              <p className="text-center text-gray-500 py-10">loading jobs...</p>
            ) : filteredJobs.length === 0 ? (
              <div className="text-center py-10 bg-gray-50 rounded-lg">
                <h3 className="text-xl font-semibold text-gray-700">no jobs found.</h3>
                <p className="text-gray-500 mt-2">
                  {canPostJobs 
                    ? 'start by posting your first job opening.'
                    : 'job posting is currently disabled.'
                  }
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
                  />
                ))}
              </div>
            )}
          </div>
        ) : activeTab === 'archived' ? (
          // archived jobs section
          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-800">your archived jobs (past deadline)</h2>
              <p className="text-gray-600 mt-2">
                these jobs have passed their deadline. you can reactivate them with a new deadline.
              </p>
            </div>

            {loadingArchived ? (
              <p className="text-center text-gray-500 py-10">loading archived jobs...</p>
            ) : archivedJobs.length === 0 ? (
              <div className="text-center py-10 bg-gray-50 rounded-lg">
                <h3 className="text-xl font-semibold text-gray-700">no archived jobs yet.</h3>
                <p className="text-gray-500 mt-2">jobs will appear here after their deadline passes.</p>
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
                <h2 className="text-2xl font-bold text-gray-800">quick analytics overview</h2>
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                >
                  <option value="7">last 7 days</option>
                  <option value="30">last 30 days</option>
                  <option value="90">last 90 days</option>
                  <option value="365">last year</option>
                </select>
              </div>

              {loadingAnalytics ? (
                <p className="text-center text-gray-500 py-10">loading analytics...</p>
              ) : (
                <>
                  {/* analytics overview cards */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-500">total link clicks</p>
                      <p className="text-2xl font-bold text-gray-800">{analyticsOverview.totalLinkClicks}</p>
                      <p className="text-xs text-gray-600 mt-1">
                        avg: {analyticsOverview.averageClicksPerJob} per job
                      </p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-500">total views</p>
                      <p className="text-2xl font-bold text-blue-600">{analyticsOverview.totalViews}</p>
                      <p className="text-xs text-gray-600 mt-1">
                        engagement: {analyticsOverview.engagementRate}%
                      </p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-500">active jobs</p>
                      <p className="text-2xl font-bold text-green-600">{analyticsOverview.activeJobs}</p>
                      <p className="text-xs text-gray-600 mt-1">
                        of {analyticsOverview.totalJobs} total
                      </p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-500">avg days to click</p>
                      <p className="text-2xl font-bold text-purple-600">{analyticsOverview.averageDaysToClick}</p>
                      <p className="text-xs text-gray-600 mt-1">after posting</p>
                    </div>
                  </div>

                  {/* simple trend chart */}
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-3">engagement trends</h3>
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
                        <span className="text-sm text-gray-600">link clicks</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-blue-600 rounded"></div>
                        <span className="text-sm text-gray-600">views</span>
                      </div>
                    </div>
                  </div>

                  {/* top performing jobs table */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">top performing jobs</h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">job title</th>
                            <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">link clicks</th>
                            <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">views</th>
                            <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">engagement</th>
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
