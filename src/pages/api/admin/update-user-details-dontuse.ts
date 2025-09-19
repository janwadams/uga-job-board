// pages/api/admin/update-user-details.ts
// FINAL SECURE VERSION: Adds an admin security check.

import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { getSession } from '../../../utils/supabase-admin'; // Import the security helper

// Initialize the Supabase Admin client with the service role key to bypass RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // ADDED: Security check to ensure only admins can perform this action.
  const session = await getSession(req, res);
  if (!session || session.user.app_metadata.user_role !== 'admin') {
    return res.status(401).json({ error: 'Unauthorized: Not an admin.' });
  }

  const { user_id, first_name, last_name, company_name } = req.body;

  if (!user_id || !first_name || !last_name) {
    return res.status(400).json({ error: 'User ID, first name, and last name are required.' });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('user_roles')
      .update({
        first_name,
        last_name,
        // Only update company_name if it's provided (it will be null for non-reps)
        company_name: company_name || null,
      })
      .eq('user_id', user_id);

    if (error) {
      console.error('Error updating user details:', error);
      return res.status(500).json({ error: 'Failed to update user details in the database.' });
    }

    return res.status(200).json({ message: 'User details updated successfully.' });

  } catch (error) {
    console.error('Server error in update-user-details:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}