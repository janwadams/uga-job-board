// pages/api/faculty/analytics-detailed.ts
// comprehensive analytics endpoint for the detailed analytics page

import { createClient } from '@supabase/supabase-js';
import type { NextApiRequest, NextApiResponse } from 'next';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
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
      .select('role, first_name, last_name')
      .eq('user_id', user.id)
      .single();

    if (roleError || roleData?.role !== 'faculty') {
      return res.status(403).json({ error: 'user does not have faculty permissions' });
    }

    // get date range from query (defaults to 30 days)
    const { days = '30' } = req.query;

    // fetch all jobs created by this faculty member with link clicks and views
    const { data: jobs, error: jobsError } = await supabase
      .from('jobs')
      .select('*')
      .eq('created_by', user.id);

    if (jobsError) {
      console.error('error fetching jobs:', jobsError);
      return res.status(500).json({ error: 'failed to fetch jobs' });
    }

    // if no jobs, return empty data
    if (!jobs || jobs.length === 0) {
      return res.status(200).json({
        facultyName: `${roleData.first_name || ''} ${roleData.last_name || ''}`.trim() || 'faculty member',
        jobs: [],
        linkClicks: [],
        views: []
      });
    }

    const jobIds = jobs.map(j => j.id);

    // fetch link clicks for these jobs from the job_link_clicks table
    const { data: linkClicks, error: clicksError } = await supabase
      .from('job_link_clicks')
      .select('*')
      .in('job_id', jobIds);

    if (clicksError) {
      console.error('error fetching link clicks:', clicksError);
    }

    // fetch views for these jobs
    const { data: views, error: viewsError } = await supabase
      .from('job_views')
      .select('*')
      .in('job_id', jobIds);

    if (viewsError) {
      console.error('error fetching views:', viewsError);
    }

    // return all the raw data for frontend processing
    return res.status(200).json({
      facultyName: `${roleData.first_name || ''} ${roleData.last_name || ''}`.trim() || 'faculty member',
      jobs: jobs || [],
      linkClicks: linkClicks || [],
      views: views || []
    });

  } catch (error) {
    console.error('unexpected error in detailed analytics api:', error);
    return res.status(500).json({ error: 'internal server error' });
  }
}
