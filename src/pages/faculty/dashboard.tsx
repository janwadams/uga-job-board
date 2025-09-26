// pages/faculty/dashboard.tsx
// Complete faculty dashboard with analytics tab included

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/router';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

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

// Types for analytics data
interface AnalyticsOverview {
  totalJobs: number;
  totalApplications: number;
  averageApplicationsPerJob: string;
  totalViews: number;
  conversionRate: string;
  activeJobs: number;
  expiredJobs: number;
  averageDaysToApply: string;
}

interface TrendData {
  date: string;
  applications: number;
  views: number;
}

interface TopJob {
  id: string;
  title: string;
  company: string;
  applications: number;
  views: number;
  conversionRate: string;
  status: string;
  daysActive: number;
}

// Job card component - shows individual job postings
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

  // Calculate how many days since the job expired (for archived jobs)
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
          // Buttons for archived jobs
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
          // Buttons for active jobs
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
  // Tab management - active, archived, or analytics view
  const [activeTab, setActiveTab] = useState<'active' | 'archived' | 'analytics'>('active');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [archivedJobs, setArchivedJobs] = useState<Job[]>([]);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadingArchived, setLoadingArchived] = useState(true);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [userRole, setUserRole] = useState<string | null>(null);
  
  // Analytics state - stores all the data for charts and metrics
  const [dateRange, setDateRange] = useState('30'); // Default to 30 days
  const [analyticsOverview, setAnalyticsOverview] = useState<AnalyticsOverview>({
    totalJobs: 0,
    totalApplications: 0,
    averageApplicationsPerJob: '0',
    totalViews: 0,
    conversionRate: '0',
    activeJobs: 0,
    expiredJobs: 0,
    averageDaysToApply: '0'
  });
  const [applicationTrends, setApplicationTrends] = useState<TrendData[]>([]);
  const [topPerformingJobs, setTopPerformingJobs] = useState<TopJob[]>([]);

  // Check if user is logged in and has faculty role
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

  // Fetch active jobs when tab changes or filter changes
  useEffect(() => {
    const fetchJobs = async () => {
      if (!session?.user) {
        setLoading(false);
        return;
      }
      
      const userId = session.user.id;
      setLoading(true);

      // Get today's date to filter out expired jobs
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let query = supabase
        .from('jobs')
        .select('*')
        .eq('created_by', userId)
        .gte('deadline', today.toISOString()); // Only get non-expired jobs

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
    }
  }, [session, statusFilter]);

  // Fetch archived (expired) jobs
  useEffect(() => {
    const fetchArchivedJobs = async () => {
      if (!session?.user) {
        setLoadingArchived(false);
        return;
      }
      
      const userId = session.user.id;
      setLoadingArchived(true);

      // Get today's date to filter expired jobs
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('created_by', userId)
        .lt('deadline', today.toISOString()) // Only get expired jobs
        .order('deadline', { ascending: false }); // Newest expired first

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

  // Fetch analytics data when analytics tab is selected or date range changes
  useEffect(() => {
    if (activeTab === 'analytics' && session) {
      fetchAnalyticsData();
    }
  }, [activeTab, dateRange, session]);

  // Function to fetch all analytics data
  const fetchAnalyticsData = async () => {
    if (!session?.user) return;
    
    setLoadingAnalytics(true);
    try {
      const userId = session.user.id;
      
      // Fetch all jobs with applications and views
      const { data: jobsWithData, error: jobsError } = await supabase
  .from('jobs')
  .select(`
    *,
    job_applications (
      id,
      applied_at,    // ← Use correct column name
      status,
      student_id     // ← Use correct column name
    ),
    job_views (
      id,
      viewed_at,
      user_id
    )
  `)
  .eq('created_by', userId);

      if (jobsError) throw jobsError;

      // Calculate overview metrics
      const totalJobs = jobsWithData?.length || 0;
      const today = new Date();
      
      const activeJobsCount = jobsWithData?.filter(job => 
        job.status === 'active' && new Date(job.deadline) > today
      ).length || 0;
      
      const expiredJobsCount = jobsWithData?.filter(job => 
        new Date(job.deadline) <= today
      ).length || 0;

      const totalApplications = jobsWithData?.reduce((sum, job) => 
        sum + (job.job_applications?.length || 0), 0
      ) || 0;
      
      const totalViews = jobsWithData?.reduce((sum, job) => 
        sum + (job.job_views?.length || 0), 0
      ) || 0;

      const averageApplicationsPerJob = totalJobs > 0 
        ? (totalApplications / totalJobs).toFixed(1) 
        : '0';

      const conversionRate = totalViews > 0 
        ? ((totalApplications / totalViews) * 100).toFixed(1)
        : '0';

      // Calculate average days to first application
      let totalDaysToApply = 0;
      let jobsWithApplications = 0;
      
      jobsWithData?.forEach(job => {
        if (job.job_applications && job.job_applications.length > 0) {
          const sortedApps = [...job.job_applications].sort((a, b) => 
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
          const firstApp = sortedApps[0];
          const daysToApply = Math.ceil(
            (new Date(firstApp.created_at).getTime() - new Date(job.created_at).getTime()) 
            / (1000 * 60 * 60 * 24)
          );
          if (daysToApply > 0) {
            totalDaysToApply += daysToApply;
            jobsWithApplications++;
          }
        }
      });

      const averageDaysToApply = jobsWithApplications > 0
        ? (totalDaysToApply / jobsWithApplications).toFixed(1)
        : '0';

      setAnalyticsOverview({
        totalJobs,
        totalApplications,
        averageApplicationsPerJob,
        totalViews,
        conversionRate,
        activeJobs: activeJobsCount,
        expiredJobs: expiredJobsCount,
        averageDaysToApply
      });

      // Prepare trend data for chart
      const daysAgo = parseInt(dateRange);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);
      
      const trendMap: { [key: string]: { applications: number; views: number } } = {};
      
      // Initialize all dates with zero counts
      for (let d = new Date(startDate); d <= today; d.setDate(d.getDate() + 1)) {
        const dateKey = d.toISOString().split('T')[0];
        trendMap[dateKey] = { applications: 0, views: 0 };
      }
      
      // Count applications and views by date
      jobsWithData?.forEach(job => {
        job.job_applications?.forEach(app => {
          const appDate = new Date(app.created_at);
          if (appDate >= startDate) {
            const dateKey = appDate.toISOString().split('T')[0];
            if (trendMap[dateKey]) {
              trendMap[dateKey].applications++;
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
        applications: data.applications,
        views: data.views
      }));

      setApplicationTrends(trends);

      // Calculate top performing jobs
      const topJobs = jobsWithData?.map(job => ({
        id: job.id,
        title: job.title,
        company: job.company,
        applications: job.job_applications?.length || 0,
        views: job.job_views?.length || 0,
        conversionRate: (job.job_views?.length || 0) > 0 
          ? (((job.job_applications?.length || 0) / (job.job_views?.length || 0)) * 100).toFixed(1)
          : '0',
        status: job.status,
        daysActive: Math.ceil((today.getTime() - new Date(job.created_at).getTime()) / (1000 * 60 * 60 * 24))
      }))
      .sort((a, b) => b.applications - a.applications)
      .slice(0, 5) || [];

      setTopPerformingJobs(topJobs);

    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  // Handle removing a job (soft delete)
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

  // Handle reactivating an expired job with a new deadline
  const handleReactivate = async (jobId: string) => {
    const newDeadline = prompt("Enter new deadline (YYYY-MM-DD):");
    if (!newDeadline) return;

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(newDeadline)) {
      alert('Please enter date in YYYY-MM-DD format');
      return;
    }

    // Check if date is in the future
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
        // Refresh both lists
        window.location.reload();
      } else {
        alert('Failed to reactivate job.');
      }
    } catch (error) {
      console.error('Error reactivating job:', error);
      alert('An error occurred while reactivating the job.');
    }
  };
  
  // Calculate metrics from the jobs list
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
            <Link href="/faculty/analytics">
              <button className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-sm">
                📊 Full Analytics
              </button>
            </Link>
            <Link href="/faculty/create">
              <button className="bg-red-700 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-800 transition-colors shadow-sm">
                + Post a New Job
              </button>
            </Link>
          </div>
        </div>

        {/* Metrics cards - shows key statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <h3 className="text-gray-500 font-semibold">Total Jobs Posted</h3>
            <p className="text-4xl font-bold text-gray-800 mt-2">{totalJobs}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <h3 className="text-gray-500 font-semibold">Active Jobs</h3>
            <p className="text-4xl font-bold text-green-600 mt-2">{activeJobs}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <h3 className="text-gray-500 font-semibold">Pending Review</h3>
            <p className="text-4xl font-bold text-yellow-600 mt-2">
              {jobs.filter(j => j.status === 'pending').length}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <h3 className="text-gray-500 font-semibold">Archived</h3>
            <p className="text-4xl font-bold text-gray-600 mt-2">{totalArchived}</p>
          </div>
        </div>

        {/* Tabs for switching between active, archived, and analytics */}
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

        {/* Content based on active tab */}
        {activeTab === 'active' ? (
          // Active jobs section
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
                  <option value="pending">Pending</option>
                  <option value="rejected">Rejected</option>
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
          // Archived jobs section
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
          // Analytics section - shows performance metrics
          <div className="space-y-6">
            {/* Date range selector for analytics */}
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
                  {/* Analytics overview cards */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-500">Total Applications</p>
                      <p className="text-2xl font-bold text-gray-800">{analyticsOverview.totalApplications}</p>
                      <p className="text-xs text-gray-600 mt-1">
                        Avg: {analyticsOverview.averageApplicationsPerJob} per job
                      </p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-500">Total Views</p>
                      <p className="text-2xl font-bold text-blue-600">{analyticsOverview.totalViews}</p>
                      <p className="text-xs text-gray-600 mt-1">
                        Conversion: {analyticsOverview.conversionRate}%
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
                      <p className="text-sm text-gray-500">Avg Days to Apply</p>
                      <p className="text-2xl font-bold text-purple-600">{analyticsOverview.averageDaysToApply}</p>
                      <p className="text-xs text-gray-600 mt-1">after posting</p>
                    </div>
                  </div>

                  {/* Simple trend chart */}
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-3">Application & View Trends</h3>
                    <div className="overflow-x-auto">
                      <div className="min-w-[600px] h-48 flex items-end justify-between gap-1">
                        {applicationTrends.slice(-14).map((day, index) => (
                          <div key={index} className="flex-1 flex flex-col items-center">
                            <div className="w-full flex gap-0.5 items-end h-40">
                              <div 
                                className="flex-1 bg-red-600 rounded-t"
                                style={{ 
                                  height: `${day.applications > 0 ? (day.applications / Math.max(...applicationTrends.map(d => d.applications)) * 100) : 0}%`,
                                  minHeight: day.applications > 0 ? '4px' : '0'
                                }}
                                title={`${day.applications} applications`}
                              />
                              <div 
                                className="flex-1 bg-blue-600 rounded-t"
                                style={{ 
                                  height: `${day.views > 0 ? (day.views / Math.max(...applicationTrends.map(d => d.views)) * 100) : 0}%`,
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
                        <span className="text-sm text-gray-600">Applications</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-blue-600 rounded"></div>
                        <span className="text-sm text-gray-600">Views</span>
                      </div>
                    </div>
                  </div>

                  {/* Top performing jobs table */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Top Performing Jobs</h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Job Title</th>
                            <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Applications</th>
                            <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Views</th>
                            <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Conversion</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {topPerformingJobs.map((job, index) => (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm font-medium text-gray-900">{job.title}</td>
                              <td className="px-4 py-3 text-sm text-center">
                                <span className="font-semibold text-green-600">{job.applications}</span>
                              </td>
                              <td className="px-4 py-3 text-sm text-center">{job.views}</td>
                              <td className="px-4 py-3 text-sm text-center">
                                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                  {job.conversionRate}%
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