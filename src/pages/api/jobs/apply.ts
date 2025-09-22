import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log('Apply endpoint called with:', req.body);

  const { jobId, userId } = req.body;

  if (!jobId || !userId) {
    return res.status(400).json({ error: 'Job ID and User ID are required' });
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

    // Check if user has already applied
    const { data: existingApplication } = await supabaseAdmin
      .from('job_applications')
      .select('id')
      .eq('job_id', jobId)
      .eq('student_id', userId)
      .single();

    if (existingApplication) {
      return res.status(400).json({ error: 'You have already applied to this job' });
    }

    // Create application
    const { data: application, error: applicationError } = await supabaseAdmin
      .from('job_applications')
      .insert([{
        job_id: jobId,
        student_id: userId,
        status: 'applied'
      }])
      .select()
      .single();

    if (applicationError) {
      console.error('Application creation error:', applicationError);
      return res.status(500).json({ error: 'Failed to submit application: ' + applicationError.message });
    }

    // Track analytics event
    await supabaseAdmin
      .from('job_analytics')
      .insert([{
        job_id: jobId,
        event_type: 'apply_click',
        user_id: userId
      }]);

    console.log('Application created successfully');
    return res.status(200).json({ 
      message: 'Application submitted successfully',
      application 
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}