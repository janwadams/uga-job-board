// pages/api/rep/jobs/create.ts
// secure api endpoint to create a new job posting by company rep
// rep jobs start in pending status and require admin approval

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
  // only allow post requests
  if (req.method !== 'POST') {
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

    // verify user has rep role
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleError || roleData?.role !== 'rep') {
      return res.status(403).json({ error: 'user does not have rep permissions' });
    }

    // get job data from request body
    const {
      title,
      company,
      industry,
      job_type,
      location,
      salary_range,
      description,
      requirements,
      skills,
      deadline,
      apply_method
    } = req.body;

    // validate required fields
    if (!title || !company || !industry || !job_type || !description || !deadline) {
      return res.status(400).json({ error: 'missing required fields' });
    }

    // validate deadline is in the future
    const deadlineDate = new Date(deadline);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (deadlineDate <= today) {
      return res.status(400).json({ error: 'deadline must be in the future' });
    }

    // create the job posting with pending status for admin approval
    const { data: newJob, error: createError } = await supabase
      .from('jobs')
      .insert([{
        title,
        company,
        industry,
        job_type,
        location: location || null,
        salary_range: salary_range || null,
        description,
        requirements: requirements || null,
        skills: skills || null,
        deadline,
        apply_method: apply_method || null,
        created_by: user.id,
        status: 'pending'
      }])
      .select()
      .single();

    if (createError) {
      console.error('error creating job:', createError);
      return res.status(500).json({ error: 'failed to create job posting' });
    }

    return res.status(201).json({ 
      message: 'job created successfully and is pending admin approval',
      job: newJob 
    });

  } catch (error) {
    console.error('unexpected error in create job api:', error);
    return res.status(500).json({ error: 'internal server error' });
  }
}
