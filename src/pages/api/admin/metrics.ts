import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const [{ data: jobs, error: jobsError }, { data: analytics, error: analyticsError }] = await Promise.all([
      supabaseAdmin
        .from('jobs')
        .select('*'),
      supabaseAdmin
        .from('job_analytics')
        .select('*')
    ]);

    if (jobsError || analyticsError) {
      console.error('Error fetching data:', jobsError || analyticsError);
      return res.status(500).json({ error: 'Failed to fetch job data.' });
    }

    const totalPostings = jobs?.length || 0;
    const activePostings = jobs?.filter(job => job.status === 'active').length || 0;

    // Aggregate analytics data for real-time counts
    const jobViewsMap = analytics?.reduce((acc: any, item: any) => {
      acc[item.job_id] = acc[item.job_id] || { views: 0, apply_clicks: 0 };
      if (item.event_type === 'view') {
        acc[item.job_id].views++;
      } else if (item.event_type === 'apply_click') {
        acc[item.job_id].apply_clicks++;
      }
      return acc;
    }, {});

    // Calculate top companies by engagement (views + clicks)
    const companyEngagementMap = jobs?.reduce((acc: any, job: any) => {
      const jobAnalytics = jobViewsMap[job.id] || { views: 0, apply_clicks: 0 };
      acc[job.company] = acc[job.company] || { views: 0, apply_clicks: 0, total_engagement: 0 };
      acc[job.company].views += jobAnalytics.views;
      acc[job.company].apply_clicks += jobAnalytics.apply_clicks;
      acc[job.company].total_engagement = acc[job.company].views + acc[job.company].apply_clicks;
      return acc;
    }, {});

    const topCompanies = Object.keys(companyEngagementMap).sort((a, b) =>
      companyEngagementMap[b].total_engagement - companyEngagementMap[a].total_engagement
    ).map(company => ({
      company: company,
      views: companyEngagementMap[company].views,
      apply_clicks: companyEngagementMap[company].apply_clicks,
    }));

    // Generate time-series data (this will be more complex to fully implement
    // but this gives you a real-time snapshot)
    const timeSeriesData = [{
      date: new Date().toISOString().split('T')[0],
      total_postings: totalPostings,
      active_postings: activePostings,
      views: analytics?.filter(item => item.event_type === 'view').length || 0,
      apply_clicks: analytics?.filter(item => item.event_type === 'apply_click').length || 0,
    }];
    
    res.status(200).json({
      total_postings: totalPostings,
      active_postings: activePostings,
      time_series: timeSeriesData,
      top_companies: topCompanies,
    });

  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}