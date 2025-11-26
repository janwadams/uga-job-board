// pages api route for toggle switch - 11/26/25

import { createPagesServerClient } from '@supabase/auth-helpers-nextjs';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabase = createPagesServerClient({ req, res });

  // GET - fetch settings
  if (req.method === 'GET') {
    const { data: settings, error } = await supabase
      .from('app_settings')
      .select('setting_key, setting_value');

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    // convert to object for easy access
    const settingsObj = settings.reduce((acc: Record<string, boolean>, { setting_key, setting_value }) => {
      acc[setting_key] = setting_value;
      return acc;
    }, {});

    return res.status(200).json(settingsObj);
  }

  // PATCH - update a setting
  if (req.method === 'PATCH') {
    const { data: { user } } = await supabase.auth.getUser();
    const { setting_key, setting_value } = req.body;

    const { error } = await supabase
      .from('app_settings')
      .update({ 
        setting_value, 
        updated_at: new Date().toISOString(),
        updated_by: user?.id 
      })
      .eq('setting_key', setting_key);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ success: true });
  }

  // method not allowed
  return res.status(405).json({ error: 'Method not allowed' });
}