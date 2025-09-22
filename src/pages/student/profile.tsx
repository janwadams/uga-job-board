// src/pages/student/profile.tsx

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import { 
  UserCircleIcon,
  BriefcaseIcon,
  BuildingOfficeIcon,
  AcademicCapIcon,
  SparklesIcon,
  CheckCircleIcon,
  XMarkIcon,
  PlusIcon
} from '@heroicons/react/24/outline';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface StudentProfile {
  id?: string;
  user_id: string;
  interests: string[];
  skills: string[];
  preferred_job_types: string[];
  preferred_industries: string[];
}

const JOB_TYPES = ['Internship', 'Part-Time', 'Full-Time'];
const INDUSTRIES = [
  'Technology', 'Healthcare', 'Finance', 'Education', 'Retail',
  'Manufacturing', 'Marketing', 'Sales', 'Engineering', 'Design',
  'Consulting', 'Legal', 'Non-Profit', 'Government', 'Media',
  'Hospitality', 'Real Estate', 'Transportation', 'Energy', 'Agriculture'
];

const COMMON_SKILLS = [
  'Communication', 'Teamwork', 'Problem Solving', 'Leadership', 'Time Management',
  'Microsoft Office', 'Data Analysis', 'Project Management', 'Customer Service',
  'Sales', 'Marketing', 'Social Media', 'Writing', 'Research', 'Presentation',
  'JavaScript', 'Python', 'Java', 'React', 'SQL', 'Excel', 'Photoshop',
  'Public Speaking', 'Negotiation', 'Critical Thinking'
];

export default function StudentProfile() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  // Profile fields
  const [interests, setInterests] = useState<string[]>([]);
  const [skills, setSkills] = useState<string[]>([]);
  const [preferredJobTypes, setPreferredJobTypes] = useState<string[]>([]);
  const [preferredIndustries, setPreferredIndustries] = useState<string[]>([]);
  
  // Input fields for custom additions
  const [newInterest, setNewInterest] = useState('');
  const [newSkill, setNewSkill] = useState('');

  useEffect(() => {
    checkAuthAndLoadProfile();
  }, []);

  const checkAuthAndLoadProfile = async () => {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error || !session) {
      router.push('/login');
      return;
    }

    // Check if user is a student
    const { data: userData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', session.user.id)
      .single();

    if (userData?.role !== 'student') {
      router.push('/unauthorized');
      return;
    }

    setSession(session);
    loadProfile(session.user.id);
  };

  const loadProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('student_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading profile:', error);
      } else if (data) {
        setInterests(data.interests || []);
        setSkills(data.skills || []);
        setPreferredJobTypes(data.preferred_job_types || []);
        setPreferredIndustries(data.preferred_industries || []);
      }
    } catch (error) {
      console.error('Unexpected error:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    if (!session) return;
    
    setSaving(true);
    setSuccessMessage('');

    const profileData = {
      user_id: session.user.id,
      interests,
      skills,
      preferred_job_types: preferredJobTypes,
      preferred_industries: preferredIndustries
    };

    try {
      // Check if profile exists
      const { data: existingProfile } = await supabase
        .from('student_profiles')
        .select('id')
        .eq('user_id', session.user.id)
        .single();

      let error;
      if (existingProfile) {
        // Update existing profile
        ({ error } = await supabase
          .from('student_profiles')
          .update(profileData)
          .eq('user_id', session.user.id));
      } else {
        // Create new profile
        ({ error } = await supabase
          .from('student_profiles')
          .insert(profileData));
      }

      if (error) {
        console.error('Error saving profile:', error);
        alert('Error saving profile. Please try again.');
      } else {
        setSuccessMessage('Profile saved successfully!');
        setTimeout(() => setSuccessMessage(''), 3000);
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      alert('An unexpected error occurred. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const toggleJobType = (jobType: string) => {
    setPreferredJobTypes(prev =>
      prev.includes(jobType)
        ? prev.filter(jt => jt !== jobType)
        : [...prev, jobType]
    );
  };

  const toggleIndustry = (industry: string) => {
    setPreferredIndustries(prev =>
      prev.includes(industry)
        ? prev.filter(ind => ind !== industry)
        : [...prev, industry]
    );
  };

  const toggleSkill = (skill: string) => {
    setSkills(prev =>
      prev.includes(skill)
        ? prev.filter(s => s !== skill)
        : [...prev, skill]
    );
  };

  const addInterest = () => {
    if (newInterest.trim() && !interests.includes(newInterest.trim())) {
      setInterests([...interests, newInterest.trim()]);
      setNewInterest('');
    }
  };

  const removeInterest = (interest: string) => {
    setInterests(interests.filter(i => i !== interest));
  };

  const addSkill = () => {
    if (newSkill.trim() && !skills.includes(newSkill.trim())) {
      setSkills([...skills, newSkill.trim()]);
      setNewSkill('');
    }
  };

  const removeSkill = (skill: string) => {
    setSkills(skills.filter(s => s !== skill));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <p className="mt-2 text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/student/dashboard">
            <button className="text-blue-600 hover:text-blue-700 mb-4">
              ← Back to Dashboard
            </button>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
          <p className="text-gray-600 mt-2">
            Set your preferences to get personalized job recommendations
          </p>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center">
            <CheckCircleIcon className="h-5 w-5 text-green-600 mr-2" />
            <p className="text-green-800">{successMessage}</p>
          </div>
        )}

        {/* Profile Sections */}
        <div className="space-y-6">
          {/* Preferred Job Types */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center mb-4">
              <BriefcaseIcon className="h-6 w-6 text-blue-600 mr-2" />
              <h2 className="text-xl font-semibold text-gray-900">Preferred Job Types</h2>
            </div>
            <p className="text-gray-600 mb-4">Select the types of opportunities you're interested in</p>
            <div className="flex flex-wrap gap-2">
              {JOB_TYPES.map(jobType => (
                <button
                  key={jobType}
                  onClick={() => toggleJobType(jobType)}
                  className={`px-4 py-2 rounded-full transition-colors ${
                    preferredJobTypes.includes(jobType)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {jobType}
                </button>
              ))}
            </div>
          </div>

          {/* Preferred Industries */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center mb-4">
              <BuildingOfficeIcon className="h-6 w-6 text-blue-600 mr-2" />
              <h2 className="text-xl font-semibold text-gray-900">Preferred Industries</h2>
            </div>
            <p className="text-gray-600 mb-4">Select industries you'd like to work in</p>
            <div className="flex flex-wrap gap-2">
              {INDUSTRIES.map(industry => (
                <button
                  key={industry}
                  onClick={() => toggleIndustry(industry)}
                  className={`px-4 py-2 rounded-full transition-colors ${
                    preferredIndustries.includes(industry)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {industry}
                </button>
              ))}
            </div>
          </div>

          {/* Skills */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center mb-4">
              <AcademicCapIcon className="h-6 w-6 text-blue-600 mr-2" />
              <h2 className="text-xl font-semibold text-gray-900">Skills</h2>
            </div>
            <p className="text-gray-600 mb-4">Select your skills or add custom ones</p>
            
            {/* Common Skills */}
            <div className="flex flex-wrap gap-2 mb-4">
              {COMMON_SKILLS.map(skill => (
                <button
                  key={skill}
                  onClick={() => toggleSkill(skill)}
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${
                    skills.includes(skill)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {skill}
                </button>
              ))}
            </div>

            {/* Add Custom Skill */}
            <div className="flex gap-2 mt-4">
              <input
                type="text"
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addSkill()}
                placeholder="Add a custom skill"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
              <button
                onClick={addSkill}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <PlusIcon className="h-5 w-5" />
              </button>
            </div>

            {/* Custom Skills Display */}
            {skills.filter(s => !COMMON_SKILLS.includes(s)).length > 0 && (
              <div className="mt-4">
                <p className="text-sm text-gray-600 mb-2">Custom Skills:</p>
                <div className="flex flex-wrap gap-2">
                  {skills.filter(s => !COMMON_SKILLS.includes(s)).map(skill => (
                    <span
                      key={skill}
                      className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm flex items-center gap-1"
                    >
                      {skill}
                      <button
                        onClick={() => removeSkill(skill)}
                        className="ml-1 hover:text-blue-600"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Interests */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center mb-4">
              <SparklesIcon className="h-6 w-6 text-blue-600 mr-2" />
              <h2 className="text-xl font-semibold text-gray-900">Interests</h2>
            </div>
            <p className="text-gray-600 mb-4">Add keywords that describe your interests (e.g., "sustainability", "startup", "remote work")</p>
            
            {/* Add Interest */}
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newInterest}
                onChange={(e) => setNewInterest(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addInterest()}
                placeholder="Add an interest"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
              <button
                onClick={addInterest}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <PlusIcon className="h-5 w-5" />
              </button>
            </div>

            {/* Interests Display */}
            {interests.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {interests.map(interest => (
                  <span
                    key={interest}
                    className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm flex items-center gap-1"
                  >
                    {interest}
                    <button
                      onClick={() => removeInterest(interest)}
                      className="ml-1 hover:text-purple-600"
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {interests.length === 0 && (
              <p className="text-gray-500 text-sm">No interests added yet</p>
            )}
          </div>
        </div>

        {/* Save Button */}
        <div className="mt-8 flex justify-end gap-4">
          <Link href="/student/dashboard">
            <button className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50">
              Cancel
            </button>
          </Link>
          <button
            onClick={saveProfile}
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </div>

        {/* Profile Completion Status */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">Profile Completion Tips:</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Select at least one job type to get started</li>
            <li>• Choose 2-3 industries you're most interested in</li>
            <li>• Add 5-10 relevant skills to improve job matching</li>
            <li>• Include specific interests to get better recommendations</li>
          </ul>
        </div>
      </div>
    </div>
  );
}