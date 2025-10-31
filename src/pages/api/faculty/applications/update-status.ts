// pages/api/faculty/applications/update-status.ts
// secure api endpoint to update the status of a student application

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
  // only allow put requests
  if (req.method !== 'PUT') {
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

    // get application id and new status from request body
    const { applicationId, newStatus } = req.body;

    if (!applicationId || !newStatus) {
      return res.status(400).json({ error: 'application id and new status are required' });
    }

    // validate status value
    const validStatuses = ['applied', 'viewed', 'interview', 'hired', 'rejected'];
    if (!validStatuses.includes(newStatus)) {
      return res.status(400).json({ error: 'invalid status value' });
    }

    // fetch the application to verify it belongs to one of this faculty's jobs
    const { data: application, error: appError } = await supabase
      .from('job_applications')
      .select('job_id')
      .eq('id', applicationId)
      .single();

    if (appError || !application) {
      return res.status(404).json({ error: 'application not found' });
    }

    // verify the job belongs to this faculty member
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('created_by')
      .eq('id', application.job_id)
      .single();

    if (jobError || !job) {
      return res.status(404).json({ error: 'associated job not found' });
    }

    if (job.created_by !== user.id) {
      return res.status(403).json({ error: 'you do not have permission to update this application' });
    }

    // update the application status
    const { error: updateError } = await supabase
      .from('job_applications')
      .update({ status: newStatus })
      .eq('id', applicationId);

    if (updateError) {
      console.error('error updating application status:', updateError);
      return res.status(500).json({ error: 'failed to update application status' });
    }

    return res.status(200).json({ 
      message: 'application status updated successfully',
      newStatus 
    });

  } catch (error) {
    console.error('unexpected error in update application status api:', error);
    return res.status(500).json({ error: 'internal server error' });
  }
}
