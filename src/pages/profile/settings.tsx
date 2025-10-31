// pages/profile/settings.tsx - universal profile settings page for all user types

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import { 
  UserCircleIcon, 
  EnvelopeIcon, 
  PhoneIcon,
  BriefcaseIcon,
  AcademicCapIcon,
  BuildingOfficeIcon,
  ArrowLeftIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface ProfileData {
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  bio: string;
  profile_picture_url: string;
  role: string;
  // student fields
  major?: string;
  graduation_year?: string;
  gpa?: string;
  resume_url?: string;
  linkedin_url?: string;
  // rep fields
  company_name?: string;
  job_title?: string;
  company_website?: string;
  
}

export default function ProfileSettings() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  
  // profile form data
  const [profileData, setProfileData] = useState<ProfileData>({
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
    bio: '',
    profile_picture_url: '',
    role: '',
    major: '',
    graduation_year: '',
    gpa: '',
    resume_url: '',
    linkedin_url: '',
    company_name: '',
    job_title: '',
    company_website: '',
 
  });

  // check if user is logged in and load their profile data
  useEffect(() => {
    const loadProfile = async () => {
      try {
        // get current user session
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

        if (sessionError || !sessionData.session) {
          router.push('/login');
          return;
        }

        const user = sessionData.session.user;
        setUserId(user.id);

        // fetch user profile from user_roles table
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (roleError || !roleData) {
          setErrorMessage('failed to load profile data');
          setLoading(false);
          return;
        }

        // populate form with existing data
        setProfileData({
          first_name: roleData.first_name || '',
          last_name: roleData.last_name || '',
          email: user.email || '',
          phone_number: roleData.phone_number || '',
          bio: roleData.bio || '',
          profile_picture_url: roleData.profile_picture_url || '',
          role: roleData.role || '',
          major: roleData.major || '',
          graduation_year: roleData.graduation_year || '',
          gpa: roleData.gpa || '',
          resume_url: roleData.resume_url || '',
          linkedin_url: roleData.linkedin_url || '',
          company_name: roleData.company_name || '',
          job_title: roleData.job_title || '',
          company_website: roleData.company_website || '',
        
        });

        setLoading(false);
      } catch (error) {
        console.error('error loading profile:', error);
        setErrorMessage('an error occurred while loading your profile');
        setLoading(false);
      }
    };

    loadProfile();
  }, [router]);

  // handle form field changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProfileData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  // handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMessage('');
    setErrorMessage('');

    try {
      // call api to update profile
      const response = await fetch('/api/profile/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userId,
          email: profileData.email,
          profileData: profileData,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setErrorMessage(result.error || 'failed to update profile');
        setSaving(false);
        return;
      }

      setSuccessMessage('profile updated successfully!');
      setSaving(false);

      // redirect back to dashboard after 2 seconds
      setTimeout(() => {
        if (profileData.role === 'student') {
          router.push('/student/dashboard');
        } else if (profileData.role === 'rep') {
          router.push('/rep/dashboard');
        } else if (profileData.role === 'faculty') {
          router.push('/faculty/dashboard');
        } else if (profileData.role === 'admin') {
          router.push('/admin/dashboard');
        }
      }, 2000);

    } catch (error) {
      console.error('error updating profile:', error);
      setErrorMessage('an error occurred while updating your profile');
      setSaving(false);
    }
  };

  // get dashboard link based on role
  const getDashboardLink = () => {
    if (profileData.role === 'student') return '/student/dashboard';
    if (profileData.role === 'rep') return '/rep/dashboard';
    if (profileData.role === 'faculty') return '/faculty/dashboard';
    if (profileData.role === 'admin') return '/admin/dashboard';
    return '/';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-red-700"></div>
          <p className="mt-4 text-gray-600">loading your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* header with back button */}
      <div className="bg-red-700 text-white py-6 shadow-lg">
        <div className="max-w-4xl mx-auto px-4">
          <Link href={getDashboardLink()}>
            <button className="flex items-center gap-2 text-white hover:text-gray-200 mb-4">
              <ArrowLeftIcon className="h-5 w-5" />
              Back To Dashboard
            </button>
          </Link>
          <h1 className="text-3xl font-bold">Profile Settings</h1>
          <p className="text-red-100 mt-2">Manage Your Account Information</p>
        </div>
      </div>

      {/* profile form */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* success/error messages */}
        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
            <CheckCircleIcon className="h-6 w-6 text-green-600" />
            <p className="text-green-800">{successMessage}</p>
          </div>
        )}

        {errorMessage && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
            <XCircleIcon className="h-6 w-6 text-red-600" />
            <p className="text-red-800">{errorMessage}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* basic information section */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3 mb-6">
              <UserCircleIcon className="h-6 w-6 text-red-700" />
              <h2 className="text-xl font-bold text-gray-900">Basic Information</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  first name *
                </label>
                <input
                  type="text"
                  name="first_name"
                  value={profileData.first_name}
                  onChange={handleChange}
                  required
                  className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  last name *
                </label>
                <input
                  type="text"
                  name="last_name"
                  value={profileData.last_name}
                  onChange={handleChange}
                  required
                  className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  email *
                </label>
                <input
                  type="email"
                  name="email"
                  value={profileData.email}
                  onChange={handleChange}
                  required
                  className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  phone number
                </label>
                <input
                  type="tel"
                  name="phone_number"
                  value={profileData.phone_number}
                  onChange={handleChange}
                  placeholder="(123) 456-7890"
                  className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
              </div>
            </div>

            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                bio / about me
              </label>
              <textarea
                name="bio"
                value={profileData.bio}
                onChange={handleChange}
                rows={4}
                placeholder="tell us a little about yourself..."
                className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
            </div>

            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                profile picture url
              </label>
              <input
                type="url"
                name="profile_picture_url"
                value={profileData.profile_picture_url}
                onChange={handleChange}
                placeholder="https://example.com/your-photo.jpg"
                className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
              <p className="text-sm text-gray-500 mt-1">
                paste a link to your profile picture (optional)
              </p>
            </div>
          </div>

          {/* student-specific fields */}
          {profileData.role === 'student' && (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center gap-3 mb-6">
                <AcademicCapIcon className="h-6 w-6 text-red-700" />
                <h2 className="text-xl font-bold text-gray-900">Academic Information</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    major
                  </label>
                  <input
                    type="text"
                    name="major"
                    value={profileData.major}
                    onChange={handleChange}
                    placeholder="e.g., computer science"
                    className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    expected graduation year
                  </label>
                  <input
                    type="text"
                    name="graduation_year"
                    value={profileData.graduation_year}
                    onChange={handleChange}
                    placeholder="e.g., 2025"
                    className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    gpa (optional)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="4.0"
                    name="gpa"
                    value={profileData.gpa}
                    onChange={handleChange}
                    placeholder="e.g., 3.75"
                    className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    linkedin profile
                  </label>
                  <input
                    type="url"
                    name="linkedin_url"
                    value={profileData.linkedin_url}
                    onChange={handleChange}
                    placeholder="https://linkedin.com/in/yourprofile"
                    className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>
              </div>

              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  resume url
                </label>
                <input
                  type="url"
                  name="resume_url"
                  value={profileData.resume_url}
                  onChange={handleChange}
                  placeholder="https://example.com/your-resume.pdf"
                  className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
                <p className="text-sm text-gray-500 mt-1">
                  upload your resume to google drive or dropbox and paste the public link here
                </p>
              </div>
            </div>
          )}

          {/* rep-specific fields */}
          {profileData.role === 'rep' && (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center gap-3 mb-6">
                <BuildingOfficeIcon className="h-6 w-6 text-red-700" />
                <h2 className="text-xl font-bold text-gray-900">Company Information</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    company name
                  </label>
                  <input
                    type="text"
                    name="company_name"
                    value={profileData.company_name}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    your job title
                  </label>
                  <input
                    type="text"
                    name="job_title"
                    value={profileData.job_title}
                    onChange={handleChange}
                    placeholder="e.g., hr manager"
                    className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    company website
                  </label>
                  <input
                    type="url"
                    name="company_website"
                    value={profileData.company_website}
                    onChange={handleChange}
                    placeholder="https://yourcompany.com"
                    className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    linkedin profile
                  </label>
                  <input
                    type="url"
                    name="linkedin_url"
                    value={profileData.linkedin_url}
                    onChange={handleChange}
                    placeholder="https://linkedin.com/in/yourprofile"
                    className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>
              </div>
            </div>
          )}

          

          {/* save button */}
          <div className="flex justify-end gap-4">
            <Link href={getDashboardLink()}>
              <button
                type="button"
                className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-50"
              >
                cancel
              </button>
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 bg-red-700 text-white rounded-lg font-semibold hover:bg-red-800 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {saving ? 'saving...' : 'save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
