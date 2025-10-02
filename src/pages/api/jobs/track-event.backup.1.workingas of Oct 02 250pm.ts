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

  const { jobId, eventType } = req.body;

  if (!jobId || !eventType) {
    return res.status(400).json({ error: 'Job ID and event type are required.' });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('job_analytics')
      .insert([{ job_id: jobId, event_type: eventType }]);

    if (error) {
      console.error('Error inserting event:', error);
      return res.status(500).json({ error: 'Failed to insert event.' });
    }

    return res.status(200).json({ message: 'Event tracked successfully.', data });
  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}