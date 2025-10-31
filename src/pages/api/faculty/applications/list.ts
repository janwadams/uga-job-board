// pages/api/faculty/applications/list.ts
// secure api endpoint to fetch all student applications for faculty's jobs

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
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleError || roleData?.role !== 'faculty') {
      return res.status(403).json({ error: 'user does not have faculty permissions' });
    }

    // get all jobs by this faculty member
    const { data: jobs, error: jobsError } = await supabase
      .from('jobs')
      .select('*')
      .eq('created_by', user.id)
      .order('created_at', { ascending: false });

    if (jobsError) {
      console.error('error fetching jobs:', jobsError);
      return res.status(500).json({ error: 'failed to fetch jobs' });
    }

    if (!jobs || jobs.length === 0) {
      return res.status(200).json({ jobsWithApplications: [] });
    }

    // get job ids
    const jobIds = jobs.map(j => j.id);

    // fetch all applications for these jobs
    const { data: applications, error: appsError } = await supabase
      .from('job_applications')
      .select('*')
      .in('job_id', jobIds)
      .order('applied_at', { ascending: false });

    if (appsError) {
      console.error('error fetching applications:', appsError);
      return res.status(500).json({ error: 'failed to fetch applications' });
    }

    // organize applications by job id
    const applicationsByJobId: { [key: string]: any[] } = {};
    
    applications?.forEach(app => {
      if (!applicationsByJobId[app.job_id]) {
        applicationsByJobId[app.job_id] = [];
      }
      applicationsByJobId[app.job_id].push(app);
    });

    // combine jobs with their applications
    const jobsWithApplications = jobs.map(job => ({
      job,
      applications: applicationsByJobId[job.id] || []
    }));

    return res.status(200).json({ jobsWithApplications });

  } catch (error) {
    console.error('unexpected error in applications list api:', error);
    return res.status(500).json({ error: 'internal server error' });
  }
}
