// /pages/faculty/analytics.tsx
// Analytics dashboard component for faculty to track job posting performance

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
  expiredJobs: number;
  averageDaysToApply: string;
}

interface TrendData {
  date: string;
  applications: number;
  views: number;
}

interface JobTypeData {
  name: string;
  value: number;
  percentage: string;
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
}

interface SkillDemand {
  skill: string;
  count: number;
  percentage: string;
}

interface IndustryData {
  industry: string;
  applications: number;
  jobs: number;
  avgPerJob: string;
}

interface StatusData {
  status: string;
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
    totalApplications: 0,
    averageApplicationsPerJob: '0',
    totalViews: 0,
    conversionRate: '0',
    activeJobs: 0,
    expiredJobs: 0,
    averageDaysToApply: '0'
  });

  const [applicationTrends, setApplicationTrends] = useState<TrendData[]>([]);
  const [jobTypeDistribution, setJobTypeDistribution] = useState<JobTypeData[]>([]);
  const [topPerformingJobs, setTopPerformingJobs] = useState<TopJob[]>([]);
  const [skillsDemand, setSkillsDemand] = useState<SkillDemand[]>([]);
  const [applicationsByIndustry, setApplicationsByIndustry] = useState<IndustryData[]>([]);
  const [applicationStatus, setApplicationStatus] = useState<StatusData[]>([]);

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

    // Check if user is faculty
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
      
      // Fetch all jobs with applications and views - FIXED COLUMN NAMES
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

      // Calculate overview metrics
      const totalJobs = jobs?.length || 0;
      const today = new Date();
      
      const activeJobs = jobs?.filter(job => 
        job.status === 'active' && new Date(job.deadline) > today
      ).length || 0;
      
      const expiredJobs = jobs?.filter(job => 
        new Date(job.deadline) <= today
      ).length || 0;

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

      // Calculate average days to first application
      let totalDaysToApply = 0;
      let jobsWithApplications = 0;
      
      jobs?.forEach(job => {
        if (job.job_applications && job.job_applications.length > 0) {
          const sortedApps = [...job.job_applications].sort((a, b) => 
            new Date(a.applied_at).getTime() - new Date(b.applied_at).getTime() // FIXED: use applied_at
          );
          const firstApp = sortedApps[0];
          const daysToApply = Math.ceil(
            (new Date(firstApp.applied_at).getTime() - new Date(job.created_at).getTime()) // FIXED: use applied_at
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

      setOverview({
        totalJobs,
        totalApplications,
        averageApplicationsPerJob,
        totalViews,
        conversionRate,
        activeJobs,
        expiredJobs,
        averageDaysToApply
      });

      // Prepare application trends
      const daysAgo = parseInt(dateRange);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);
      
      const trendMap: { [key: string]: { applications: number; views: number } } = {};
      
      // Initialize all dates
      for (let d = new Date(startDate); d <= today; d.setDate(d.getDate() + 1)) {
        const dateKey = d.toISOString().split('T')[0];
        trendMap[dateKey] = { applications: 0, views: 0 };
      }
      
      // Count applications by date
      jobs?.forEach(job => {
        job.job_applications?.forEach(app => {
          const appDate = new Date(app.applied_at); // FIXED: use applied_at not created_at
          if (appDate >= startDate) {
            const dateKey = appDate.toISOString().split('T')[0];
            if (trendMap[dateKey]) {
              trendMap[dateKey].applications++;
            }
          }
        });
        
        // Count views by date
        job.job_views?.forEach(view => {
          const viewDate = new Date(view.created_at); // Views use created_at
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
        views: data.views
      }));

      setApplicationTrends(trends);

      // Job type distribution
      const typeCount: { [key: string]: number } = {};
      jobs?.forEach(job => {
        typeCount[job.job_type] = (typeCount[job.job_type] || 0) + 1;
      });
      
      const jobTypes = Object.entries(typeCount).map(([type, count]) => ({
        name: type,
        value: count,
        percentage: ((count / totalJobs) * 100).toFixed(1)
      }));

      setJobTypeDistribution(jobTypes);

      // Top performing jobs
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
        daysActive: Math.ceil((today.getTime() - new Date(job.created_at).getTime()) / (1000 * 60 * 60 * 24))
      }))
      .sort((a, b) => b.applications - a.applications)
      .slice(0, 5) || [];

      setTopPerformingJobs(topJobs);

      // Skills in demand
      const skillCount: { [key: string]: number } = {};
      jobs?.forEach(job => {
        job.skills?.forEach((skill: string) => {
          skillCount[skill] = (skillCount[skill] || 0) + 1;
        });
      });
      
      const skills = Object.entries(skillCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([skill, count]) => ({
          skill,
          count,
          percentage: ((count / totalJobs) * 100).toFixed(1)
        }));

      setSkillsDemand(skills);

      // Applications by industry
      const industryData: { [key: string]: { applications: number; jobs: number } } = {};
      jobs?.forEach(job => {
        const appCount = job.job_applications?.length || 0;
        if (!industryData[job.industry]) {
          industryData[job.industry] = { applications: 0, jobs: 0 };
        }
        industryData[job.industry].applications += appCount;
        industryData[job.industry].jobs += 1;
      });

      const industries = Object.entries(industryData)
        .map(([industry, data]) => ({
          industry,
          applications: data.applications,
          jobs: data.jobs,
          avgPerJob: (data.applications / data.jobs).toFixed(1)
        }))
        .sort((a, b) => b.applications - a.applications);

      setApplicationsByIndustry(industries);

      // Application status distribution
      const statusCount: { [key: string]: number } = { 
        applied: 0, 
        viewed: 0, 
        interview: 0, 
        hired: 0, 
        rejected: 0 
      };
      
      jobs?.forEach(job => {
        job.job_applications?.forEach(app => {
          const status = app.status || 'applied';
          if (statusCount.hasOwnProperty(status)) {
            statusCount[status]++;
          }
        });
      });

      const statuses = Object.entries(statusCount).map(([status, count]) => ({
        status: status.charAt(0).toUpperCase() + status.slice(1),
        count,
        percentage: totalApplications > 0 ? ((count / totalApplications) * 100).toFixed(1) : '0'
      }));

      setApplicationStatus(statuses);

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
            <div className="text-lg">Loading analytics...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-red-800">📊 Analytics Dashboard</h1>
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
            <Link href="/faculty/dashboard">
              <button className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">
                Back to Dashboard
              </button>
            </Link>
          </div>
        </div>

        {/* Overview Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
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
            <h3 className="text-gray-500 font-semibold text-sm">Active Jobs</h3>
            <p className="text-4xl font-bold text-green-600 mt-2">{overview.activeJobs}</p>
            <p className="text-sm text-gray-600 mt-1">
              of {overview.totalJobs} total
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <h3 className="text-gray-500 font-semibold text-sm">Avg Days to Apply</h3>
            <p className="text-4xl font-bold text-purple-600 mt-2">{overview.averageDaysToApply}</p>
            <p className="text-sm text-gray-600 mt-1">
              after posting
            </p>
          </div>
        </div>

        {/* Application Trends */}
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4">📈 Application & View Trends</h2>
          <div className="overflow-x-auto">
            <div className="min-w-[600px] h-64 flex items-end justify-between gap-2">
              {applicationTrends.map((day, index) => (
                <div key={index} className="flex-1 flex flex-col items-center">
                  <div className="w-full flex gap-1 items-end h-48">
                    <div 
                      className="flex-1 bg-red-600 rounded-t"
                      style={{ 
                        height: `${day.applications > 0 ? (day.applications / Math.max(...applicationTrends.map(d => d.applications)) * 100) : 0}%`,
                        minHeight: day.applications > 0 ? '4px' : '0'
                      }}
                      title={`${day.applications} applications`}
                    />
                    <div 
                      className="flex-1 bg-blue-600 rounded-t"
                      style={{ 
                        height: `${day.views > 0 ? (day.views / Math.max(...applicationTrends.map(d => d.views)) * 100) : 0}%`,
                        minHeight: day.views > 0 ? '4px' : '0'
                      }}
                      title={`${day.views} views`}
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
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Job Type Distribution */}
          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Job Type Distribution</h2>
            {jobTypeDistribution.length > 0 ? (
              <div className="space-y-3">
                {jobTypeDistribution.map((type, index) => (
                  <div key={index}>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700">{type.name}</span>
                      <span className="text-sm text-gray-500">{type.value} jobs ({type.percentage}%)</span>
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

          {/* Application Status Distribution */}
          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Application Status</h2>
            {applicationStatus.length > 0 ? (
              <div className="space-y-3">
                {applicationStatus.map((status, index) => (
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
              <p className="text-gray-500">No status data available</p>
            )}
          </div>
        </div>

        {/* Top Performing Jobs */}
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4">🏆 Top Performing Jobs</h2>
          {topPerformingJobs.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Job Title</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Company</th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Applications</th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Views</th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Conversion</th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Days Active</th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {topPerformingJobs.map((job, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{job.title}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{job.company}</td>
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
                        <Link href={`/faculty/view/${job.id}`}>
                          <button className="text-blue-600 hover:text-blue-800 text-xs">View</button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500">No job performance data available</p>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Most Requested Skills */}
          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <h2 className="text-xl font-bold text-gray-800 mb-4">🎯 Most Requested Skills</h2>
            {skillsDemand.length > 0 ? (
              <div className="space-y-3">
                {skillsDemand.map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">{item.skill}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-red-600 h-2 rounded-full" 
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-500 min-w-[3rem] text-right">
                        {item.count} jobs
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No skills data available</p>
            )}
          </div>

          {/* Applications by Industry */}
          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Applications by Industry</h2>
            {applicationsByIndustry.length > 0 ? (
              <div className="space-y-3">
                {applicationsByIndustry.slice(0, 5).map((item, index) => (
                  <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-gray-700">{item.industry}</p>
                      <p className="text-xs text-gray-500">{item.jobs} jobs posted</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-gray-900">{item.applications}</p>
                      <p className="text-xs text-gray-500">avg: {item.avgPerJob}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No industry data available</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}