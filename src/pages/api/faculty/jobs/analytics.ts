// pages/api/faculty/analytics.ts
// secure api endpoint to fetch analytics data for faculty member's jobs

import { createClient } from '@supabase/supabase-js';
import type { NextApiRequest, NextApiResponse } from 'next';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // only allow get requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'method not allowed' });
  }

  try {
    // get the authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'no authorization token provided' });
    }

    const token = authHeader.replace('Bearer ', '');

    // verify the user's session
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return res.status(401).json({ error: 'invalid or expired token' });
    }

    // verify user has faculty role
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleError || roleData?.role !== 'faculty') {
      return res.status(403).json({ error: 'user does not have faculty permissions' });
    }

    // get date range from query (defaults to 30 days)
    const { days = '30' } = req.query;
    const daysAgo = parseInt(days as string);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysAgo);

    // fetch all jobs for this faculty member
    const { data: jobsData, error: jobsError } = await supabase
      .from('jobs')
      .select('*')
      .eq('created_by', user.id);

    if (jobsError) {
      console.error('error fetching jobs:', jobsError);
      return res.status(500).json({ error: 'failed to fetch jobs' });
    }

    const jobIds = jobsData?.map(j => j.id) || [];

    // if no jobs, return empty analytics
    if (jobIds.length === 0) {
      return res.status(200).json({
        overview: {
          totalJobs: 0,
          totalLinkClicks: 0,
          averageClicksPerJob: '0',
          totalViews: 0,
          engagementRate: '0',
          activeJobs: 0,
          expiredJobs: 0,
          averageDaysToClick: '0'
        },
        trends: [],
        topJobs: []
      });
    }

    // fetch link clicks data
    const { data: clicksData, error: clicksError } = await supabase
      .from('link_clicks')
      .select('*')
      .in('job_id', jobIds)
      .gte('clicked_at', startDate.toISOString());

    if (clicksError) {
      console.error('error fetching clicks:', clicksError);
    }

    // fetch views data
    const { data: viewsData, error: viewsError } = await supabase
      .from('job_views')
      .select('*')
      .in('job_id', jobIds)
      .gte('viewed_at', startDate.toISOString());

    if (viewsError) {
      console.error('error fetching views:', viewsError);
    }

    // calculate overview metrics
    const totalClicks = clicksData?.length || 0;
    const totalViews = viewsData?.length || 0;
    const activeJobs = jobsData?.filter(j => 
      j.status === 'active' && new Date(j.deadline) >= new Date()
    ).length || 0;
    const expiredJobs = jobsData?.filter(j => 
      new Date(j.deadline) < new Date()
    ).length || 0;

    // calculate average days to click
    let totalDaysToClick = 0;
    let clicksWithDays = 0;

    clicksData?.forEach(click => {
      const job = jobsData?.find(j => j.id === click.job_id);
      if (job) {
        const jobCreated = new Date(job.created_at);
        const clickDate = new Date(click.clicked_at);
        const daysDiff = Math.floor((clickDate.getTime() - jobCreated.getTime()) / (1000 * 60 * 60 * 24));
        totalDaysToClick += daysDiff;
        clicksWithDays++;
      }
    });

    const avgDaysToClick = clicksWithDays > 0 
      ? (totalDaysToClick / clicksWithDays).toFixed(1) 
      : '0';

    // build overview object
    const overview = {
      totalJobs: jobsData?.length || 0,
      totalLinkClicks: totalClicks,
      averageClicksPerJob: jobsData && jobsData.length > 0 
        ? (totalClicks / jobsData.length).toFixed(1) 
        : '0',
      totalViews: totalViews,
      engagementRate: totalViews > 0 
        ? ((totalClicks / totalViews) * 100).toFixed(1) 
        : '0',
      activeJobs,
      expiredJobs,
      averageDaysToClick: avgDaysToClick
    };

    // generate trend data
    const trends = [];
    for (let i = daysAgo - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const dayClicks = clicksData?.filter(c => 
        c.clicked_at.startsWith(dateStr)
      ).length || 0;

      const dayViews = viewsData?.filter(v => 
        v.viewed_at.startsWith(dateStr)
      ).length || 0;

      trends.push({
        date: `${date.getMonth() + 1}/${date.getDate()}`,
        clicks: dayClicks,
        views: dayViews
      });
    }

    // calculate top performing jobs
    const jobPerformance = jobIds.map(jobId => {
      const job = jobsData?.find(j => j.id === jobId);
      const clicks = clicksData?.filter(c => c.job_id === jobId).length || 0;
      const views = viewsData?.filter(v => v.job_id === jobId).length || 0;
      
      const daysActive = Math.floor(
        (new Date().getTime() - new Date(job?.created_at || 0).getTime()) / (1000 * 60 * 60 * 24)
      );

      return {
        id: jobId,
        title: job?.title || '',
        company: job?.company || '',
        clicks,
        views,
        engagementRate: views > 0 ? ((clicks / views) * 100).toFixed(1) : '0',
        status: job?.status || '',
        daysActive
      };
    });

    // sort by clicks and take top 5
    const topJobs = jobPerformance
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 5);

    return res.status(200).json({
      overview,
      trends,
      topJobs
    });

  } catch (error) {
    console.error('unexpected error in analytics api:', error);
    return res.status(500).json({ error: 'internal server error' });
  }
}
