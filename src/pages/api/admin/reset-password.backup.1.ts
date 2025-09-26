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

    // first, we need to find the user by email to get their id
    const { data: userData, error: userError } = await supabaseAdmin
      .from('auth.users')
      .select('id')
      .eq('email', email.toLowerCase())
      .single();

    if (userError || !userData) {
      console.error('User lookup error:', userError);
      return res.status(404).json({ 
        error: 'User not found with that email address' 
      });
    }

    // update the user's password using the admin api
    const { data, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      userData.id,
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
    console.log(`Password reset for user: ${email} (ID: ${userData.id}) - Test Mode: ${testMode || false}`);

    // return success response
    return res.status(200).json({ 
      success: true,
      message: 'Password updated successfully',
      userId: userData.id,
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