// pages/api/jobs/track-click.ts
// this endpoint tracks when a student clicks on a job link
// it records the click in the job_link_clicks table so faculty and reps can see analytics

import { createClient } from '@supabase/supabase-js';
import type { NextApiRequest, NextApiResponse } from 'next';

// use service role key to bypass rls policies on the server
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // only accept post requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method not allowed' });
  }

  try {
    // get the authorization token from the request header
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'no authorization token provided' });
    }

    // extract the token
    const token = authHeader.replace('Bearer ', '');
    
    // verify the user is logged in by checking their session token
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return res.status(401).json({ error: 'invalid or expired token' });
    }

    // get the job id from the request body
    const { job_id } = req.body;

    if (!job_id) {
      return res.status(400).json({ error: 'job_id is required' });
    }

    // insert or update the click record in the database
    // if the user already clicked this job, it updates the timestamp
    // if it's a new click, it creates a new record
    const { error } = await supabase
      .from('job_link_clicks')
      .upsert({
        job_id,
        user_id: user.id,
        clicked_at: new Date().toISOString()
      }, {
        onConflict: 'job_id,user_id'
      });

    if (error) {
      console.error('error tracking click:', error);
      return res.status(500).json({ error: 'failed to track click' });
    }

    return res.status(200).json({ success: true });

  } catch (error) {
    console.error('unexpected error:', error);
    return res.status(500).json({ error: 'internal server error' });
  }
}
