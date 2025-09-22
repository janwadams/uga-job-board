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

  console.log('=== DEBUG: Create admin endpoint hit ===');
  
  // TEMPORARILY SKIP AUTH CHECK FOR DEBUGGING
  // Let's see if the basic functionality works first
  
  const { email, password, firstName, lastName } = req.body;
  
  console.log('Request body:', { email, firstName, lastName, passwordLength: password?.length });

  if (!email || !password || !firstName || !lastName) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  try {
    console.log('Attempting to create user with Supabase Admin...');
    
    // Create the admin user
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
      console.error('Supabase user creation failed:', signUpError);
      return res.status(400).json({ error: 'Failed to create user: ' + signUpError?.message });
    }

    console.log('User created successfully, now adding to user_roles...');

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
        },
      ]);

    if (rolesError) {
      console.error('Role assignment failed:', rolesError);
      // Clean up the created user if role assignment fails
      await supabaseAdmin.auth.admin.deleteUser(user.id);
      return res.status(500).json({ error: 'Failed to assign admin role: ' + rolesError.message });
    }

    console.log('Admin account created successfully!');
    return res.status(200).json({ message: 'Admin account created successfully.' });

  } catch (error) {
    console.error('Unexpected error creating admin:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}