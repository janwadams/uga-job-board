import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Admin Client for server-side operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

    // Step 1: Fetch user data for audit log BEFORE anonymization
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
        deleted_by_admin_email: adminEmail, // admin deletion
        deleted_at: new Date().toISOString()
      });

    if (auditError) {
      console.error('[Admin Delete] Failed to write audit log:', auditError);
      return res.status(500).json({ error: 'Failed to create audit record' });
    }

    console.log(`[Admin Delete] Audit log created for user: ${userId}`);

    // Step 3: Anonymize user data in user_roles table (instead of hard delete)
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
      console.error('[Admin Delete] Failed to anonymize user_roles:', anonymizeError);
      return res.status(500).json({ error: 'Failed to anonymize profile data' });
    }

    console.log(`[Admin Delete] Anonymized user_roles for user: ${userId}`);

    // Step 4: Delete user from auth.users (this will prevent login)
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (authError) {
      console.error('[Admin Delete] Failed to delete from auth.users:', authError);
      // even if auth deletion fails, user is anonymized and marked inactive
      return res.status(500).json({ 
        error: 'Failed to delete authentication account, but profile has been anonymized' 
      });
    }

    console.log(`[Admin Delete] Deleted from auth.users for user: ${userId}`);
    console.log(`[Admin Delete] Successfully completed deletion for user: ${userId} by admin: ${adminEmail}`);

    res.status(200).json({ 
      success: true,
      message: 'User successfully deleted and anonymized.' 
    });

  } catch (error) {
    console.error('[Admin Delete] Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    res.status(500).json({ error: 'Internal Server Error', details: errorMessage });
  }
}
