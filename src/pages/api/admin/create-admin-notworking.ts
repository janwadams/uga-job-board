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

  // Verify the requesting user is an admin
  const supabase = createPagesServerClient({ req, res });
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Check if requesting user is admin
  const { data: userData, error: userError } = await supabaseAdmin
    .from('user_roles')
    .select('role')
    .eq('user_id', session.user.id)
    .single();

  if (userError || !userData || userData.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden - Admin access required' });
  }

  const { email, password, firstName, lastName } = req.body;

  if (!email || !password || !firstName || !lastName) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  try {
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
        },
      ]);

    if (rolesError) {
      // Clean up the created user if role assignment fails
      await supabaseAdmin.auth.admin.deleteUser(user.id);
      return res.status(500).json({ error: 'Failed to assign admin role.' });
    }

    return res.status(200).json({ message: 'Admin account created successfully.' });

  } catch (error) {
    console.error('Error creating admin:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}