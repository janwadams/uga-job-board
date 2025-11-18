// src/pages/admin/platform-effectiveness.tsx - updated for link click tracking

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import {
  ChartBarIcon,
  CursorArrowRaysIcon,
  EyeIcon,
  UserGroupIcon,
  ArrowTrendingUpIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface ConversionFunnel {
  total_views: number;
  unique_viewers: number;
  link_clicks: number; // changed from apply_clicks
  unique_clickers: number; // changed from quick_applies
  view_to_click_rate: number;
  click_engagement_rate: number; // changed from click_to_apply_rate
  overall_conversion: number;
}

interface UserEngagementPattern {
  hour: number;
  views: number;
  clicks: number;
}

interface JobPerformance {
  id: string;
  title: string;
  company: string;
  views: number;
  clicks: number;
  engagement_rate: number; // changed from applications
  effectiveness_score: number;
}

interface PlatformHealth {
  score: number;
  status: 'excellent' | 'good' | 'fair' | 'poor';
  metrics: {
    user_activity: number;
    job_freshness: number;
    click_rate: number; // changed from application_rate
    engagement_rate: number;
  };
}

export default function PlatformEffectiveness() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('7');
  const [conversionFunnel, setConversionFunnel] = useState<ConversionFunnel | null>(null);
  const [engagementPatterns, setEngagementPatterns] = useState<UserEngagementPattern[]>([]);
  const [topPerformingJobs, setTopPerformingJobs] = useState<JobPerformance[]>([]);
  const [platformHealth, setPlatformHealth] = useState<PlatformHealth | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (!loading) {
      fetchAllMetrics();
    }
  }, [dateRange]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      router.push('/login');
      return;
    }

    const { data: userData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', session.user.id)
      .single();

    if (userData?.role !== 'admin') {
      router.push('/unauthorized');
      return;
    }

    fetchAllMetrics();
  };

  const fetchAllMetrics = async () => {
    setLoading(true);
    
    try {
      const daysAgo = parseInt(dateRange);
      const startDate = new Date(new Date().getTime() - daysAgo * 24 * 60 * 60 * 1000);

      // get all the metrics
      await fetchConversionFunnel(startDate);
      await fetchEngagementPatterns(startDate);
      await fetchTopPerformingJobs(startDate);
      await calculatePlatformHealth(startDate);
      
    } catch (error) {
      console.error('Error fetching metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchConversionFunnel = async (startDate: Date) => {
    // get analytics data for the time period
    const { data: analytics, error } = await supabase
      .from('job_analytics')
      .select('*')
      .gte('created_at', startDate.toISOString());

    if (error) throw error;

    // count different event types
    const views = analytics?.filter(a => a.event_type === 'view') || [];
    const clicks = analytics?.filter(a => a.event_type === 'click_apply' || a.event_type === 'link_click') || [];
    
    const uniqueViewers = new Set(views.map(v => v.user_id)).size;
    const uniqueClickers = new Set(clicks.map(c => c.user_id)).size;

    const funnel: ConversionFunnel = {
      total_views: views.length,
      unique_viewers: uniqueViewers,
      link_clicks: clicks.length,
      unique_clickers: uniqueClickers,
      view_to_click_rate: views.length > 0 ? (clicks.length / views.length * 100) : 0,
      click_engagement_rate: uniqueViewers > 0 ? (uniqueClickers / uniqueViewers * 100) : 0,
      overall_conversion: views.length > 0 ? (clicks.length / views.length * 100) : 0
    };

    setConversionFunnel(funnel);
  };

  const fetchEngagementPatterns = async (startDate: Date) => {
    // get hourly engagement data
    const { data: analytics } = await supabase
      .from('job_analytics')
      .select('created_at, event_type')
      .gte('created_at', startDate.toISOString());

    // group by hour of day
    const hourlyData: { [key: number]: { views: number, clicks: number } } = {};
    
    for (let i = 0; i < 24; i++) {
      hourlyData[i] = { views: 0, clicks: 0 };
    }

    analytics?.forEach(record => {
      const hour = new Date(record.created_at).getHours();
      if (record.event_type === 'view') {
        hourlyData[hour].views++;
      } else if (record.event_type === 'click_apply' || record.event_type === 'link_click') {
        hourlyData[hour].clicks++;
      }
    });

    const patterns = Object.entries(hourlyData).map(([hour, data]) => ({
      hour: parseInt(hour),
      views: data.views,
      clicks: data.clicks
    }));

    setEngagementPatterns(patterns);
  };

  const fetchTopPerformingJobs = async (startDate: Date) => {
    // get jobs
    const { data: jobs } = await supabase
      .from('jobs')
      .select('id, title, company')
      .eq('status', 'active');

    // get analytics for these jobs
    const { data: analytics } = await supabase
      .from('job_analytics')
      .select('job_id, event_type')
      .gte('created_at', startDate.toISOString());

    // calculate metrics for each job
    const jobMetrics = new Map<string, JobPerformance>();

    jobs?.forEach(job => {
      const jobAnalytics = analytics?.filter(a => a.job_id === job.id) || [];
      const views = jobAnalytics.filter(a => a.event_type === 'view').length;
      const clicks = jobAnalytics.filter(a => a.event_type === 'click_apply' || a.event_type === 'link_click').length;
      
      const engagement_rate = views > 0 ? (clicks / views * 100) : 0;
      const effectiveness_score = engagement_rate; // simplified scoring based on engagement
      
      jobMetrics.set(job.id, {
        id: job.id,
        title: job.title,
        company: job.company,
        views,
        clicks,
        engagement_rate,
        effectiveness_score
      });
    });

    // sort by effectiveness and take top 10
    const performanceList = Array.from(jobMetrics.values())
      .filter(job => job.views > 0) // only show jobs with at least some views
      .sort((a, b) => b.effectiveness_score - a.effectiveness_score)
      .slice(0, 10);
    
    setTopPerformingJobs(performanceList);
  };

  const calculatePlatformHealth = async (startDate: Date) => {
    const now = new Date();
    
    // calculate user activity score
    const { count: activeUsers } = await supabase
      .from('job_analytics')
      .select('user_id', { count: 'exact', head: true })
      .gte('created_at', new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString());

    const { count: totalUsers } = await supabase
      .from('user_roles')
      .select('*', { count: 'exact', head: true });

    const userActivityScore = totalUsers ? (activeUsers! / totalUsers * 100) : 0;

    // calculate job freshness score
    const { count: recentJobs } = await supabase
      .from('jobs')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')
      .gte('created_at', new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString());

    const { count: totalActiveJobs } = await supabase
      .from('jobs')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    const jobFreshnessScore = totalActiveJobs ? (recentJobs! / totalActiveJobs * 100) : 0;

    // calculate click rate score
    const { count: recentClicks } = await supabase
      .from('job_analytics')
      .select('*', { count: 'exact', head: true })
      .in('event_type', ['click_apply', 'link_click'])
      .gte('created_at', startDate.toISOString());

    const clickRateScore = Math.min((recentClicks! / 10), 100);

    // calculate engagement rate score
    const { count: engagements } = await supabase
      .from('job_analytics')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startDate.toISOString());

    const engagementRateScore = Math.min((engagements! / 100), 100);

    // calculate overall health score (weighted average)
    const overallScore = (
      userActivityScore * 0.3 +
      jobFreshnessScore * 0.2 +
      clickRateScore * 0.3 +
      engagementRateScore * 0.2
    );

    // determine health status based on score
    let status: PlatformHealth['status'] = 'poor';
    if (overallScore >= 80) status = 'excellent';
    else if (overallScore >= 60) status = 'good';
    else if (overallScore >= 40) status = 'fair';

    setPlatformHealth({
      score: Math.round(overallScore),
      status,
      metrics: {
        user_activity: Math.round(userActivityScore),
        job_freshness: Math.round(jobFreshnessScore),
        click_rate: Math.round(clickRateScore),
        engagement_rate: Math.round(engagementRateScore)
      }
    });
  };

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 60) return 'text-yellow-600 bg-yellow-100';
    if (score >= 40) return 'text-orange-600 bg-orange-100';
    return 'text-red-600 bg-red-100';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <p className="mt-2 text-gray-600">Loading platform effectiveness data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* page header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Platform Effectiveness Dashboard</h1>
              <p className="text-gray-600 mt-2">Advanced metrics and platform health monitoring</p>
            </div>
            <div className="flex gap-3">
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="1">Last 24 hours</option>
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
              </select>
              <Link href="/admin/dashboard">
                <button className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600">
                  ← Back to Admin
                </button>
              </Link>
            </div>
          </div>
        </div>

        {/* platform health score card */}
        {platformHealth && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Platform Health Score</h2>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <div className={`text-6xl font-bold px-6 py-4 rounded-lg ${getHealthColor(platformHealth.score)}`}>
                  {platformHealth.score}
                </div>
                <div className="ml-6">
                  <p className="text-2xl font-semibold capitalize">{platformHealth.status}</p>
                  <p className="text-gray-600">Overall Platform Health</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold">{platformHealth.metrics.user_activity}%</p>
                  <p className="text-sm text-gray-600">User Activity</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">{platformHealth.metrics.job_freshness}%</p>
                  <p className="text-sm text-gray-600">Job Freshness</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">{platformHealth.metrics.click_rate}%</p>
                  <p className="text-sm text-gray-600">Click Rate</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">{platformHealth.metrics.engagement_rate}%</p>
                  <p className="text-sm text-gray-600">Engagement Rate</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* conversion funnel visualization - updated */}
        {conversionFunnel && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Engagement Funnel</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-blue-50 rounded">
                <div className="flex items-center">
                  <EyeIcon className="h-8 w-8 text-blue-600 mr-3" />
                  <div>
                    <p className="font-semibold">Views</p>
                    <p className="text-sm text-gray-600">{conversionFunnel.unique_viewers} unique users</p>
                  </div>
                </div>
                <p className="text-2xl font-bold">{conversionFunnel.total_views}</p>
              </div>

              <div className="flex items-center justify-center">
                <div className="text-center">
                  <p className="text-sm text-gray-500">View to Click Rate</p>
                  <p className="text-lg font-semibold text-blue-600">
                    {conversionFunnel.view_to_click_rate.toFixed(1)}%
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-green-50 rounded">
                <div className="flex items-center">
                  <CursorArrowRaysIcon className="h-8 w-8 text-green-600 mr-3" />
                  <div>
                    <p className="font-semibold">Link Clicks</p>
                    <p className="text-sm text-gray-600">{conversionFunnel.unique_clickers} unique clickers</p>
                  </div>
                </div>
                <p className="text-2xl font-bold">{conversionFunnel.link_clicks}</p>
              </div>

              <div className="border-t pt-4 text-center">
                <p className="text-sm text-gray-600">Overall Engagement Rate</p>
                <p className="text-3xl font-bold text-purple-600">
                  {conversionFunnel.overall_conversion.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
        )}

        {/* hourly engagement patterns */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">User Engagement Patterns</h2>
          <div className="overflow-x-auto">
            <div className="min-w-full">
              <p className="text-sm text-gray-600 mb-3">Peak activity hours (24-hour format)</p>
              <div className="flex items-end justify-between h-32 px-2">
                {engagementPatterns.map(pattern => {
                  const maxValue = Math.max(...engagementPatterns.map(p => p.views + p.clicks));
                  const height = maxValue > 0 ? ((pattern.views + pattern.clicks) / maxValue * 100) : 0;
                  
                  return (
                    <div key={pattern.hour} className="flex-1 flex flex-col items-center">
                      <div className="relative w-full flex flex-col items-center">
                        <div 
                          className="w-full bg-blue-500 rounded-t"
                          style={{ height: `${height}px` }}
                          title={`${pattern.views} views, ${pattern.clicks} clicks`}
                        />
                        <span className="text-xs text-gray-500 mt-1">
                          {pattern.hour}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-gray-500 text-center mt-2">Hour of Day</p>
            </div>
          </div>
        </div>

        {/* top performing jobs table - updated */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Top Performing Jobs</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Job Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Company
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Views
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Link Clicks
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Engagement Rate
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Effectiveness Score
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {topPerformingJobs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                      No job performance data available for this period
                    </td>
                  </tr>
                ) : (
                  topPerformingJobs.map(job => (
                    <tr key={job.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        <Link href={`/admin/view/${job.id}`}>
                          <span className="text-blue-600 hover:underline cursor-pointer">
                            {job.title}
                          </span>
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {job.company}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                        {job.views}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                        {job.clicks}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          job.engagement_rate > 10 ? 'bg-green-100 text-green-800' :
                          job.engagement_rate > 5 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {job.engagement_rate.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                        <div className="flex items-center justify-center">
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ width: `${Math.min(job.effectiveness_score, 100)}%` }}
                            />
                          </div>
                          <span className="ml-2 text-xs text-gray-600">
                            {job.effectiveness_score.toFixed(0)}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}