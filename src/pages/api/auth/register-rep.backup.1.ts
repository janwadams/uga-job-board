
// pages/api/auth/register-rep.ts

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

  const { email, password, company_name } = req.body;

  if (!email || !password || !company_name) {
    return res.status(400).json({ error: 'Email, password, and company name are required.' });
  }

  try {
    const { data: { user }, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: { company_name: company_name },
    });

    if (signUpError || !user) {
      console.error('[Register Rep] Sign up error:', signUpError);
      return res.status(400).json({ error: signUpError?.message || 'Failed to create user.' });
    }

    const insertData = { 
      user_id: user.id,
      role: 'pending',
      is_active: false,
    };

    // THIS IS THE NEW LINE. IT WILL LOG EXACTLY WHAT WE ARE TRYING TO INSERT.
    console.log('[Register Rep] Attempting to insert into user_roles:', insertData);

    const { error: rolesError } = await supabaseAdmin
      .from('user_roles')
      .insert([insertData]);

    if (rolesError) {
      console.error('[Register Rep] Roles table insert error:', rolesError);
      return res.status(500).json({ error: 'Failed to create user role entry.' });
    }

    return res.status(200).json({ message: 'Account created successfully. Awaiting admin approval.' });

  } catch (error) {
    console.error('[Register Rep] Server error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}


























/*
import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

// Initialize the Supabase Admin client with the service role key
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

  if (!email || !password || !company_name) {
    return res.status(400).json({ error: 'Email, password, and company name are required.' });
  }

  try {
    // 1. Create the user using the Supabase Admin client, storing company_name in user_metadata
    const { data: { user }, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: { company_name: company_name },
    });

    if (signUpError || !user) {
      console.error('[Register Rep] Sign up error:', signUpError);
      return res.status(400).json({ error: signUpError?.message || 'Failed to create user.' });
    }

    // 2. Insert the user into your custom user_roles table with a pending status.
    const { error: rolesError } = await supabaseAdmin
      .from('user_roles')
      .insert([
        { 
          user_id: user.id,
          role: 'pending',
          is_active: false, // CHANGED: Now correctly using 'is_active'
        },
      ]);

    if (rolesError) {
      console.error('[Register Rep] Roles table insert error:', rolesError);
      return res.status(500).json({ error: 'Failed to create user role entry.' });
    }

    // 3. Return success
    return res.status(200).json({ message: 'Account created successfully. Awaiting admin approval.' });

  } catch (error) {
    console.error('[Register Rep] Server error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}


*/