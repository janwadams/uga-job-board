// pages/faculty/dashboard.tsx
// updated faculty dashboard with link click tracking instead of applications

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/router';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import { 
  CursorArrowRaysIcon,
  ChartBarIcon 
} from '@heroicons/react/24/outline';

// we still need supabase client to get the session token for api calls
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
    checkAuth();
  }, []);

  // when user changes tabs or date range, load the appropriate data
  useEffect(() => {
    if (session && userRole === 'faculty') {
      if (activeTab === 'active') {
        fetchJobs();
      } else if (activeTab === 'archived') {
        fetchArchivedJobs();
      } else if (activeTab === 'analytics') {
        fetchAnalytics();
      }
    }
  }, [session, userRole, activeTab, dateRange]);

  const checkAuth = async () => {
    try {
      // get the current session using supabase client
      const { data: { session: userSession }, error } = await supabase.auth.getSession();
      
      if (error || !userSession) {
        router.push('/login');
        return;
      }

      // verify user has faculty role
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userSession.user.id)
        .single();

      if (roleError || roleData?.role !== 'faculty') {
        router.push('/unauthorized');
        return;
      }

      setSession(userSession);
      setUserRole(roleData.role);
    } catch (error) {
      console.error('error checking auth:', error);
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  // fetch active jobs using api route
  const fetchJobs = async () => {
    if (!session) return;
    
    setLoading(true);
    try {
      // call our api route to get active jobs (not archived)
      const response = await fetch('/api/faculty/jobs/list?archived=false', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error('failed to fetch jobs');
      }

      const data = await response.json();
      setJobs(data.jobs || []);
    } catch (error) {
      console.error('error fetching jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  // fetch archived jobs (past deadline) using api route
  const fetchArchivedJobs = async () => {
    if (!session) return;
    
    setLoadingArchived(true);
    try {
      // call our api route to get archived jobs (deadline passed)
      const response = await fetch('/api/faculty/jobs/list?archived=true', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error('failed to fetch archived jobs');
      }

      const data = await response.json();
      setArchivedJobs(data.jobs || []);
    } catch (error) {
      console.error('error fetching archived jobs:', error);
    } finally {
      setLoadingArchived(false);
    }
  };

  // fetch analytics data using api route
  const fetchAnalytics = async () => {
    if (!session) return;
    
    setLoadingAnalytics(true);
    try {
      // call our api route to get analytics data
      const response = await fetch(`/api/faculty/analytics?days=${dateRange}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error('failed to fetch analytics');
      }

      const data = await response.json();
      
      // set all the analytics state from the api response
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
    } catch (error) {
      console.error('error fetching analytics:', error);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  // soft delete a job - marks it as removed using api route
  const handleRemove = async (jobId: string) => {
    if (!confirm('are you sure you want to remove this job? it will be marked as inactive.')) {
      return;
    }

    try {
      // call our api route to update the job status to removed
      const response = await fetch(`/api/faculty/jobs/${jobId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ status: 'removed' }),
      });

      if (!response.ok) {
        throw new Error('failed to remove job');
      }

      // reload the jobs list to show updated status
      fetchJobs();
      alert('job removed successfully');
    } catch (error) {
      console.error('error removing job:', error);
      alert('failed to remove job. please try again.');
    }
  };

  // reactivate an archived job with a new deadline using api route
  const handleReactivate = async (jobId: string) => {
    const newDeadline = prompt('enter new deadline (yyyy-mm-dd):');
    if (!newDeadline) return;

    // basic date validation
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(newDeadline)) {
      alert('invalid date format. please use yyyy-mm-dd');
      return;
    }

    const deadlineDate = new Date(newDeadline);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (deadlineDate <= today) {
      alert('deadline must be in the future');
      return;
    }

    try {
      // call our api route to update the job with new deadline and active status
      const response = await fetch(`/api/faculty/jobs/${jobId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ 
          deadline: newDeadline,
          status: 'active'
        }),
      });

      if (!response.ok) {
        throw new Error('failed to reactivate job');
      }

      // reload both lists to show updated job
      fetchArchivedJobs();
      fetchJobs();
      alert('job reactivated successfully with new deadline');
    } catch (error) {
      console.error('error reactivating job:', error);
      alert('failed to reactivate job. please try again.');
    }
  };

  // filter jobs based on the selected status
  const filteredJobs = useMemo(() => {
    if (!statusFilter) return jobs;
    return jobs.filter(job => job.status === statusFilter);
  }, [jobs, statusFilter]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-700 mx-auto"></div>
          <p className="mt-4 text-gray-600">loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* header section */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-red-800">Faculty Dashboard</h1>
              <p className="text-gray-600 mt-1">manage your job postings and track engagement</p>
            </div>
            <div className="flex gap-3">
              <Link href="/faculty/post-job">
                <button className="px-4 py-2 bg-red-700 text-white rounded hover:bg-red-800 font-semibold">
                  + Post New Job
                </button>
              </Link>
              <button
                onClick={() => router.push('/login')}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 font-semibold"
              >
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* tab navigation */}
        <div className="mb-6 border-b border-gray-200">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('active')}
              className={`px-6 py-3 font-semibold transition-colors ${
                activeTab === 'active'
                  ? 'text-red-700 border-b-2 border-red-700'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Active Jobs ({jobs.filter(j => j.status === 'active' || j.status === 'pending').length})
            </button>
            <button
              onClick={() => setActiveTab('archived')}
              className={`px-6 py-3 font-semibold transition-colors ${
                activeTab === 'archived'
                  ? 'text-red-700 border-b-2 border-red-700'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Archived Jobs ({archivedJobs.length})
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-6 py-3 font-semibold transition-colors flex items-center gap-2 ${
                activeTab === 'analytics'
                  ? 'text-red-700 border-b-2 border-red-700'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <ChartBarIcon className="w-5 h-5" />
              Quick Analytics
            </button>
          </div>
        </div>

        {/* main content area - changes based on active tab */}
        {activeTab === 'active' ? (
          // active jobs section
          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Your Active Job Postings</h2>
                <p className="text-gray-600 mt-1">
                  {filteredJobs.length} {filteredJobs.length === 1 ? 'job' : 'jobs'} 
                  {statusFilter && ` with status: ${statusFilter}`}
                </p>
              </div>
              
              {/* filter dropdown */}
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
              <p className="text-center text-gray-500 py-10">loading jobs...</p>
            ) : filteredJobs.length === 0 ? (
              <div className="text-center py-10 bg-gray-50 rounded-lg">
                <h3 className="text-xl font-semibold text-gray-700">
                  {statusFilter ? 'No jobs match this filter' : 'No jobs posted yet'}
                </h3>
                <p className="text-gray-500 mt-2">
                  {statusFilter 
                    ? 'try selecting a different status filter above' 
                    : 'click "Post New Job" to create your first job posting'}
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
              <h2 className="text-2xl font-bold text-gray-800">Your Archived Jobs (Past Deadline)</h2>
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
          // analytics section - updated labels
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
                  {/* analytics overview cards - updated labels */}
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

                  {/* simple trend chart - updated labels */}
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

                  {/* top performing jobs table - updated labels */}
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
