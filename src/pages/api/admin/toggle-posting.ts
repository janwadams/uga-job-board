// pages/api/admin/toggle-posting.ts
// PERFECT FIT FOR YOUR SCHEMA: auth.users + public.user_roles
// Your user_roles has: user_id (PK), role, is_active, email

import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Step 1: Verify user is logged in
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.email) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Step 2: Get user data from user_roles table
    // Since your user_roles has email column, we can query directly by email!
    const { data: userData, error: userError } = await supabase
      .from('user_roles')
      .select('user_id, role, is_active')
      .eq('email', session.user.email)
      .single();

    if (userError || !userData) {
      return res.status(403).json({ error: 'User not found' });
    }

    // Step 3: Check if user is admin and active
    if (userData.role !== 'admin' || !userData.is_active) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Step 4: Validate request data
    const { settingKey, enabled } = req.body;

    if (!settingKey || typeof enabled !== 'boolean') {
      return res.status(400).json({ error: 'Invalid request' });
    }

    // Validate settingKey is one we support
    const validSettings = ['faculty_can_post_jobs', 'rep_can_post_jobs'];
    if (!validSettings.includes(settingKey)) {
      return res.status(400).json({ error: 'Invalid setting key' });
    }

    // Step 5: Update the setting
    const { error } = await supabase
      .from('app_settings')
      .update({ 
        setting_value: enabled,
        updated_by: userData.user_id,  // Store the user's auth ID
        updated_at: new Date().toISOString()
      })
      .eq('setting_key', settingKey);

    if (error) {
      console.error('Error updating setting:', error);
      return res.status(500).json({ error: 'Failed to update setting' });
    }

    return res.status(200).json({ 
      success: true, 
      message: `${settingKey} set to ${enabled}` 
    });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
