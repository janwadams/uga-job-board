// pages/api/account/delete.ts
// API endpoint to delete user account with data anonymization
// Simplified version without token validation

import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

// initialize supabase admin client with service role key
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'DELETE' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, confirmText } = req.body;
    
    console.log('[Account Deletion] Received request for userId:', userId);
    console.log('[Account Deletion] Confirm text:', confirmText);

    if (!userId) {
      console.error('[Account Deletion] No userId provided');
      return res.status(400).json({ error: 'User ID is required' });
    }

    // verify confirmation text
    if (confirmText !== 'DELETE') {
      console.error('[Account Deletion] Invalid confirmation text');
      return res.status(400).json({ error: 'Confirmation text must be "DELETE"' });
    }

    console.log(`[Account Deletion] Starting deletion process for user: ${userId}`);

    // step 0: fetch user data for audit log BEFORE anonymization
    const { data: userData, error: fetchError } = await supabaseAdmin
      .from('user_roles')
      .select('email, role, first_name, last_name, company_name, is_active')
      .eq('user_id', userId)
      .single();

    if (fetchError) {
      console.error('[Account Deletion] Failed to fetch user data for audit:', fetchError);
      return res.status(500).json({ error: 'Failed to fetch user data' });
    }

    // Check if already deleted/anonymized
    if (userData.is_active === false || userData.email?.startsWith('deleted_')) {
      console.log(`[Account Deletion] User ${userId} is already deleted/anonymized`);
      return res.status(400).json({ error: 'This account has already been deleted' });
    }

    // Get email - use from user_roles or fetch from auth
    let emailForAudit = userData.email;
    if (!emailForAudit || emailForAudit.trim() === '') {
      // Fallback: get email from auth.users
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId);
      emailForAudit = authUser?.user?.email || '';
    }
    
    console.log(`[Account Deletion] Using email for audit: ${emailForAudit}`);

    // step 1: write to audit log
    const { error: auditError } = await supabaseAdmin
      .from('deleted_users_audit')
      .insert({
        user_id: userId,
        email: emailForAudit,
        role: userData.role,
        first_name: userData.first_name,
        last_name: userData.last_name,
        company_name: userData.company_name,
        deleted_by_admin_email: emailForAudit, // Self-deletion: use user's own email
        deleted_at: new Date().toISOString()
      });

    if (auditError) {
      console.error('[Account Deletion] Failed to write audit log:', auditError);
      return res.status(500).json({ error: 'Failed to create audit record' });
    }

    console.log(`[Account Deletion] Audit log created for user: ${userId}`);

    // step 2: anonymize user data in user_roles table
    const { error: anonymizeError } = await supabaseAdmin
      .from('user_roles')
      .update({
        is_active: false,
        first_name: 'Deleted',
        last_name: 'User',
        email: `deleted_${userId}@deleted.com`,
        phone_number: null,
        bio: null,
        profile_picture_url: null,
        major: null,
        graduation_year: null,
        gpa: null,
        resume_url: null,
        linkedin_url: null,
        job_title: null,
        company_name: null,
        company_website: null,
        department: null,
        office_location: null,
        office_hours: null,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (anonymizeError) {
      console.error('[Account Deletion] Failed to anonymize user_roles:', anonymizeError);
      return res.status(500).json({ error: 'Failed to anonymize profile data' });
    }

    console.log(`[Account Deletion] Anonymized user_roles for user: ${userId}`);

    // step 3: delete user from auth.users (this will prevent login)
    try {
      const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(userId);

      if (deleteAuthError) {
        console.error('[Account Deletion] Failed to delete from auth.users:', deleteAuthError);
        console.log('[Account Deletion] Continuing anyway - user is anonymized and marked inactive');
      } else {
        console.log(`[Account Deletion] Deleted from auth.users for user: ${userId}`);
      }
    } catch (authDeleteException) {
      console.error('[Account Deletion] Exception deleting from auth.users:', authDeleteException);
      console.log('[Account Deletion] Continuing anyway - user is anonymized and marked inactive');
    }

    console.log(`[Account Deletion] Successfully completed deletion for user: ${userId}`);

    return res.status(200).json({ 
      success: true,
      message: 'Account deleted successfully. Your data has been anonymized.'
    });

  } catch (error: any) {
    console.error('[Account Deletion] Unexpected error:', error);
    return res.status(500).json({ 
      error: 'An internal server error occurred during account deletion',
      details: error.message 
    });
  }
}
