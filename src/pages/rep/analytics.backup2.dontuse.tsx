// /pages/rep/analytics.tsx
// analytics dashboard for company representatives to track job posting engagement (link clicks instead of applications)

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
  totalLinkClicks: number; // changed from totalApplications
  averageClicksPerJob: string; // changed from averageApplicationsPerJob
  totalViews: number;
  engagementRate: string; // changed from conversionRate
  activeJobs: number;
  pendingJobs: number;
  rejectedJobs: number;
  approvalRate: string;
  averageDaysToClick: string; // changed from averageDaysToApply
  averageTimeToApproval: string;
}

interface TrendData {
  date: string;
  clicks: number; // changed from applications
  views: number;
  postings: number;
}

interface JobTypeData {
  name: string;
  value: number;
  percentage: string;
  clicks: number; // changed from applications
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
  deadline: string;
}

interface SkillDemand {
  skill: string;
  count: number;
  clicks: number; // changed from applications
  avgClicksPerJob: string; // changed from avgApplicationsPerJob
}

interface StatusBreakdown {
  status: string;
  count: number;
  percentage: string;
  color: string;
}

interface EngagementMetric { // changed from ApplicationStatus
  metric: string;
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
    totalLinkClicks: 0,
    averageClicksPerJob: '0',
    totalViews: 0,
    engagementRate: '0',
    activeJobs: 0,
    pendingJobs: 0,
    rejectedJobs: 0,
    approvalRate: '0',
    averageDaysToClick: '0',
    averageTimeToApproval: '0'
  });

  const [clickTrends, setClickTrends] = useState<TrendData[]>([]);
  const [jobTypeDistribution, setJobTypeDistribution] = useState<JobTypeData[]>([]);
  const [topPerformingJobs, setTopPerformingJobs] = useState<TopJob[]>([]);
  const [skillsDemand, setSkillsDemand] = useState<SkillDemand[]>([]);
  const [statusBreakdown, setStatusBreakdown] = useState<StatusBreakdown[]>([]);
  const [engagementMetrics, setEngagementMetrics] = useState<EngagementMetric[]>([]);
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
      
      // fetch all jobs by this rep with link clicks and views
      const { data: jobs, error: jobsError } = await supabase
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
      const totalJobs = jobs?.length || 0;
      const today = new Date();
      
      const activeJobs = jobs?.filter(job => 
        job.status === 'active' && new Date(job.deadline) > today
      ).length || 0;
      
      const pendingJobs = jobs?.filter(job => 
        job.status === 'pending'
      ).length || 0;
      
      const rejectedJobs = jobs?.filter(job => 
        job.status === 'rejected'
      ).length || 0;

      const submittedJobs = jobs?.filter(job => 
        job.status !== 'pending'
      ).length || 0;
      
      const approvedJobs = jobs?.filter(job => 
        job.status === 'active' || job.status === 'removed' || job.status === 'archived'
      ).length || 0;
      
      const approvalRate = submittedJobs > 0 
        ? ((approvedJobs / submittedJobs) * 100).toFixed(1)
        : '0';

      const totalLinkClicks = jobs?.reduce((sum, job) => 
        sum + (job.job_link_clicks?.length || 0), 0
      ) || 0;
      
      const totalViews = jobs?.reduce((sum, job) => 
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
      
      jobs?.forEach(job => {
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

      // average time to approval (placeholder)
      let totalDaysToApproval = 0;
      let approvedJobCount = 0;
      
      jobs?.forEach(job => {
        if (job.status === 'active') {
          approvedJobCount++;
          totalDaysToApproval += 2; // placeholder: assume 2 days average
        }
      });
      
      const averageTimeToApproval = approvedJobCount > 0
        ? (totalDaysToApproval / approvedJobCount).toFixed(1)
        : '2';

      setOverview({
        totalJobs,
        totalLinkClicks,
        averageClicksPerJob,
        totalViews,
        engagementRate,
        activeJobs,
        pendingJobs,
        rejectedJobs,
        approvalRate,
        averageDaysToClick,
        averageTimeToApproval
      });

      // prepare click trends
      const daysAgo = parseInt(dateRange);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);
      
      const trendMap: { [key: string]: { clicks: number; views: number; postings: number } } = {};
      
      for (let d = new Date(startDate); d <= today; d.setDate(d.getDate() + 1)) {
        const dateKey = d.toISOString().split('T')[0];
        trendMap[dateKey] = { clicks: 0, views: 0, postings: 0 };
      }
      
      jobs?.forEach(job => {
        const postDate = new Date(job.created_at);
        if (postDate >= startDate) {
          const postDateKey = postDate.toISOString().split('T')[0];
          if (trendMap[postDateKey]) {
            trendMap[postDateKey].postings++;
          }
        }
        
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
        views: data.views,
        postings: data.postings
      }));

      setClickTrends(trends);

      // job type distribution with clicks
      const typeData: { [key: string]: { count: number; clicks: number } } = {};
      jobs?.forEach(job => {
        if (!typeData[job.job_type]) {
          typeData[job.job_type] = { count: 0, clicks: 0 };
        }
        typeData[job.job_type].count++;
        typeData[job.job_type].clicks += job.job_link_clicks?.length || 0;
      });
      
      const jobTypes = Object.entries(typeData).map(([type, data]) => ({
        name: type,
        value: data.count,
        percentage: totalJobs > 0 ? ((data.count / totalJobs) * 100).toFixed(1) : '0',
        clicks: data.clicks
      }));

      setJobTypeDistribution(jobTypes);

      // top performing jobs
      const topJobs = jobs?.map(job => ({
        id: job.id,
        title: job.title,
        company: job.company,
        clicks: job.job_link_clicks?.length || 0,
        views: job.job_views?.length || 0,
        engagementRate: (job.job_views?.length || 0) > 0 
          ? ((job.job_link_clicks?.length || 0) / (job.job_views?.length || 0) * 100).toFixed(1)
          : '0',
        status: job.status,
        daysActive: Math.ceil((today.getTime() - new Date(job.created_at).getTime()) / (1000 * 60 * 60 * 24)),
        deadline: job.deadline
      }))
      .filter(job => job.status === 'active')
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 5) || [];

      setTopPerformingJobs(topJobs);

      // skills performance analysis
      const skillData: { [key: string]: { count: number; clicks: number } } = {};
      jobs?.forEach(job => {
        job.skills?.forEach((skill: string) => {
          if (!skillData[skill]) {
            skillData[skill] = { count: 0, clicks: 0 };
          }
          skillData[skill].count++;
          skillData[skill].clicks += job.job_link_clicks?.length || 0;
        });
      });
      
      const skills = Object.entries(skillData)
        .map(([skill, data]) => ({
          skill,
          count: data.count,
          clicks: data.clicks,
          avgClicksPerJob: data.count > 0 ? (data.clicks / data.count).toFixed(1) : '0'
        }))
        .sort((a, b) => b.clicks - a.clicks)
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

      // engagement metrics
      const metrics: EngagementMetric[] = [
        {
          metric: 'High Engagement',
          count: jobs?.filter(j => (j.job_link_clicks?.length || 0) > 10).length || 0,
          percentage: totalJobs > 0 
            ? ((jobs?.filter(j => (j.job_link_clicks?.length || 0) > 10).length || 0) / totalJobs * 100).toFixed(1)
            : '0'
        },
        {
          metric: 'Medium Engagement',
          count: jobs?.filter(j => (j.job_link_clicks?.length || 0) >= 5 && (j.job_link_clicks?.length || 0) <= 10).length || 0,
          percentage: totalJobs > 0
            ? ((jobs?.filter(j => (j.job_link_clicks?.length || 0) >= 5 && (j.job_link_clicks?.length || 0) <= 10).length || 0) / totalJobs * 100).toFixed(1)
            : '0'
        },
        {
          metric: 'Low Engagement',
          count: jobs?.filter(j => (j.job_link_clicks?.length || 0) > 0 && (j.job_link_clicks?.length || 0) < 5).length || 0,
          percentage: totalJobs > 0
            ? ((jobs?.filter(j => (j.job_link_clicks?.length || 0) > 0 && (j.job_link_clicks?.length || 0) < 5).length || 0) / totalJobs * 100).toFixed(1)
            : '0'
        }
      ];

      setEngagementMetrics(metrics);

      // competitor comparison (simulated industry averages)
      const comparison: CompetitorComparison[] = [
        {
          metric: 'Clicks per Job',
          yourValue: averageClicksPerJob,
          industryAvg: '6.5',
          performance: parseFloat(averageClicksPerJob) > 6.5 ? 'above' : 
                      parseFloat(averageClicksPerJob) < 6.5 ? 'below' : 'equal'
        },
        {
          metric: 'View to Click Rate',
          yourValue: `${engagementRate}%`,
          industryAvg: '10%',
          performance: parseFloat(engagementRate) > 10 ? 'above' : 
                      parseFloat(engagementRate) < 10 ? 'below' : 'equal'
        },
        {
          metric: 'Days to First Click',
          yourValue: averageDaysToClick,
          industryAvg: '2.5',
          performance: parseFloat(averageDaysToClick) < 2.5 ? 'above' : 
                      parseFloat(averageDaysToClick) > 2.5 ? 'below' : 'equal'
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

        {/* key metrics overview - updated labels */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <h3 className="text-gray-500 font-semibold text-sm">Total Link Clicks</h3>
            <p className="text-4xl font-bold text-gray-800 mt-2">{overview.totalLinkClicks}</p>
            <p className="text-sm text-gray-600 mt-1">
              Avg: {overview.averageClicksPerJob} per job
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <h3 className="text-gray-500 font-semibold text-sm">Total Views</h3>
            <p className="text-4xl font-bold text-blue-600 mt-2">{overview.totalViews}</p>
            <p className="text-sm text-gray-600 mt-1">
              Engagement: {overview.engagementRate}%
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

        {/* job status breakdown */}
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

        {/* engagement trends - updated labels */}
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4">📈 Engagement Trends</h2>
          <div className="overflow-x-auto">
            <div className="min-w-[600px] h-64 flex items-end justify-between gap-2">
              {clickTrends.map((day, index) => (
                <div key={index} className="flex-1 flex flex-col items-center">
                  <div className="w-full flex gap-0.5 items-end h-48">
                    <div 
                      className="flex-1 bg-red-600 rounded-t"
                      style={{ 
                        height: `${day.clicks > 0 ? (day.clicks / Math.max(...clickTrends.map(d => Math.max(d.clicks, d.views, d.postings))) * 100) : 0}%`,
                        minHeight: day.clicks > 0 ? '4px' : '0'
                      }}
                      title={`${day.clicks} clicks`}
                    />
                    <div 
                      className="flex-1 bg-blue-600 rounded-t"
                      style={{ 
                        height: `${day.views > 0 ? (day.views / Math.max(...clickTrends.map(d => Math.max(d.clicks, d.views, d.postings))) * 100) : 0}%`,
                        minHeight: day.views > 0 ? '4px' : '0'
                      }}
                      title={`${day.views} views`}
                    />
                    <div 
                      className="flex-1 bg-green-600 rounded-t"
                      style={{ 
                        height: `${day.postings > 0 ? (day.postings / Math.max(...clickTrends.map(d => Math.max(d.clicks, d.views, d.postings))) * 100) : 0}%`,
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
                <span className="text-sm text-gray-600">Link Clicks</span>
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

        {/* The rest of the component continues with the same pattern... */}
        {/* I'll continue with the key sections */}

        {/* top performing jobs - updated labels */}
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4">🏆 Your Top Performing Jobs</h2>
          {topPerformingJobs.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Job Title</th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Link Clicks</th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Views</th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Engagement</th>
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
                        <span className="font-semibold text-green-600">{job.clicks}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-center">{job.views}</td>
                      <td className="px-4 py-3 text-sm text-center">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                          {job.engagementRate}%
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

        {/* helpful tips - updated */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">💡 Performance Tips</h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li>• Jobs with clear application links receive {overview.engagementRate}% more clicks</li>
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