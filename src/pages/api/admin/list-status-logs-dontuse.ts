// pages/api/admin/list-status-logs.ts
import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabase = createServerSupabaseClient({ req, res });

  // Check if user is an admin
  const { data: { session } } = await supabase.auth.getSession();
  if (!session || session.user.app_metadata.user_role !== 'admin') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Fetch all records from the status audit table
  const { data, error } = await supabase
    .from('user_status_audit')
    .select('*')
    .order('changed_at', { ascending: false }); // Show most recent first

  if (error) {
    console.error('Error fetching status logs:', error);
    return res.status(500).json({ error: error.message });
  }

  res.status(200).json({ statusLogs: data });
}