// pages/api/auth/register-rep.ts

import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

// Initialize the Supabase Admin client with the service role key
// This is essential for performing admin-level actions like creating users
// and inserting into tables that have restrictive RLS policies.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST requests to this endpoint
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { email, password, company_name } = req.body;

  // Basic validation to ensure required fields are present
  if (!email || !password || !company_name) {
    return res.status(400).json({ error: 'Email, password, and company name are required.' });
  }

  try {
    // Step 1: Create the new user in the auth.users table
    const { data: { user }, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // Auto-confirm the email, can be set to false if you want email verification
      user_metadata: { company_name: company_name },
    });

    if (signUpError || !user) {
      console.error('[Register Rep] Supabase sign-up error:', signUpError?.message);
      // Provide a more user-friendly error message
      return res.status(400).json({ error: 'A user with this email already exists or the password is too weak.' });
    }

    // Step 2 (FIX): Insert a new record into the user_roles table to assign the role
    const { error: rolesError } = await supabaseAdmin
      .from('user_roles')
      .insert([
        { 
          user_id: user.id, // The ID of the user we just created
          role: 'rep',      // Assign the 'rep' role by default
          is_active: false, // Reps must be approved by an admin, so start as inactive
        },
      ]);

    if (rolesError) {
      // If this fails, we should ideally delete the user we just created to avoid orphaned auth entries.
      // This is an advanced topic (transactions), but for now, logging the error is crucial.
      console.error('[Register Rep] Failed to insert into user_roles:', rolesError.message);
      
      // Clean up the created user to prevent orphaned accounts
      await supabaseAdmin.auth.admin.deleteUser(user.id);
      
      return res.status(500).json({ error: 'Failed to assign a role to the new user. The user was not created.' });
    }

    // Step 3: Return a success message
    return res.status(200).json({ message: 'Account created successfully. Awaiting admin approval.' });

  } catch (error) {
    console.error('[Register Rep] Unexpected server error:', error);
    return res.status(500).json({ error: 'An internal server error occurred.' });
  }
}
