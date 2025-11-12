// pages/settings.tsx
// Account settings page for faculty to update their profile information

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import { ArrowLeftIcon, CheckCircleIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface UserProfile {
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  department: string;
  job_title: string;
  office_location: string;
  office_hours: string;
}

export default function Settings() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  const [profile, setProfile] = useState<UserProfile>({
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
    department: '',
    job_title: '',
    office_location: '',
    office_hours: ''
  });

  // check if user is logged in
  useEffect(() => {
    const checkSession = async () => {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !sessionData.session) {
        router.push('/login');
        return;
      }

      const user = sessionData.session.user;
      
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', user.id)
        .single();
        
      if (roleError || !roleData) {
        router.push('/unauthorized');
        return;
      }
      
      setUserRole(roleData.role);
      setSession(sessionData.session);
      
      // populate form with existing data
      setProfile({
        first_name: roleData.first_name || '',
        last_name: roleData.last_name || '',
        email: roleData.email || user.email || '',
        phone_number: roleData.phone_number || '',
        department: roleData.department || '',
        job_title: roleData.job_title || '',
        office_location: roleData.office_location || '',
        office_hours: roleData.office_hours || ''
      });
      
      setLoading(false);
    };
    checkSession();
  }, [router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!session?.user) return;
    
    // validate required fields
    if (!profile.first_name || !profile.last_name || !profile.email) {
      setMessage({ type: 'error', text: 'First name, last name, and email are required.' });
      return;
    }
    
    setSaving(true);
    setMessage(null);
    
    try {
      // Get the session token
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      
      if (!currentSession?.access_token) {
        throw new Error('No valid session found');
      }

      // Call the secure API route
      const response = await fetch('/api/profile/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentSession.access_token}`
        },
        body: JSON.stringify({
          first_name: profile.first_name,
          last_name: profile.last_name,
          email: profile.email,
          phone_number: profile.phone_number,
          department: profile.department,
          job_title: profile.job_title,
          office_location: profile.office_location,
          office_hours: profile.office_hours
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update profile');
      }
      
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      
      // clear success message after 3 seconds
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      console.error('Error updating profile:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to update profile.' });
    } finally {
      setSaving(false);
    }
  };

  const getDashboardLink = () => {
    switch (userRole) {
      case 'faculty':
        return '/faculty/dashboard';
      case 'student':
        return '/student/dashboard';
      case 'rep':
        return '/rep/dashboard';
      case 'admin':
        return '/admin/dashboard';
      default:
        return '/';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* header */}
        <div className="mb-8">
          <Link href={getDashboardLink()}>
            <button className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4">
              <ArrowLeftIcon className="h-5 w-5" />
              Back to Dashboard
            </button>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Account Settings</h1>
          <p className="text-gray-600 mt-2">Update your personal information</p>
        </div>

        {/* message display */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
            message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}>
            {message.type === 'success' ? (
              <CheckCircleIcon className="h-5 w-5" />
            ) : (
              <ExclamationCircleIcon className="h-5 w-5" />
            )}
            <p>{message.text}</p>
          </div>
        )}

        {/* settings form */}
        <div className="bg-white shadow-md rounded-lg p-6 border border-gray-200">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* basic information section */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Basic Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 mb-2">
                    First Name <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    id="first_name"
                    name="first_name"
                    value={profile.first_name}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 mb-2">
                    Last Name <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    id="last_name"
                    name="last_name"
                    value={profile.last_name}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={profile.email}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label htmlFor="phone_number" className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    id="phone_number"
                    name="phone_number"
                    value={profile.phone_number}
                    onChange={handleChange}
                    placeholder="(123) 456-7890"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* faculty-specific information section */}
            {userRole === 'faculty' && (
              <div className="pt-6 border-t border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Faculty Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="department" className="block text-sm font-medium text-gray-700 mb-2">
                      Department
                    </label>
                    <select
                      id="department"
                      name="department"
                      value={profile.department}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    >
                      <option value="">Select Department</option>
                      <option value="Computer Science">Computer Science</option>
                      <option value="Engineering">Engineering</option>
                      <option value="Business">Business</option>
                      <option value="Biology">Biology</option>
                      <option value="Chemistry">Chemistry</option>
                      <option value="Physics">Physics</option>
                      <option value="Mathematics">Mathematics</option>
                      <option value="Psychology">Psychology</option>
                      <option value="English">English</option>
                      <option value="History">History</option>
                      <option value="Economics">Economics</option>
                      <option value="Political Science">Political Science</option>
                      <option value="Sociology">Sociology</option>
                      <option value="Education">Education</option>
                      <option value="Art">Art</option>
                      <option value="Music">Music</option>
                      <option value="Theatre">Theatre</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="job_title" className="block text-sm font-medium text-gray-700 mb-2">
                      Title/Position
                    </label>
                    <select
                      id="job_title"
                      name="job_title"
                      value={profile.job_title}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    >
                      <option value="">Select Title</option>
                      <option value="Professor">Professor</option>
                      <option value="Associate Professor">Associate Professor</option>
                      <option value="Assistant Professor">Assistant Professor</option>
                      <option value="Lecturer">Lecturer</option>
                      <option value="Senior Lecturer">Senior Lecturer</option>
                      <option value="Adjunct Professor">Adjunct Professor</option>
                      <option value="Visiting Professor">Visiting Professor</option>
                      <option value="Research Professor">Research Professor</option>
                      <option value="Professor Emeritus">Professor Emeritus</option>
                      <option value="Instructor">Instructor</option>
                      <option value="Teaching Assistant">Teaching Assistant</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="office_location" className="block text-sm font-medium text-gray-700 mb-2">
                      Office Location
                    </label>
                    <input
                      type="text"
                      id="office_location"
                      name="office_location"
                      value={profile.office_location}
                      onChange={handleChange}
                      placeholder="e.g., Boyd Building, Room 304"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label htmlFor="office_hours" className="block text-sm font-medium text-gray-700 mb-2">
                      Office Hours
                    </label>
                    <input
                      type="text"
                      id="office_hours"
                      name="office_hours"
                      value={profile.office_hours}
                      onChange={handleChange}
                      placeholder="e.g., Mon/Wed 2-4 PM"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* submit button */}
            <div className="pt-6 border-t border-gray-200 flex justify-end gap-4">
              <Link href={getDashboardLink()}>
                <button
                  type="button"
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </Link>
              <button
                type="submit"
                disabled={saving}
                className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
                  saving
                    ? 'bg-gray-400 text-white cursor-not-allowed'
                    : 'bg-red-700 text-white hover:bg-red-800'
                }`}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
