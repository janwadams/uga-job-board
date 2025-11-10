// pages/api/auth/register-rep.ts for company rep

import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

// Initialize the Supabase Admin client with the service role key
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // UPDATED: Now expecting first_name and last_name in the request body
  const { email, password, company_name, first_name, last_name } = req.body;

  // UPDATED: Added validation for the new name fields
  if (!email || !password || !company_name || !first_name || !last_name) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  try {
    // Step 1: Create the new user in auth.users
    const { data: { user }, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // Auto-confirm email because an admin will approve the account
      user_metadata: { 
        company_name: company_name,
        first_name: first_name,
        last_name: last_name,
      },
    });

    if (signUpError || !user) {
      console.error('[Register Rep] Supabase sign-up error:', signUpError?.message);
      return res.status(400).json({ error: 'A user with this email already exists or the password is too weak.' });
    }

    // Step 2: Insert the full user record into the user_roles table
    const { error: rolesError } = await supabaseAdmin
      .from('user_roles')
      .insert([
        { 
          user_id: user.id,
          role: 'rep',          // Assign the 'rep' role
          is_active: false,     // Rep accounts require admin approval
          first_name: first_name, // Save the first name
          last_name: last_name,  // Save the last name
          company_name: company_name, // Save the company name
        },
      ]);

    if (rolesError) {
      console.error('[Register Rep] Failed to insert into user_roles:', rolesError.message);
      // IMPORTANT: Clean up the created auth user if the role assignment fails
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

