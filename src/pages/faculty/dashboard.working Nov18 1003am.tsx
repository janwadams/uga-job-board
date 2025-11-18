// pages/faculty/dashboard.tsx
// Updated faculty dashboard with link click tracking instead of applications

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

  // check if user is logged in and has faculty role
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

  // function to fetch link clicks count for all faculty's jobs
  const fetchLinkClicksCount = async () => {
    if (!session) return;
    
    try {
      // get all jobs by this faculty member
      const { data: jobs } = await supabase
        .from('jobs')
        .select('id')
        .eq('created_by', session.user.id);
      
      if (jobs && jobs.length > 0) {
        // count link clicks for these specific jobs only
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

  // fetch active jobs when tab changes or filter changes
  useEffect(() => {
    const fetchJobs = async () => {
      if (!session?.user) {
        setLoading(false);
        return;
      }
      
      const userId = session.user.id;
      setLoading(true);

      // get today's date to filter out expired jobs
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let query = supabase
        .from('jobs')
        .select('*')
        .eq('created_by', userId)
        .gte('deadline', today.toISOString()); // only get non-expired jobs

      if (statusFilter) {
        query = query.eq('status', statusFilter);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching jobs:', error);
        setJobs([]);
      } else {
        setJobs(data as Job[] || []);
      }

      setLoading(false);
    };

    if (session) {
      fetchJobs();
      fetchLinkClicksCount(); // fetch link clicks count when session is ready
    }
  }, [session, statusFilter]);

  // fetch archived (expired) jobs
  useEffect(() => {
    const fetchArchivedJobs = async () => {
      if (!session?.user) {
        setLoadingArchived(false);
        return;
      }
      
      const userId = session.user.id;
      setLoadingArchived(true);

      // get today's date to filter expired jobs
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('created_by', userId)
        .lt('deadline', today.toISOString()) // only get expired jobs
        .order('deadline', { ascending: false }); // newest expired first

      if (error) {
        console.error('Error fetching archived jobs:', error);
        setArchivedJobs([]);
      } else {
        setArchivedJobs(data as Job[] || []);
      }

      setLoadingArchived(false);
    };

    if (session) {
      fetchArchivedJobs();
    }
  }, [session]);

  // fetch analytics data when analytics tab is selected or date range changes
  useEffect(() => {
    if (activeTab === 'analytics' && session) {
      fetchAnalyticsData();
    }
  }, [activeTab, dateRange, session]);

  // function to fetch all analytics data - updated for link clicks
  const fetchAnalyticsData = async () => {
    if (!session?.user) return;
    
    setLoadingAnalytics(true);
    try {
      const userId = session.user.id;
      
      // fetch all jobs with link clicks and views
      const { data: jobsWithData, error: jobsError } = await supabase
        .from('jobs')
        .select(`
          *,
          job_link_clicks (
            id,
            clicked_at,
            user_id
          ),
          job_views (
            id,
            created_at,
            user_id
          )
        `)
        .eq('created_by', userId);

      if (jobsError) throw jobsError;

      // calculate overview metrics
      const totalJobs = jobsWithData?.length || 0;
      const today = new Date();
      
      const activeJobsCount = jobsWithData?.filter(job => 
        job.status === 'active' && new Date(job.deadline) > today
      ).length || 0;
      
      const expiredJobsCount = jobsWithData?.filter(job => 
        new Date(job.deadline) <= today
      ).length || 0;

      const totalLinkClicks = jobsWithData?.reduce((sum, job) => 
        sum + (job.job_link_clicks?.length || 0), 0
      ) || 0;
      
      const totalViews = jobsWithData?.reduce((sum, job) => 
        sum + (job.job_views?.length || 0), 0
      ) || 0;

      const averageClicksPerJob = totalJobs > 0 
        ? (totalLinkClicks / totalJobs).toFixed(1) 
        : '0';

      const engagementRate = totalViews > 0 
        ? ((totalLinkClicks / totalViews) * 100).toFixed(1)
        : '0';

      // calculate average days to first click
      let totalDaysToClick = 0;
      let jobsWithClicks = 0;
      
      jobsWithData?.forEach(job => {
        if (job.job_link_clicks && job.job_link_clicks.length > 0) {
          const sortedClicks = [...job.job_link_clicks].sort((a, b) => 
            new Date(a.clicked_at).getTime() - new Date(b.clicked_at).getTime()
          );
          const firstClick = sortedClicks[0];
          const daysToClick = Math.ceil(
            (new Date(firstClick.clicked_at).getTime() - new Date(job.created_at).getTime())
            / (1000 * 60 * 60 * 24)
          );
          if (daysToClick > 0) {
            totalDaysToClick += daysToClick;
            jobsWithClicks++;
          }
        }
      });

      const averageDaysToClick = jobsWithClicks > 0
        ? (totalDaysToClick / jobsWithClicks).toFixed(1)
        : '0';

      setAnalyticsOverview({
        totalJobs,
        totalLinkClicks,
        averageClicksPerJob,
        totalViews,
        engagementRate,
        activeJobs: activeJobsCount,
        expiredJobs: expiredJobsCount,
        averageDaysToClick
      });

      // prepare trend data for chart
      const daysAgo = parseInt(dateRange);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);
      
      const trendMap: { [key: string]: { clicks: number; views: number } } = {};
      
      for (let d = new Date(startDate); d <= today; d.setDate(d.getDate() + 1)) {
        const dateKey = d.toISOString().split('T')[0];
        trendMap[dateKey] = { clicks: 0, views: 0 };
      }
      
      jobsWithData?.forEach(job => {
        job.job_link_clicks?.forEach(click => {
          const clickDate = new Date(click.clicked_at);
          if (clickDate >= startDate) {
            const dateKey = clickDate.toISOString().split('T')[0];
            if (trendMap[dateKey]) {
              trendMap[dateKey].clicks++;
            }
          }
        });
        
        job.job_views?.forEach(view => {
          const viewDate = new Date(view.created_at);
          if (viewDate >= startDate) {
            const dateKey = viewDate.toISOString().split('T')[0];
            if (trendMap[dateKey]) {
              trendMap[dateKey].views++;
            }
          }
        });
      });

      const trends = Object.entries(trendMap).map(([date, data]) => ({
        date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        clicks: data.clicks,
        views: data.views
      }));

      setClickTrends(trends);

      // calculate top performing jobs
      const topJobs = jobsWithData?.map(job => ({
        id: job.id,
        title: job.title,
        company: job.company,
        clicks: job.job_link_clicks?.length || 0,
        views: job.job_views?.length || 0,
        engagementRate: (job.job_views?.length || 0) > 0 
          ? (((job.job_link_clicks?.length || 0) / (job.job_views?.length || 0)) * 100).toFixed(1)
          : '0',
        status: job.status,
        daysActive: Math.ceil((today.getTime() - new Date(job.created_at).getTime()) / (1000 * 60 * 60 * 24))
      }))
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 5) || [];

      setTopPerformingJobs(topJobs);

    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  // handle removing a job (soft delete)
  const handleRemove = async (jobId: string) => {
    if (!confirm('Are you sure you want to remove this posting? This action is permanent.')) {
      return;
    }

    const { error } = await supabase
      .from('jobs')
      .update({ status: 'removed' })
      .eq('id', jobId);

    if (error) {
      alert('Failed to remove job.');
    } else {
      setJobs((prev) =>
        prev.map((job) =>
          job.id === jobId ? { ...job, status: 'removed' as Job['status'] } : job
        )
      );
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

  if (!session || !userRole) {
    return <p className="p-8 text-center">Loading dashboard...</p>;
  }

  return (
    <div className="bg-gray-50 min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-red-800">📚 Faculty Dashboard</h1>
          <div className="flex gap-4">
            {/* removed view applications button since faculty can't see applications anymore */}
            <Link href="/profile/settings">
              <button className="bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-700 transition-colors shadow-sm flex items-center gap-2">
                <UserCircleIcon className="h-5 w-5" />
                Account Settings
              </button>
            </Link>
            <Link href="/faculty/analytics">
              <button className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2">
                <ChartBarIcon className="h-5 w-5" />
                Full Analytics
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
                <h3 className="text-gray-500 font-semibold">Link Clicks</h3>
                <p className="text-4xl font-bold text-purple-600 mt-2">{linkClicksCount}</p>
                <p className="text-xs text-gray-600 mt-1">
                  Student engagement
                </p>
              </div>
              <CursorArrowRaysIcon className="h-10 w-10 text-purple-500" />
            </div>
          </div>
        </div>

        {/* tabs for switching between active, archived, and analytics */}
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
              onClick={() => setActiveTab('archived')} 
              className={`${
                activeTab === 'archived' 
                  ? 'border-red-700 text-red-800' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-lg`}
            >
              Archived Jobs ({archivedJobs.length})
            </button>
            <button 
              onClick={() => setActiveTab('analytics')} 
              className={`${
                activeTab === 'analytics' 
                  ? 'border-red-700 text-red-800' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-lg`}
            >
              Quick Analytics
            </button>
          </nav>
        </div>

        {/* content based on active tab */}
        {activeTab === 'active' ? (
          // active jobs section
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
                  <option value="active">Active</option>
                  <option value="removed">Removed</option>
                </select>
              </div>
            </div>

            {loading ? (
              <p className="text-center text-gray-500 py-10">Loading your jobs...</p>
            ) : jobs.length === 0 ? (
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