// pages api route for toggle switch - 11/26/25

import { createClient } from '@supabase/supabase-js';
import type { NextApiRequest, NextApiResponse } from 'next';

// service role client (bypasses RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // GET - fetch settings
  if (req.method === 'GET') {
    const { data: settings, error } = await supabaseAdmin
      .from('app_settings')
      .select('setting_key, setting_value');

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const settingsObj = settings.reduce((acc: Record<string, boolean>, { setting_key, setting_value }) => {
      acc[setting_key] = setting_value;
      return acc;
    }, {});

    return res.status(200).json(settingsObj);
  }

  // PATCH - update a setting (admin only)
  if (req.method === 'PATCH') {
    // get token from authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'no authorization token provided' });
    }

    const token = authHeader.replace('Bearer ', '');

    // verify user
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return res.status(401).json({ error: 'invalid or expired token' });
    }

    // verify user is an admin
    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleData?.role !== 'admin') {
      return res.status(403).json({ error: 'admin access required' });
    }

    const { setting_key, setting_value } = req.body;

    const { error } = await supabaseAdmin
      .from('app_settings')
      .update({ 
        setting_value, 
        updated_at: new Date().toISOString(),
        updated_by: user.id 
      })
      .eq('setting_key', setting_key);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'method not allowed' });
}