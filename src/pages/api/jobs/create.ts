import { NextApiRequest, NextApiResponse } from 'next';
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  // Use the correct function to create the server-side client
  const supabase = createPagesServerClient({
    req,
    res,
  });

  // Get the authenticated user's session
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  console.log('API Route Session:', session);
  console.log('API Route Session Error:', sessionError);

  if (sessionError || !session) {
    return res.status(401).json({ message: 'Unauthorized. Please log in.' });
  }

  // Get the user's role from your custom `user_roles` table
  const { data: roleData, error: roleError } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', session.user.id)
    .single();

  if (roleError || !roleData || !['rep', 'faculty', 'staff'].includes(roleData.role)) {
    console.error('Role check failed:', roleError?.message || 'Role is not authorized');
    return res.status(403).json({ message: 'Forbidden. Your role cannot create job postings.' });
  }

  console.log('Attempting to create a job...'); // New console.log statement

  // Extract the job data from the request body
  const {
    title,
    company,
    industry,
    job_type,
    description,
    skills,
    deadline,
    apply_method,
    status,
  } = req.body;

  // Perform the insertion into the jobs table
  const { data, error } = await supabase
    .from('jobs')
    .insert({
      title,
      company,
      industry,
      job_type,
      description,
      skills,
      deadline,
      apply_method: apply_method, // Note: apply_method is a jsonb column
      created_by: session.user.id, // Use the server's session user ID for security
      status,
    })
    .select();

  if (error) {
    console.error('Supabase insert error:', error.message);
    return res.status(500).json({ message: 'Failed to create job posting.', details: error.message });
  }

  return res.status(200).json({
    message: 'Job created successfully',
    jobId: data[0].id,
    job: data[0],
  });
}
