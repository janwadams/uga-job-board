//api/jobs/apply.ts

import { NextApiRequest, NextApiResponse } from 'next';
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify user is authenticated
  const supabase = createPagesServerClient({ req, res });
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Check if user is a student
  const { data: userData, error: userError } = await supabaseAdmin
    .from('user_roles')
    .select('role')
    .eq('user_id', session.user.id)
    .single();

  if (userError || !userData || userData.role !== 'student') {
    return res.status(403).json({ error: 'Only students can apply to jobs' });
  }

  const { jobId } = req.body;

  if (!jobId) {
    return res.status(400).json({ error: 'Job ID is required' });
  }

  try {
    // Check if job exists and is active
    const { data: job, error: jobError } = await supabaseAdmin
      .from('jobs')
      .select('id, title, company, status, deadline')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (job.status !== 'active') {
      return res.status(400).json({ error: 'Job is no longer accepting applications' });
    }

    // Check if deadline has passed
    const deadline = new Date(job.deadline);
    const now = new Date();
    if (deadline < now) {
      return res.status(400).json({ error: 'Application deadline has passed' });
    }

    // Check if student has already applied
    const { data: existingApplication } = await supabaseAdmin
      .from('job_applications')
      .select('id')
      .eq('job_id', jobId)
      .eq('student_id', session.user.id)
      .single();

    if (existingApplication) {
      return res.status(400).json({ error: 'You have already applied to this job' });
    }

    // Create application
    const { data: application, error: applicationError } = await supabaseAdmin
      .from('job_applications')
      .insert([{
        job_id: jobId,
        student_id: session.user.id,
        status: 'applied'
      }])
      .select()
      .single();

    if (applicationError) {
      console.error('Application creation error:', applicationError);
      return res.status(500).json({ error: 'Failed to submit application' });
    }

    // Track analytics event
    await supabaseAdmin
      .from('job_analytics')
      .insert([{
        job_id: jobId,
        event_type: 'apply_click',
        user_id: session.user.id
      }]);

    return res.status(200).json({ 
      message: 'Application submitted successfully',
      application 
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
