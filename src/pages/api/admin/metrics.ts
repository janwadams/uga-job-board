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
    // We are not tracking views or apply clicks, so we will use placeholder data for now.
    // The query is to fetch all jobs.
    const { data: jobs, error: jobsError } = await supabaseAdmin
      .from('jobs')
      .select('*');

    if (jobsError) {
      console.error('Error fetching jobs:', jobsError);
      return res.status(500).json({ error: 'Failed to fetch job data.' });
    }

    const totalPostings = jobs?.length || 0;
    const activePostings = jobs?.filter(job => job.status === 'active').length || 0;

    // Placeholder data for time-series and engagement
    const timeSeriesData = [
      { date: '2025-08-01', total_postings: 5, active_postings: 3, views: 250, apply_clicks: 10 },
      { date: '2025-08-08', total_postings: 7, active_postings: 5, views: 400, apply_clicks: 15 },
      { date: '2025-08-15', total_postings: 12, active_postings: 10, views: 800, apply_clicks: 25 },
      { date: '2025-08-22', total_postings: 15, active_postings: 12, views: 1100, apply_clicks: 35 },
      { date: '2025-08-29', total_postings: totalPostings, active_postings: activePostings, views: 1400, apply_clicks: 45 },
    ];

    const topCompanies = [
      { company: 'Google', views: 500, apply_clicks: 20 },
      { company: 'Microsoft', views: 300, apply_clicks: 10 },
      { company: 'Amazon', views: 250, apply_clicks: 8 },
      { company: 'Test Company', views: 50, apply_clicks: 2 },
    ];

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