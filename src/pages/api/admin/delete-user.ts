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
    // Note: In a production app, you would add a utility here to verify 
    // that the user making the request is indeed an admin.

    const { userToDelete } = req.body;

    if (!userToDelete || !userToDelete.user_id) {
        return res.status(400).json({ error: 'User ID to delete is required.' });
    }

    // Step 1: Delete the user's profile from the public.user_roles table first.
    // This is important to do before deleting the auth user to respect the foreign key relationship.
    const { error: roleError } = await supabaseAdmin
        .from('user_roles')
        .delete()
        .eq('user_id', userToDelete.user_id);

     if (roleError) {
        console.error('Role deletion error:', roleError);
        throw new Error(`Failed to delete user from roles table: ${roleError.message}`);
    }

    // Step 2: Delete the user from the main auth.users table.
    // This is the final, permanent deletion.
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userToDelete.user_id);

    if (authError) {
        console.error('Auth user deletion error:', authError);
        throw new Error(`Failed to delete user from authentication system: ${authError.message}`);
    }

    res.status(200).json({ message: 'User successfully deleted.' });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    res.status(500).json({ error: 'Internal Server Error', details: errorMessage });
  }
}

