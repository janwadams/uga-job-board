// pages/api/faculty/jobs/[id].ts
// secure api endpoint to get, update, or delete a specific job

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

    // get job id from url
    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'invalid job id' });
    }

    // handle different http methods
    switch (req.method) {
      case 'GET':
        return await handleGet(id, user.id, res);
      case 'PUT':
        return await handleUpdate(id, user.id, req.body, res);
      case 'DELETE':
        return await handleDelete(id, user.id, res);
      default:
        return res.status(405).json({ error: 'method not allowed' });
    }

  } catch (error) {
    console.error('unexpected error in job api:', error);
    return res.status(500).json({ error: 'internal server error' });
  }
}

// get a single job
async function handleGet(jobId: string, userId: string, res: NextApiResponse) {
  const { data: job, error } = await supabase
    .from('jobs')
    .select('*')
    .eq('id', jobId)
    .single();

  if (error) {
    return res.status(404).json({ error: 'job not found' });
  }

  // verify the user owns this job
  if (job.created_by !== userId) {
    return res.status(403).json({ error: 'you do not have permission to view this job' });
  }

  return res.status(200).json({ job });
}

// update a job
async function handleUpdate(jobId: string, userId: string, updateData: any, res: NextApiResponse) {
  // first verify the user owns this job
  const { data: existingJob, error: fetchError } = await supabase
    .from('jobs')
    .select('created_by')
    .eq('id', jobId)
    .single();

  if (fetchError || !existingJob) {
    return res.status(404).json({ error: 'job not found' });
  }

  if (existingJob.created_by !== userId) {
    return res.status(403).json({ error: 'you do not have permission to update this job' });
  }

  // validate deadline if provided
  if (updateData.deadline) {
    const deadlineDate = new Date(updateData.deadline);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (deadlineDate <= today) {
      return res.status(400).json({ error: 'deadline must be in the future' });
    }
  }

  // update the job
  const { data: updatedJob, error: updateError } = await supabase
    .from('jobs')
    .update(updateData)
    .eq('id', jobId)
    .select()
    .single();

  if (updateError) {
    console.error('error updating job:', updateError);
    return res.status(500).json({ error: 'failed to update job' });
  }

  return res.status(200).json({ 
    message: 'job updated successfully',
    job: updatedJob 
  });
}

// delete a job
async function handleDelete(jobId: string, userId: string, res: NextApiResponse) {
  // first verify the user owns this job
  const { data: existingJob, error: fetchError } = await supabase
    .from('jobs')
    .select('created_by')
    .eq('id', jobId)
    .single();

  if (fetchError || !existingJob) {
    return res.status(404).json({ error: 'job not found' });
  }

  if (existingJob.created_by !== userId) {
    return res.status(403).json({ error: 'you do not have permission to delete this job' });
  }

  // delete the job
  const { error: deleteError } = await supabase
    .from('jobs')
    .delete()
    .eq('id', jobId);

  if (deleteError) {
    console.error('error deleting job:', deleteError);
    return res.status(500).json({ error: 'failed to delete job' });
  }

  return res.status(200).json({ message: 'job deleted successfully' });
}
