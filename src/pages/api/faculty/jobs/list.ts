// pages/api/faculty/jobs/list.ts
// secure api endpoint to fetch all jobs created by the logged-in faculty member

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
    // get the authorization header (contains the session token)
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'no authorization token provided' });
    }

    // extract the token from "Bearer <token>"
    const token = authHeader.replace('Bearer ', '');

    // verify the user's session using the token
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

    // get query parameters for filtering
    const { status, archived } = req.query;

    // build the query based on parameters
    let query = supabase
      .from('jobs')
      .select('*')
      .eq('created_by', user.id)
      .order('created_at', { ascending: false });

    // filter by archived status (based on deadline)
    if (archived === 'true') {
      // get jobs where deadline has passed
      query = query.lt('deadline', new Date().toISOString().split('T')[0]);
    } else if (archived === 'false') {
      // get jobs where deadline is in the future
      query = query.gte('deadline', new Date().toISOString().split('T')[0]);
    }

    // filter by status if provided
    if (status && typeof status === 'string') {
      query = query.eq('status', status);
    }

    const { data: jobs, error: jobsError } = await query;

    if (jobsError) {
      console.error('error fetching jobs:', jobsError);
      return res.status(500).json({ error: 'failed to fetch jobs' });
    }

    // return the jobs list
    return res.status(200).json({ jobs });

  } catch (error) {
    console.error('unexpected error in jobs list api:', error);
    return res.status(500).json({ error: 'internal server error' });
  }
}
