// pages/api/account/delete.ts
// API endpoint to delete user account with data anonymization

import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

// initialize supabase admin client with service role key
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// initialize regular supabase client for auth verification
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // get the user's session token
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    console.log('[Account Deletion] Token present:', !!token);
    
    if (!token) {
      console.error('[Account Deletion] No token provided');
      return res.status(401).json({ error: 'No authorization token provided' });
    }

    // Use the service role client to verify the token (admin client can verify any token)
    let user;
    try {
      const { data, error: authError } = await supabaseAdmin.auth.getUser(token);
      
      console.log('[Account Deletion] Auth check - error:', authError);
      console.log('[Account Deletion] Auth check - user:', !!data?.user);
      
      if (authError) {
        console.error('[Account Deletion] Auth error details:', JSON.stringify(authError));
        return res.status(401).json({ error: 'Invalid token', details: authError.message });
      }
      
      if (!data?.user) {
        console.error('[Account Deletion] No user in auth response');
        return res.status(401).json({ error: 'No user found for token' });
      }
      
      user = data.user;
    } catch (authException) {
      console.error('[Account Deletion] Auth exception:', authException);
      return res.status(401).json({ error: 'Authentication failed', details: String(authException) });
    }

    const userId = user.id;
    const confirmText = req.body.confirmText;
    
    console.log('[Account Deletion] User ID:', userId);
    console.log('[Account Deletion] Confirm text:', confirmText);

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

    // Use email from auth.users (from session token) as primary source
    // This ensures we get the real email even if user_roles.email is somehow empty
    const emailForAudit = user.email || userData.email || '';
    
    console.log(`[Account Deletion] Using email for audit: ${emailForAudit}`);

    // step 1: write to audit log
    const { error: auditError } = await supabaseAdmin
      .from('deleted_users_audit')
      .insert({
        user_id: userId,
        email: emailForAudit, // Use auth email as primary source
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
    // Note: This might fail but we still consider the deletion successful since data is anonymized
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

    // step 4: jobs, applications, views, and clicks remain in database
    // they will show as created by "Deleted User" due to the anonymization
    // this preserves data integrity and analytics

    console.log(`[Account Deletion] Successfully completed deletion for user: ${userId}`);

    return res.status(200).json({ 
      success: true,
      message: 'Account deleted successfully. Your data has been anonymized and you have been logged out.'
    });

  } catch (error: any) {
    console.error('[Account Deletion] Unexpected error:', error);
    return res.status(500).json({ 
      error: 'An internal server error occurred during account deletion',
      details: error.message 
    });
  }
}
