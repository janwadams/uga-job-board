import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { data: jobs, error } = await supabaseAdmin
      .from('jobs')
      .select('id, title, company, status, created_at');

    if (error) {
      console.error('Error fetching pending jobs:', error);
      return res.status(500).json({ error: 'Failed to fetch pending jobs.' });
    }
    
    const pendingJobs = jobs?.filter(job => job.status === 'pending');

    return res.status(200).json({ jobs: pendingJobs });
  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}