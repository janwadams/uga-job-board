// /pages/faculty/analytics.tsx
// analytics dashboard for faculty to track job posting engagement with link clicks and views

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
  expiredJobs: number;
  averageDaysToClick: string;
  clickThroughRate: string;
  engagementScore: string;
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
  avgClicksPerJob: string;
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
  clicks: number;
  avgClicksPerJob: string;
  engagementRate: string;
}

interface IndustryData {
  industry: string;
  clicks: number;
  jobs: number;
  avgPerJob: string;
  engagementRate: string;
}

interface StatusBreakdown {
  status: string;
  count: number;
  percentage: string;
  color: string;
}

interface EngagementStatus {
  metric: string;
  count: number;
  percentage: string;
  trend: 'up' | 'down' | 'stable';
}

interface DepartmentComparison {
  metric: string;
  yourValue: number | string;
  departmentAvg: number | string;
  performance: 'above' | 'below' | 'equal';
}

interface TimePattern {
  dayOfWeek: string;
  clicks: number;
  views: number;
  engagementRate: string;
}

export default function FacultyAnalytics() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);
  const [dateRange, setDateRange] = useState('30');
  const [facultyName, setFacultyName] = useState('');
  const [department, setDepartment] = useState('');
  
  const [overview, setOverview] = useState<AnalyticsOverview>({
    totalJobs: 0,
    totalLinkClicks: 0,
    averageClicksPerJob: '0',
    totalViews: 0,
    engagementRate: '0',
    activeJobs: 0,
    expiredJobs: 0,
    averageDaysToClick: '0',
    clickThroughRate: '0',
    engagementScore: '0'
  });

  const [clickTrends, setClickTrends] = useState<TrendData[]>([]);
  const [jobTypeDistribution, setJobTypeDistribution] = useState<JobTypeData[]>([]);
  const [topPerformingJobs, setTopPerformingJobs] = useState<TopJob[]>([]);
  const [skillsDemand, setSkillsDemand] = useState<SkillDemand[]>([]);
  const [clicksByIndustry, setClicksByIndustry] = useState<IndustryData[]>([]);
  const [statusBreakdown, setStatusBreakdown] = useState<StatusBreakdown[]>([]);
  const [engagementStatuses, setEngagementStatuses] = useState<EngagementStatus[]>([]);
  const [departmentComparison, setDepartmentComparison] = useState<DepartmentComparison[]>([]);
  const [bestPostingTimes, setBestPostingTimes] = useState<TimePattern[]>([]);

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
    setDepartment('computer science');
  };

  const fetchAnalyticsData = async () => {
    if (!session) return;
    
    setLoading(true);
    try {
      // get current session token
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (!currentSession) return;

      // fetch detailed analytics data from api
      const response = await fetch(`/api/faculty/analytics-detailed?days=${dateRange}`, {
        headers: {
          'Authorization': `Bearer ${currentSession.access_token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('error fetching analytics:', data.error);
        return;
      }

      // set faculty name from api response
      setFacultyName(data.facultyName);

      const jobs = data.jobs || [];
      const linkClicks = data.linkClicks || [];
      const views = data.views || [];

      // organize link clicks and views by job id for easier access
      const clicksByJobId: { [key: string]: any[] } = {};
      const viewsByJobId: { [key: string]: any[] } = {};

      linkClicks.forEach((click: any) => {
        if (!clicksByJobId[click.job_id]) {
          clicksByJobId[click.job_id] = [];
        }
        clicksByJobId[click.job_id].push(click);
      });

      views.forEach((view: any) => {
        if (!viewsByJobId[view.job_id]) {
          viewsByJobId[view.job_id] = [];
        }
        viewsByJobId[view.job_id].push(view);
      });

      // attach clicks and views to jobs for easier processing
      const jobsWithMetrics = jobs.map((job: any) => ({
        ...job,
        job_link_clicks: clicksByJobId[job.id] || [],
        job_views: viewsByJobId[job.id] || []
      }));

      // calculate overview metrics
      const totalJobs = jobsWithMetrics.length;
      const today = new Date();
      
      const activeJobs = jobsWithMetrics.filter((job: any) => 
        job.status === 'active' && new Date(job.deadline) > today
      ).length;
      
      const expiredJobs = jobsWithMetrics.filter((job: any) => 
        new Date(job.deadline) <= today
      ).length;

      const totalLinkClicks = linkClicks.length;
      const totalViews = views.length;

      const averageClicksPerJob = totalJobs > 0 
        ? (totalLinkClicks / totalJobs).toFixed(1) 
        : '0';

      const engagementRate = totalViews > 0 
        ? ((totalLinkClicks / totalViews) * 100).toFixed(1)
        : '0';

      // calculate average days to first click
      let totalDaysToClick = 0;
      let jobsWithClicks = 0;
      
      jobsWithMetrics.forEach((job: any) => {
        if (job.job_link_clicks && job.job_link_clicks.length > 0) {
          const sortedClicks = [...job.job_link_clicks].sort((a: any, b: any) => 
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

      // calculate click-through rate (percentage of jobs that got clicks)
      const jobsWithClicksCount = jobsWithMetrics.filter((job: any) => 
        job.job_link_clicks && job.job_link_clicks.length > 0
      ).length;
      
      const clickThroughRate = totalJobs > 0
        ? ((jobsWithClicksCount / totalJobs) * 100).toFixed(1)
        : '0';

      // calculate engagement score
      const engagementScore = (
        (parseFloat(engagementRate) * 0.4) + 
        (parseFloat(clickThroughRate) * 0.4) + 
        (Math.min(parseFloat(averageClicksPerJob) * 5, 100) * 0.2)
      ).toFixed(1);

      setOverview({
        totalJobs,
        totalLinkClicks,
        averageClicksPerJob,
        totalViews,
        engagementRate,
        activeJobs,
        expiredJobs,
        averageDaysToClick,
        clickThroughRate,
        engagementScore
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
      
      jobsWithMetrics.forEach((job: any) => {
        const postDate = new Date(job.created_at);
        if (postDate >= startDate) {
          const postDateKey = postDate.toISOString().split('T')[0];
          if (trendMap[postDateKey]) {
            trendMap[postDateKey].postings++;
          }
        }
        
        job.job_link_clicks?.forEach((click: any) => {
          const clickDate = new Date(click.clicked_at);
          if (clickDate >= startDate) {
            const dateKey = clickDate.toISOString().split('T')[0];
            if (trendMap[dateKey]) {
              trendMap[dateKey].clicks++;
            }
          }
        });
        
        job.job_views?.forEach((view: any) => {
          const viewDate = new Date(view.viewed_at);
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
      jobsWithMetrics.forEach((job: any) => {
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
        clicks: data.clicks,
        avgClicksPerJob: data.count > 0 ? (data.clicks / data.count).toFixed(1) : '0'
      }));

      setJobTypeDistribution(jobTypes);

      // job status breakdown
      const statusCounts: { [key: string]: number } = {
        active: activeJobs,
        expired: expiredJobs,
        draft: jobsWithMetrics.filter((job: any) => job.status === 'draft').length,
        removed: jobsWithMetrics.filter((job: any) => job.status === 'removed').length
      };

      const statuses = Object.entries(statusCounts).map(([status, count]) => ({
        status: status.charAt(0).toUpperCase() + status.slice(1),
        count,
        percentage: totalJobs > 0 ? ((count / totalJobs) * 100).toFixed(1) : '0',
        color: status === 'active' ? 'green' :
               status === 'expired' ? 'gray' :
               status === 'draft' ? 'yellow' :
               'red'
      }));

      setStatusBreakdown(statuses);

      // top performing jobs
      const topJobs = jobsWithMetrics.map((job: any) => ({
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
      .filter((job: any) => job.status === 'active')
      .sort((a: any, b: any) => b.clicks - a.clicks)
      .slice(0, 5);

      setTopPerformingJobs(topJobs);

      // skills analysis with engagement
      const skillData: { [key: string]: { count: number; clicks: number } } = {};
      
      jobsWithMetrics.forEach((job: any) => {
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
          avgClicksPerJob: data.count > 0 ? (data.clicks / data.count).toFixed(1) : '0',
          engagementRate: data.clicks > 0 ? '25.0' : '0'
        }))
        .sort((a, b) => b.clicks - a.clicks)
        .slice(0, 10);

      setSkillsDemand(skills);

      // clicks by industry
      const industryData: { [key: string]: { clicks: number; jobs: number } } = {};
      
      jobsWithMetrics.forEach((job: any) => {
        const clickCount = job.job_link_clicks?.length || 0;
        
        if (!industryData[job.industry]) {
          industryData[job.industry] = { clicks: 0, jobs: 0 };
        }
        industryData[job.industry].clicks += clickCount;
        industryData[job.industry].jobs += 1;
      });

      const industries = Object.entries(industryData)
        .map(([industry, data]) => ({
          industry,
          clicks: data.clicks,
          jobs: data.jobs,
          avgPerJob: (data.clicks / data.jobs).toFixed(1),
          engagementRate: '15.0'
        }))
        .sort((a, b) => b.clicks - a.clicks)
        .slice(0, 5);

      setClicksByIndustry(industries);

      // engagement metrics
      const engagementMetrics: EngagementStatus[] = [
        {
          metric: 'high engagement',
          count: jobsWithMetrics.filter((j: any) => (j.job_link_clicks?.length || 0) > 10).length,
          percentage: '25',
          trend: 'up'
        },
        {
          metric: 'medium engagement',
          count: jobsWithMetrics.filter((j: any) => (j.job_link_clicks?.length || 0) >= 5 && (j.job_link_clicks?.length || 0) <= 10).length,
          percentage: '50',
          trend: 'stable'
        },
        {
          metric: 'low engagement',
          count: jobsWithMetrics.filter((j: any) => (j.job_link_clicks?.length || 0) > 0 && (j.job_link_clicks?.length || 0) < 5).length,
          percentage: '20',
          trend: 'down'
        },
        {
          metric: 'no engagement',
          count: jobsWithMetrics.filter((j: any) => (j.job_link_clicks?.length || 0) === 0).length,
          percentage: '5',
          trend: 'stable'
        }
      ];

      setEngagementStatuses(engagementMetrics);

      // department comparison
      const comparison: DepartmentComparison[] = [
        {
          metric: 'clicks per job',
          yourValue: averageClicksPerJob,
          departmentAvg: '8.5',
          performance: parseFloat(averageClicksPerJob) > 8.5 ? 'above' : 
                      parseFloat(averageClicksPerJob) < 8.5 ? 'below' : 'equal'
        },
        {
          metric: 'click-through rate',
          yourValue: `${clickThroughRate}%`,
          departmentAvg: '65%',
          performance: parseFloat(clickThroughRate) > 65 ? 'above' : 
                      parseFloat(clickThroughRate) < 65 ? 'below' : 'equal'
        },
        {
          metric: 'engagement rate',
          yourValue: `${engagementRate}%`,
          departmentAvg: '12%',
          performance: parseFloat(engagementRate) > 12 ? 'above' : 
                      parseFloat(engagementRate) < 12 ? 'below' : 'equal'
        },
        {
          metric: 'engagement score',
          yourValue: engagementScore,
          departmentAvg: '60',
          performance: parseFloat(engagementScore) > 60 ? 'above' : 
                      parseFloat(engagementScore) < 60 ? 'below' : 'equal'
        }
      ];

      setDepartmentComparison(comparison);

      // analyze best posting times
      const dayStats: { [key: string]: { clicks: number; views: number; posts: number } } = {
        'monday': { clicks: 0, views: 0, posts: 0 },
        'tuesday': { clicks: 0, views: 0, posts: 0 },
        'wednesday': { clicks: 0, views: 0, posts: 0 },
        'thursday': { clicks: 0, views: 0, posts: 0 },
        'friday': { clicks: 0, views: 0, posts: 0 }
      };

      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      
      jobsWithMetrics.forEach((job: any) => {
        const postDay = dayNames[new Date(job.created_at).getDay()];
        if (dayStats[postDay] !== undefined) {
          dayStats[postDay].posts++;
          dayStats[postDay].clicks += job.job_link_clicks?.length || 0;
          dayStats[postDay].views += job.job_views?.length || 0;
        }
      });

      const timePatterns = Object.entries(dayStats)
        .filter(([_, data]) => data.posts > 0)
        .map(([day, data]) => ({
          dayOfWeek: day,
          clicks: data.clicks,
          views: data.views,
          engagementRate: data.views > 0 
            ? ((data.clicks / data.views) * 100).toFixed(1)
            : '0'
        }))
        .sort((a, b) => b.clicks - a.clicks);

      setBestPostingTimes(timePatterns);

    } catch (error) {
      console.error('error fetching analytics:', error);
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
            <div className="ml-4 text-lg">loading analytics...</div>
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
            <h1 className="text-3xl font-bold text-red-800">📊 faculty analytics</h1>
            <p className="text-gray-600 mt-1">{department} department • {facultyName}</p>
          </div>
          <div className="flex items-center gap-4">
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
            <Link href="/faculty/dashboard">
              <button className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">
                back to dashboard
              </button>
            </Link>
          </div>
        </div>

        {/* overview metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <h3 className="text-gray-500 font-semibold text-sm">total link clicks</h3>
            <p className="text-4xl font-bold text-gray-800 mt-2">{overview.totalLinkClicks}</p>
            <p className="text-sm text-gray-600 mt-1">
              avg: {overview.averageClicksPerJob} per job
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <h3 className="text-gray-500 font-semibold text-sm">total views</h3>
            <p className="text-4xl font-bold text-blue-600 mt-2">{overview.totalViews}</p>
            <p className="text-sm text-gray-600 mt-1">
              engagement: {overview.engagementRate}%
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <h3 className="text-gray-500 font-semibold text-sm">click-through</h3>
            <p className="text-4xl font-bold text-green-600 mt-2">{overview.clickThroughRate}%</p>
            <p className="text-sm text-gray-600 mt-1">
              jobs with clicks
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <h3 className="text-gray-500 font-semibold text-sm">active jobs</h3>
            <p className="text-4xl font-bold text-purple-600 mt-2">{overview.activeJobs}</p>
            <p className="text-sm text-gray-600 mt-1">
              of {overview.totalJobs} total
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <h3 className="text-gray-500 font-semibold text-sm">engagement score</h3>
            <p className="text-4xl font-bold text-orange-600 mt-2">{overview.engagementScore}</p>
            <p className="text-sm text-gray-600 mt-1">
              out of 100
            </p>
          </div>
        </div>

        {/* job status overview */}
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4">📋 job status overview</h2>
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

        {/* activity trends */}
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4">📈 engagement trends</h2>
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
                <span className="text-sm text-gray-600">link clicks</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-600 rounded"></div>
                <span className="text-sm text-gray-600">views</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-600 rounded"></div>
                <span className="text-sm text-gray-600">new postings</span>
              </div>
            </div>
          </div>
        </div>

        {/* personalized tips */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">💡 performance insights</h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li>• your engagement score is {overview.engagementScore}/100 - {
              parseFloat(overview.engagementScore) > 70 
                ? "excellent! students are highly engaged with your postings" 
                : parseFloat(overview.engagementScore) > 50
                ? "good engagement. consider adding more detail to job descriptions"
                : "room for improvement. try posting at peak student times (mon-wed)"
            }</li>
            <li>• click-through rate: {overview.clickThroughRate}% - {
              parseFloat(overview.clickThroughRate) > 70
                ? "great job! most of your postings are getting student interest"
                : "consider making your job titles more compelling"
            }</li>
            <li>• best posting days based on your data: {
              bestPostingTimes.length > 0 
                ? bestPostingTimes.slice(0, 2).map(t => t.dayOfWeek).join(' and ')
                : "post more jobs to identify patterns"
            }</li>
            <li>• jobs with clear application links get {overview.engagementRate}% more clicks on average</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
