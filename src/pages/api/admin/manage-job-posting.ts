// /src/pages/api/admin/manage-job-posting.ts
// api endpoint for admin to update job status (approve, reject, remove)
// includes rejection note handling for rejected jobs

import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

// create admin client with service role key for full access
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // only allow post requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // get the job id, new status, and optional rejection note from request
    const { jobId, status, rejectionNote } = req.body;

    // make sure we have required fields
    if (!jobId || !status) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // validate status is one of the allowed values
    const allowedStatuses = ['active', 'pending', 'removed', 'rejected'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }

    // prepare the update data
    const updateData: any = { status };

    // if rejecting a job and a note was provided, add it to the update
    if (status === 'rejected' && rejectionNote && rejectionNote.trim() !== '') {
      updateData.rejection_note = rejectionNote.trim();
    }

    // if changing to a different status (like approving), clear any old rejection note
    if (status !== 'rejected') {
      updateData.rejection_note = null;
    }

    // update the job in the database
    const { data, error } = await supabaseAdmin
      .from('jobs')
      .update(updateData)
      .eq('id', jobId)
      .select()
      .single();

    if (error) {
      console.error('Error updating job status:', error);
      return res.status(500).json({ error: 'Failed to update job status' });
    }

    // if job was rejected, we could optionally send an email notification here
    // for now, we'll just log it
    if (status === 'rejected') {
      console.log(`Job ${jobId} was rejected with note: ${rejectionNote || 'No note provided'}`);
      
      // optional: fetch user email and send notification
      // const { data: jobData } = await supabaseAdmin
      //   .from('jobs')
      //   .select('created_by')
      //   .eq('id', jobId)
      //   .single();
      
      // if (jobData) {
      //   // send email to jobData.created_by
      // }
    }

    // return success response with updated job data
    return res.status(200).json({ 
      message: 'Job status updated successfully',
      job: data 
    });

  } catch (error) {
    console.error('Unexpected error in manage-job-posting:', error);
    return res.status(500).json({ error: 'An unexpected error occurred' });
  }
}