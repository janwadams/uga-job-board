// /pages/rep/analytics.tsx
// Complete analytics dashboard for company representatives - FIXED VERSION

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
  totalLinkClicks: number;
  averageClicksPerJob: string;
  totalViews: number;
  engagementRate: string;
  activeJobs: number;
  pendingJobs: number;
  rejectedJobs: number;
  approvalRate: string;
  averageDaysToClick: string;
  averageTimeToApproval: string;
}

interface TrendData {
  date: string;
  clicks: number;
  views: number;
  postings: number;
}

interface JobTypeData {
  name: string;
  value: number;
  percentage: string;
  clicks: number;
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
  deadline: string;
}

interface SkillDemand {
  skill: string;
  count: number;
  avgViewsPerJob: string;
  engagementRate: string;
}

interface StatusBreakdown {
  status: string;
  count: number;
  percentage: string;
  color: string;
}

interface EngagementMetric {
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
      
      const { data: jobs, error: jobsError } = await supabase
        .from('jobs')
        .select(`
          *,
          job_link_clicks (
            id,
            clicked_at,
            user_id
          ),
          job_analytics!job_analytics_job_id_fkey (
            id,
            event_type,
            created_at,
            user_id
          )
        `)
        .eq('created_by', userId);

      if (jobsError) throw jobsError;

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

      // FIXED: Approval rate calculation
      const submittedJobs = jobs?.filter(job => 
        job.status !== 'pending' && job.status !== 'draft'  // Submitted means went through approval process
      ).length || 0;
      
      const approvedJobs = jobs?.filter(job => 
        job.status === 'active'  // Only active jobs are approved by admin
      ).length || 0;
      
      const approvalRate = submittedJobs > 0 
        ? ((approvedJobs / submittedJobs) * 100).toFixed(1)
        : '0';

      const totalLinkClicks = jobs?.reduce((sum, job) => 
        sum + (job.job_link_clicks?.length || 0), 0
      ) || 0;
      
      // calculate unique and total views from job_analytics
      const viewsData = jobs?.reduce((acc, job) => {
        const analyticsEvents = job.job_analytics || [];
        const viewEvents = analyticsEvents.filter(
          (event: any) => event.event_type === 'view' || event.event_type === 'job_view'
        );
        
        // unique views - count unique users per job
        const uniqueViewers = new Set(
          viewEvents
            .filter((event: any) => event.user_id)
            .map((event: any) => event.user_id)
        ).size;
        
        // total views - all view events
        const totalViews = viewEvents.length;
        
        return {
          unique: acc.unique + uniqueViewers,
          total: acc.total + totalViews
        };
      }, { unique: 0, total: 0 }) || { unique: 0, total: 0 };

      const totalViews = viewsData.unique; // use unique views for main metric
      const totalAllViews = viewsData.total; // keep total for reference

      const averageClicksPerJob = totalJobs > 0 
        ? (totalLinkClicks / totalJobs).toFixed(1) 
        : '0';

      const engagementRate = totalViews > 0 
        ? ((totalLinkClicks / totalViews) * 100).toFixed(1)
        : '0';

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

      let totalApprovalTime = 0;
      let approvedCount = 0;
      jobs?.forEach(job => {
        if (job.status === 'active') {
          const approvalTime = Math.ceil(
            (new Date(job.last_reviewed || job.created_at).getTime() - new Date(job.created_at).getTime())
            / (1000 * 60 * 60 * 24)
          );
          if (approvalTime > 0) {
            totalApprovalTime += approvalTime;
            approvedCount++;
          }
        }
      });

      const averageTimeToApproval = approvedCount > 0
        ? (totalApprovalTime / approvedCount).toFixed(1)
        : 'N/A';

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
        
        // count views from job_analytics
        const analyticsEvents = job.job_analytics || [];
        analyticsEvents.forEach(event => {
          if (event.event_type === 'view' || event.event_type === 'job_view') {
            const viewDate = new Date(event.created_at);
            if (viewDate >= startDate) {
              const dateKey = viewDate.toISOString().split('T')[0];
              if (trendMap[dateKey]) {
                trendMap[dateKey].views++;
              }
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

      const jobTypeCounts: { [key: string]: { count: number; clicks: number; views: number } } = {};
      jobs?.forEach(job => {
        const type = job.job_type || 'Other';
        if (!jobTypeCounts[type]) {
          jobTypeCounts[type] = { count: 0, clicks: 0, views: 0 };
        }
        jobTypeCounts[type].count++;
        jobTypeCounts[type].clicks += job.job_link_clicks?.length || 0;
        
        // calculate unique views for this job
        const analyticsEvents = job.job_analytics || [];
        const viewEvents = analyticsEvents.filter(
          (event: any) => event.event_type === 'view' || event.event_type === 'job_view'
        );
        const uniqueViews = new Set(
          viewEvents.filter((e: any) => e.user_id).map((e: any) => e.user_id)
        ).size;
        jobTypeCounts[type].views += uniqueViews;
      });

      const jobTypes = Object.entries(jobTypeCounts)
        .map(([name, data]) => ({
          name: name === 'full-time' ? 'Full-Time' : 
                name === 'part-time' ? 'Part-Time' : 
                name === 'internship' ? 'Internship' : 
                name === 'co-op' ? 'Co-op' : name,
          value: data.count,
          percentage: totalJobs > 0 ? ((data.count / totalJobs) * 100).toFixed(1) : '0',
          clicks: data.clicks
        }))
        .sort((a, b) => b.value - a.value);

      setJobTypeDistribution(jobTypes);

      // REMOVED: Skills analytics section - not relevant for company reps
      setSkillsDemand([]);

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

      // UPDATED: Engagement levels with more realistic thresholds
      const metrics: EngagementMetric[] = [
        {
          metric: 'High Engagement',
          count: jobs?.filter(j => (j.job_link_clicks?.length || 0) > 5).length || 0,
          percentage: totalJobs > 0 
            ? ((jobs?.filter(j => (j.job_link_clicks?.length || 0) > 5).length || 0) / totalJobs * 100).toFixed(1)
            : '0'
        },
        {
          metric: 'Medium Engagement',
          count: jobs?.filter(j => (j.job_link_clicks?.length || 0) >= 2 && (j.job_link_clicks?.length || 0) <= 5).length || 0,
          percentage: totalJobs > 0
            ? ((jobs?.filter(j => (j.job_link_clicks?.length || 0) >= 2 && (j.job_link_clicks?.length || 0) <= 5).length || 0) / totalJobs * 100).toFixed(1)
            : '0'
        },
        {
          metric: 'Low Engagement',
          count: jobs?.filter(j => (j.job_link_clicks?.length || 0) === 1).length || 0,
          percentage: totalJobs > 0
            ? ((jobs?.filter(j => (j.job_link_clicks?.length || 0) === 1).length || 0) / totalJobs * 100).toFixed(1)
            : '0'
        },
        {
          metric: 'No Engagement',
          count: jobs?.filter(j => (j.job_link_clicks?.length || 0) === 0).length || 0,
          percentage: totalJobs > 0
            ? ((jobs?.filter(j => (j.job_link_clicks?.length || 0) === 0).length || 0) / totalJobs * 100).toFixed(1)
            : '0'
        }
      ];

      setEngagementMetrics(metrics);

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
          metric: 'Avg Days to Click',
          yourValue: `${averageDaysToClick} days`,
          industryAvg: '3 days',
          performance: parseFloat(averageDaysToClick) < 3 ? 'above' : 
                      parseFloat(averageDaysToClick) > 3 ? 'below' : 'equal'
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

      const topJobs = jobs?.map(job => {
        // calculate unique views from job_analytics
        const analyticsEvents = job.job_analytics || [];
        const viewEvents = analyticsEvents.filter(
          (event: any) => event.event_type === 'view' || event.event_type === 'job_view'
        );
        const uniqueViews = new Set(
          viewEvents.filter((e: any) => e.user_id).map((e: any) => e.user_id)
        ).size;
        
        const clicks = job.job_link_clicks?.length || 0;
        
        return {
          id: job.id,
          title: job.title,
          company: job.company,
          clicks,
          views: uniqueViews, // unique views
          engagementRate: uniqueViews > 0 
            ? ((clicks / uniqueViews) * 100).toFixed(1)
            : '0',
          status: job.status,
          daysActive: Math.ceil((today.getTime() - new Date(job.created_at).getTime()) / (1000 * 60 * 60 * 24)),
          deadline: job.deadline
        };
      })
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 5) || [];

      setTopPerformingJobs(topJobs);

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
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-red-800">📊 Company Analytics</h1>
            <p className="text-gray-600 mt-1">{companyName}</p>
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

        {/* calculation help box */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <svg className="h-5 w-5 text-yellow-600 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div className="text-xs">
              <p className="font-semibold text-gray-900 mb-2">how your metrics are calculated:</p>
              <div className="space-y-1 text-gray-700">
                <p><strong>views:</strong> unique students who viewed your jobs (each student counted once per job, not total page loads)</p>
                <p><strong>link clicks:</strong> total times students clicked to apply (tracked per student per job)</p>
                <p><strong>engagement rate:</strong> (clicks ÷ unique views) × 100 - can exceed 100% if students click multiple jobs</p>
                <p><strong>approval rate:</strong> (approved jobs ÷ submitted jobs) × 100 - shows admin approval percentage</p>
                <p><strong>pending/rejected:</strong> jobs awaiting approval or needing revision (rep-specific metrics)</p>
              </div>
            </div>
          </div>
        </div>

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

        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4">📋 Job Status Overview</h2>
          <p className="text-sm text-gray-600 mb-4">
            Current status of all your job postings. Active jobs are live, pending awaits admin approval, rejected needs revision, and expired are past deadline.
          </p>
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

        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4">📈 Engagement Trends</h2>
          <p className="text-sm text-gray-600 mb-4">
            Daily activity showing clicks (red), views (blue), and new postings (green). Taller bars indicate higher activity. Use this to identify your best posting days.
          </p>
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <h2 className="text-xl font-bold text-gray-800 mb-2">🏆 Top Performing Jobs</h2>
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
              <p className="text-xs font-semibold text-green-900 mb-1">📊 how it's calculated:</p>
              <p className="text-xs text-green-800">
                <strong>engagement rate = (apply clicks ÷ unique student views) × 100</strong>
              </p>
              <p className="text-xs text-green-700 mt-1">
                • ranked by total clicks, then by engagement rate<br/>
                • shows unique views (individual students) not total page loads<br/>
                • &gt;20% engagement is excellent, 10-20% is good, &lt;10% needs improvement
              </p>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Your most clicked job postings ranked by student interest. Higher engagement rates mean more clicks relative to views.
            </p>
            {topPerformingJobs.length > 0 ? (
              <div className="space-y-3">
                {topPerformingJobs.map((job, index) => (
                  <div key={index} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-gray-800">{job.title}</h3>
                        <p className="text-sm text-gray-600">{job.company}</p>
                        <div className="flex gap-4 mt-2 text-xs text-gray-500">
                          <span>{job.clicks} clicks</span>
                          <span>{job.views} views</span>
                          <span className="text-green-600 font-semibold">{job.engagementRate}% rate</span>
                        </div>
                      </div>
                      <span className={`px-2 py-1 text-xs font-semibold rounded ${
                        job.status === 'active' ? 'bg-green-100 text-green-800' :
                        job.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {job.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No job performance data available</p>
            )}
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Job Type Distribution</h2>
            <p className="text-sm text-gray-600 mb-4">
              Breakdown of your postings by type (full-time, internship, etc.) with click counts. Shows which job types attract the most student interest.
            </p>
            {jobTypeDistribution.length > 0 ? (
              <div className="space-y-3">
                {jobTypeDistribution.map((type, index) => (
                  <div key={index}>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700">{type.name}</span>
                      <span className="text-sm text-gray-500">
                        {type.value} jobs • {type.clicks} clicks
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

          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Engagement Levels</h2>
            <p className="text-sm text-gray-600 mb-4">
              Categorizes your jobs by student interest level. Jobs with no engagement may need better titles or descriptions to attract applicants.
            </p>
            {engagementMetrics.length > 0 ? (
              <div className="space-y-3">
                {engagementMetrics.map((metric, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${
                        metric.metric === 'High Engagement' ? 'bg-green-600' :
                        metric.metric === 'Medium Engagement' ? 'bg-yellow-600' :
                        metric.metric === 'Low Engagement' ? 'bg-orange-600' :
                        'bg-red-600'
                      }`} />
                      <span className="text-sm font-medium text-gray-700">{metric.metric}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">{metric.count} jobs</span>
                      <span className="text-xs text-gray-400">({metric.percentage}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No engagement data available</p>
            )}
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <h2 className="text-xl font-bold text-gray-800 mb-4">📊 Industry Comparison</h2>
            <p className="text-sm text-gray-600 mb-4">
              Compares your metrics against industry averages. Green (↑) means above average, red (↓) means below average performance.
            </p>
            <div className="space-y-3">
              {competitorComparison.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">{item.metric}</span>
                  <div className="flex items-center gap-3">
                    <span className={`font-semibold ${
                      item.performance === 'above' ? 'text-green-600' :
                      item.performance === 'below' ? 'text-red-600' :
                      'text-gray-600'
                    }`}>
                      {item.yourValue}
                    </span>
                    <span className="text-xs text-gray-400">vs {item.industryAvg}</span>
                    <span className={`text-xs ${
                      item.performance === 'above' ? 'text-green-600' :
                      item.performance === 'below' ? 'text-red-600' :
                      'text-gray-600'
                    }`}>
                      {item.performance === 'above' ? '↑' : item.performance === 'below' ? '↓' : '='}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* REMOVED: Skills Demand Analysis section - not relevant for company reps */}

        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">💡 Performance Tips</h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li>• Your engagement rate is {overview.engagementRate}% - {
              parseFloat(overview.engagementRate) > 10 
                ? "Great job! Your listings are compelling to students" 
                : "Consider improving job descriptions to increase clicks"
            }</li>
            <li>• {
              engagementMetrics.find(m => m.metric === 'No Engagement')?.count || 0
            } jobs have no clicks - consider revising these listings or adjusting requirements</li>
            <li>• Average time to first click is {overview.averageDaysToClick} days - {
              parseFloat(overview.averageDaysToClick) < 3
                ? "Excellent response time!"
                : "Consider posting during peak student activity times"
            }</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
