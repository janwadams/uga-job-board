// pages/api/admin/delete-user.ts
import { createClient } from '@supabase/supabase-js';
import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from '../../../utils/supabase-admin'; // You might need to create this helper

// IMPORTANT: This API route uses the SERVICE_ROLE_KEY for admin-level actions.
// It should be stored securely in your environment variables and NEVER exposed to the client.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // 1. Get the current admin user's session
    const session = await getSession(req);
    if (!session || session.user.app_metadata.user_role !== 'admin') {
      return res.status(401).json({ error: 'Unauthorized: Not an admin.' });
    }
    const adminEmail = session.user.email;
    
    // 2. Get the user ID to delete from the request body
    const { userIdToDelete } = req.body;
    if (!userIdToDelete) {
      return res.status(400).json({ error: 'User ID to delete is required.' });
    }

    // 3. Fetch the user's profile details from your 'profiles' table
    //    (Assuming your profiles table is named 'profiles')
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('first_name, last_name, company_name, role')
      .eq('id', userIdToDelete)
      .single();

    if (profileError || !userProfile) {
        // Even if a profile doesn't exist, we might still want to delete the auth user.
        // For now, we'll log it and continue.
        console.warn(`Could not find profile for user ${userIdToDelete}. Deleting auth user anyway.`);
    }

    // 4. Fetch the user's auth details (like email)
    const { data: { user: authUser }, error: authUserError } = await supabaseAdmin.auth.admin.getUserById(userIdToDelete);
    
    if (authUserError || !authUser) {
        return res.status(404).json({ error: `User with ID ${userIdToDelete} not found in auth.` });
    }

    // 5. Insert the user's data into the audit table
    const { error: auditError } = await supabaseAdmin
      .from('deleted_users_audit')
      .insert({
        user_id: authUser.id,
        email: authUser.email,
        role: userProfile?.role || 'unknown',
        first_name: userProfile?.first_name || null,
        last_name: userProfile?.last_name || null,
        company_name: userProfile?.company_name || null,
        deleted_by_admin_email: adminEmail
      });

    if (auditError) {
      console.error('Audit log error:', auditError);
      return res.status(500).json({ error: 'Failed to write to audit log. Aborting deletion.' });
    }

    // 6. If audit was successful, permanently delete the user
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userIdToDelete);

    if (deleteError) {
      console.error('Delete user error:', deleteError);
      // This is a tricky state: user is audited but not deleted. Manual intervention may be needed.
      return res.status(500).json({ error: 'Failed to delete user after auditing.' });
    }

    // 7. Success!
    res.status(200).json({ message: 'User successfully audited and deleted.' });

  } catch (error) {
    console.error('Unexpected error in delete-user API:', error);
    res.status(500).json({ error: 'An unexpected error occurred.' });
  }
}