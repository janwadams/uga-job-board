// src/pages/admin/analytics.tsx - comprehensive platform metrics dashboard

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
  ArrowDownIcon
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
  apply_clicks: number;
  applications: number;
}

interface TopCompany {
  company: string;
  views: number;
  apply_clicks: number;
  job_count: number;
}

interface MostViewedJob {
  id: string;
  title: string;
  company: string;
  views: number;
  apply_clicks: number;
  applications: number;
  created_at: string;
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
  applications_submitted_month: number;
  total_postings: number;
  active_postings: number;
  
  // comparison with last month
  jobs_posted_last_month: number;
  applications_submitted_last_month: number;
  jobs_growth_percentage: number;
  applications_growth_percentage: number;
  
  // top content
  time_series: TimeSeriesData[];
  top_companies: TopCompany[];
  most_viewed_jobs: MostViewedJob[];
  
  // user engagement
  user_engagement: UserEngagement;
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

      // fetch jobs posted this month
      const { count: jobsThisMonth } = await supabase
        .from('jobs')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startOfMonth.toISOString());

      // fetch jobs posted last month
      const { count: jobsLastMonth } = await supabase
        .from('jobs')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startOfLastMonth.toISOString())
        .lt('created_at', startOfMonth.toISOString());

      // fetch applications submitted this month
      const { count: applicationsThisMonth } = await supabase
        .from('job_applications')
        .select('*', { count: 'exact', head: true })
        .gte('applied_at', startOfMonth.toISOString());

      // fetch applications submitted last month
      const { count: applicationsLastMonth } = await supabase
        .from('job_applications')
        .select('*', { count: 'exact', head: true })
        .gte('applied_at', startOfLastMonth.toISOString())
        .lt('applied_at', startOfMonth.toISOString());

      // fetch total and active postings
      const { count: totalPostings } = await supabase
        .from('jobs')
        .select('*', { count: 'exact', head: true });

      const { count: activePostings } = await supabase
        .from('jobs')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      // fetch most viewed jobs (you'll need a job_analytics table for this)
      // for now, we'll fetch recent jobs as a placeholder
      const { data: mostViewedJobs } = await supabase
        .from('jobs')
        .select(`
          id,
          title,
          company,
          created_at,
          job_applications(count)
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(10);

      // transform most viewed jobs data
      const transformedMostViewed = mostViewedJobs?.map(job => ({
        id: job.id,
        title: job.title,
        company: job.company,
        views: Math.floor(Math.random() * 1000) + 100, // placeholder - replace with real data
        apply_clicks: Math.floor(Math.random() * 100) + 10, // placeholder
        applications: job.job_applications?.[0]?.count || 0,
        created_at: job.created_at
      })) || [];

      // fetch user engagement metrics
      const { count: totalUsers } = await supabase
        .from('user_roles')
        .select('*', { count: 'exact', head: true });

      // fetch users by role
      const { data: userRoles } = await supabase
        .from('user_roles')
        .select('role');

      const userByRole = {
        student: 0,
        faculty: 0,
        staff: 0,
        rep: 0,
        admin: 0
      };

      userRoles?.forEach(user => {
        if (user.role in userByRole) {
          userByRole[user.role as keyof typeof userByRole]++;
        }
      });

      // fetch new users this month
      const { count: newUsersMonth } = await supabase
        .from('user_roles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startOfMonth.toISOString());

      // calculate growth percentages
      const jobsGrowth = jobsLastMonth ? ((jobsThisMonth! - jobsLastMonth) / jobsLastMonth * 100) : 100;
      const applicationsGrowth = applicationsLastMonth ? 
        ((applicationsThisMonth! - applicationsLastMonth) / applicationsLastMonth * 100) : 100;

      // create time series data for the selected date range
      const timeSeriesData: TimeSeriesData[] = [];
      for (let i = daysAgo - 1; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dateStr = date.toISOString().split('T')[0];
        
        // fetch data for this date (simplified - in production you'd batch these)
        const { count: dailyJobs } = await supabase
          .from('jobs')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', dateStr)
          .lt('created_at', new Date(date.getTime() + 24 * 60 * 60 * 1000).toISOString());

        const { count: dailyApplications } = await supabase
          .from('job_applications')
          .select('*', { count: 'exact', head: true })
          .gte('applied_at', dateStr)
          .lt('applied_at', new Date(date.getTime() + 24 * 60 * 60 * 1000).toISOString());

        timeSeriesData.push({
          date: dateStr,
          total_postings: dailyJobs || 0,
          active_postings: dailyJobs || 0,
          views: Math.floor(Math.random() * 500) + 50, // placeholder
          apply_clicks: Math.floor(Math.random() * 50) + 5, // placeholder
          applications: dailyApplications || 0
        });
      }

      // fetch top companies by job postings
      const { data: topCompaniesData } = await supabase
        .from('jobs')
        .select('company')
        .eq('status', 'active');

      const companyMap = new Map<string, number>();
      topCompaniesData?.forEach(job => {
        companyMap.set(job.company, (companyMap.get(job.company) || 0) + 1);
      });

      const topCompanies: TopCompany[] = Array.from(companyMap.entries())
        .map(([company, count]) => ({
          company,
          job_count: count,
          views: Math.floor(Math.random() * 1000) + 100, // placeholder
          apply_clicks: Math.floor(Math.random() * 100) + 10 // placeholder
        }))
        .sort((a, b) => b.job_count - a.job_count)
        .slice(0, 5);

      // set all metrics
      setMetrics({
        jobs_posted_month: jobsThisMonth || 0,
        applications_submitted_month: applicationsThisMonth || 0,
        total_postings: totalPostings || 0,
        active_postings: activePostings || 0,
        jobs_posted_last_month: jobsLastMonth || 0,
        applications_submitted_last_month: applicationsLastMonth || 0,
        jobs_growth_percentage: jobsGrowth,
        applications_growth_percentage: applicationsGrowth,
        time_series: timeSeriesData,
        top_companies: topCompanies,
        most_viewed_jobs: transformedMostViewed,
        user_engagement: {
          total_users: totalUsers || 0,
          active_users_today: Math.floor((totalUsers || 0) * 0.3), // placeholder
          active_users_week: Math.floor((totalUsers || 0) * 0.6), // placeholder
          active_users_month: Math.floor((totalUsers || 0) * 0.8), // placeholder
          new_users_month: newUsersMonth || 0,
          user_by_role: userByRole
        }
      });

    } catch (err) {
      console.error('Error fetching metrics:', err);
      setError('Failed to fetch metrics data.');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (!metrics) return;

    // prepare csv content
    let csvContent = 'Platform Metrics Report\n';
    csvContent += `Generated: ${new Date().toLocaleDateString()}\n\n`;
    
    // summary metrics
    csvContent += 'Summary Metrics\n';
    csvContent += `Jobs Posted This Month,${metrics.jobs_posted_month}\n`;
    csvContent += `Applications Submitted This Month,${metrics.applications_submitted_month}\n`;
    csvContent += `Total Postings,${metrics.total_postings}\n`;
    csvContent += `Active Postings,${metrics.active_postings}\n\n`;
    
    // time series data
    csvContent += 'Daily Metrics\n';
    csvContent += 'Date,Jobs Posted,Applications,Views,Apply Clicks\n';
    metrics.time_series.forEach(row => {
      csvContent += `${row.date},${row.total_postings},${row.applications},${row.views},${row.apply_clicks}\n`;
    });
    
    // top companies
    csvContent += '\nTop Companies\n';
    csvContent += 'Company,Jobs Posted,Views,Apply Clicks\n';
    metrics.top_companies.forEach(company => {
      csvContent += `${company.company},${company.job_count},${company.views},${company.apply_clicks}\n`;
    });

    // create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `platform_metrics_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        <p className="mt-2 text-gray-600">Loading metrics...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="p-4 text-red-600">Error: {error}</div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <Head>
        <title>Platform Metrics Dashboard</title>
      </Head>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* header with controls */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">📊 Platform Metrics Dashboard</h1>
            <p className="text-gray-600 mt-1">Comprehensive analytics and engagement metrics</p>
          </div>
          <div className="flex space-x-4">
            {/* date range selector */}
            <select 
              value={dateRange} 
              onChange={(e) => setDateRange(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
            </select>
            
            <Link href="/admin/dashboard">
              <button className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500">
                ← Back to Admin Dashboard
              </button>
            </Link>
            <button
              onClick={handleExportCSV}
              className="bg-red-700 text-white px-4 py-2 rounded hover:bg-red-800"
            >
              Export CSV
            </button>
          </div>
        </div>

        {metrics && (
          <div className="space-y-8">
            {/* key metrics cards - main focus metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* jobs posted this month */}
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Jobs Posted This Month</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">
                      {metrics.jobs_posted_month}
                    </p>
                    <p className={`text-sm mt-2 flex items-center ${
                      metrics.jobs_growth_percentage >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {metrics.jobs_growth_percentage >= 0 ? (
                        <ArrowUpIcon className="h-4 w-4 mr-1" />
                      ) : (
                        <ArrowDownIcon className="h-4 w-4 mr-1" />
                      )}
                      {Math.abs(metrics.jobs_growth_percentage).toFixed(1)}% vs last month
                    </p>
                  </div>
                  <BriefcaseIcon className="h-10 w-10 text-blue-500" />
                </div>
              </div>

              {/* applications submitted this month */}
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Applications This Month</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">
                      {metrics.applications_submitted_month}
                    </p>
                    <p className={`text-sm mt-2 flex items-center ${
                      metrics.applications_growth_percentage >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {metrics.applications_growth_percentage >= 0 ? (
                        <ArrowUpIcon className="h-4 w-4 mr-1" />
                      ) : (
                        <ArrowDownIcon className="h-4 w-4 mr-1" />
                      )}
                      {Math.abs(metrics.applications_growth_percentage).toFixed(1)}% vs last month
                    </p>
                  </div>
                  <DocumentTextIcon className="h-10 w-10 text-green-500" />
                </div>
              </div>

              {/* active postings */}
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Active Postings</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">
                      {metrics.active_postings}
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                      of {metrics.total_postings} total
                    </p>
                  </div>
                  <ChartBarIcon className="h-10 w-10 text-purple-500" />
                </div>
              </div>

              {/* total users */}
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Users</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">
                      {metrics.user_engagement.total_users}
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                      +{metrics.user_engagement.new_users_month} this month
                    </p>
                  </div>
                  <UserGroupIcon className="h-10 w-10 text-orange-500" />
                </div>
              </div>
            </div>

            {/* user engagement trends */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold text-gray-700 mb-4">User Engagement Trends</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <p className="text-sm text-gray-600">Active Today</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {metrics.user_engagement.active_users_today}
                  </p>
                  <p className="text-sm text-gray-500">
                    {((metrics.user_engagement.active_users_today / metrics.user_engagement.total_users) * 100).toFixed(1)}% of users
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Active This Week</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {metrics.user_engagement.active_users_week}
                  </p>
                  <p className="text-sm text-gray-500">
                    {((metrics.user_engagement.active_users_week / metrics.user_engagement.total_users) * 100).toFixed(1)}% of users
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Active This Month</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {metrics.user_engagement.active_users_month}
                  </p>
                  <p className="text-sm text-gray-500">
                    {((metrics.user_engagement.active_users_month / metrics.user_engagement.total_users) * 100).toFixed(1)}% of users
                  </p>
                </div>
              </div>

              {/* user breakdown by role */}
              <div className="mt-6 pt-6 border-t">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Users by Role</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Students</p>
                    <p className="text-xl font-bold text-blue-600">{metrics.user_engagement.user_by_role.student}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Faculty</p>
                    <p className="text-xl font-bold text-green-600">{metrics.user_engagement.user_by_role.faculty}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Staff</p>
                    <p className="text-xl font-bold text-purple-600">{metrics.user_engagement.user_by_role.staff}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Reps</p>
                    <p className="text-xl font-bold text-orange-600">{metrics.user_engagement.user_by_role.rep}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Admins</p>
                    <p className="text-xl font-bold text-red-600">{metrics.user_engagement.user_by_role.admin}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* most viewed jobs */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold text-gray-700 mb-4">Most Viewed Jobs</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full table-auto border-collapse">
                  <thead>
                    <tr className="bg-gray-50 text-gray-700">
                      <th className="border-b px-4 py-2 text-left">Job Title</th>
                      <th className="border-b px-4 py-2 text-left">Company</th>
                      <th className="border-b px-4 py-2 text-center">Views</th>
                      <th className="border-b px-4 py-2 text-center">Apply Clicks</th>
                      <th className="border-b px-4 py-2 text-center">Applications</th>
                      <th className="border-b px-4 py-2 text-center">Conversion</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.most_viewed_jobs.map((job) => (
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
                        <td className="border-b px-4 py-2 text-center">{job.apply_clicks}</td>
                        <td className="border-b px-4 py-2 text-center">{job.applications}</td>
                        <td className="border-b px-4 py-2 text-center">
                          {job.views > 0 ? `${((job.applications / job.views) * 100).toFixed(1)}%` : '0%'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* time series chart - daily activity */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold text-gray-700 mb-4">Daily Activity Trends</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full table-auto border-collapse border border-gray-200">
                  <thead>
                    <tr className="bg-gray-100 text-gray-700">
                      <th className="border px-4 py-2">Date</th>
                      <th className="border px-4 py-2">Jobs Posted</th>
                      <th className="border px-4 py-2">Applications</th>
                      <th className="border px-4 py-2">Views</th>
                      <th className="border px-4 py-2">Apply Clicks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.time_series.slice(-7).map((item) => (
                      <tr key={item.date} className="text-center">
                        <td className="border px-4 py-2">{item.date}</td>
                        <td className="border px-4 py-2">{item.total_postings}</td>
                        <td className="border px-4 py-2">{item.applications}</td>
                        <td className="border px-4 py-2">{item.views}</td>
                        <td className="border px-4 py-2">{item.apply_clicks}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            {/* top companies by engagement */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold text-gray-700 mb-4">Top Companies by Engagement</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full table-auto border-collapse border border-gray-200">
                  <thead>
                    <tr className="bg-gray-100 text-gray-700">
                      <th className="border px-4 py-2">Company</th>
                      <th className="border px-4 py-2">Active Jobs</th>
                      <th className="border px-4 py-2">Total Views</th>
                      <th className="border px-4 py-2">Apply Clicks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.top_companies.map((item) => (
                      <tr key={item.company} className="text-center">
                        <td className="border px-4 py-2 font-medium">{item.company}</td>
                        <td className="border px-4 py-2">{item.job_count}</td>
                        <td className="border px-4 py-2">{item.views}</td>
                        <td className="border px-4 py-2">{item.apply_clicks}</td>
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