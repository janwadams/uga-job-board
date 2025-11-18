// src/pages/admin/platform-effectiveness.tsx - enhanced with detailed health monitoring and recommendations

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
  XCircleIcon,
  ExclamationTriangleIcon,
  LightBulbIcon
} from '@heroicons/react/24/outline';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface ConversionFunnel {
  total_views: number;
  unique_viewers: number;
  link_clicks: number;
  unique_clickers: number;
  view_to_click_rate: number;
  click_engagement_rate: number;
  overall_conversion: number;
}

interface UserEngagementPattern {
  hour: number;
  views: number;
  clicks: number;
  activity_level: 'low' | 'medium' | 'high';
}

interface JobPerformance {
  id: string;
  title: string;
  company: string;
  views: number;
  clicks: number;
  engagement_rate: number;
  effectiveness_score: number;
  days_active: number;
}

interface PlatformHealth {
  score: number;
  status: 'excellent' | 'good' | 'fair' | 'poor';
  metrics: {
    user_activity: number;
    job_freshness: number;
    click_rate: number;
    engagement_rate: number;
  };
  concerns: string[];
  recommendations: string[];
}

interface SystemStatus {
  active_jobs: number;
  expired_jobs: number;
  pending_approvals: number;
  stale_jobs: number; // jobs with no views in 7+ days
  high_performing_jobs: number;
  low_performing_jobs: number;
}

export default function PlatformEffectiveness() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('7');
  const [conversionFunnel, setConversionFunnel] = useState<ConversionFunnel | null>(null);
  const [engagementPatterns, setEngagementPatterns] = useState<UserEngagementPattern[]>([]);
  const [topPerformingJobs, setTopPerformingJobs] = useState<JobPerformance[]>([]);
  const [platformHealth, setPlatformHealth] = useState<PlatformHealth | null>(null);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);

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

      // get all the metrics in parallel
      await Promise.all([
        fetchConversionFunnel(startDate),
        fetchEngagementPatterns(startDate),
        fetchTopPerformingJobs(startDate),
        fetchSystemStatus(),
        calculatePlatformHealth(startDate)
      ]);
      
    } catch (error) {
      console.error('Error fetching metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSystemStatus = async () => {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // get active jobs count
    const { count: activeCount } = await supabase
      .from('jobs')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')
      .gte('deadline', now.toISOString());

    // get expired jobs count
    const { count: expiredCount } = await supabase
      .from('jobs')
      .select('*', { count: 'exact', head: true })
      .lt('deadline', now.toISOString());

    // get pending approvals
    const { count: pendingCount } = await supabase
      .from('jobs')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    // get all active jobs for performance analysis
    const { data: activeJobs } = await supabase
      .from('jobs')
      .select('id, created_at')
      .eq('status', 'active')
      .gte('deadline', now.toISOString());

    let staleCount = 0;
    let highPerformingCount = 0;
    let lowPerformingCount = 0;

    if (activeJobs) {
      for (const job of activeJobs) {
        // check views in last 7 days
        const { count: recentViews } = await supabase
          .from('job_views')
          .select('*', { count: 'exact', head: true })
          .eq('job_id', job.id)
          .gte('viewed_at', sevenDaysAgo.toISOString());

        // check total views and clicks
        const { count: totalViews } = await supabase
          .from('job_views')
          .select('*', { count: 'exact', head: true })
          .eq('job_id', job.id);

        const { count: totalClicks } = await supabase
          .from('job_link_clicks')
          .select('*', { count: 'exact', head: true })
          .eq('job_id', job.id);

        // categorize job performance
        if (recentViews === 0) {
          staleCount++;
        }

        const engagementRate = totalViews ? (totalClicks || 0) / totalViews : 0;
        if (engagementRate > 0.15) {
          highPerformingCount++;
        } else if (engagementRate < 0.05 && totalViews && totalViews > 10) {
          lowPerformingCount++;
        }
      }
    }

    setSystemStatus({
      active_jobs: activeCount || 0,
      expired_jobs: expiredCount || 0,
      pending_approvals: pendingCount || 0,
      stale_jobs: staleCount,
      high_performing_jobs: highPerformingCount,
      low_performing_jobs: lowPerformingCount
    });
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

    // calculate activity levels
    const totalActivity = Object.values(hourlyData).reduce((sum, h) => sum + h.views + h.clicks, 0);
    const avgActivity = totalActivity / 24;

    const patterns: UserEngagementPattern[] = Object.entries(hourlyData).map(([hour, data]) => {
      const activity = data.views + data.clicks;
      let activityLevel: 'low' | 'medium' | 'high' = 'low';
      
      if (activity > avgActivity * 1.5) {
        activityLevel = 'high';
      } else if (activity > avgActivity * 0.5) {
        activityLevel = 'medium';
      }

      return {
        hour: parseInt(hour),
        views: data.views,
        clicks: data.clicks,
        activity_level: activityLevel
      };
    });

    setEngagementPatterns(patterns);
  };

  const fetchTopPerformingJobs = async (startDate: Date) => {
    const now = new Date();
    
    // get jobs
    const { data: jobs } = await supabase
      .from('jobs')
      .select('id, title, company, created_at')
      .eq('status', 'active')
      .gte('deadline', now.toISOString());

    // get analytics for these jobs
    const { data: analytics } = await supabase
      .from('job_analytics')
      .select('job_id, event_type')
      .gte('created_at', startDate.toISOString());

    // calculate metrics for each job
    const jobMetrics = new Map<string, JobPerformance>();

    if (jobs) {
      for (const job of jobs) {
        const jobAnalytics = analytics?.filter(a => a.job_id === job.id) || [];
        const views = jobAnalytics.filter(a => a.event_type === 'view').length;
        const clicks = jobAnalytics.filter(a => a.event_type === 'click_apply' || a.event_type === 'link_click').length;
        const engagement = views > 0 ? (clicks / views) * 100 : 0;
        
        // calculate days active
        const daysActive = Math.floor(
          (now.getTime() - new Date(job.created_at).getTime()) / (1000 * 60 * 60 * 24)
        );
        
        // effectiveness score: weighted combination of engagement, views, and freshness
        const viewScore = Math.min(views / 10, 1) * 40; // max 40 points for 100+ views
        const engagementScore = Math.min(engagement / 20, 1) * 40; // max 40 points for 20%+ engagement
        const freshnessScore = Math.max(0, (1 - daysActive / 30)) * 20; // max 20 points, decreases with age
        const effectivenessScore = viewScore + engagementScore + freshnessScore;

        jobMetrics.set(job.id, {
          id: job.id,
          title: job.title,
          company: job.company,
          views,
          clicks,
          engagement_rate: engagement,
          effectiveness_score: effectivenessScore,
          days_active: daysActive
        });
      }
    }

    const sortedJobs = Array.from(jobMetrics.values())
      .sort((a, b) => b.effectiveness_score - a.effectiveness_score)
      .slice(0, 10);

    setTopPerformingJobs(sortedJobs);
  };

  const calculatePlatformHealth = async (startDate: Date) => {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // get user activity metrics
    const { count: totalUsers } = await supabase
      .from('user_roles')
      .select('*', { count: 'exact', head: true });

    const { data: recentActivity } = await supabase
      .from('job_analytics')
      .select('user_id')
      .gte('created_at', oneWeekAgo.toISOString());

    const activeUsers = new Set(recentActivity?.map(a => a.user_id)).size;
    const userActivity = totalUsers ? (activeUsers / totalUsers) * 100 : 0;

    // get job freshness metrics
    const { count: totalJobs } = await supabase
      .from('jobs')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')
      .gte('deadline', now.toISOString());

    const { count: recentJobs } = await supabase
      .from('jobs')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')
      .gte('created_at', oneWeekAgo.toISOString());

    const jobFreshness = totalJobs ? (recentJobs || 0) / totalJobs * 100 : 0;

    // get engagement metrics
    const { data: allViews } = await supabase
      .from('job_views')
      .select('job_id')
      .gte('viewed_at', oneWeekAgo.toISOString());

    const { data: allClicks } = await supabase
      .from('job_link_clicks')
      .select('job_id')
      .gte('clicked_at', oneWeekAgo.toISOString());

    const clickRate = allViews?.length ? ((allClicks?.length || 0) / allViews.length) * 100 : 0;
    const engagementRate = userActivity > 0 ? (clickRate + userActivity) / 2 : 0;

    // calculate overall health score (0-100)
    const healthScore = Math.round(
      (userActivity * 0.3) + 
      (jobFreshness * 0.2) + 
      (clickRate * 0.3) + 
      (engagementRate * 0.2)
    );

    // determine health status
    let status: 'excellent' | 'good' | 'fair' | 'poor';
    if (healthScore >= 80) status = 'excellent';
    else if (healthScore >= 60) status = 'good';
    else if (healthScore >= 40) status = 'fair';
    else status = 'poor';

    // generate concerns and recommendations
    const concerns: string[] = [];
    const recommendations: string[] = [];

    if (userActivity < 30) {
      concerns.push('Low user activity - only ' + userActivity.toFixed(1) + '% of users active this week');
      recommendations.push('Send email notifications to inactive users about new opportunities');
      recommendations.push('Consider implementing a weekly digest of new jobs');
    }

    if (jobFreshness < 20) {
      concerns.push('Stale job inventory - few new jobs posted recently');
      recommendations.push('Reach out to faculty and companies to encourage new postings');
      recommendations.push('Review and remove expired job listings');
    }

    if (clickRate < 10) {
      concerns.push('Low click-through rate - jobs not attracting enough interest');
      recommendations.push('Review job titles and descriptions for clarity and appeal');
      recommendations.push('Consider highlighting high-quality opportunities');
    }

    if (systemStatus && systemStatus.pending_approvals > 5) {
      concerns.push(systemStatus.pending_approvals + ' jobs pending approval - causing delays');
      recommendations.push('Review and approve/reject pending jobs promptly');
    }

    if (systemStatus && systemStatus.stale_jobs > 10) {
      concerns.push(systemStatus.stale_jobs + ' jobs with no recent views');
      recommendations.push('Consider removing or updating stale job listings');
      recommendations.push('Contact job posters to refresh their listings');
    }

    if (concerns.length === 0) {
      recommendations.push('Platform is performing well - maintain current practices');
      recommendations.push('Monitor trending job types to guide future postings');
    }

    setPlatformHealth({
      score: healthScore,
      status,
      metrics: {
        user_activity: Math.round(userActivity),
        job_freshness: Math.round(jobFreshness),
        click_rate: Math.round(clickRate),
        engagement_rate: Math.round(engagementRate)
      },
      concerns,
      recommendations
    });
  };

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'bg-green-100 text-green-800';
    if (score >= 60) return 'bg-blue-100 text-blue-800';
    if (score >= 40) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getHealthIcon = (score: number) => {
    if (score >= 80) return <CheckCircleIcon className="h-8 w-8 text-green-600" />;
    if (score >= 60) return <CheckCircleIcon className="h-8 w-8 text-blue-600" />;
    if (score >= 40) return <ExclamationTriangleIcon className="h-8 w-8 text-yellow-600" />;
    return <XCircleIcon className="h-8 w-8 text-red-600" />;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading platform health metrics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Platform Health Dashboard</h1>
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

        {/* system status overview */}
        {systemStatus && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg shadow">
              <p className="text-sm text-gray-600">Active Jobs</p>
              <p className="text-2xl font-bold text-blue-600">{systemStatus.active_jobs}</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <p className="text-sm text-gray-600">Pending Approval</p>
              <p className="text-2xl font-bold text-yellow-600">{systemStatus.pending_approvals}</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <p className="text-sm text-gray-600">Expired Jobs</p>
              <p className="text-2xl font-bold text-gray-600">{systemStatus.expired_jobs}</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <p className="text-sm text-gray-600">Stale Jobs</p>
              <p className="text-2xl font-bold text-orange-600">{systemStatus.stale_jobs}</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <p className="text-sm text-gray-600">High Performing</p>
              <p className="text-2xl font-bold text-green-600">{systemStatus.high_performing_jobs}</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <p className="text-sm text-gray-600">Low Performing</p>
              <p className="text-2xl font-bold text-red-600">{systemStatus.low_performing_jobs}</p>
            </div>
          </div>
        )}

        {/* platform health score card */}
        {platformHealth && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Platform Health Score</h2>
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-6">
              <div className="flex items-center gap-4">
                {getHealthIcon(platformHealth.score)}
                <div className={`text-6xl font-bold px-6 py-4 rounded-lg ${getHealthColor(platformHealth.score)}`}>
                  {platformHealth.score}
                </div>
                <div>
                  <p className="text-2xl font-semibold capitalize">{platformHealth.status}</p>
                  <p className="text-gray-600">Overall Platform Health</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">{platformHealth.metrics.user_activity}%</p>
                  <p className="text-sm text-gray-600">User Activity</p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">{platformHealth.metrics.job_freshness}%</p>
                  <p className="text-sm text-gray-600">Job Freshness</p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-purple-600">{platformHealth.metrics.click_rate}%</p>
                  <p className="text-sm text-gray-600">Click Rate</p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-orange-600">{platformHealth.metrics.engagement_rate}%</p>
                  <p className="text-sm text-gray-600">Engagement Rate</p>
                </div>
              </div>
            </div>

            {/* concerns and recommendations */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 pt-6 border-t">
              {/* concerns */}
              {platformHealth.concerns.length > 0 && (
                <div className="bg-red-50 p-4 rounded-lg">
                  <div className="flex items-center mb-3">
                    <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mr-2" />
                    <h3 className="font-semibold text-red-900">Areas of Concern</h3>
                  </div>
                  <ul className="space-y-2">
                    {platformHealth.concerns.map((concern, index) => (
                      <li key={index} className="text-sm text-red-800 flex items-start">
                        <span className="mr-2">•</span>
                        <span>{concern}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* recommendations */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center mb-3">
                  <LightBulbIcon className="h-5 w-5 text-blue-600 mr-2" />
                  <h3 className="font-semibold text-blue-900">Recommendations</h3>
                </div>
                <ul className="space-y-2">
                  {platformHealth.recommendations.map((rec, index) => (
                    <li key={index} className="text-sm text-blue-800 flex items-start">
                      <span className="mr-2">•</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* conversion funnel visualization */}
        {conversionFunnel && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Engagement Funnel</h2>
            <p className="text-sm text-gray-600 mb-4">
              Track how users progress from viewing jobs to clicking application links
            </p>
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

              <div className="border-t pt-4">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="p-3 bg-purple-50 rounded">
                    <p className="text-sm text-gray-600">Click Engagement Rate</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {conversionFunnel.click_engagement_rate.toFixed(1)}%
                    </p>
                    <p className="text-xs text-gray-500 mt-1">of viewers clicked apply</p>
                  </div>
                  <div className="p-3 bg-indigo-50 rounded">
                    <p className="text-sm text-gray-600">Overall Conversion</p>
                    <p className="text-2xl font-bold text-indigo-600">
                      {conversionFunnel.overall_conversion.toFixed(1)}%
                    </p>
                    <p className="text-xs text-gray-500 mt-1">views to clicks</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* hourly engagement patterns */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">User Engagement Patterns</h2>
          <p className="text-sm text-gray-600 mb-4">
            Peak activity hours help you schedule important announcements and new job postings
          </p>
          <div className="overflow-x-auto">
            <div className="min-w-full">
              <div className="flex items-end justify-between h-40 px-2">
                {engagementPatterns.map(pattern => {
                  const maxValue = Math.max(...engagementPatterns.map(p => p.views + p.clicks));
                  const height = maxValue > 0 ? ((pattern.views + pattern.clicks) / maxValue * 120) : 0;
                  
                  const colorClass = 
                    pattern.activity_level === 'high' ? 'bg-green-500' :
                    pattern.activity_level === 'medium' ? 'bg-blue-500' :
                    'bg-gray-400';
                  
                  return (
                    <div key={pattern.hour} className="flex-1 flex flex-col items-center">
                      <div className="relative w-full flex flex-col items-center">
                        <div 
                          className={`w-full ${colorClass} rounded-t hover:opacity-80 transition-opacity cursor-pointer`}
                          style={{ height: `${height}px`, minHeight: '4px' }}
                          title={`Hour ${pattern.hour}: ${pattern.views} views, ${pattern.clicks} clicks (${pattern.activity_level} activity)`}
                        />
                        <span className="text-xs text-gray-500 mt-1">
                          {pattern.hour}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-gray-500 text-center mt-2">Hour of Day (24-hour format)</p>
              <div className="flex justify-center gap-6 mt-4 text-sm">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-green-500 rounded mr-2"></div>
                  <span className="text-gray-600">High Activity</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-blue-500 rounded mr-2"></div>
                  <span className="text-gray-600">Medium Activity</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-gray-400 rounded mr-2"></div>
                  <span className="text-gray-600">Low Activity</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* top performing jobs table */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Top Performing Jobs</h2>
          <p className="text-sm text-gray-600 mb-4">
            Effectiveness score combines engagement rate, view count, and job freshness
          </p>
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
                    Clicks
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Engagement
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Days Active
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Effectiveness
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {topPerformingJobs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
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
                          job.engagement_rate > 15 ? 'bg-green-100 text-green-800' :
                          job.engagement_rate > 10 ? 'bg-blue-100 text-blue-800' :
                          job.engagement_rate > 5 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {job.engagement_rate.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                        {job.days_active}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                        <div className="flex items-center justify-center">
                          <div className="w-20 bg-gray-200 rounded-full h-2.5">
                            <div 
                              className={`h-2.5 rounded-full ${
                                job.effectiveness_score > 75 ? 'bg-green-600' :
                                job.effectiveness_score > 50 ? 'bg-blue-600' :
                                job.effectiveness_score > 25 ? 'bg-yellow-600' :
                                'bg-red-600'
                              }`}
                              style={{ width: `${Math.min(job.effectiveness_score, 100)}%` }}
                            />
                          </div>
                          <span className="ml-2 text-xs text-gray-600 font-medium">
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
