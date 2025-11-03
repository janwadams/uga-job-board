// pages/api/faculty/link-clicks-count.ts
// secure api endpoint to get total link clicks count for all faculty's jobs

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

    // get all jobs by this faculty member
    const { data: jobs, error: jobsError } = await supabase
      .from('jobs')
      .select('id')
      .eq('created_by', user.id);

    if (jobsError) {
      console.error('error fetching jobs:', jobsError);
      return res.status(500).json({ error: 'failed to fetch jobs' });
    }

    if (!jobs || jobs.length === 0) {
      return res.status(200).json({ count: 0 });
    }

    // count link clicks for these specific jobs only
    const jobIds = jobs.map(job => job.id);
    const { count, error: countError } = await supabase
      .from('link_clicks')
      .select('*', { count: 'exact', head: true })
      .in('job_id', jobIds);

    if (countError) {
      console.error('error counting clicks:', countError);
      return res.status(500).json({ error: 'failed to count link clicks' });
    }

    return res.status(200).json({ count: count || 0 });

  } catch (error) {
    console.error('unexpected error in link clicks count api:', error);
    return res.status(500).json({ error: 'internal server error' });
  }
}
