// pages/api/admin/delete-users.ts
// WARNING: This version includes auditing but is INSECURE as it lacks an admin check.

import { createClient } from '@supabase/supabase-js';
import { NextApiRequest, NextApiResponse } from 'next';
// Note: We no longer need getSession since we are removing the security check.
// import { getSession } from '../../../utils/supabase-admin';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // SECURITY CHECK REMOVED: The following block that verified the admin role is gone.
    /*
    const session = await getSession(req, res);
    if (!session || session.user.app_metadata.user_role !== 'admin') {
      return res.status(401).json({ error: 'Unauthorized: Not an admin.' });
    }
    const adminEmail = session.user.email;
    */
    
    const { userIdToDelete } = req.body;
    if (!userIdToDelete) {
      return res.status(400).json({ error: 'User ID to delete is required.' });
    }

    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('user_roles')
      .select('first_name, last_name, company_name, role')
      .eq('user_id', userIdToDelete)
      .single();

    if (profileError) {
      console.warn(`Could not find profile for user ${userIdToDelete} in 'user_roles'.`, profileError);
    }

    const { data: { user: authUser }, error: authUserError } = await supabaseAdmin.auth.admin.getUserById(userIdToDelete);
    if (authUserError || !authUser) {
      return res.status(404).json({ error: `User with ID ${userIdToDelete} not found in auth.` });
    }

    // Insert the user's data into the audit table
    const { error: auditError } = await supabaseAdmin
      .from('deleted_users_audit')
      .insert({
        user_id: authUser.id,
        email: authUser.email,
        role: userProfile?.role || 'unknown',
        first_name: userProfile?.first_name || null,
        last_name: userProfile?.last_name || null,
        company_name: userProfile?.company_name || null,
        // Since we don't know who the admin is, we log it as unknown.
        deleted_by_admin_email: 'unknown (insecure endpoint)'
      });

    if (auditError) {
      console.error('Audit log error:', auditError);
      return res.status(500).json({ error: 'Failed to write to audit log. Aborting deletion.' });
    }

    if (userProfile) {
        const { error: deleteProfileError } = await supabaseAdmin
            .from('user_roles')
            .delete()
            .eq('user_id', userIdToDelete);

        if (deleteProfileError) {
            console.error('Failed to delete user from user_roles:', deleteProfileError);
            return res.status(500).json({ error: 'Audited user but failed to delete from user_roles.' });
        }
    }

    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(userIdToDelete);

    if (deleteAuthError) {
      console.error('Delete auth user error:', deleteAuthError);
      return res.status(500).json({ error: 'Failed to delete user from auth after deleting profile.' });
    }

    res.status(200).json({ message: 'User successfully audited and deleted from all tables.' });

  } catch (error) {
    console.error('Unexpected error in delete-user API:', error);
    res.status(500).json({ error: 'An unexpected error occurred.' });
  }
}