// enhanced api endpoint to delete account with tracking
// pages/api/delete-account.ts

import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // get user from token
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // get optional deletion reason from request body
    const { reason } = req.body;

    // get user info before deletion for audit
    const { data: userInfo } = await supabaseAdmin
      .from('user_roles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!userInfo) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    // save complete record to audit table for tracking
    const { error: auditError } = await supabaseAdmin
      .from('deleted_users_audit')
      .insert({
        user_id: user.id,
        email: userInfo.email || user.email,
        role: userInfo.role,
        first_name: userInfo.first_name,
        last_name: userInfo.last_name,
        company_name: userInfo.company_name,
        deleted_at: new Date().toISOString(),
        self_deleted: true, // user deleted their own account
        deleted_by_admin_email: null, // null since it's self-deletion
        deletion_reason: reason || null // store the reason if provided
      });

    if (auditError) {
      console.error('Error creating audit record:', auditError);
      // continue anyway - we don't want to block deletion if audit fails
    }

    // clean up related data based on role
    if (userInfo.role === 'student') {
      // delete student's applications
      const { error: appError } = await supabaseAdmin
        .from('applications')
        .delete()
        .eq('student_id', user.id);
      
      if (appError) console.error('Error deleting applications:', appError);

      // delete saved jobs
      const { error: savedError } = await supabaseAdmin
        .from('saved_jobs')
        .delete()
        .eq('student_id', user.id);
      
      if (savedError) console.error('Error deleting saved jobs:', savedError);

    } else if (userInfo.role === 'rep' || userInfo.role === 'faculty') {
      // for reps and faculty, remove them as creator from jobs but keep the jobs
      const { error: jobError } = await supabaseAdmin
        .from('jobs')
        .update({ created_by: null })
        .eq('created_by', user.id);
      
      if (jobError) console.error('Error updating jobs:', jobError);
    }

    // delete from user_roles table
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .delete()
      .eq('user_id', user.id);

    if (roleError) {
      console.error('Error deleting user role:', roleError);
      return res.status(500).json({ error: 'Failed to delete user profile' });
    }

    // finally, delete the auth account
    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(user.id);

    if (deleteAuthError) {
      console.error('Error deleting auth account:', deleteAuthError);
      // note: profile is already deleted, so we continue
    }

    // log the deletion for monitoring
    console.log(`Account deleted: ${userInfo.email} (${userInfo.role}) - Reason: ${reason || 'Not provided'}`);

    return res.status(200).json({ 
      message: 'Account deleted successfully',
      deleted: true 
    });

  } catch (error) {
    console.error('Unexpected error deleting account:', error);
    return res.status(500).json({ error: 'An unexpected error occurred' });
  }
}
