// src/pages/admin/analytics.tsx - optimized version with batch queries and explanations
// tracks link clicks instead of applications

import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import {
  BriefcaseIcon,
  DocumentTextIcon,
  EyeIcon,
  ArrowTrendingUpIcon,
  CalendarIcon,
  UserGroupIcon,
  ChartBarIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  CursorArrowRaysIcon,
  ClockIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface TimeSeriesData {
  date: string;
  total_postings: number;
  active_postings: number;
  views: number;
  link_clicks: number;
}

interface TopCompany {
  company: string;
  views: number;
  link_clicks: number;
  job_count: number;
  engagement_rate: number;
}

interface MostViewedJob {
  id: string;
  title: string;
  company: string;
  views: number; // unique views
  total_views: number; // total views including repeats
  link_clicks: number;
  engagement_rate: number;
  created_at: string;
  days_active: number;
}

interface UserEngagement {
  total_users: number;
  active_users_today: number;
  active_users_week: number;
  active_users_month: number;
  new_users_month: number;
  user_by_role: {
    student: number;
    faculty: number;
    staff: number;
    rep: number;
    admin: number;
  };
}

interface MetricsData {
  // current month metrics
  jobs_posted_month: number;
  link_clicks_month: number;
  total_postings: number;
  active_postings: number;
  
  // comparison with last month
  jobs_posted_last_month: number;
  link_clicks_last_month: number;
  jobs_growth_percentage: number;
  clicks_growth_percentage: number;
  
  // average metrics
  avg_views_per_job: number;
  avg_clicks_per_job: number;
  overall_engagement_rate: number;
  
  // top content
  time_series: TimeSeriesData[];
  top_companies: TopCompany[];
  most_viewed_jobs: MostViewedJob[];
  most_engaged_jobs: MostViewedJob[]; // jobs with highest click-through rate
  
  // user engagement
  user_engagement: UserEngagement;
  
  // peak activity times
  peak_activity_day: string;
  peak_activity_time: string;
}

export default function AdminAnalyticsDashboard() {
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dateRange, setDateRange] = useState('30'); // default to 30 days

  useEffect(() => {
    fetchMetrics();
  }, [dateRange]);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      
      // get date ranges for queries
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      const daysAgo = parseInt(dateRange);
      const startDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      // OPTIMIZED: fetch all data in one parallel batch
      const [
        jobsThisMonthResult,
        jobsLastMonthResult,
        clicksThisMonthResult,
        clicksLastMonthResult,
        totalPostingsResult,
        activePostingsResult,
        totalUsersResult,
        newUsersMonthResult,
        userRolesResult,
        allJobsResult,
        allClicksResult,
        allAnalyticsResult,
        activeTodayResult,
        activeWeekResult,
        activeMonthResult
      ] = await Promise.all([
        // jobs posted this month
        supabase.from('jobs')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', startOfMonth.toISOString()),
        
        // jobs posted last month
        supabase.from('jobs')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', startOfLastMonth.toISOString())
          .lt('created_at', startOfMonth.toISOString()),
        
        // link clicks this month
        supabase.from('job_link_clicks')
          .select('*', { count: 'exact', head: true })
          .gte('clicked_at', startOfMonth.toISOString()),
        
        // link clicks last month
        supabase.from('job_link_clicks')
          .select('*', { count: 'exact', head: true })
          .gte('clicked_at', startOfLastMonth.toISOString())
          .lt('clicked_at', startOfMonth.toISOString()),
        
        // total postings
        supabase.from('jobs')
          .select('*', { count: 'exact', head: true }),
        
        // active postings
        supabase.from('jobs')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'active'),
        
        // total ACTIVE users (excludes disabled accounts)
        supabase.from('user_roles')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true),
        
        // new ACTIVE users this month
        supabase.from('user_roles')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true)
          .gte('created_at', startOfMonth.toISOString()),
        
        // all ACTIVE user roles for breakdown (excludes disabled users)
        supabase.from('user_roles')
          .select('user_id, role, is_active')
          .eq('is_active', true),
        
        // get all active jobs with their data
        supabase.from('jobs')
          .select('id, title, company, created_at')
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(20),
        
        // get ALL clicks at once for the date range
        supabase.from('job_link_clicks')
          .select('job_id, clicked_at')
          .gte('clicked_at', startDate.toISOString()),
        
        // get all analytics for time analysis
        supabase.from('job_analytics')
          .select('created_at, event_type, user_id, job_id')
          .gte('created_at', startDate.toISOString()),
        
        // active users today
        supabase.from('job_analytics')
          .select('user_id', { count: 'exact', head: false })
          .gte('created_at', oneDayAgo.toISOString()),
        
        // active users this week
        supabase.from('job_analytics')
          .select('user_id', { count: 'exact', head: false })
          .gte('created_at', oneWeekAgo.toISOString()),
        
        // active users this month
        supabase.from('job_analytics')
          .select('user_id', { count: 'exact', head: false })
          .gte('created_at', startOfMonth.toISOString())
      ]);

      // extract counts from results
      const jobsThisMonth = jobsThisMonthResult.count || 0;
      const jobsLastMonth = jobsLastMonthResult.count || 0;
      const clicksThisMonth = clicksThisMonthResult.count || 0;
      const clicksLastMonth = clicksLastMonthResult.count || 0;
      const totalPostings = totalPostingsResult.count || 0;
      const activePostings = activePostingsResult.count || 0;
      const totalUsers = totalUsersResult.count || 0;
      const newUsersMonth = newUsersMonthResult.count || 0;

      // calculate percentage changes
      const jobsGrowth = jobsLastMonth > 0 
        ? ((jobsThisMonth - jobsLastMonth) / jobsLastMonth) * 100 
        : (jobsThisMonth > 0 ? 0 : 0); // Show 0% instead of 100% when starting from zero
      const clicksGrowth = clicksLastMonth > 0 
        ? ((clicksThisMonth - clicksLastMonth) / clicksLastMonth) * 100 
        : (clicksThisMonth > 0 ? 0 : 0); // Show 0% instead of 100% when starting from zero

      // process user roles
      const roleBreakdown = {
        student: 0,
        faculty: 0,
        staff: 0,
        rep: 0,
        admin: 0
      };

      userRolesResult.data?.forEach(user => {
        if (user.role in roleBreakdown) {
          roleBreakdown[user.role as keyof typeof roleBreakdown]++;
        }
      });

      // count unique active users
      const activeToday = new Set(activeTodayResult.data?.map(a => a.user_id)).size;
      const activeWeek = new Set(activeWeekResult.data?.map(a => a.user_id)).size;
      const activeMonth = new Set(activeMonthResult.data?.map(a => a.user_id)).size;

      // OPTIMIZED: process all job stats at once using maps
      const viewsByJob = new Map<string, number>(); // total views per job
      const uniqueViewsByJob = new Map<string, Set<string>>(); // unique viewers per job
      const clicksByJob = new Map<string, number>(); // clicks per job

      // Process views from job_analytics table (which has user_id)
      allAnalyticsResult.data?.forEach(record => {
        if (record.event_type === 'view' || record.event_type === 'job_view') {
          // count total views
          viewsByJob.set(record.job_id, (viewsByJob.get(record.job_id) || 0) + 1);
          
          // track unique viewers per job
          if (!uniqueViewsByJob.has(record.job_id)) {
            uniqueViewsByJob.set(record.job_id, new Set());
          }
          if (record.user_id) { // only count logged-in users for unique views
            uniqueViewsByJob.get(record.job_id)!.add(record.user_id);
          }
        }
      });

      allClicksResult.data?.forEach(click => {
        clicksByJob.set(click.job_id, (clicksByJob.get(click.job_id) || 0) + 1);
      });

      // create most viewed jobs array with accurate engagement stats
      const mostViewedJobs: MostViewedJob[] = (allJobsResult.data || [])
        .map(job => {
          const totalViews = viewsByJob.get(job.id) || 0;
          const uniqueViews = uniqueViewsByJob.get(job.id)?.size || 0;
          const clicks = clicksByJob.get(job.id) || 0;
          const daysActive = Math.floor(
            (now.getTime() - new Date(job.created_at).getTime()) / (1000 * 60 * 60 * 24)
          );
          
          // calculate engagement based on unique views (more accurate)
          const engagementRate = uniqueViews > 0 ? (clicks / uniqueViews) * 100 : 0;
          
          return {
            id: job.id,
            title: job.title,
            company: job.company,
            views: uniqueViews, // use unique views for display
            total_views: totalViews, // keep total for reference
            link_clicks: clicks,
            engagement_rate: engagementRate, // now based on unique views
            created_at: job.created_at,
            days_active: daysActive
          };
        })
        .filter(job => job.views > 0); // only include jobs with at least one view
      
      // create two different sorted lists
      const mostViewedJobsList = [...mostViewedJobs]
        .sort((a, b) => b.views - a.views)
        .slice(0, 10);
      
      const mostEngagedJobsList = [...mostViewedJobs]
        .filter(job => job.views >= 5) // minimum 5 unique views for engagement ranking
        .sort((a, b) => b.engagement_rate - a.engagement_rate)
        .slice(0, 10);

      // calculate company stats from job data using unique views
      const companyStats = new Map<string, { uniqueViews: number, totalViews: number, clicks: number, jobs: Set<string> }>();
      
      allJobsResult.data?.forEach(job => {
        if (!companyStats.has(job.company)) {
          companyStats.set(job.company, { uniqueViews: 0, totalViews: 0, clicks: 0, jobs: new Set() });
        }
        const stats = companyStats.get(job.company)!;
        stats.jobs.add(job.id);
        stats.uniqueViews += uniqueViewsByJob.get(job.id)?.size || 0; // use unique views
        stats.totalViews += viewsByJob.get(job.id) || 0; // keep total for reference
        stats.clicks += clicksByJob.get(job.id) || 0;
      });

      const topCompanies: TopCompany[] = Array.from(companyStats.entries())
        .map(([company, stats]) => ({
          company,
          views: stats.uniqueViews, // use unique views for display
          link_clicks: stats.clicks,
          job_count: stats.jobs.size,
          engagement_rate: stats.uniqueViews > 0 ? (stats.clicks / stats.uniqueViews) * 100 : 0 // engagement based on unique
        }))
        .sort((a, b) => b.views - a.views)
        .slice(0, 10);

      // create time series data
      const timeSeriesMap = new Map<string, { postings: number, clicks: number, views: number, uniqueViewers: Set<string> }>();
      // initialize all dates in range (including today)
      for (let i = 0; i <= daysAgo; i++) {
        const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
        const dateStr = date.toISOString().split('T')[0];
        timeSeriesMap.set(dateStr, { postings: 0, clicks: 0, views: 0, uniqueViewers: new Set() });
      }

      // count events per day from analytics
      allAnalyticsResult.data?.forEach(record => {
        const dateStr = record.created_at.split('T')[0];
        const existing = timeSeriesMap.get(dateStr);
        if (existing) {
          if (record.event_type === 'view') {
            existing.views++; // total views
            if (record.user_id) {
              existing.uniqueViewers.add(`${record.user_id}-${record.job_id}`); // track unique user-job pairs
            }
          } else if (record.event_type === 'click_apply' || record.event_type === 'link_click') {
            existing.clicks++;
          }
        }
      });

      // also process clicks from job_link_clicks table for the time series chart
      allClicksResult.data?.forEach(click => {
        const dateStr = click.clicked_at.split('T')[0];
        const existing = timeSeriesMap.get(dateStr);
        if (existing) {
          existing.clicks++;
        }
      });

      // count job postings per day
      allJobsResult.data?.forEach(job => {
        const dateStr = job.created_at.split('T')[0];
        const existing = timeSeriesMap.get(dateStr);
        if (existing) {
          existing.postings++;
        }
      });

      const timeSeries: TimeSeriesData[] = Array.from(timeSeriesMap.entries())
        .map(([date, data]) => ({
          date,
          total_postings: data.postings,
          active_postings: data.postings,
          views: data.uniqueViewers.size, // use unique viewers count for the day
          link_clicks: data.clicks
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // create a set of non-student users to filter from activity analysis
      const nonStudentUsers = new Set<string>();
      userRolesResult.data?.forEach(user => {
        if (user.role !== 'student') {
          nonStudentUsers.add(user.user_id);
        }
      });

      // find peak activity times (student activity only)
      const dayActivity = new Map<string, number>();
      const hourActivity = new Map<number, number>();

      allAnalyticsResult.data?.forEach(record => {
        // skip non-student activity for peak analysis
        if (record.user_id && nonStudentUsers.has(record.user_id)) {
          return;
        }
        
        const date = new Date(record.created_at);
        const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' });
        const hour = date.getHours();

        dayActivity.set(dayOfWeek, (dayActivity.get(dayOfWeek) || 0) + 1);
        hourActivity.set(hour, (hourActivity.get(hour) || 0) + 1);
      });

      const peakDay = Array.from(dayActivity.entries())
        .sort((a, b) => b[1] - a[1])[0]?.[0] || 'Monday';

      const peakHour = Array.from(hourActivity.entries())
        .sort((a, b) => b[1] - a[1])[0]?.[0] || 12;
      
      const peakTime = `${peakHour}:00 - ${peakHour + 1}:00`;

      // calculate average metrics using unique views for accuracy
      const jobsWithViews = mostViewedJobs.filter(job => job.views > 0);
      const totalUniqueViews = jobsWithViews.reduce((sum, job) => sum + job.views, 0);
      const totalAllViews = jobsWithViews.reduce((sum, job) => sum + job.total_views, 0);
      const totalClicks = mostViewedJobs.reduce((sum, job) => sum + job.link_clicks, 0);
      const avgViewsPerJob = activePostings > 0 ? totalUniqueViews / activePostings : 0;
      const avgClicksPerJob = activePostings > 0 ? totalClicks / activePostings : 0;
      const overallEngagementRate = totalUniqueViews > 0 ? (totalClicks / totalUniqueViews) * 100 : 0;

      setMetrics({
        jobs_posted_month: jobsThisMonth,
        link_clicks_month: clicksThisMonth,
        total_postings: totalPostings,
        active_postings: activePostings,
        jobs_posted_last_month: jobsLastMonth,
        link_clicks_last_month: clicksLastMonth,
        jobs_growth_percentage: jobsGrowth,
        clicks_growth_percentage: clicksGrowth,
        avg_views_per_job: avgViewsPerJob,
        avg_clicks_per_job: avgClicksPerJob,
        overall_engagement_rate: overallEngagementRate,
        time_series: timeSeries,
        top_companies: topCompanies,
        most_viewed_jobs: mostViewedJobsList,
        most_engaged_jobs: mostEngagedJobsList,
        user_engagement: {
          total_users: totalUsers,
          active_users_today: activeToday,
          active_users_week: activeWeek,
          active_users_month: activeMonth,
          new_users_month: newUsersMonth,
          user_by_role: roleBreakdown
        },
        peak_activity_day: peakDay,
        peak_activity_time: peakTime
      });

    } catch (err) {
      console.error('Error fetching metrics:', err);
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>Admin Analytics | UGA Job Board</title>
      </Head>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Platform Analytics</h1>
            <p className="text-gray-600 mt-2">Comprehensive metrics and insights</p>
          </div>
          <div className="flex gap-3 w-full sm:w-auto">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="flex-1 sm:flex-initial px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
            </select>
            <Link href="/admin/dashboard">
              <button className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600">
                ← Dashboard
              </button>
            </Link>
          </div>
        </div>

        {metrics && (
          <div className="space-y-6">
            {/* key metrics cards with explanations */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* jobs posted this month */}
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm text-gray-600">Jobs Posted This Month</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">
                      {metrics.jobs_posted_month}
                    </p>
                    <div className="flex items-center mt-2">
                      {metrics.jobs_growth_percentage >= 0 ? (
                        <ArrowUpIcon className="h-4 w-4 text-green-500 mr-1" />
                      ) : (
                        <ArrowDownIcon className="h-4 w-4 text-red-500 mr-1" />
                      )}
                      <p className={`text-sm ${
                        metrics.jobs_growth_percentage >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {Math.abs(metrics.jobs_growth_percentage).toFixed(1)}% from last month
                      </p>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 italic">
                      Total new opportunities added this month
                    </p>
                  </div>
                  <BriefcaseIcon className="h-10 w-10 text-blue-500" />
                </div>
              </div>

              {/* link clicks this month */}
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm text-gray-600">Link Clicks This Month</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">
                      {metrics.link_clicks_month}
                    </p>
                    <div className="flex items-center mt-2">
                      {metrics.clicks_growth_percentage >= 0 ? (
                        <ArrowUpIcon className="h-4 w-4 text-green-500 mr-1" />
                      ) : (
                        <ArrowDownIcon className="h-4 w-4 text-red-500 mr-1" />
                      )}
                      <p className={`text-sm ${
                        metrics.clicks_growth_percentage >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {Math.abs(metrics.clicks_growth_percentage).toFixed(1)}% from last month
                      </p>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 italic">
                      Students clicking to external applications
                    </p>
                  </div>
                  <CursorArrowRaysIcon className="h-10 w-10 text-green-500" />
                </div>
              </div>

              {/* active postings */}
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm text-gray-600">Active Postings</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">
                      {metrics.active_postings}
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                      of {metrics.total_postings} total
                    </p>
                    <p className="text-xs text-gray-500 mt-1 italic">
                      Jobs currently accepting applications
                    </p>
                  </div>
                  <ChartBarIcon className="h-10 w-10 text-purple-500" />
                </div>
              </div>

              {/* total users */}
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm text-gray-600">Total Active Users</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">
                      {metrics.user_engagement.total_users}
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                      +{metrics.user_engagement.new_users_month} this month
                    </p>
                    <p className="text-xs text-gray-500 mt-1 italic">
                      Active accounts only (disabled excluded)
                    </p>
                  </div>
                  <UserGroupIcon className="h-10 w-10 text-orange-500" />
                </div>
              </div>
            </div>

            {/* engagement insights card with full explanations */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg shadow border border-blue-100">
              <div className="flex items-center mb-4">
                <ArrowTrendingUpIcon className="h-6 w-6 text-blue-600 mr-2" />
                <h2 className="text-xl font-semibold text-gray-800">Platform Insights</h2>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                These metrics help you understand typical job performance and identify optimal posting times
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="bg-white p-4 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Avg Views Per Job</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {metrics.avg_views_per_job.toFixed(1)}
                      </p>
                    </div>
                    <InformationCircleIcon className="h-5 w-5 text-gray-400" title="Average number of times each job is viewed" />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Typical job visibility across platform
                  </p>
                </div>
                <div className="bg-white p-4 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Avg Clicks Per Job</p>
                      <p className="text-2xl font-bold text-green-600">
                        {metrics.avg_clicks_per_job.toFixed(1)}
                      </p>
                    </div>
                    <InformationCircleIcon className="h-5 w-5 text-gray-400" title="Average application link clicks per job" />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Typical application interest level
                  </p>
                </div>
                <div className="bg-white p-4 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Overall Engagement Rate</p>
                      <p className="text-2xl font-bold text-purple-600">
                        {metrics.overall_engagement_rate.toFixed(1)}%
                      </p>
                    </div>
                    <InformationCircleIcon className="h-5 w-5 text-gray-400" title="Percentage of views that result in clicks" />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Views converting to application clicks
                  </p>
                </div>
              </div>
              <div className="pt-4 border-t border-blue-200">
                <p className="text-sm font-medium text-gray-700 mb-3">Optimal Posting Times</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center bg-white p-3 rounded-lg">
                    <CalendarIcon className="h-5 w-5 text-blue-500 mr-2" />
                    <div>
                      <p className="text-sm text-gray-600">Peak Activity Day</p>
                      <p className="font-semibold text-gray-800">{metrics.peak_activity_day}</p>
                    </div>
                  </div>
                  <div className="flex items-center bg-white p-3 rounded-lg">
                    <ClockIcon className="h-5 w-5 text-blue-500 mr-2" />
                    <div>
                      <p className="text-sm text-gray-600">Peak Activity Time</p>
                      <p className="font-semibold text-gray-800">{metrics.peak_activity_time}</p>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-gray-600 mt-3 italic">
                  Post jobs and send announcements during peak times for maximum visibility
                </p>
              </div>
            </div>

            {/* user engagement trends section with explanations */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold text-gray-700 mb-2">User Engagement Trends</h2>
              <p className="text-sm text-gray-600 mb-4">
                Track active users over different time periods to gauge platform health and user retention
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Active Today</p>
                  <p className="text-3xl font-bold text-blue-600">
                    {metrics.user_engagement.active_users_today}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {metrics.user_engagement.total_users > 0 
                      ? `${((metrics.user_engagement.active_users_today / metrics.user_engagement.total_users) * 100).toFixed(1)}% of users`
                      : '0% of users'}
                  </p>
                  <p className="text-xs text-gray-500 mt-2 italic">
                    Users who viewed or clicked jobs today
                  </p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Active This Week</p>
                  <p className="text-3xl font-bold text-green-600">
                    {metrics.user_engagement.active_users_week}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {metrics.user_engagement.total_users > 0
                      ? `${((metrics.user_engagement.active_users_week / metrics.user_engagement.total_users) * 100).toFixed(1)}% of users`
                      : '0% of users'}
                  </p>
                  <p className="text-xs text-gray-500 mt-2 italic">
                    Week-over-week engagement indicator
                  </p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Active This Month</p>
                  <p className="text-3xl font-bold text-purple-600">
                    {metrics.user_engagement.active_users_month}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {metrics.user_engagement.total_users > 0
                      ? `${((metrics.user_engagement.active_users_month / metrics.user_engagement.total_users) * 100).toFixed(1)}% of users`
                      : '0% of users'}
                  </p>
                  <p className="text-xs text-gray-500 mt-2 italic">
                    Monthly active user baseline
                  </p>
                </div>
              </div>

              {/* user breakdown by role with explanations */}
              <div className="mt-6 pt-6 border-t">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Active Users by Role</h3>
                <p className="text-xs text-gray-500 mb-3">Currently active users only (disabled accounts excluded)</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Students</p>
                    <p className="text-2xl font-bold text-blue-600">{metrics.user_engagement.user_by_role.student}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Faculty</p>
                    <p className="text-2xl font-bold text-green-600">{metrics.user_engagement.user_by_role.faculty}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Reps</p>
                    <p className="text-2xl font-bold text-orange-600">{metrics.user_engagement.user_by_role.rep}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Admins</p>
                    <p className="text-2xl font-bold text-red-600">{metrics.user_engagement.user_by_role.admin}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* activity trends visualization with explanation */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold text-gray-700 mb-2">Activity Trends</h2>
              <p className="text-sm text-gray-600 mb-4">
                Daily breakdown of jobs posted, views, and link clicks. Use this to identify trends and patterns in platform usage.
              </p>
              <div className="overflow-x-auto">
                <div className="min-w-[600px] h-64 flex items-end justify-between gap-2">
                  {metrics.time_series.slice(-14).map((day, index) => {
                    const maxValue = Math.max(
                      ...metrics.time_series.slice(-14).map(d => 
                        Math.max(d.total_postings, d.views, d.link_clicks)
                      )
                    );
                    
                    return (
                      <div key={index} className="flex-1 flex flex-col items-center">
                        <div className="w-full flex gap-0.5 items-end h-48">
                          <div 
                            className="flex-1 bg-blue-600 rounded-t hover:bg-blue-700 transition-colors"
                            style={{ 
                              height: `${day.total_postings > 0 ? (day.total_postings / maxValue * 100) : 0}%`,
                              minHeight: day.total_postings > 0 ? '4px' : '0'
                            }}
                            title={`${day.total_postings} jobs posted`}
                          />
                          <div 
                            className="flex-1 bg-green-600 rounded-t hover:bg-green-700 transition-colors"
                            style={{ 
                              height: `${day.link_clicks > 0 ? (day.link_clicks / maxValue * 100) : 0}%`,
                              minHeight: day.link_clicks > 0 ? '4px' : '0'
                            }}
                            title={`${day.link_clicks} link clicks`}
                          />
                          <div 
                            className="flex-1 bg-purple-600 rounded-t hover:bg-purple-700 transition-colors"
                            style={{ 
                              height: `${day.views > 0 ? (day.views / maxValue * 100) : 0}%`,
                              minHeight: day.views > 0 ? '4px' : '0'
                            }}
                            title={`${day.views} views`}
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-2 text-center">
                          {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-center gap-6 mt-4 text-sm">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-blue-600 rounded mr-2"></div>
                    <span className="text-gray-600">Jobs Posted</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-green-600 rounded mr-2"></div>
                    <span className="text-gray-600">Link Clicks</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-purple-600 rounded mr-2"></div>
                    <span className="text-gray-600">Views</span>
                  </div>
                </div>
              </div>
            </div>

            {/* most viewed jobs table - based on unique student views */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold text-gray-700 mb-2">Most Viewed Jobs</h2>
              <p className="text-sm text-gray-600 mb-4">
                Jobs with the most unique student views. Shows actual reach (how many individual students viewed each job).
                Total views shows repeat visits, indicating strong interest when higher than unique views.
              </p>
              <div className="overflow-x-auto">
                <table className="min-w-full table-auto border-collapse">
                  <thead>
                    <tr className="bg-gray-50 text-gray-700">
                      <th className="border-b px-4 py-2 text-left">Job Title</th>
                      <th className="border-b px-4 py-2 text-left">Company</th>
                      <th className="border-b px-4 py-2 text-center">Unique Views</th>
                      <th className="border-b px-4 py-2 text-center">Total Views</th>
                      <th className="border-b px-4 py-2 text-center">Clicks</th>
                      <th className="border-b px-4 py-2 text-center">Days Active</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.most_viewed_jobs.slice(0, 10).map((job) => (
                      <tr key={job.id} className="hover:bg-gray-50">
                        <td className="border-b px-4 py-2">
                          <Link href={`/admin/view/${job.id}`}>
                            <span className="text-blue-600 hover:underline cursor-pointer">
                              {job.title}
                            </span>
                          </Link>
                        </td>
                        <td className="border-b px-4 py-2">{job.company}</td>
                        <td className="border-b px-4 py-2 text-center font-semibold">{job.views}</td>
                        <td className="border-b px-4 py-2 text-center text-gray-600">{job.total_views}</td>
                        <td className="border-b px-4 py-2 text-center">{job.link_clicks}</td>
                        <td className="border-b px-4 py-2 text-center text-gray-600">
                          {job.days_active} days
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* most engaged jobs table with accurate engagement calculation */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold text-gray-700 mb-2">Most Engaged Jobs</h2>
              <p className="text-sm text-gray-600 mb-4">
                Jobs with the highest click-through rate (minimum 5 unique viewers). 
                Shows actual engagement based on unique students who viewed then clicked to apply.
                Engagement &gt;20% is excellent, 10-20% is good.
              </p>
              <div className="overflow-x-auto">
                <table className="min-w-full table-auto border-collapse">
                  <thead>
                    <tr className="bg-gray-50 text-gray-700">
                      <th className="border-b px-4 py-2 text-left">Job Title</th>
                      <th className="border-b px-4 py-2 text-left">Company</th>
                      <th className="border-b px-4 py-2 text-center">Unique Views</th>
                      <th className="border-b px-4 py-2 text-center">Clicks</th>
                      <th className="border-b px-4 py-2 text-center">Engagement</th>
                      <th className="border-b px-4 py-2 text-center">Days Active</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.most_engaged_jobs.slice(0, 10).map((job) => (
                      <tr key={job.id} className="hover:bg-gray-50">
                        <td className="border-b px-4 py-2">
                          <Link href={`/admin/view/${job.id}`}>
                            <span className="text-blue-600 hover:underline cursor-pointer">
                              {job.title}
                            </span>
                          </Link>
                        </td>
                        <td className="border-b px-4 py-2">{job.company}</td>
                        <td className="border-b px-4 py-2 text-center">{job.views}</td>
                        <td className="border-b px-4 py-2 text-center">{job.link_clicks}</td>
                        <td className="border-b px-4 py-2 text-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            job.engagement_rate > 20 ? 'bg-green-100 text-green-800' :
                            job.engagement_rate > 10 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {job.engagement_rate.toFixed(1)}%
                          </span>
                        </td>
                        <td className="border-b px-4 py-2 text-center text-gray-600">
                          {job.days_active} days
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            {/* top companies by engagement table with explanation */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold text-gray-700 mb-2">Top Companies by Engagement</h2>
              <p className="text-sm text-gray-600 mb-4">
                Companies with the most student interest, ranked by total views. Engagement rate indicates quality of their job postings.
                This helps identify which companies students prefer and which may need posting improvements.
              </p>
              <div className="overflow-x-auto">
                <table className="min-w-full table-auto border-collapse border border-gray-200">
                  <thead>
                    <tr className="bg-gray-100 text-gray-700">
                      <th className="border px-4 py-2">Company</th>
                      <th className="border px-4 py-2">Active Jobs</th>
                      <th className="border px-4 py-2">Total Views</th>
                      <th className="border px-4 py-2">Link Clicks</th>
                      <th className="border px-4 py-2">Engagement Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.top_companies.map((item) => (
                      <tr key={item.company} className="text-center hover:bg-gray-50">
                        <td className="border px-4 py-2 font-medium text-left">{item.company}</td>
                        <td className="border px-4 py-2">{item.job_count}</td>
                        <td className="border px-4 py-2">{item.views}</td>
                        <td className="border px-4 py-2">{item.link_clicks}</td>
                        <td className="border px-4 py-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            item.engagement_rate > 15 ? 'bg-green-100 text-green-800' :
                            item.engagement_rate > 10 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {item.engagement_rate.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
