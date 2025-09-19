// src/utils/supabase-admin.ts
import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs';
import { NextApiRequest, NextApiResponse } from 'next';

// This helper function securely retrieves the user's session on the server-side.
// It's used by our admin-only API routes to verify the user is logged in and has the 'admin' role.
export const getSession = async (req: NextApiRequest, res: NextApiResponse) => {
  const supabase = createServerSupabaseClient({ req, res });

  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    console.error('Error getting session:', error.message);
    return null;
  }

  // Ensure app_metadata and user_role exist
  if (!session?.user?.app_metadata?.user_role) {
    return null;
  }
  
  return session;
};