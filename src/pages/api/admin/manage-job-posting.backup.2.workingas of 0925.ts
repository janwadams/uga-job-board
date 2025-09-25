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

  const { jobId, status, rejectionNote } = req.body;

  if (!jobId || !status) {
    return res.status(400).json({ error: 'Job ID and new status are required.' });
  }

  const updateData: { status: string; rejection_note?: string } = { status: status };
  if (status === 'rejected' && rejectionNote) {
    updateData.rejection_note = rejectionNote;
  }

  // ADDED: Log the data we are about to send to the database
  console.log('[Manage Job Posting API] Attempting update:', { updateData, jobId });

  try {
    const { error } = await supabaseAdmin
      .from('jobs')
      .update(updateData)
      .eq('id', jobId);

    if (error) {
      console.error('Error updating job status:', error);
      return res.status(500).json({ error: 'Failed to update job status.' });
    }

    return res.status(200).json({ message: 'Job status updated successfully.' });
  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}