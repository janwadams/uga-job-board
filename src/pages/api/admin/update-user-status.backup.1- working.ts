import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

// Initialize the Supabase Admin client with the service role key
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, isActive } = req.body;

  if (!userId || typeof isActive === 'undefined') {
    return res.status(400).json({ error: 'User ID and active status are required.' });
  }

  try {
    // Perform the update in the user_roles table
    const { data, error } = await supabaseAdmin
      .from('user_roles')
      .update({ is_active: isActive })
      .eq('user_id', userId);

    if (error) {
      console.error('Error updating user status:', error);
      return res.status(500).json({ error: 'Failed to update user status.' });
    }

    return res.status(200).json({ message: 'User status updated successfully.', data });

  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}