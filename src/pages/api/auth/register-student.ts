// pages/api/auth/register-student.ts

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

  const { email, password, firstName, lastName } = req.body;

  // Student-specific validation 
  if (!email || !password || !firstName || !lastName) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  // Ensure the email is a valid .edu address
  if (!email.toLowerCase().endsWith('.edu')) {
      return res.status(400).json({ error: 'Please use a valid .edu email address.' });
  }

  try {
    // Create the new student user in the auth.users table
    const { data: { user }, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // Auto-confirm student emails
      user_metadata: { 
        first_name: firstName,
        last_name: lastName,
      },
    });

    if (signUpError || !user) {
      console.error('[Register Student] Supabase sign-up error:', signUpError?.message);
      return res.status(400).json({ error: 'A user with this email already exists or the password is too weak.' });
    }

    // Insert a record into the user_roles table to assign the student role
    // assumes you have added 'first_name' and 'last_name' columns to your 'user_roles' table.
    const { error: rolesError } = await supabaseAdmin
      .from('user_roles')
      .insert([
        { 
          user_id: user.id,
          role: 'student',      // Assign the 'student' role
          is_active: true,      // Students are active by default and don't need admin approval
          first_name: firstName,
          last_name: lastName,
        },
      ]);

    if (rolesError) {
      console.error('[Register Student] Failed to insert into user_roles:', rolesError.message);
      // Clean up the created user if role assignment fails
      await supabaseAdmin.auth.admin.deleteUser(user.id);
      return res.status(500).json({ error: 'Failed to assign a role to the new user. The user was not created.' });
    }

    // Return a success message
    return res.status(200).json({ message: 'Account created successfully! You can now log in.' });

  } catch (error) {
    console.error('[Register Student] Unexpected server error:', error);
    return res.status(500).json({ error: 'An internal server error occurred.' });
  }
}
