// pages api route for toggle switch - 11/26/25

import { createClient } from '@supabase/supabase-js';
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs';
import type { NextApiRequest, NextApiResponse } from 'next';

// service role client for database updates (bypasses RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // GET - fetch settings (any authenticated user can read)
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
    const supabase = createPagesServerClient({ req, res });
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return res.status(401).json({ error: 'not authenticated' });
    }

    // verify user is an admin
    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', session.user.id)
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
        updated_by: session.user.id 
      })
      .eq('setting_key', setting_key);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'method not allowed' });
}