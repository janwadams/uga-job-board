// pages/api/auth/update.ts - api endpoint to update user profile information

import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

// initialize supabase admin client with service role key for all operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'method not allowed' });
  }

  const { userId, email, profileData } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'user id is required' });
  }

  try {
    // step 1: update email in auth.users if it changed
    if (email) {
      const { error: emailError } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        { email: email }
      );

      if (emailError) {
        console.error('[Profile Update] failed to update email:', emailError.message);
        return res.status(400).json({ error: 'failed to update email. it may already be in use.' });
      }
    }

    // step 2: update profile data in user_roles table using admin client
    const { error: profileError } = await supabaseAdmin
      .from('user_roles')
      .update({
        first_name: profileData.first_name,
        last_name: profileData.last_name,
        phone_number: profileData.phone_number,
        bio: profileData.bio,
        profile_picture_url: profileData.profile_picture_url,
        // student-specific fields
        major: profileData.major,
        graduation_year: profileData.graduation_year,
        gpa: profileData.gpa ? parseFloat(profileData.gpa) : null,
        resume_url: profileData.resume_url,
        linkedin_url: profileData.linkedin_url,
        // rep-specific fields
        job_title: profileData.job_title,
        company_website: profileData.company_website,
        company_name: profileData.company_name,
      })
      .eq('user_id', userId);

    if (profileError) {
      console.error('[Profile Update] failed to update profile:', profileError.message);
      return res.status(500).json({ error: 'failed to update profile information' });
    }

    // step 3: return success
    return res.status(200).json({ message: 'profile updated successfully' });

  } catch (error) {
    console.error('[Profile Update] unexpected error:', error);
    return res.status(500).json({ error: 'an internal server error occurred' });
  }
}