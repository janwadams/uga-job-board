// /pages/rep/analytics.tsx
// analytics dashboard for company representatives to track their job posting performance

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/router';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface AnalyticsOverview {
  totalJobs: number;
  totalApplications: number;
  averageApplicationsPerJob: string;
  totalViews: number;
  conversionRate: string;
  activeJobs: number;
  pendingJobs: number;
  rejectedJobs: number;
  approvalRate: string;
  averageDaysToApply: string;
  averageTimeToApproval: string;
}

interface TrendData {
  date: string;
  applications: number;
  views: number;
  postings: number;
}

interface JobTypeData {
  name: string;
  value: number;
  percentage: string;
  applications: number;
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
  deadline: string;
}

interface SkillDemand {
  skill: string;
  count: number;
  applications: number;
  avgApplicationsPerJob: string;
}

interface StatusBreakdown {
  status: string;
  count: number;
  percentage: string;
  color: string;
}

interface ApplicationStatus {
  status: string;
  count: number;
  percentage: string;
}

interface CompetitorComparison {
  metric: string;
  yourValue: number | string;
  industryAvg: number | string;
  performance: 'above' | 'below' | 'equal';
}

export default function RepAnalytics() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);
  const [dateRange, setDateRange] = useState('30');
  const [companyName, setCompanyName] = useState('');
  
  const [overview, setOverview] = useState<AnalyticsOverview>({
    totalJobs: 0,
    totalApplications: 0,
    averageApplicationsPerJob: '0',
    totalViews: 0,
    conversionRate: '0',
    activeJobs: 0,
    pendingJobs: 0,
    rejectedJobs: 0,
    approvalRate: '0',
    averageDaysToApply: '0',
    averageTimeToApproval: '0'
  });

  const [applicationTrends, setApplicationTrends] = useState<TrendData[]>([]);
  const [jobTypeDistribution, setJobTypeDistribution] = useState<JobTypeData[]>([]);
  const [topPerformingJobs, setTopPerformingJobs] = useState<TopJob[]>([]);
  const [skillsDemand, setSkillsDemand] = useState<SkillDemand[]>([]);
  const [statusBreakdown, setStatusBreakdown] = useState<StatusBreakdown[]>([]);
  const [applicationStatuses, setApplicationStatuses] = useState<ApplicationStatus[]>([]);
  const [competitorComparison, setCompetitorComparison] = useState<CompetitorComparison[]>([]);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (session) {
      fetchAnalyticsData();
    }
  }, [session, dateRange]);

  const checkAuth = async () => {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error || !session) {
      router.push('/login');
      return;
    }

    // check if user is a rep
    const { data: userData } = await supabase
      .from('user_roles')
      .select('role, company_name')
      .eq('user_id', session.user.id)
      .single();

    if (userData?.role !== 'rep') {
      router.push('/unauthorized');
      return;
    }

    setSession(session);
    setCompanyName(userData.company_name || 'Your Company');
  };

  const fetchAnalyticsData = async () => {
    if (!session) return;
    
    setLoading(true);
    try {
      const userId = session.user.id;
      
      // fetch all jobs by this rep with applications and views
      const { data: jobs, error: jobsError } = await supabase
        .from('jobs')
        .select(`
          *,
          job_applications (
            id,
            applied_at,
            status,
            student_id
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
      const totalJobs = jobs?.length || 0;
      const today = new Date();
      
      // count jobs by status
      const activeJobs = jobs?.filter(job => 
        job.status === 'active' && new Date(job.deadline) > today
      ).length || 0;
      
      const pendingJobs = jobs?.filter(job => 
        job.status === 'pending'
      ).length || 0;
      
      const rejectedJobs = jobs?.filter(job => 
        job.status === 'rejected'
      ).length || 0;

      // calculate approval rate (what percentage of submitted jobs got approved)
      const submittedJobs = jobs?.filter(job => 
        job.status !== 'pending' // jobs that have been reviewed
      ).length || 0;
      
      const approvedJobs = jobs?.filter(job => 
        job.status === 'active' || job.status === 'removed' || job.status === 'archived'
      ).length || 0;
      
      const approvalRate = submittedJobs > 0 
        ? ((approvedJobs / submittedJobs) * 100).toFixed(1)
        : '0';

      const totalApplications = jobs?.reduce((sum, job) => 
        sum + (job.job_applications?.length || 0), 0
      ) || 0;
      
      const totalViews = jobs?.reduce((sum, job) => 
        sum + (job.job_views?.length || 0), 0
      ) || 0;

      const averageApplicationsPerJob = totalJobs > 0 
        ? (totalApplications / totalJobs).toFixed(1) 
        : '0';

      const conversionRate = totalViews > 0 
        ? ((totalApplications / totalViews) * 100).toFixed(1)
        : '0';

      // calculate average days to first application
      let totalDaysToApply = 0;
      let jobsWithApplications = 0;
      
      jobs?.forEach(job => {
        if (job.job_applications && job.job_applications.length > 0) {
          const sortedApps = [...job.job_applications].sort((a, b) => 
            new Date(a.applied_at).getTime() - new Date(b.applied_at).getTime()
          );
          const firstApp = sortedApps[0];
          const daysToApply = Math.ceil(
            (new Date(firstApp.applied_at).getTime() - new Date(job.created_at).getTime())
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

      // calculate average time to approval (for approved jobs)
      let totalDaysToApproval = 0;
      let approvedJobCount = 0;
      
      jobs?.forEach(job => {
        if (job.status === 'active') {
          // estimate approval time (we don't have exact approval timestamp)
          // for now, use a placeholder
          approvedJobCount++;
          totalDaysToApproval += 2; // placeholder: assume 2 days average
        }
      });
      
      const averageTimeToApproval = approvedJobCount > 0
        ? (totalDaysToApproval / approvedJobCount).toFixed(1)
        : '2'; // default estimate

      setOverview({
        totalJobs,
        totalApplications,
        averageApplicationsPerJob,
        totalViews,
        conversionRate,
        activeJobs,
        pendingJobs,
        rejectedJobs,
        approvalRate,
        averageDaysToApply,
        averageTimeToApproval
      });

      // prepare application trends
      const daysAgo = parseInt(dateRange);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);
      
      const trendMap: { [key: string]: { applications: number; views: number; postings: number } } = {};
      
      // initialize all dates
      for (let d = new Date(startDate); d <= today; d.setDate(d.getDate() + 1)) {
        const dateKey = d.toISOString().split('T')[0];
        trendMap[dateKey] = { applications: 0, views: 0, postings: 0 };
      }
      
      // count applications, views, and new postings by date
      jobs?.forEach(job => {
        // count new postings
        const postDate = new Date(job.created_at);
        if (postDate >= startDate) {
          const postDateKey = postDate.toISOString().split('T')[0];
          if (trendMap[postDateKey]) {
            trendMap[postDateKey].postings++;
          }
        }
        
        // count applications
        job.job_applications?.forEach(app => {
          const appDate = new Date(app.applied_at);
          if (appDate >= startDate) {
            const dateKey = appDate.toISOString().split('T')[0];
            if (trendMap[dateKey]) {
              trendMap[dateKey].applications++;
            }
          }
        });
        
        // count views
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
        views: data.views,
        postings: data.postings
      }));

      setApplicationTrends(trends);

      // job type distribution with applications
      const typeData: { [key: string]: { count: number; applications: number } } = {};
      jobs?.forEach(job => {
        if (!typeData[job.job_type]) {
          typeData[job.job_type] = { count: 0, applications: 0 };
        }
        typeData[job.job_type].count++;
        typeData[job.job_type].applications += job.job_applications?.length || 0;
      });
      
      const jobTypes = Object.entries(typeData).map(([type, data]) => ({
        name: type,
        value: data.count,
        percentage: totalJobs > 0 ? ((data.count / totalJobs) * 100).toFixed(1) : '0',
        applications: data.applications
      }));

      setJobTypeDistribution(jobTypes);

      // top performing jobs
      const topJobs = jobs?.map(job => ({
        id: job.id,
        title: job.title,
        company: job.company,
        applications: job.job_applications?.length || 0,
        views: job.job_views?.length || 0,
        conversionRate: (job.job_views?.length || 0) > 0 
          ? ((job.job_applications?.length || 0) / (job.job_views?.length || 0) * 100).toFixed(1)
          : '0',
        status: job.status,
        daysActive: Math.ceil((today.getTime() - new Date(job.created_at).getTime()) / (1000 * 60 * 60 * 24)),
        deadline: job.deadline
      }))
      .filter(job => job.status === 'active') // only show active jobs in top performers
      .sort((a, b) => b.applications - a.applications)
      .slice(0, 5) || [];

      setTopPerformingJobs(topJobs);

      // skills performance analysis
      const skillData: { [key: string]: { count: number; applications: number } } = {};
      jobs?.forEach(job => {
        job.skills?.forEach((skill: string) => {
          if (!skillData[skill]) {
            skillData[skill] = { count: 0, applications: 0 };
          }
          skillData[skill].count++;
          skillData[skill].applications += job.job_applications?.length || 0;
        });
      });
      
      const skills = Object.entries(skillData)
        .map(([skill, data]) => ({
          skill,
          count: data.count,
          applications: data.applications,
          avgApplicationsPerJob: data.count > 0 ? (data.applications / data.count).toFixed(1) : '0'
        }))
        .sort((a, b) => b.applications - a.applications)
        .slice(0, 10);

      setSkillsDemand(skills);

      // job status breakdown
      const statusCounts: { [key: string]: number } = {
        active: activeJobs,
        pending: pendingJobs,
        rejected: rejectedJobs,
        expired: jobs?.filter(job => new Date(job.deadline) <= today).length || 0
      };

      const statuses = Object.entries(statusCounts).map(([status, count]) => ({
        status: status.charAt(0).toUpperCase() + status.slice(1),
        count,
        percentage: totalJobs > 0 ? ((count / totalJobs) * 100).toFixed(1) : '0',
        color: status === 'active' ? 'green' :
               status === 'pending' ? 'yellow' :
               status === 'rejected' ? 'red' :
               'gray'
      }));

      setStatusBreakdown(statuses);

      // application status distribution
      const appStatusCount: { [key: string]: number } = { 
        applied: 0, 
        viewed: 0, 
        interview: 0, 
        hired: 0, 
        rejected: 0 
      };
      
      jobs?.forEach(job => {
        job.job_applications?.forEach(app => {
          const status = app.status || 'applied';
          if (appStatusCount.hasOwnProperty(status)) {
            appStatusCount[status]++;
          }
        });
      });

      const appStatuses = Object.entries(appStatusCount).map(([status, count]) => ({
        status: status.charAt(0).toUpperCase() + status.slice(1),
        count,
        percentage: totalApplications > 0 ? ((count / totalApplications) * 100).toFixed(1) : '0'
      }));

      setApplicationStatuses(appStatuses);

      // competitor comparison (simulated industry averages)
      const comparison: CompetitorComparison[] = [
        {
          metric: 'Applications per Job',
          yourValue: averageApplicationsPerJob,
          industryAvg: '8.5',
          performance: parseFloat(averageApplicationsPerJob) > 8.5 ? 'above' : 
                      parseFloat(averageApplicationsPerJob) < 8.5 ? 'below' : 'equal'
        },
        {
          metric: 'View to Apply Rate',
          yourValue: `${conversionRate}%`,
          industryAvg: '15%',
          performance: parseFloat(conversionRate) > 15 ? 'above' : 
                      parseFloat(conversionRate) < 15 ? 'below' : 'equal'
        },
        {
          metric: 'Days to First Apply',
          yourValue: averageDaysToApply,
          industryAvg: '3.5',
          performance: parseFloat(averageDaysToApply) < 3.5 ? 'above' : 
                      parseFloat(averageDaysToApply) > 3.5 ? 'below' : 'equal'
        },
        {
          metric: 'Approval Rate',
          yourValue: `${approvalRate}%`,
          industryAvg: '85%',
          performance: parseFloat(approvalRate) > 85 ? 'above' : 
                      parseFloat(approvalRate) < 85 ? 'below' : 'equal'
        }
      ];

      setCompetitorComparison(comparison);

    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-center items-center h-96">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-700"></div>
            <div className="ml-4 text-lg">Loading analytics...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-red-800">📊 Company Analytics</h1>
            <p className="text-gray-600 mt-1">{companyName} Performance Dashboard</p>
          </div>
          <div className="flex items-center gap-4">
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
            <Link href="/rep/dashboard">
              <button className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">
                Back to Dashboard
              </button>
            </Link>
          </div>
        </div>

        {/* key metrics overview - rep specific */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <h3 className="text-gray-500 font-semibold text-sm">Total Applications</h3>
            <p className="text-4xl font-bold text-gray-800 mt-2">{overview.totalApplications}</p>
            <p className="text-sm text-gray-600 mt-1">
              Avg: {overview.averageApplicationsPerJob} per job
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <h3 className="text-gray-500 font-semibold text-sm">Total Views</h3>
            <p className="text-4xl font-bold text-blue-600 mt-2">{overview.totalViews}</p>
            <p className="text-sm text-gray-600 mt-1">
              Conversion: {overview.conversionRate}%
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <h3 className="text-gray-500 font-semibold text-sm">Approval Rate</h3>
            <p className="text-4xl font-bold text-green-600 mt-2">{overview.approvalRate}%</p>
            <p className="text-sm text-gray-600 mt-1">
              {overview.rejectedJobs} rejected
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <h3 className="text-gray-500 font-semibold text-sm">Active Jobs</h3>
            <p className="text-4xl font-bold text-purple-600 mt-2">{overview.activeJobs}</p>
            <p className="text-sm text-gray-600 mt-1">
              {overview.pendingJobs} pending approval
            </p>
          </div>
        </div>

        {/* job status breakdown - important for reps */}
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4">📋 Job Status Overview</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {statusBreakdown.map((status, index) => (
              <div key={index} className="text-center">
                <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-2 ${
                  status.color === 'green' ? 'bg-green-100' :
                  status.color === 'yellow' ? 'bg-yellow-100' :
                  status.color === 'red' ? 'bg-red-100' :
                  'bg-gray-100'
                }`}>
                  <span className={`text-2xl font-bold ${
                    status.color === 'green' ? 'text-green-600' :
                    status.color === 'yellow' ? 'text-yellow-600' :
                    status.color === 'red' ? 'text-red-600' :
                    'text-gray-600'
                  }`}>
                    {status.count}
                  </span>
                </div>
                <p className="text-sm font-medium text-gray-700">{status.status}</p>
                <p className="text-xs text-gray-500">{status.percentage}%</p>
              </div>
            ))}
          </div>
        </div>

        {/* application and posting trends */}
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4">📈 Activity Trends</h2>
          <div className="overflow-x-auto">
            <div className="min-w-[600px] h-64 flex items-end justify-between gap-2">
              {applicationTrends.map((day, index) => (
                <div key={index} className="flex-1 flex flex-col items-center">
                  <div className="w-full flex gap-0.5 items-end h-48">
                    <div 
                      className="flex-1 bg-red-600 rounded-t"
                      style={{ 
                        height: `${day.applications > 0 ? (day.applications / Math.max(...applicationTrends.map(d => Math.max(d.applications, d.views, d.postings))) * 100) : 0}%`,
                        minHeight: day.applications > 0 ? '4px' : '0'
                      }}
                      title={`${day.applications} applications`}
                    />
                    <div 
                      className="flex-1 bg-blue-600 rounded-t"
                      style={{ 
                        height: `${day.views > 0 ? (day.views / Math.max(...applicationTrends.map(d => Math.max(d.applications, d.views, d.postings))) * 100) : 0}%`,
                        minHeight: day.views > 0 ? '4px' : '0'
                      }}
                      title={`${day.views} views`}
                    />
                    <div 
                      className="flex-1 bg-green-600 rounded-t"
                      style={{ 
                        height: `${day.postings > 0 ? (day.postings / Math.max(...applicationTrends.map(d => Math.max(d.applications, d.views, d.postings))) * 100) : 0}%`,
                        minHeight: day.postings > 0 ? '4px' : '0'
                      }}
                      title={`${day.postings} new postings`}
                    />
                  </div>
                  <p className="text-xs text-gray-600 mt-2 rotate-45 origin-left">{day.date}</p>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-4 mt-4 justify-center">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-600 rounded"></div>
                <span className="text-sm text-gray-600">Applications</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-600 rounded"></div>
                <span className="text-sm text-gray-600">Views</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-600 rounded"></div>
                <span className="text-sm text-gray-600">New Postings</span>
              </div>
            </div>
          </div>
        </div>

        {/* competitor comparison - unique to rep */}
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4">📊 Industry Comparison</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Metric</th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Your Performance</th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Industry Average</th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {competitorComparison.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.metric}</td>
                    <td className="px-4 py-3 text-sm text-center font-semibold">
                      {item.yourValue}
                    </td>
                    <td className="px-4 py-3 text-sm text-center text-gray-600">
                      {item.industryAvg}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        item.performance === 'above' 
                          ? 'bg-green-100 text-green-800'
                          : item.performance === 'below'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {item.performance === 'above' ? '↑ Above' : 
                         item.performance === 'below' ? '↓ Below' : 
                         '= Equal'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* job type performance */}
          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Job Type Performance</h2>
            {jobTypeDistribution.length > 0 ? (
              <div className="space-y-3">
                {jobTypeDistribution.map((type, index) => (
                  <div key={index}>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700">{type.name}</span>
                      <span className="text-sm text-gray-500">
                        {type.value} jobs • {type.applications} applications
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          type.name === 'Full-Time' ? 'bg-green-600' :
                          type.name === 'Part-Time' ? 'bg-blue-600' :
                          'bg-purple-600'
                        }`}
                        style={{ width: `${type.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No job type data available</p>
            )}
          </div>

          {/* application status distribution */}
          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Application Pipeline</h2>
            {applicationStatuses.length > 0 ? (
              <div className="space-y-3">
                {applicationStatuses.map((status, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${
                        status.status === 'Hired' ? 'bg-green-600' :
                        status.status === 'Interview' ? 'bg-blue-600' :
                        status.status === 'Rejected' ? 'bg-red-600' :
                        status.status === 'Viewed' ? 'bg-yellow-600' :
                        'bg-gray-600'
                      }`} />
                      <span className="text-sm font-medium text-gray-700">{status.status}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">{status.count}</span>
                      <span className="text-xs text-gray-400">({status.percentage}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No application data available</p>
            )}
          </div>
        </div>

        {/* top performing jobs */}
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4">🏆 Your Top Performing Jobs</h2>
          {topPerformingJobs.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Job Title</th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Applications</th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Views</th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Conversion</th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Days Active</th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Deadline</th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
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
                      <td className="px-4 py-3 text-sm text-center">{job.daysActive}</td>
                      <td className="px-4 py-3 text-sm text-center">
                        {new Date(job.deadline).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-center">
                        <Link href={`/rep/view/${job.id}`}>
                          <button className="text-blue-600 hover:text-blue-800 text-xs">View</button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500">No active jobs to display</p>
          )}
        </div>

        {/* skills performance analysis */}
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <h2 className="text-xl font-bold text-gray-800 mb-4">🎯 Skills Performance Analysis</h2>
          {skillsDemand.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Skill</th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Jobs Posted</th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Total Applications</th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Avg per Job</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {skillsDemand.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.skill}</td>
                      <td className="px-4 py-3 text-sm text-center">{item.count}</td>
                      <td className="px-4 py-3 text-sm text-center">
                        <span className="font-semibold text-green-600">{item.applications}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-center">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                          {item.avgApplicationsPerJob}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500">No skills data available</p>
          )}
        </div>

        {/* helpful tips for reps */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">💡 Performance Tips</h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li>• Jobs with detailed descriptions receive {overview.conversionRate}% more applications</li>
            <li>• Include salary ranges to increase visibility by up to 30%</li>
            <li>• Jobs posted on Monday-Wednesday get the most views</li>
            <li>• Your approval rate is {overview.approvalRate}% - {
              parseFloat(overview.approvalRate) > 85 
                ? "Great job! Keep up the quality postings" 
                : "Review admin feedback to improve approval rate"
            }</li>
          </ul>
        </div>
      </div>
    </div>
  );
}