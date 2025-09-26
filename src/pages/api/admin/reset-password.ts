// /pages/api/admin/reset-password.ts
// api endpoint for test mode password resets
// allows password updates without email verification during testing

import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

// create admin client with service role key for full access
// this allows us to update any user's password
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // only allow post requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, newPassword, testMode } = req.body;

    // validate required fields
    if (!email || !newPassword) {
      return res.status(400).json({ 
        error: 'Email and new password are required' 
      });
    }

    // validate password strength
    if (newPassword.length < 6) {
      return res.status(400).json({ 
        error: 'Password must be at least 6 characters long' 
      });
    }

    // only allow test mode in development environment
    const isTestEnvironment = process.env.NODE_ENV === 'development' || 
                             process.env.NEXT_PUBLIC_TEST_MODE === 'true';
    
    if (testMode && !isTestEnvironment) {
      return res.status(403).json({ 
        error: 'Test mode is not allowed in production' 
      });
    }

    // first, list all users to find the one with matching email
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error('Error listing users:', listError);
      return res.status(500).json({ 
        error: 'Failed to look up user',
        details: listError.message 
      });
    }

    // find the user with the matching email
    const user = users.find(u => u.email?.toLowerCase() === email.toLowerCase());
    
    if (!user) {
      return res.status(404).json({ 
        error: 'User not found with that email address' 
      });
    }

    // update the user's password using their ID
    const { data, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      { password: newPassword }
    );

    if (updateError) {
      console.error('Password update error:', updateError);
      return res.status(500).json({ 
        error: 'Failed to update password',
        details: updateError.message 
      });
    }

    // log the password reset for audit purposes
    console.log(`Password reset for user: ${email} (ID: ${user.id}) - Test Mode: ${testMode || false}`);

    // return success response
    return res.status(200).json({ 
      success: true,
      message: 'Password updated successfully',
      userId: user.id,
      email: email,
      testMode: testMode || false
    });

  } catch (error) {
    console.error('Unexpected error in reset-password API:', error);
    return res.status(500).json({ 
      error: 'An unexpected error occurred',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}