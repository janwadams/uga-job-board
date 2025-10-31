// /pages/faculty/analytics.tsx
// updated analytics dashboard for faculty to track job posting engagement (link clicks instead of applications)

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/router';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

// we still need supabase client to get the session token for api calls
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
  expiredJobs: number;
  averageDaysToClick: string; // changed from averageDaysToApply
  clickThroughRate: string; // changed from studentSuccessRate
  engagementScore: string;
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
  avgClicksPerJob: string; // changed from avgApplicationsPerJob
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
  engagementRate: string; // changed from hireRate
}

interface IndustryData {
  industry: string;
  clicks: number; // changed from applications
  jobs: number;
  avgPerJob: string;
  engagementRate: string; // changed from successRate
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
  clicks: number; // changed from applications
  views: number;
  engagementRate: string; // changed from conversionRate
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
    try {
      // get the current session using supabase client
      const { data: { session: userSession }, error } = await supabase.auth.getSession();
      
      if (error || !userSession) {
        router.push('/login');
        return;
      }

      // verify user has faculty role
      const { data: userData } = await supabase
        .from('user_roles')
        .select('role, first_name, last_name')
        .eq('user_id', userSession.user.id)
        .single();

      if (userData?.role !== 'faculty') {
        router.push('/unauthorized');
        return;
      }

      setSession(userSession);
      setFacultyName(`${userData.first_name || ''} ${userData.last_name || ''}`.trim() || 'faculty member');
      setDepartment('computer science'); // placeholder
    } catch (error) {
      console.error('error checking auth:', error);
      router.push('/login');
    }
  };

  const fetchAnalyticsData = async () => {
    if (!session) return;
    
    setLoading(true);
    try {
      // call our api route to get raw analytics data
      const response = await fetch(`/api/faculty/analytics-detailed?days=${dateRange}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error('failed to fetch analytics data');
      }

      const { jobs, linkClicks, views } = await response.json();

      // now process the raw data on the frontend (same logic as original)
      
      // calculate overview metrics
      const totalJobs = jobs?.length || 0;
      const today = new Date();
      
      const activeJobs = jobs?.filter((job: any) => 
        job.status === 'active' && new Date(job.deadline) > today
      ).length || 0;
      
      const expiredJobs = jobs?.filter((job: any) => 
        new Date(job.deadline) <= today
      ).length || 0;

      const totalLinkClicks = linkClicks?.length || 0;
      const totalViews = views?.length || 0;

      const averageClicksPerJob = totalJobs > 0 
        ? (totalLinkClicks / totalJobs).toFixed(1) 
        : '0';

      const engagementRate = totalViews > 0 
        ? ((totalLinkClicks / totalViews) * 100).toFixed(1)
        : '0';

      // calculate average days to first click
      let totalDaysToClick = 0;
      let jobsWithClicks = 0;
      
      jobs?.forEach((job: any) => {
        const jobClicks = linkClicks?.filter((c: any) => c.job_id === job.id) || [];
        if (jobClicks.length > 0) {
          const sortedClicks = [...jobClicks].sort((a: any, b: any) => 
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
      const jobsWithClicksCount = jobs?.filter((job: any) => 
        linkClicks?.some((c: any) => c.job_id === job.id)
      ).length || 0;
      
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
      
      jobs?.forEach((job: any) => {
        const postDate = new Date(job.created_at);
        if (postDate >= startDate) {
          const postDateKey = postDate.toISOString().split('T')[0];
          if (trendMap[postDateKey]) {
            trendMap[postDateKey].postings++;
          }
        }
      });

      linkClicks?.forEach((click: any) => {
        const clickDate = new Date(click.clicked_at);
        if (clickDate >= startDate) {
          const dateKey = clickDate.toISOString().split('T')[0];
          if (trendMap[dateKey]) {
            trendMap[dateKey].clicks++;
          }
        }
      });
      
      views?.forEach((view: any) => {
        const viewDate = new Date(view.viewed_at);
        if (viewDate >= startDate) {
          const dateKey = viewDate.toISOString().split('T')[0];
          if (trendMap[dateKey]) {
            trendMap[dateKey].views++;
          }
        }
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
      jobs?.forEach((job: any) => {
        if (!typeData[job.job_type]) {
          typeData[job.job_type] = { count: 0, clicks: 0 };
        }
        typeData[job.job_type].count++;
        const jobClickCount = linkClicks?.filter((c: any) => c.job_id === job.id).length || 0;
        typeData[job.job_type].clicks += jobClickCount;
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
        draft: jobs?.filter((job: any) => job.status === 'draft').length || 0,
        removed: jobs?.filter((job: any) => job.status === 'removed').length || 0
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
      const topJobs = jobs?.map((job: any) => {
        const jobClicks = linkClicks?.filter((c: any) => c.job_id === job.id).length || 0;
        const jobViews = views?.filter((v: any) => v.job_id === job.id).length || 0;
        
        return {
          id: job.id,
          title: job.title,
          company: job.company,
          clicks: jobClicks,
          views: jobViews,
          engagementRate: jobViews > 0 
            ? ((jobClicks / jobViews) * 100).toFixed(1)
            : '0',
          status: job.status,
          daysActive: Math.ceil((today.getTime() - new Date(job.created_at).getTime()) / (1000 * 60 * 60 * 24)),
          deadline: job.deadline
        };
      })
      .filter((job: any) => job.status === 'active')
      .sort((a: any, b: any) => b.clicks - a.clicks)
      .slice(0, 5) || [];

      setTopPerformingJobs(topJobs);

      // skills analysis with engagement
      const skillData: { [key: string]: { count: number; clicks: number } } = {};
      
      jobs?.forEach((job: any) => {
        const jobClickCount = linkClicks?.filter((c: any) => c.job_id === job.id).length || 0;
        job.skills?.forEach((skill: string) => {
          if (!skillData[skill]) {
            skillData[skill] = { count: 0, clicks: 0 };
          }
          skillData[skill].count++;
          skillData[skill].clicks += jobClickCount;
        });
      });
      
      const skills = Object.entries(skillData)
        .map(([skill, data]) => ({
          skill,
          count: data.count,
          clicks: data.clicks,
          avgClicksPerJob: data.count > 0 ? (data.clicks / data.count).toFixed(1) : '0',
          engagementRate: data.count > 0 
            ? ((data.clicks / (data.count * (totalViews / totalJobs))) * 100).toFixed(1)
            : '0'
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      setSkillsDemand(skills);

      // industry analysis
      const industryData: { [key: string]: { jobs: number; clicks: number } } = {};
      
      jobs?.forEach((job: any) => {
        const industry = job.industry || 'other';
        if (!industryData[industry]) {
          industryData[industry] = { jobs: 0, clicks: 0 };
        }
        industryData[industry].jobs++;
        const jobClickCount = linkClicks?.filter((c: any) => c.job_id === job.id).length || 0;
        industryData[industry].clicks += jobClickCount;
      });
      
      const industries = Object.entries(industryData)
        .map(([industry, data]) => ({
          industry,
          clicks: data.clicks,
          jobs: data.jobs,
          avgPerJob: data.jobs > 0 ? (data.clicks / data.jobs).toFixed(1) : '0',
          engagementRate: data.jobs > 0 
            ? ((data.clicks / (data.jobs * (totalViews / totalJobs))) * 100).toFixed(1)
            : '0'
        }))
        .sort((a, b) => b.clicks - a.clicks)
        .slice(0, 5);

      setClicksByIndustry(industries);

      // engagement metrics
      const highEngagement = jobs?.filter((job: any) => {
        const jobClicks = linkClicks?.filter((c: any) => c.job_id === job.id).length || 0;
        const jobViews = views?.filter((v: any) => v.job_id === job.id).length || 0;
        return jobViews > 0 && (jobClicks / jobViews) > 0.1;
      }).length || 0;

      const lowEngagement = jobs?.filter((job: any) => {
        const jobClicks = linkClicks?.filter((c: any) => c.job_id === job.id).length || 0;
        const jobViews = views?.filter((v: any) => v.job_id === job.id).length || 0;
        return jobViews > 0 && (jobClicks / jobViews) <= 0.05;
      }).length || 0;

      const engagementMetrics = [
        {
          metric: 'high engagement',
          count: highEngagement,
          percentage: totalJobs > 0 ? ((highEngagement / totalJobs) * 100).toFixed(1) : '0',
          trend: 'up' as const
        },
        {
          metric: 'medium engagement',
          count: totalJobs - highEngagement - lowEngagement,
          percentage: totalJobs > 0 ? (((totalJobs - highEngagement - lowEngagement) / totalJobs) * 100).toFixed(1) : '0',
          trend: 'stable' as const
        },
        {
          metric: 'low engagement',
          count: lowEngagement,
          percentage: totalJobs > 0 ? ((lowEngagement / totalJobs) * 100).toFixed(1) : '0',
          trend: 'down' as const
        }
      ];

      setEngagementStatuses(engagementMetrics);

      // best posting times (day of week analysis)
      const dayData: { [key: string]: { clicks: number; views: number; posts: number } } = {
        'sunday': { clicks: 0, views: 0, posts: 0 },
        'monday': { clicks: 0, views: 0, posts: 0 },
        'tuesday': { clicks: 0, views: 0, posts: 0 },
        'wednesday': { clicks: 0, views: 0, posts: 0 },
        'thursday': { clicks: 0, views: 0, posts: 0 },
        'friday': { clicks: 0, views: 0, posts: 0 },
        'saturday': { clicks: 0, views: 0, posts: 0 }
      };

      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

      jobs?.forEach((job: any) => {
        const postDay = dayNames[new Date(job.created_at).getDay()];
        dayData[postDay].posts++;
      });

      linkClicks?.forEach((click: any) => {
        const clickDay = dayNames[new Date(click.clicked_at).getDay()];
        dayData[clickDay].clicks++;
      });

      views?.forEach((view: any) => {
        const viewDay = dayNames[new Date(view.viewed_at).getDay()];
        dayData[viewDay].views++;
      });

      const bestTimes = Object.entries(dayData)
        .map(([day, data]) => ({
          dayOfWeek: day.charAt(0).toUpperCase() + day.slice(1),
          clicks: data.clicks,
          views: data.views,
          engagementRate: data.views > 0 ? ((data.clicks / data.views) * 100).toFixed(1) : '0'
        }))
        .sort((a, b) => b.clicks - a.clicks);

      setBestPostingTimes(bestTimes);

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

        {/* updated overview metrics */}
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

        {/* activity trends - updated labels */}
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

        {/* job type distribution */}
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4">💼 job type distribution</h2>
          <div className="space-y-4">
            {jobTypeDistribution.map((type, index) => (
              <div key={index}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium text-gray-700">{type.name}</span>
                  <span className="text-sm text-gray-600">
                    {type.value} jobs • {type.clicks} clicks • avg {type.avgClicksPerJob} per job
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-red-600 h-2 rounded-full"
                    style={{ width: `${type.percentage}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* top performing jobs */}
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4">🏆 top performing jobs</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">job title</th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">link clicks</th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">views</th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">engagement</th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">days active</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {topPerformingJobs.map((job, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {job.title}
                      <br />
                      <span className="text-xs text-gray-500">{job.company}</span>
                    </td>
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* skills in demand */}
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4">🎯 top skills in demand</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {skillsDemand.map((skill, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <div>
                  <p className="font-medium text-gray-800">{skill.skill}</p>
                  <p className="text-xs text-gray-500">{skill.count} jobs • {skill.clicks} clicks</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-red-600">{skill.avgClicksPerJob}</p>
                  <p className="text-xs text-gray-500">avg per job</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* clicks by industry */}
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4">🏭 clicks by industry</h2>
          <div className="space-y-3">
            {clicksByIndustry.map((industry, index) => (
              <div key={index} className="flex items-center justify-between p-3 border border-gray-200 rounded">
                <div>
                  <p className="font-medium text-gray-800">{industry.industry}</p>
                  <p className="text-sm text-gray-600">{industry.jobs} jobs</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-red-600">{industry.clicks}</p>
                  <p className="text-xs text-gray-500">avg {industry.avgPerJob} per job</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* engagement levels */}
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4">📊 engagement levels</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {engagementStatuses.map((status, index) => (
              <div key={index} className="p-4 border-2 border-gray-200 rounded-lg text-center">
                <p className="text-sm font-medium text-gray-500 uppercase">{status.metric}</p>
                <p className="text-3xl font-bold text-gray-800 mt-2">{status.count}</p>
                <p className="text-sm text-gray-600 mt-1">{status.percentage}% of jobs</p>
                <span className={`inline-block mt-2 text-xs px-2 py-1 rounded ${
                  status.trend === 'up' ? 'bg-green-100 text-green-800' :
                  status.trend === 'down' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {status.trend === 'up' ? '↑' : status.trend === 'down' ? '↓' : '→'} {status.trend}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* best posting times */}
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4">⏰ best posting times (by day of week)</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">day</th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">clicks</th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">views</th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">engagement rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {bestPostingTimes.map((time, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{time.dayOfWeek}</td>
                    <td className="px-4 py-3 text-sm text-center">{time.clicks}</td>
                    <td className="px-4 py-3 text-sm text-center">{time.views}</td>
                    <td className="px-4 py-3 text-sm text-center">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                        {time.engagementRate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* personalized tips - updated */}
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
