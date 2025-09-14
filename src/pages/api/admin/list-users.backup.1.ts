/*

// pages/api/admin/list-users.ts

import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Make sure this is only used server-side!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const [{ data: roles }, { data: jobs }, { data: users }] = await Promise.all([
      supabaseAdmin.from('user_roles').select('*'),
      supabaseAdmin.from('jobs').select('created_by'),
      supabaseAdmin.auth.admin.listUsers(),
    ]);

    // Count jobs
    const jobCountMap = jobs.reduce((acc: any, job: any) => {
      acc[job.created_by] = (acc[job.created_by] || 0) + 1;
      return acc;
    }, {});

    // Map each user
    const enriched = roles.map((roleRow) => {
      const authUser = users.users.find((u: any) => u.id === roleRow.user_id);
      return {
        user_id: roleRow.user_id,
        role: roleRow.role,
        is_active: roleRow.is_active,
        last_sign_in_at: authUser?.last_sign_in_at || null,
        jobs_posted: jobCountMap[roleRow.user_id] || 0,
      };
    });

    res.status(200).json({ users: enriched });
  } catch (error) {
    console.error('[Admin List Users] Error:', error);
    res.status(500).json({ error: 'Failed to fetch admin user list.' });
  }
}
*/

// pages/api/admin/list-users.ts

import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Make sure this is only used server-side!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const [{ data: roles }, { data: jobs }, { data: users }] = await Promise.all([
      supabaseAdmin.from('user_roles').select('*'),
      supabaseAdmin.from('jobs').select('created_by'),
      supabaseAdmin.auth.admin.listUsers(),
    ]);

    // Count jobs
    const jobCountMap = jobs.reduce((acc: any, job: any) => {
      acc[job.created_by] = (acc[job.created_by] || 0) + 1;
      return acc;
    }, {});

    // Map each user
    const enriched = roles.map((roleRow) => {
      const authUser = users.users.find((u: any) => u.id === roleRow.user_id);
      return {
        user_id: roleRow.user_id,
        role: roleRow.role,
        is_active: roleRow.is_active,
        email: authUser?.email || null, // ADDED: Include the user's email from auth.users
        last_sign_in_at: authUser?.last_sign_in_at || null,
        jobs_posted: jobCountMap[roleRow.user_id] || 0,
      };
    });

    res.status(200).json({ users: enriched });
  } catch (error) {
    console.error('[Admin List Users] Error:', error);
    res.status(500).json({ error: 'Failed to fetch admin user list.' });
  }
}