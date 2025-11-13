//    /pages/api/admin/delete-user.ts

import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Admin Client for server-side operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// UUID for a "System Deleted User" - 
// This is a placeholder account that will own all orphaned content
//18aeff56-775f-49e7-b351-28c7e80ec3c8
const DELETED_USER_ID = '18aeff56-775f-49e7-b351-28c7e80ec3c8';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { userToDelete, adminEmail } = req.body;

    if (!userToDelete || !userToDelete.user_id) {
      return res.status(400).json({ error: 'User ID to delete is required.' });
    }

    if (!adminEmail) {
      return res.status(400).json({ error: 'Admin email is required for audit logging.' });
    }

    const userId = userToDelete.user_id;

    console.log(`[Admin Delete] Starting deletion process for user: ${userId} by admin: ${adminEmail}`);

    // Step 1: Fetch user data for audit log BEFORE deletion
    const { data: userData, error: fetchError } = await supabaseAdmin
      .from('user_roles')
      .select('email, role, first_name, last_name, company_name')
      .eq('user_id', userId)
      .single();

    if (fetchError) {
      console.error('[Admin Delete] Failed to fetch user data for audit:', fetchError);
      return res.status(500).json({ error: 'Failed to fetch user data' });
    }

    // Step 2: Write to audit log
    const { error: auditError } = await supabaseAdmin
      .from('deleted_users_audit')
      .insert({
        user_id: userId,
        email: userData.email,
        role: userData.role,
        first_name: userData.first_name,
        last_name: userData.last_name,
        company_name: userData.company_name,
        deleted_by_admin_email: adminEmail,
        deleted_at: new Date().toISOString()
      });

    if (auditError) {
      console.error('[Admin Delete] Failed to write audit log:', auditError);
      return res.status(500).json({ error: 'Failed to create audit record' });
    }

    console.log(`[Admin Delete] Audit log created for user: ${userId}`);

    // Step 3: Reassign all foreign key references to preserve data integrity
    
    // Reassign jobs created by this user
    const { error: jobsError } = await supabaseAdmin
      .from('jobs')
      .update({ created_by: DELETED_USER_ID })
      .eq('created_by', userId);

    if (jobsError) {
      console.error('[Admin Delete] Failed to reassign jobs:', jobsError);
    } else {
      console.log(`[Admin Delete] Reassigned jobs to system deleted user`);
    }

    // Reassign applications (if student)
    const { error: appsError } = await supabaseAdmin
      .from('applications')
      .update({ user_id: DELETED_USER_ID })
      .eq('user_id', userId);

    if (appsError) {
      console.error('[Admin Delete] Failed to reassign applications:', appsError);
    } else {
      console.log(`[Admin Delete] Reassigned applications to system deleted user`);
    }

    // Reassign job views
    const { error: viewsError } = await supabaseAdmin
      .from('job_views')
      .update({ user_id: DELETED_USER_ID })
      .eq('user_id', userId);

    if (viewsError) {
      console.error('[Admin Delete] Failed to reassign job views:', viewsError);
    }

    // Reassign job link clicks
    const { error: clicksError } = await supabaseAdmin
      .from('job_link_clicks')
      .update({ user_id: DELETED_USER_ID })
      .eq('user_id', userId);

    if (clicksError) {
      console.error('[Admin Delete] Failed to reassign job link clicks:', clicksError);
    }

    console.log(`[Admin Delete] All foreign key references reassigned`);

    // Step 4: HARD DELETE from user_roles (now safe - no FK violations)
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .delete()
      .eq('user_id', userId);

    if (roleError) {
      console.error('[Admin Delete] Failed to delete from user_roles:', roleError);
      return res.status(500).json({ error: 'Failed to delete user from roles table' });
    }

    console.log(`[Admin Delete] Deleted from user_roles for user: ${userId}`);

    // Step 5: Delete from auth.users (should work now)
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (authError) {
      console.error('[Admin Delete] Failed to delete from auth.users:', authError);
      return res.status(500).json({ 
        error: 'Failed to delete authentication account',
        details: authError.message 
      });
    }

    console.log(`[Admin Delete] Deleted from auth.users for user: ${userId}`);
    console.log(`[Admin Delete] Successfully completed deletion for user: ${userId} by admin: ${adminEmail}`);

    res.status(200).json({ 
      success: true,
      message: 'User successfully deleted. All content has been preserved and reassigned.' 
    });

  } catch (error) {
    console.error('[Admin Delete] Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    res.status(500).json({ error: 'Internal Server Error', details: errorMessage });
  }
}
