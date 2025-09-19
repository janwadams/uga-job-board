// pages/api/admin/update-user-status.ts
import { createClient } from '@supabase/supabase-js';
import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from '../../../utils/supabase-admin'; // You might need this helper

// This API route must use the SERVICE_ROLE_KEY to perform admin actions.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // 1. Authenticate the admin making the request (CRITICAL SECURITY STEP)
    const session = await getSession(req, res);
    if (!session || session.user.app_metadata.user_role !== 'admin') {
      return res.status(401).json({ error: 'Unauthorized: Not an admin.' });
    }
    const adminEmail = session.user.email;

    // 2. Get data from the request body
    const { userId, isActive } = req.body;
    if (!userId || typeof isActive !== 'boolean') {
      return res.status(400).json({ error: 'User ID and isActive status are required.' });
    }
    
    // 3. Update the user's status in your 'user_roles' table
    //    ADJUSTED to match your file's table and column names.
    const { error: updateError } = await supabaseAdmin
      .from('user_roles') // Using your table name
      .update({ is_active: isActive })
      .eq('user_id', userId); // Using your column name

    if (updateError) {
      console.error('Error updating user status:', updateError);
      return res.status(500).json({ error: 'Failed to update user status.' });
    }

    // 4. NEW: Log this action to the audit table
    const actionTaken = isActive ? 'enabled' : 'disabled';

    const { error: auditError } = await supabaseAdmin
      .from('user_status_audit')
      .insert({
        user_id: userId,
        action: actionTaken,
        changed_by_admin_email: adminEmail,
      });
    
    if (auditError) {
        // The main action succeeded, but auditing failed.
        // Log this serious issue but don't fail the whole request.
        console.error('CRITICAL: Failed to write to user_status_audit log:', auditError);
    }

    // 5. Success!
    res.status(200).json({ message: 'User status updated and action logged.' });

  } catch (error) {
    console.error('Unexpected error in update-user-status API:', error);
    res.status(500).json({ error: 'An unexpected error occurred.' });
  }
}