// api endpoint for registering company representatives and faculty/staff
// pages/api/auth/register-rep.ts

import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

// initialize the supabase admin client with the service role key
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // get all the form data including the new is_faculty flag
  const { email, password, company_name, first_name, last_name, is_faculty } = req.body;

  // check that we have all required fields
  if (!email || !password || !first_name || !last_name) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  // company name is only required for company reps, not faculty
  if (!is_faculty && !company_name) {
    return res.status(400).json({ error: 'Company name is required for company representatives.' });
  }

  // make sure faculty are using uga email addresses
  if (is_faculty && !email.endsWith('@uga.edu')) {
    return res.status(400).json({ error: 'Faculty/Staff must use a UGA email address (@uga.edu).' });
  }

  try {
    // step 1: create the new user in auth.users
    const { data: { user }, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // auto-confirm email because an admin will approve the account
      user_metadata: { 
        company_name: company_name || 'University of Georgia',
        first_name: first_name,
        last_name: last_name,
        is_faculty: is_faculty || false,
      },
    });

    if (signUpError || !user) {
      console.error('[Register Rep] Supabase sign-up error:', signUpError?.message);
      return res.status(400).json({ error: 'A user with this email already exists or the password is too weak.' });
    }

    // step 2: figure out what role to assign based on user type
    const role = is_faculty ? 'faculty' : 'rep';

    // step 3: insert the full user record into the user_roles table
    const { error: rolesError } = await supabaseAdmin
      .from('user_roles')
      .insert([
        { 
          user_id: user.id,
          role: role,          // either 'rep' or 'faculty' based on what they selected
          is_active: false,    // all accounts need admin approval before they can log in
          first_name: first_name, // save the first name
          last_name: last_name,   // save the last name
          company_name: company_name || 'University of Georgia', // faculty get uga as company name
          email: email,           // store email for easier admin management
        },
      ]);

    if (rolesError) {
      console.error('[Register Rep] Failed to insert into user_roles:', rolesError.message);
      // important: clean up the created auth user if the role assignment fails
      await supabaseAdmin.auth.admin.deleteUser(user.id);
      return res.status(500).json({ error: 'Failed to assign a role to the new user. The user was not created.' });
    }

    // step 4: return a success message that tells them what type of account was created
    const accountType = is_faculty ? 'Faculty/Staff' : 'Company Representative';
    return res.status(200).json({ 
      message: `${accountType} account created successfully. Awaiting admin approval.` 
    });

  } catch (error) {
    console.error('[Register Rep] Unexpected server error:', error);
    return res.status(500).json({ error: 'An internal server error occurred.' });
  }
}
