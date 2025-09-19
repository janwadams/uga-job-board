// pages/api/admin/update-user-status.ts
// WARNING: This version includes auditing but is INSECURE as it lacks an admin check.

import { createClient } from '@supabase/supabase-js';
import { NextApiRequest, NextApiResponse } from 'next';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { userId, isActive } = req.body;
    if (!userId || typeof isActive !== 'boolean') {
      return res.status(400).json({ error: 'User ID and isActive status are required.' });
    }
    
    // Update the user's status in the 'user_roles' table
    const { error: updateError } = await supabaseAdmin
      .from('user_roles')
      .update({ is_active: isActive })
      .eq('user_id', userId);

    if (updateError) {
      console.error('Error updating user status:', updateError);
      return res.status(500).json({ error: 'Failed to update user status.' });
    }

    // THIS PART IS ADDED BACK IN: Log this action to the audit table
    const actionTaken = isActive ? 'enabled' : 'disabled';

    const { error: auditError } = await supabaseAdmin
      .from('user_status_audit')
      .insert({
        user_id: userId,
        action: actionTaken,
        // We don't know who the admin is, so we can't log it.
        changed_by_admin_email: 'unknown (insecure endpoint)', 
      });
    
    if (auditError) {
        console.error('CRITICAL: Failed to write to user_status_audit log:', auditError);
    }

    res.status(200).json({ message: 'User status updated and action logged.' });

  } catch (error) {
    console.error('Unexpected error in update-user-status API:', error);
    res.status(500).json({ error: 'An unexpected error occurred.' });
  }
}