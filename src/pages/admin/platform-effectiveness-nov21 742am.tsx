//platform analystics 

import { useEffect, useState, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Types
interface Job {
  id: string;
  title: string;
  company: string;
  status: string;
  created_at: string;
  deadline: string;
  created_by: string;
  view_count?: number;
}

interface JobAnalytics {
  id: string;
  job_id: string;
  event_type: string;
  created_at: string;
  user_id: string | null;
}

interface JobLinkClick {
  id: string;
  job_id: string;
  user_id: string;
  clicked_at: string;
}

interface User {
  user_id: string;
  role: string;
  email: string;
  first_name: string;
  last_name: string;
  created_at: string;
}

interface SavedJob {
  id: string;
  student_id: string | null;
  job_id: string | null;
  saved_at: string | null;
  reminder_set: boolean | null;
  reminder_date: string | null;
}

interface EnhancedJob extends Job {
  viewCount: number;
  clickCount: number;
  uniqueClickCount: number;
  saveCount: number;
  engagementRate: number;
  clickThroughRate: string;
  daysActive: number;
  performanceScore: number;
  dailyEngagement: number;
}

export default function PlatformEffectiveness() {
  // State
  const [jobs, setJobs] = useState<Job[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [analytics, setAnalytics] = useState<JobAnalytics[]>([]);
  const [linkClicks, setLinkClicks] = useState<JobLinkClick[]>([]);
  const [savedJobs, setSavedJobs] = useState<SavedJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMetric, setSelectedMetric] = useState<'engagement' | 'clicks' | 'saves'>('engagement');

  // Fetch all data
  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchJobs(),
        fetchUsers(),
        fetchAnalytics(),
        fetchLinkClicks(),
        fetchSavedJobs()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchJobs = async () => {
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching jobs:', error);
    } else {
      setJobs(data || []);
    }
  };

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from('users')
      .select('*');
    
    if (error) {
      console.error('Error fetching users:', error);
    } else {
      setUsers(data || []);
    }
  };

  const fetchAnalytics = async () => {
    const { data, error } = await supabase
      .from('job_analytics')
      .select('*');
    
    if (error) {
      console.error('Error fetching analytics:', error);
    } else {
      setAnalytics(data || []);
    }
  };

  const fetchLinkClicks = async () => {
    const { data, error } = await supabase
      .from('job_link_clicks')
      .select('*');
    
    if (error) {
      console.error('Error fetching link clicks:', error);
    } else {
      setLinkClicks(data || []);
    }
  };

  const fetchSavedJobs = async () => {
    const { data, error } = await supabase
      .from('saved_jobs')
      .select('*');
    
    if (error) {
      console.error('Error fetching saved jobs:', error);
    } else {
      setSavedJobs(data || []);
    }
  };

  // Pre-calculate metrics for efficiency
  const metricsMap = useMemo(() => {
    const map: Record<string, {
      views: number;
      uniqueViews: number;
      clicks: number;
      uniqueClicks: number;
      saves: number;
    }> = {};

    // Count views and UNIQUE views per student (from analytics table)
    const uniqueViewsPerJob: Record<string, Set<string>> = {};
    analytics.forEach(event => {
      if (event.event_type === 'view' || event.event_type === 'job_view') {
        if (!map[event.job_id]) {
          map[event.job_id] = { views: 0, uniqueViews: 0, clicks: 0, uniqueClicks: 0, saves: 0 };
        }
        map[event.job_id].views++; // Total views
        
        // Track unique student views
        if (!uniqueViewsPerJob[event.job_id]) {
          uniqueViewsPerJob[event.job_id] = new Set();
        }
        // Only count if user_id exists (not anonymous)
        if (event.user_id) {
          uniqueViewsPerJob[event.job_id].add(event.user_id);
        }
      }
    });

    // Set unique view counts
    Object.keys(uniqueViewsPerJob).forEach(jobId => {
      if (map[jobId]) {
        map[jobId].uniqueViews = uniqueViewsPerJob[jobId].size;
      }
    });

    // Count total clicks and unique clicks
    const uniqueClicksPerJob: Record<string, Set<string>> = {};
    linkClicks.forEach(click => {
      if (!map[click.job_id]) {
        map[click.job_id] = { views: 0, uniqueViews: 0, clicks: 0, uniqueClicks: 0, saves: 0 };
      }
      map[click.job_id].clicks++;
      
      // Track unique users
      if (!uniqueClicksPerJob[click.job_id]) {
        uniqueClicksPerJob[click.job_id] = new Set();
      }
      uniqueClicksPerJob[click.job_id].add(click.user_id);
    });

    // Set unique click counts
    Object.keys(uniqueClicksPerJob).forEach(jobId => {
      if (map[jobId]) {
        map[jobId].uniqueClicks = uniqueClicksPerJob[jobId].size;
      }
    });

    // Count saves
    savedJobs.forEach(save => {
      // Skip if job_id is null
      if (!save.job_id) return;
      
      if (!map[save.job_id]) {
        map[save.job_id] = { views: 0, uniqueViews: 0, clicks: 0, uniqueClicks: 0, saves: 0 };
      }
      map[save.job_id].saves++;
    });

    return map;
  }, [analytics, linkClicks, savedJobs]);

  // Calculate top performing jobs with composite scoring
  const topPerformingJobs = useMemo(() => {
    const now = new Date();
    
    const enhancedJobs: EnhancedJob[] = jobs
      .filter(job => job.status === 'active') // Only active jobs
      .map(job => {
        const metrics = metricsMap[job.id] || { views: 0, uniqueViews: 0, clicks: 0, uniqueClicks: 0, saves: 0 };
        const daysActive = Math.max(1, Math.floor((now.getTime() - new Date(job.created_at).getTime()) / (1000 * 60 * 60 * 24)));
        
        // Use UNIQUE views for rate calculations (one per student)
        const clickThroughRate = metrics.uniqueViews > 0 
          ? ((metrics.uniqueClicks / metrics.uniqueViews) * 100).toFixed(1)
          : '0.0';
        
        const engagementRate = metrics.uniqueViews > 0
          ? ((metrics.uniqueClicks + metrics.saves * 2) / metrics.uniqueViews) * 100
          : 0;

        const dailyEngagement = (metrics.uniqueViews + metrics.uniqueClicks + metrics.saves) / daysActive;

        // Composite performance score (weighted formula)
        // Considers: engagement rate, click-through rate, saves, and daily activity
        const performanceScore = (
          (metrics.uniqueClicks * 3) +  // Unique clicks are most valuable
          (metrics.saves * 2) +          // Saves show strong interest
          (metrics.uniqueViews * 0.1) +  // Unique views show reach
          (engagementRate * 2) +         // Engagement rate shows quality
          (dailyEngagement * 5)          // Consistent daily activity
        );

        return {
          ...job,
          viewCount: metrics.uniqueViews,  // Show unique student views
          clickCount: metrics.clicks,
          uniqueClickCount: metrics.uniqueClicks,
          saveCount: metrics.saves,
          engagementRate,
          clickThroughRate,
          daysActive,
          performanceScore,
          dailyEngagement
        };
      })
      .sort((a, b) => {
        // Sort based on selected metric
        switch (selectedMetric) {
          case 'clicks':
            return b.uniqueClickCount - a.uniqueClickCount;
          case 'saves':
            return b.saveCount - a.saveCount;
          default:
            return b.performanceScore - a.performanceScore;
        }
      })
      .slice(0, 5);

    return enhancedJobs;
  }, [jobs, metricsMap, selectedMetric]);

  // Calculate platform-wide statistics
  const platformStats = useMemo(() => {
    // Count unique students who viewed jobs
    const uniqueViewers = new Set(
      analytics
        .filter(a => (a.event_type === 'view' || a.event_type === 'job_view') && a.user_id)
        .map(a => a.user_id)
    ).size;
    
    const totalViews = analytics.filter(a => a.event_type === 'view' || a.event_type === 'job_view').length;
    const totalClicks = linkClicks.length;
    const uniqueUsersClicking = new Set(linkClicks.map(c => c.user_id)).size;
    const totalSaves = savedJobs.filter(s => s.job_id !== null).length;
    const activeJobs = jobs.filter(j => j.status === 'active').length;
    
    const avgClickRate = uniqueViewers > 0 ? (uniqueUsersClicking / uniqueViewers) * 100 : 0;
    const avgSaveRate = uniqueViewers > 0 ? (totalSaves / uniqueViewers) * 100 : 0;
    
    return {
      totalViews,
      uniqueViewers,
      totalClicks,
      uniqueUsersClicking,
      totalSaves,
      activeJobs,
      avgClickRate: avgClickRate.toFixed(1),
      avgSaveRate: avgSaveRate.toFixed(1)
    };
  }, [analytics, linkClicks, savedJobs, jobs]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="text-center">Loading platform effectiveness data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Platform Effectiveness</h1>
          <p className="mt-2 text-gray-600">Track job performance and user engagement metrics</p>
        </div>

        {/* Platform Overview Stats */}
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-sm font-medium text-gray-500">Unique Students</div>
            <div className="mt-2 text-3xl font-bold text-gray-900">{platformStats.uniqueViewers}</div>
            <div className="mt-1 text-sm text-gray-500">viewed jobs</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-sm font-medium text-gray-500">Total Views</div>
            <div className="mt-2 text-3xl font-bold text-gray-900">{platformStats.totalViews.toLocaleString()}</div>
            <div className="mt-1 text-sm text-gray-500">{platformStats.activeJobs} active jobs</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-sm font-medium text-gray-500">Apply Clicks</div>
            <div className="mt-2 text-3xl font-bold text-gray-900">{platformStats.uniqueUsersClicking}</div>
            <div className="mt-1 text-sm text-green-600">{platformStats.avgClickRate}% conversion</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-sm font-medium text-gray-500">Jobs Saved</div>
            <div className="mt-2 text-3xl font-bold text-gray-900">{platformStats.totalSaves}</div>
            <div className="mt-1 text-sm text-blue-600">by students</div>
          </div>
        </div>

        {/* Top Performing Jobs */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">Top Performing Jobs</h2>
              <select
                value={selectedMetric}
                onChange={(e) => setSelectedMetric(e.target.value as 'engagement' | 'clicks' | 'saves')}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm"
              >
                <option value="engagement">By Overall Engagement</option>
                <option value="clicks">By Apply Clicks</option>
                <option value="saves">By Saves</option>
              </select>
            </div>
          </div>

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
                    Unique Views
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Apply Clicks
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Click Rate
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Saves
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Daily Engagement
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Days Active
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Score
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {topPerformingJobs.map((job, index) => (
                  <tr key={job.id} className={index === 0 ? 'bg-green-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {index === 0 && '🏆 '}
                          {job.title}
                        </div>
                        <div className="text-xs text-gray-500">
                          ID: {job.id.slice(0, 8)}...
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {job.company}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="text-sm font-medium text-gray-900">{job.viewCount}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div>
                        <span className="text-sm font-medium text-gray-900">{job.uniqueClickCount}</span>
                        <div className="text-xs text-gray-500">({job.clickCount} total)</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        parseFloat(job.clickThroughRate) > 10 
                          ? 'bg-green-100 text-green-800'
                          : parseFloat(job.clickThroughRate) > 5 
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {job.clickThroughRate}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="text-sm font-medium text-gray-900">{job.saveCount}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="text-sm font-medium text-gray-900">
                        {job.dailyEngagement.toFixed(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                      {job.daysActive}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="text-sm font-bold text-indigo-600">
                        {job.performanceScore.toFixed(0)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {topPerformingJobs.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No active jobs with engagement data yet.
            </div>
          )}
        </div>

        {/* Back to Admin Dashboard */}
        <div className="mt-8">
          <Link href="/admin/dashboard">
            <button className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors">
              ← Back to Admin Dashboard
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}