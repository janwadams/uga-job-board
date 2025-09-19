// pages/api/admin/update-user-status.ts
// FINAL SECURE VERSION: Uses Supabase's ban feature AND updates the local is_active flag.

import { createClient } from '@supabase/supabase-js';
import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from '../../../utils/supabase-admin';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // We are using the secure version with the admin check.
    const session = await getSession(req, res);
    if (!session || session.user.app_metadata.user_role !== 'admin') {
      return res.status(401).json({ error: 'Unauthorized: Not an admin.' });
    }

    const { userId, isActive } = req.body;
    if (!userId || typeof isActive !== 'boolean') {
      return res.status(400).json({ error: 'User ID and isActive status are required.' });
    }
    
    // Step 1: Update the user in Supabase's auth system to actually prevent login.
    // To disable, we ban them. To enable, we set the ban duration to 'none'.
    const { error: banError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { ban_duration: isActive ? 'none' : '100y' } // '100y' is effectively a permanent ban
    );

    if (banError) {
        console.error('Error banning/unbanning user:', banError);
        return res.status(500).json({ error: 'Failed to update user auth status.' });
    }

    // Step 2: Update your user_roles table to keep your UI consistent.
    const { error: updateError } = await supabaseAdmin
      .from('user_roles')
      .update({ is_active: isActive })
      .eq('user_id', userId);

    if (updateError) {
      console.error('Error updating is_active flag:', updateError);
      return res.status(500).json({ error: 'Failed to update user is_active flag.' });
    }
    
    // (Optional but recommended) We can also add this to your status audit log.
    const actionTaken = isActive ? 'enabled' : 'disabled';
    await supabaseAdmin.from('user_status_audit').insert({
      user_id: userId,
      action: actionTaken,
      changed_by__admin_email: session.user.email,
    });

    res.status(200).json({ message: 'User status updated and synced with auth system.' });

  } catch (error) {
    console.error('Unexpected error in update-user-status API:', error);
    res.status(500).json({ error: 'An unexpected error occurred.' });
  }
}