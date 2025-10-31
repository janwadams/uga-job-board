// api endpoint to toggle faculty posting permission
// only admins can access this endpoint

import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method not allowed' });
  }

  try {
    // step 1: get the authorization token from the request header
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'unauthorized - no token provided' });
    }

    const token = authHeader.replace('Bearer ', '');

    // step 2: verify the token and get the user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(401).json({ error: 'unauthorized - invalid token' });
    }

    // step 3: get user data from user_roles table
    const { data: userData, error: userError } = await supabase
      .from('user_roles')
      .select('user_id, role, is_active')
      .eq('user_id', user.id)
      .single();

    if (userError || !userData) {
      return res.status(403).json({ error: 'user not found' });
    }

    // step 4: check if user is admin and active
    if (userData.role !== 'admin' || !userData.is_active) {
      return res.status(403).json({ error: 'admin access required' });
    }

    // step 5: validate request data
    const { settingKey, enabled } = req.body;

    if (!settingKey || typeof enabled !== 'boolean') {
      return res.status(400).json({ error: 'invalid request' });
    }

    // validate settingKey is one we support
    const validSettings = ['faculty_can_post_jobs', 'rep_can_post_jobs'];
    if (!validSettings.includes(settingKey)) {
      return res.status(400).json({ error: 'invalid setting key' });
    }

    // step 6: update the setting in the database
    const { error } = await supabase
      .from('app_settings')
      .update({ 
        setting_value: enabled,
        updated_by: userData.user_id,
        updated_at: new Date().toISOString()
      })
      .eq('setting_key', settingKey);

    if (error) {
      console.error('error updating setting:', error);
      return res.status(500).json({ error: 'failed to update setting' });
    }

    return res.status(200).json({ 
      success: true, 
      message: `${settingKey} set to ${enabled}` 
    });
  } catch (error) {
    console.error('error:', error);
    return res.status(500).json({ error: 'internal server error' });
  }
}