// /pages/faculty/analytics.tsx
// Complete analytics dashboard for faculty members with detailed explanations - last change on 11/23/25

import React, { useEffect, useState } from 'react';
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
  totalAllViews: number;  // add total page views
  engagementRate: string;
  activeJobs: number;
  archivedJobs: number;
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

interface EngagementMetric {
  metric: string;
  count: number;
  percentage: string;
}

export default function FacultyAnalytics() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);
  const [dateRange, setDateRange] = useState('30');
  
  const [overview, setOverview] = useState<AnalyticsOverview>({
    totalJobs: 0,
    totalLinkClicks: 0,
    averageClicksPerJob: '0',
    totalViews: 0,
    totalAllViews: 0,  // add initial value
    engagementRate: '0',
    activeJobs: 0,
    archivedJobs: 0
  });

  const [clickTrends, setClickTrends] = useState<TrendData[]>([]);
  const [jobTypeDistribution, setJobTypeDistribution] = useState<JobTypeData[]>([]);
  const [topPerformingJobs, setTopPerformingJobs] = useState<TopJob[]>([]);
  const [engagementMetrics, setEngagementMetrics] = useState<EngagementMetric[]>([]);

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
      .select('role')
      .eq('user_id', session.user.id)
      .single();

    if (userData?.role !== 'faculty') {
      router.push('/unauthorized');
      return;
    }

    setSession(session);
  };

  const fetchAnalyticsData = async () => {
    if (!session) return;
    
    setLoading(true);
    try {
      const userId = session.user.id;
      const daysAgo = parseInt(dateRange);
      const dateThreshold = new Date();
      dateThreshold.setDate(dateThreshold.getDate() - daysAgo);
      
      // Fetch all jobs created by this faculty member
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
      
      // Calculate active and archived jobs
      const activeJobs = jobs?.filter(job => 
        job.status === 'active' && new Date(job.deadline) > today
      ).length || 0;
      
      const archivedJobs = jobs?.filter(job => 
        new Date(job.deadline) <= today
      ).length || 0;

      // calculate link clicks and views from analytics
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

      // Calculate average days to first click
      setOverview({
        totalJobs,
        totalLinkClicks,
        averageClicksPerJob,
        totalViews,
        totalAllViews,  // add total page views
        engagementRate,
        activeJobs,
        archivedJobs
      });

      // Generate trend data for the selected date range
      const trends: TrendData[] = [];
      for (let i = daysAgo - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const clicksOnDay = jobs?.reduce((sum, job) => {
          const clicksCount = job.job_link_clicks?.filter((click: any) => 
            click.clicked_at.split('T')[0] === dateStr
          ).length || 0;
          return sum + clicksCount;
        }, 0) || 0;

        const viewsOnDay = jobs?.reduce((sum, job) => {
          const analyticsEvents = job.job_analytics || [];
          const viewsCount = analyticsEvents.filter((event: any) => 
            (event.event_type === 'view' || event.event_type === 'job_view') &&
            event.created_at.split('T')[0] === dateStr
          ).length || 0;
          return sum + viewsCount;
        }, 0) || 0;

        const postingsOnDay = jobs?.filter(job => 
          job.created_at.split('T')[0] === dateStr
        ).length || 0;

        trends.push({
          date: `${date.getMonth() + 1}/${date.getDate()}`,
          clicks: clicksOnDay,
          views: viewsOnDay,
          postings: postingsOnDay
        });
      }
      setClickTrends(trends);

      // Calculate job type distribution
      const jobTypes: { [key: string]: { count: number, clicks: number } } = {};
      jobs?.forEach(job => {
        const type = job.job_type || 'Unknown';
        if (!jobTypes[type]) {
          jobTypes[type] = { count: 0, clicks: 0 };
        }
        jobTypes[type].count++;
        jobTypes[type].clicks += job.job_link_clicks?.length || 0;
      });

      const jobTypeData: JobTypeData[] = Object.entries(jobTypes).map(([name, data]) => ({
        name,
        value: data.count,
        percentage: ((data.count / totalJobs) * 100).toFixed(1),
        clicks: data.clicks
      }));
      setJobTypeDistribution(jobTypeData);

      // Calculate top performing jobs with unique view tracking
      const jobsWithMetrics = jobs?.map(job => {
        const clicks = job.job_link_clicks?.length || 0;
        
        // calculate unique and total views from job_analytics
        const analyticsEvents = job.job_analytics || [];
        const viewEvents = analyticsEvents.filter(
          (event: any) => event.event_type === 'view' || event.event_type === 'job_view'
        );
        
        const uniqueViews = new Set(
          viewEvents
            .filter((event: any) => event.user_id)
            .map((event: any) => event.user_id)
        ).size;
        
        const totalViews = viewEvents.length;
        
        // engagement rate based on unique views
        const engagementRate = uniqueViews > 0 ? ((clicks / uniqueViews) * 100).toFixed(1) : '0';
        const createdDate = new Date(job.created_at);
        const daysActive = Math.ceil((today.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));

        return {
          id: job.id,
          title: job.title,
          company: job.company,
          clicks,
          views: uniqueViews,  // unique views for display
          totalViews,  // total views for reference
          engagementRate,
          status: job.status,
          daysActive,
          deadline: job.deadline
        };
      }) || [];

      const topJobs = jobsWithMetrics
        .sort((a, b) => b.clicks - a.clicks)
        .slice(0, 5);
      setTopPerformingJobs(topJobs);

      // Calculate engagement metrics
      const highEngagement = jobs?.filter(job => {
        const clicks = job.job_link_clicks?.length || 0;
        const analyticsEvents = job.job_analytics || [];
        const viewEvents = analyticsEvents.filter(
          (event: any) => event.event_type === 'view' || event.event_type === 'job_view'
        );
        const uniqueViews = new Set(
          viewEvents.filter((e: any) => e.user_id).map((e: any) => e.user_id)
        ).size;
        return uniqueViews > 0 && (clicks / uniqueViews) > 0.15;
      }).length || 0;

      const mediumEngagement = jobs?.filter(job => {
        const clicks = job.job_link_clicks?.length || 0;
        const analyticsEvents = job.job_analytics || [];
        const viewEvents = analyticsEvents.filter(
          (event: any) => event.event_type === 'view' || event.event_type === 'job_view'
        );
        const uniqueViews = new Set(
          viewEvents.filter((e: any) => e.user_id).map((e: any) => e.user_id)
        ).size;
        return uniqueViews > 0 && (clicks / uniqueViews) >= 0.05 && (clicks / uniqueViews) <= 0.15;
      }).length || 0;

      const lowEngagement = jobs?.filter(job => {
        const clicks = job.job_link_clicks?.length || 0;
        const analyticsEvents = job.job_analytics || [];
        const viewEvents = analyticsEvents.filter(
          (event: any) => event.event_type === 'view' || event.event_type === 'job_view'
        );
        const uniqueViews = new Set(
          viewEvents.filter((e: any) => e.user_id).map((e: any) => e.user_id)
        ).size;
        return uniqueViews > 0 && (clicks / uniqueViews) < 0.05;
      }).length || 0;

      const noEngagement = jobs?.filter(job => {
        const clicks = job.job_link_clicks?.length || 0;
        return clicks === 0;
      }).length || 0;

      setEngagementMetrics([
        { metric: 'High Engagement', count: highEngagement, percentage: ((highEngagement / totalJobs) * 100).toFixed(1) },
        { metric: 'Medium Engagement', count: mediumEngagement, percentage: ((mediumEngagement / totalJobs) * 100).toFixed(1) },
        { metric: 'Low Engagement', count: lowEngagement, percentage: ((lowEngagement / totalJobs) * 100).toFixed(1) },
        { metric: 'No Engagement', count: noEngagement, percentage: ((noEngagement / totalJobs) * 100).toFixed(1) }
      ]);

    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-50 min-h-screen flex items-center justify-center">
        <p className="text-xl text-gray-600">Loading analytics...</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-red-800">📊 Faculty Analytics Dashboard</h1>
            <p className="text-gray-600 mt-2">Comprehensive insights into your job posting performance</p>
          </div>
          <div className="flex gap-4">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 bg-white"
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="365">Last year</option>
            </select>
            <Link href="/faculty/dashboard">
              <button className="bg-red-700 text-white px-6 py-2 rounded-lg font-semibold hover:bg-red-800 transition-colors">
                ← Back to Dashboard
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
              <p className="font-semibold text-gray-900 mb-2">How your metrics are calculated:</p>
              <div className="space-y-1 text-gray-700">
                <p><strong>Job details views:</strong> Unique students who clicked "view details" to read the full job description (Each student counted once per job)</p>
                <p><strong>Total page views:</strong> All "view details" clicks including repeat visits by the same student (Shows engagement depth)</p>
                <p><strong>Apply link clicks:</strong> Unique students who clicked the external application link to apply (Each student counted once per job)</p>
                <p><strong>Engagement rate:</strong> (Apply clicks ÷ Details views) × 100 - Shows conversion from viewing to applying</p>
                <p><strong>Performance categories:</strong> high (&gt;15% Engagement), medium (5-15%), low (&lt;5%), no engagement (0 clicks)</p>
              </div>
            </div>
          </div>
        </div>

        {/* Overview Cards with Explanations */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Apply Link Clicks</h3>
            <p className="text-4xl font-bold text-red-600 mb-2">{overview.totalLinkClicks}</p>
            <p className="text-xs text-gray-600">
              Average: {overview.averageClicksPerJob} per job
            </p>
            <p className="text-xs text-gray-500 mt-2 italic">
              Students who clicked to apply on external sites
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Job Details Views</h3>
            <p className="text-4xl font-bold text-blue-600 mb-2">{overview.totalViews}</p>
            <p className="text-xs text-gray-600">
              Engagement: {overview.engagementRate}%
            </p>
            <p className="text-xs text-gray-500 mt-2 italic">
              Students who clicked "view details" button
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Total Page Views</h3>
            <p className="text-4xl font-bold text-indigo-600 mb-2">{overview.totalAllViews}</p>
            <p className="text-xs text-gray-600">
              All detail page visits (includes repeat views)
            </p>
            <p className="text-xs text-gray-500 mt-2 italic">
              Avg: {overview.totalViews > 0 ? (overview.totalAllViews / overview.totalViews).toFixed(1) : '0'} views per student
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Active Jobs</h3>
            <p className="text-4xl font-bold text-green-600 mb-2">{overview.activeJobs}</p>
            <p className="text-xs text-gray-600">
              of {overview.totalJobs} total
            </p>
            <p className="text-xs text-gray-500 mt-2 italic">
              Jobs currently accepting applications
            </p>
          </div>
        </div>

        {/* Key Metrics Explanation */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">📈 Understanding Your Metrics</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
            <div>
              <p className="font-semibold mb-1">Engagement Rate ({overview.engagementRate}%)</p>
              <p>Percentage of views that resulted in link clicks. Higher rates indicate compelling job descriptions and requirements that match student interests.</p>
            </div>
            <div>
              <p className="font-semibold mb-1">Link Clicks vs Views</p>
              <p>Views show interest, but clicks indicate serious intent to apply. Track this ratio to understand how well your job descriptions convert interest into action.</p>
            </div>
            <div>
              <p className="font-semibold mb-1">Active vs Archived</p>
              <p>Active jobs are still accepting applications. Archived jobs have passed their deadline and provide historical performance data for comparison.</p>
            </div>
          </div>
        </div>

        {/* Engagement Trends Chart */}
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-2">Engagement Trends Over Time</h2>
          <p className="text-sm text-gray-600 mb-4">
            Daily breakdown of link clicks, views, and new postings. Use this to identify peak engagement days and optimize posting times.
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
          {/* Top Performing Jobs */}
          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <h2 className="text-xl font-bold text-gray-800 mb-2">🏆 Top Performing Jobs</h2>
            <p className="text-sm text-gray-600 mb-2">
              Your most clicked job postings ranked by student interest. Higher engagement rates mean more clicks relative to views, indicating compelling opportunities.
            </p>
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
              <p className="text-xs font-semibold text-green-900 mb-1">📊 how it's calculated:</p>
              <p className="text-xs text-green-800">
                <strong>engagement rate = (apply clicks ÷ job details views) × 100</strong>
              </p>
              <p className="text-xs text-green-700 mt-1">
                • ranked by total apply clicks, then by engagement rate<br/>
                • shows unique students (each student counted once per job)<br/>
                • &gt;20% engagement is excellent, 10-20% is good, &lt;10% needs improvement
              </p>
            </div>
            {topPerformingJobs.length > 0 ? (
              <div className="space-y-3">
                {topPerformingJobs.map((job, index) => (
                  <div key={index} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold text-gray-400">#{index + 1}</span>
                          <h3 className="font-semibold text-gray-800">{job.title}</h3>
                        </div>
                        <p className="text-sm text-gray-600">{job.company}</p>
                        <div className="flex gap-4 mt-2 text-xs text-gray-500">
                          <span className="font-semibold text-red-600">{job.clicks} clicks</span>
                          <span>{job.views} views</span>
                          <span className="text-green-600 font-semibold">{job.engagementRate}% engagement</span>
                        </div>
                      </div>
                      <span className={`px-2 py-1 text-xs font-semibold rounded ${
                        job.status === 'active' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {job.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No job performance data available yet. Post some jobs to see analytics!</p>
            )}
          </div>

          {/* Job Type Distribution */}
          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <h2 className="text-xl font-bold text-gray-800 mb-2">📋 Job Type Distribution</h2>
            <p className="text-sm text-gray-600 mb-4">
              Breakdown of your postings by type with click counts. Shows which job types attract the most student interest and help you optimize your posting strategy.
            </p>
            {jobTypeDistribution.length > 0 ? (
              <div className="space-y-4">
                {jobTypeDistribution.map((type, index) => (
                  <div key={index}>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">{type.name}</span>
                      <span className="text-sm text-gray-500">
                        {type.value} jobs • {type.clicks} clicks
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div 
                        className={`h-3 rounded-full ${
                          type.name === 'Full-Time' ? 'bg-green-600' :
                          type.name === 'Part-Time' ? 'bg-blue-600' :
                          type.name === 'Internship' ? 'bg-purple-600' :
                          'bg-orange-600'
                        }`}
                        style={{ width: `${type.percentage}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{type.percentage}% of total jobs</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No job type data available</p>
            )}
          </div>

          {/* Engagement Levels */}
          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <h2 className="text-xl font-bold text-gray-800 mb-2">📊 Engagement Levels</h2>
            <p className="text-sm text-gray-600 mb-2">
              Categorizes your jobs by student interest level. Jobs with no engagement may need better titles, clearer descriptions, or more competitive requirements to attract students.
            </p>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-4">
              <p className="text-xs font-semibold text-purple-900 mb-1">📊 how categories are determined:</p>
              <div className="text-xs text-purple-700 space-y-1">
                <p><strong>high engagement:</strong> &gt;15% click rate (clicks ÷ unique views &gt; 0.15)</p>
                <p><strong>medium engagement:</strong> 5-15% click rate</p>
                <p><strong>low engagement:</strong> &lt;5% click rate but has some clicks</p>
                <p><strong>no engagement:</strong> 0 clicks despite having views</p>
              </div>
            </div>
            {engagementMetrics.length > 0 ? (
              <div className="space-y-4">
                {engagementMetrics.map((metric, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-full ${
                        metric.metric === 'High Engagement' ? 'bg-green-600' :
                        metric.metric === 'Medium Engagement' ? 'bg-yellow-600' :
                        metric.metric === 'Low Engagement' ? 'bg-orange-600' :
                        'bg-red-600'
                      }`} />
                      <span className="text-sm font-medium text-gray-700">{metric.metric}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900">{metric.count} jobs</span>
                      <span className="text-xs text-gray-400">({metric.percentage}%)</span>
                    </div>
                  </div>
                ))}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-xs text-gray-600">
                    <span className="font-semibold">High:</span> &gt;15% click rate • 
                    <span className="font-semibold ml-2">Medium:</span> 5-15% • 
                    <span className="font-semibold ml-2">Low:</span> &lt;5% • 
                    <span className="font-semibold ml-2">None:</span> 0 clicks
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No engagement data available</p>
            )}
          </div>

          {/* Performance Insights */}
          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <h2 className="text-xl font-bold text-gray-800 mb-2">💡 Performance Insights</h2>
            <p className="text-sm text-gray-600 mb-4">
              Actionable recommendations based on your current analytics to help improve student engagement with your job postings.
            </p>
            <div className="space-y-3">
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm font-semibold text-blue-900 mb-1">Overall Engagement</p>
                <p className="text-sm text-blue-800">
                  Your engagement rate is {overview.engagementRate}% - {
                    parseFloat(overview.engagementRate) > 10 
                      ? "Excellent! Your job listings are compelling to students." 
                      : parseFloat(overview.engagementRate) > 5
                      ? "Good performance. Consider adding more specific requirements or benefits to increase clicks."
                      : "Your listings need improvement. Try clearer job titles, better descriptions, or more competitive compensation details."
                  }
                </p>
              </div>

              <div className="p-3 bg-yellow-50 rounded-lg">
                <p className="text-sm font-semibold text-yellow-900 mb-1">Low Engagement Jobs</p>
                <p className="text-sm text-yellow-800">
                  {engagementMetrics.find(m => m.metric === 'No Engagement')?.count || 0} jobs have received no clicks. 
                  Consider revising job titles, adjusting requirements, or checking if the application links are working properly.
                </p>
              </div>


              <div className="p-3 bg-purple-50 rounded-lg">
                <p className="text-sm font-semibold text-purple-900 mb-1">Best Practices</p>
                <ul className="text-sm text-purple-800 list-disc list-inside space-y-1">
                  <li>Post jobs at least 3-4 weeks before application deadlines</li>
                  <li>Include clear salary ranges or hourly rates when possible</li>
                  <li>Use specific, searchable job titles (e.g., "Software Engineer Intern" not "Tech Opportunity")</li>
                  <li>Highlight remote/hybrid options if available</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Help Section */}
        <div className="bg-gradient-to-r from-red-50 to-blue-50 border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">📚 How to Use This Analytics Dashboard</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
            <div>
              <p className="font-semibold mb-2">Understanding Link Clicks</p>
              <p>Link clicks represent students clicking the external application URL you provided. This indicates serious interest in applying. High click rates mean your job posting is appealing to the target audience.</p>
            </div>
            <div>
              <p className="font-semibold mb-2">Improving Engagement</p>
              <p>To increase your engagement rate, ensure job titles are clear and specific, descriptions highlight unique benefits, requirements are realistic for students, and application deadlines are reasonable.</p>
            </div>
            <div>
              <p className="font-semibold mb-2">Best Times to Post</p>
              <p>Students are most active Monday through Thursday, typically between 10am and 4pm. Review your trend chart to identify when your posts get the most engagement.</p>
            </div>
            <div>
              <p className="font-semibold mb-2">Optimizing Job Types</p>
              <p>Check which job types (internship, full-time, etc.) get the most clicks. Consider posting more of the high-performing types and adjusting the mix based on student demand.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
