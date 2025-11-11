// pages/api/profile/update.ts - unified api endpoint to update user profile information for all roles

import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

// initialize supabase admin client with service role key for all operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// initialize regular supabase client for auth verification
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // support both PUT (original) and POST (new settings page)
  if (req.method !== 'PUT' && req.method !== 'POST') {
    return res.status(405).json({ error: 'method not allowed' });
  }

  try {
    // handle both old format (userId in body) and new format (token in header)
    let userId: string;
    let email: string | undefined;
    let profileData: any;

    if (req.body.userId) {
      // old format from existing code
      userId = req.body.userId;
      email = req.body.email;
      profileData = req.body.profileData || {};
    } else {
      // new format from settings page with token authentication
      const token = req.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return res.status(401).json({ error: 'no authorization token provided' });
      }

      // verify the user's session
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);

      if (authError || !user) {
        return res.status(401).json({ error: 'invalid or expired token' });
      }

      userId = user.id;
      email = req.body.email;
      profileData = req.body;
    }

    if (!userId) {
      return res.status(400).json({ error: 'user id is required' });
    }

    // validate required fields
    if (!profileData.first_name || !profileData.last_name) {
      return res.status(400).json({ error: 'first name and last name are required' });
    }

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
    // this handles all role types: student, faculty, rep, admin
    const updateData: any = {
      first_name: profileData.first_name,
      last_name: profileData.last_name,
      phone_number: profileData.phone_number || null,
      bio: profileData.bio || null,
      profile_picture_url: profileData.profile_picture_url || null,
      updated_at: new Date().toISOString()
    };

    // add student-specific fields if provided
    if (profileData.major !== undefined) updateData.major = profileData.major;
    if (profileData.graduation_year !== undefined) updateData.graduation_year = profileData.graduation_year;
    if (profileData.gpa !== undefined) updateData.gpa = profileData.gpa ? parseFloat(profileData.gpa) : null;
    if (profileData.resume_url !== undefined) updateData.resume_url = profileData.resume_url;
    if (profileData.linkedin_url !== undefined) updateData.linkedin_url = profileData.linkedin_url;

    // add rep-specific fields if provided
    if (profileData.job_title !== undefined) updateData.job_title = profileData.job_title;
    if (profileData.company_website !== undefined) updateData.company_website = profileData.company_website;
    if (profileData.company_name !== undefined) updateData.company_name = profileData.company_name;

    // add faculty-specific fields if provided
    if (profileData.department !== undefined) updateData.department = profileData.department;
    if (profileData.office_location !== undefined) updateData.office_location = profileData.office_location;
    if (profileData.office_hours !== undefined) updateData.office_hours = profileData.office_hours;

    const { data, error: profileError } = await supabaseAdmin
      .from('user_roles')
      .update(updateData)
      .eq('user_id', userId)
      .select()
      .single();

    if (profileError) {
      console.error('[Profile Update] failed to update profile:', profileError.message);
      return res.status(500).json({ error: 'failed to update profile information' });
    }

    // step 3: return success
    return res.status(200).json({ 
      success: true,
      message: 'profile updated successfully',
      data 
    });

  } catch (error: any) {
    console.error('[Profile Update] unexpected error:', error);
    return res.status(500).json({ 
      error: 'an internal server error occurred',
      details: error.message 
    });
  }
}
