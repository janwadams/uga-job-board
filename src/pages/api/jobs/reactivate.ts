// pages/api/jobs/reactivate.ts
// API endpoint to reactivate an archived job with a new deadline

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

  try {
    const { jobId, newDeadline, userId } = req.body;

    if (!jobId || !newDeadline || !userId) {
      return res.status(400).json({ error: 'Job ID, new deadline, and user ID are required' });
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(newDeadline)) {
      return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
    }

    // Validate date is in the future
    const selectedDate = new Date(newDeadline);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate <= today) {
      return res.status(400).json({ error: 'Deadline must be a future date' });
    }

    // Verify the job belongs to this user
    const { data: job, error: fetchError } = await supabaseAdmin
      .from('jobs')
      .select('created_by, status')
      .eq('id', jobId)
      .single();

    if (fetchError || !job) {
      console.error('Error fetching job:', fetchError);
      return res.status(404).json({ error: 'Job not found' });
    }

    if (job.created_by !== userId) {
      return res.status(403).json({ error: 'You do not have permission to reactivate this job' });
    }

    if (job.status !== 'archived') {
      return res.status(400).json({ error: 'Only archived jobs can be reactivated' });
    }

    // Reactivate the job
    const { error: updateError } = await supabaseAdmin
      .from('jobs')
      .update({ 
        deadline: newDeadline,
        status: 'active'
      })
      .eq('id', jobId);

    if (updateError) {
      console.error('Error reactivating job:', updateError);
      return res.status(500).json({ error: 'Failed to reactivate job' });
    }

    return res.status(200).json({ 
      success: true,
      message: 'Job reactivated successfully' 
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
