// pages/api/admin/list-users.ts

import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Make sure this is only used server-side!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const [{ data: roles }, { data: jobs }, { data: usersResponse }] = await Promise.all([
      // Select all fields from user_roles, which now includes first_name, last_name, etc.
      supabaseAdmin.from('user_roles').select('*'),
      supabaseAdmin.from('jobs').select('created_by'),
      supabaseAdmin.auth.admin.listUsers(),
    ]);

    // CORRECTED: Check for usersResponse and usersResponse.users
    if (!roles || !jobs || !usersResponse || !usersResponse.users) {
        throw new Error("Failed to fetch data from one or more sources.");
    }

    // Count jobs posted by each user
    const jobCountMap = jobs.reduce((acc: { [key: string]: number }, job: any) => {
      acc[job.created_by] = (acc[job.created_by] || 0) + 1;
      return acc;
    }, {});

    // Enrich the role data with details from auth.users and job counts
    const enrichedUsers = roles.map((roleRow) => {
      // CORRECTED: Access users directly from usersResponse.users
      const authUser = usersResponse.users.find((u: any) => u.id === roleRow.user_id);
      
      // Construct the final user object to be sent to the front-end
      return {
        user_id: roleRow.user_id,
        role: roleRow.role,
        is_active: roleRow.is_active,
        email: authUser?.email || null,
        first_name: roleRow.first_name,
        last_name: roleRow.last_name,
        company_name: roleRow.company_name,
        last_sign_in_at: authUser?.last_sign_in_at || null,
        jobs_posted: jobCountMap[roleRow.user_id] || 0,
      };
    });

    res.status(200).json({ users: enrichedUsers });
  } catch (error) {
    console.error('[Admin List Users] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    res.status(500).json({ error: 'Failed to fetch admin user list.', details: errorMessage });
  }
}

