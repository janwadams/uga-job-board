import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { email, password, firstName, lastName } = req.body;

  if (!email || !password || !firstName || !lastName) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  try {
    // Check for duplicate email in user_roles table first
    const { data: existingUser, error: checkError } = await supabaseAdmin
      .from('user_roles')
      .select('email, user_id')
      .eq('email', email.toLowerCase())
      .single();

    if (existingUser) {
      return res.status(400).json({ error: 'An account with this email already exists.' });
    }

    // Create the admin user (this will also catch duplicate emails in Supabase auth)
    const { data: { user }, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: { 
        first_name: firstName,
        last_name: lastName,
      },
    });

    if (signUpError || !user) {
      // Handle specific duplicate email error from Supabase
      if (signUpError?.message?.includes('already registered') || 
          signUpError?.message?.includes('already exists') || 
          signUpError?.message?.includes('duplicate')) {
        return res.status(400).json({ error: 'An account with this email already exists.' });
      }
      return res.status(400).json({ error: 'Failed to create user: ' + signUpError?.message });
    }

    // Add to user_roles table with admin role
    const { error: rolesError } = await supabaseAdmin
      .from('user_roles')
      .insert([
        { 
          user_id: user.id,
          role: 'admin',
          is_active: true,
          first_name: firstName,
          last_name: lastName,
          email: email.toLowerCase(), // Store email in user_roles too
        },
      ]);

    if (rolesError) {
      // Clean up the created user if role assignment fails
      await supabaseAdmin.auth.admin.deleteUser(user.id);
      return res.status(500).json({ error: 'Failed to assign admin role: ' + rolesError.message });
    }

    return res.status(200).json({ message: 'Admin account created successfully.' });

  } catch (error) {
    console.error('Unexpected error creating admin:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}