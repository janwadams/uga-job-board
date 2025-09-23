// src/pages/rep/edit-job/[id].tsx

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import {
  ExclamationTriangleIcon,
  ArrowLeftIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Job {
  id: string;
  title: string;
  company: string;
  job_type: 'Internship' | 'Part-Time' | 'Full-Time';
  industry: string;
  description: string;
  deadline: string;
  status: 'pending' | 'active' | 'rejected';
  rejection_note?: string;
  location?: string;
  salary_range?: string;
  requirements?: string[];
  created_by: string;
}

const INDUSTRIES = [
  'Technology', 'Healthcare', 'Finance', 'Education', 'Retail',
  'Manufacturing', 'Marketing', 'Sales', 'Engineering', 'Design',
  'Consulting', 'Legal', 'Non-Profit', 'Government', 'Media',
  'Hospitality', 'Real Estate', 'Transportation', 'Energy', 'Agriculture'
];

export default function EditJob() {
  const router = useRouter();
  const { id } = router.query;
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  // Form fields
  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [jobType, setJobType] = useState<'Internship' | 'Part-Time' | 'Full-Time'>('Full-Time');
  const [industry, setIndustry] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [location, setLocation] = useState('');
  const [salaryRange, setSalaryRange] = useState('');
  const [requirements, setRequirements] = useState('');
  const [rejectionNote, setRejectionNote] = useState('');
  const [originalStatus, setOriginalStatus] = useState<string>('');

  useEffect(() => {
    if (id) {
      checkAuthAndLoadJob();
    }
  }, [id]);

  const checkAuthAndLoadJob = async () => {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error || !session) {
      router.push('/login');
      return;
    }

    // Check if user is a rep
    const { data: userData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', session.user.id)
      .single();

    if (userData?.role !== 'rep') {
      router.push('/unauthorized');
      return;
    }

    setSession(session);
    loadJob(session.user.id);
  };

  const loadJob = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', id)
        .eq('created_by', userId) // Ensure the rep owns this job
        .single();

      if (error || !data) {
        console.error('Error loading job:', error);
        alert('Job not found or you do not have permission to edit it.');
        router.push('/rep/job-status');
        return;
      }

      // Populate form fields
      setTitle(data.title);
      setCompany(data.company);
      setJobType(data.job_type);
      setIndustry(data.industry);
      setDescription(data.description);
      setDeadline(data.deadline ? data.deadline.split('T')[0] : '');
      setLocation(data.location || '');
      setSalaryRange(data.salary_range || '');
      setRequirements(data.requirements ? data.requirements.join('\n') : '');
      setRejectionNote(data.rejection_note || '');
      setOriginalStatus(data.status);
    } catch (error) {
      console.error('Unexpected error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!session) return;

    // Validation
    if (!title || !company || !jobType || !industry || !description) {
      alert('Please fill in all required fields');
      return;
    }

    setSaving(true);
    setSuccessMessage('');

    try {
      // Parse requirements (split by newline)
      const requirementsArray = requirements
        .split('\n')
        .filter(req => req.trim())
        .map(req => req.trim());

      const { error } = await supabase
        .from('jobs')
        .update({
          title,
          company,
          job_type: jobType,
          industry,
          description,
          deadline: deadline || null,
          location: location || null,
          salary_range: salaryRange || null,
          requirements: requirementsArray.length > 0 ? requirementsArray : null,
          status: 'pending', // Reset to pending for re-review
          rejection_note: null // Clear the rejection note
        })
        .eq('id', id);

      if (error) {
        console.error('Error updating job:', error);
        alert('Error updating job. Please try again.');
      } else {
        setSuccessMessage('Job updated and resubmitted for review!');
        setTimeout(() => {
          router.push('/rep/job-status');
        }, 2000);
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      alert('An unexpected error occurred. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <p className="mt-2 text-gray-600">Loading job...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/rep/job-status">
            <button className="flex items-center text-blue-600 hover:text-blue-700 mb-4">
              <ArrowLeftIcon className="h-4 w-4 mr-1" />
              Back to Job Status
            </button>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Edit Job Posting</h1>
          <p className="text-gray-600 mt-2">
            Update your job posting and resubmit for approval
          </p>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center">
            <CheckCircleIcon className="h-5 w-5 text-green-600 mr-2" />
            <p className="text-green-800">{successMessage}</p>
          </div>
        )}

        {/* Rejection Note Display */}
        {rejectionNote && originalStatus === 'rejected' && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mt-0.5 mr-2 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-900">Admin Feedback on Previous Submission:</p>
                <p className="text-sm text-red-800 mt-1">{rejectionNote}</p>
                <p className="text-xs text-red-600 mt-2">
                  Please address these issues before resubmitting.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6 space-y-6">
            {/* Basic Information */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Job Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Marketing Intern"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Company Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Tech Corp"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Job Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={jobType}
                    onChange={(e) => setJobType(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="Internship">Internship</option>
                    <option value="Part-Time">Part-Time</option>
                    <option value="Full-Time">Full-Time</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Industry <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">Select Industry</option>
                    {INDUSTRIES.map(ind => (
                      <option key={ind} value={ind}>{ind}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Job Details */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Job Details</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Job Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Provide a detailed description of the role, responsibilities, and what you're looking for..."
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Be specific and detailed to avoid rejection. Include day-to-day responsibilities and expectations.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Requirements (one per line)
                  </label>
                  <textarea
                    value={requirements}
                    onChange={(e) => setRequirements(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Bachelor's degree in relevant field&#10;2+ years of experience&#10;Strong communication skills"
                  />
                </div>
              </div>
            </div>

            {/* Additional Information */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Additional Information</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., New York, NY or Remote"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Salary Range
                  </label>
                  <input
                    type="text"
                    value={salaryRange}
                    onChange={(e) => setSalaryRange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., $50,000 - $70,000"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Including salary improves approval chances
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Application Deadline
                  </label>
                  <input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Tips for Approval */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">Tips for Quick Approval:</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Provide complete and detailed job descriptions</li>
              <li>• Include salary range when possible</li>
              <li>• Avoid discriminatory language or unrealistic requirements</li>
              <li>• Be specific about responsibilities and expectations</li>
              <li>• Set a reasonable application deadline (at least 2 weeks out)</li>
            </ul>
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end gap-4">
            <Link href="/rep/job-status">
              <button
                type="button"
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Resubmitting...' : 'Resubmit for Review'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}