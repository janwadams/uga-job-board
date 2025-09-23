//edit job posting for rep - /rep/edit/[id].tsx

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../../utils/supabaseClient';
import Link from 'next/link';

// A predefined list of industries for the dropdown
const industries = [
  'Technology',
  'Healthcare',
  'Finance',
  'Education',
  'Marketing & Advertising',
  'Engineering',
  'Sales',
  'Retail',
  'Hospitality',
  'Government',
  'Non-Profit',
  'Manufacturing',
  'Arts & Entertainment',
  'Other',
];

interface JobData {
  title: string;
  company: string;
  industry: string;
  job_type: string;
  description: string;
  skills: string;
  deadline: string;
  apply_method: string;
  location?: string;
  salary_range?: string;
  status?: string;
  rejection_note?: string;
}

export default function EditJobPosting() {
  const router = useRouter();
  const { id } = router.query;

  const [formData, setFormData] = useState<JobData>({
    title: '',
    company: '',
    industry: '',
    job_type: '',
    description: '',
    skills: '',
    deadline: '',
    apply_method: '',
    location: '',
    salary_range: '',
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rejectionNote, setRejectionNote] = useState<string | null>(null);
  const [originalStatus, setOriginalStatus] = useState<string>('');

  useEffect(() => {
    if (!id) return;

    const fetchJob = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', id)
        .eq('created_by', user.id)
        .single();

      if (error || !data) {
        setError('Job not found or you are not authorized to edit.');
        setTimeout(() => router.push('/rep/dashboard'), 2000);
      } else {
        setFormData({
          title: data.title,
          company: data.company,
          industry: data.industry,
          job_type: data.job_type,
          description: data.description,
          skills: (data.skills || []).join(', '),
          deadline: data.deadline,
          apply_method: data.apply_method,
          location: data.location || '',
          salary_range: data.salary_range || '',
        });
        
        // Store rejection info if job was rejected
        if (data.status === 'rejected' && data.rejection_note) {
          setRejectionNote(data.rejection_note);
          setOriginalStatus(data.status);
        }
      }

      setLoading(false);
    };

    fetchJob();
  }, [id, router]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    // Validation
    if (!formData.title || !formData.company || !formData.industry || 
        !formData.job_type || !formData.description) {
      setError('Please fill in all required fields.');
      setIsSubmitting(false);
      return;
    }

    const parsedSkills = formData.skills
      .split(',')
      .map((skill) => skill.trim())
      .filter(Boolean);

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        setError('Authentication error. Please log in again.');
        setIsSubmitting(false);
        return;
    }

    const updateData: any = {
      title: formData.title,
      company: formData.company,
      industry: formData.industry,
      job_type: formData.job_type,
      description: formData.description,
      skills: parsedSkills,
      deadline: formData.deadline || null,
      apply_method: formData.apply_method,
      location: formData.location || null,
      salary_range: formData.salary_range || null,
    };

    // If this was a rejected job being edited, reset to pending and clear rejection note
    if (originalStatus === 'rejected') {
      updateData.status = 'pending';
      updateData.rejection_note = null;
    }

    const { error: updateError } = await supabase
      .from('jobs')
      .update(updateData)
      .eq('id', id)
      .eq('created_by', user.id);

    if (updateError) {
      setError('Failed to update job. Please try again.');
    } else {
      setSuccess(true);
      const successMessage = originalStatus === 'rejected' 
        ? 'Job updated and resubmitted for review!' 
        : 'Job updated successfully!';
      
      // Show success message briefly before redirecting
      setTimeout(() => {
        router.push('/rep/job-status');
      }, 2000);
    }
    setIsSubmitting(false);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-600">Loading job...</p>
    </div>
  );
  
  if (error && !formData.title) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-red-600">{error}</p>
    </div>
  );

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <Link href="/rep/job-status">
        <span className="text-red-700 underline hover:text-red-900 cursor-pointer mb-6 inline-block">
          ← Back to Job Status
        </span>
      </Link>

      <h1 className="text-3xl font-bold text-red-700 mb-2">Edit Job Posting</h1>
      <p className="text-gray-600 mb-6">
        {originalStatus === 'rejected' 
          ? 'Update your job posting and resubmit for approval'
          : 'Update your job posting details'}
      </p>

      {/* Success Message */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <p className="text-green-800">
            ✅ {originalStatus === 'rejected' 
              ? 'Job updated and resubmitted for review! Redirecting...' 
              : 'Job updated successfully! Redirecting...'}
          </p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Rejection Note Display */}
      {rejectionNote && originalStatus === 'rejected' && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-red-900">Admin Feedback on Previous Submission:</h3>
              <p className="text-sm text-red-800 mt-1">{rejectionNote}</p>
              <p className="text-xs text-red-600 mt-2">
                Please address these issues before resubmitting.
              </p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Job Title <span className="text-red-500">*</span>
              </label>
              <input 
                type="text" 
                name="title" 
                value={formData.title} 
                onChange={handleChange} 
                className="w-full p-2 border rounded focus:ring-2 focus:ring-red-500 focus:border-transparent" 
                placeholder="e.g., Marketing Intern"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Company <span className="text-red-500">*</span>
              </label>
              <input 
                type="text" 
                name="company" 
                value={formData.company} 
                onChange={handleChange} 
                className="w-full p-2 border rounded focus:ring-2 focus:ring-red-500 focus:border-transparent" 
                placeholder="Company Name"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Industry <span className="text-red-500">*</span>
              </label>
              <select 
                name="industry" 
                value={formData.industry} 
                onChange={handleChange} 
                className="w-full p-2 border rounded focus:ring-2 focus:ring-red-500 focus:border-transparent"
                required
              >
                <option value="">Select Industry</option>
                {industries.map(ind => <option key={ind} value={ind}>{ind}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Job Type <span className="text-red-500">*</span>
              </label>
              <select 
                name="job_type" 
                value={formData.job_type} 
                onChange={handleChange} 
                className="w-full p-2 border rounded focus:ring-2 focus:ring-red-500 focus:border-transparent"
                required
              >
                <option value="">Select Job Type</option>
                <option value="Internship">Internship</option>
                <option value="Part-Time">Part-Time</option>
                <option value="Full-Time">Full-Time</option>
              </select>
            </div>
          </div>
        </div>

        {/* Job Details Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Job Details</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Job Description <span className="text-red-500">*</span>
              </label>
              <textarea 
                name="description" 
                value={formData.description} 
                onChange={handleChange} 
                className="w-full p-2 border rounded focus:ring-2 focus:ring-red-500 focus:border-transparent" 
                placeholder="Provide a detailed description of the role, responsibilities, and requirements..."
                rows={6}
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Be specific and detailed to avoid rejection. Include day-to-day responsibilities.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Required Skills <span className="text-sm text-gray-500">(comma separated)</span>
              </label>
              <input 
                type="text" 
                name="skills" 
                value={formData.skills} 
                onChange={handleChange} 
                className="w-full p-2 border rounded focus:ring-2 focus:ring-red-500 focus:border-transparent" 
                placeholder="e.g., Communication, Excel, Project Management"
              />
            </div>
          </div>
        </div>

        {/* Additional Information Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Additional Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location
              </label>
              <input 
                type="text" 
                name="location" 
                value={formData.location} 
                onChange={handleChange} 
                className="w-full p-2 border rounded focus:ring-2 focus:ring-red-500 focus:border-transparent" 
                placeholder="e.g., New York, NY or Remote"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Salary Range
              </label>
              <input 
                type="text" 
                name="salary_range" 
                value={formData.salary_range} 
                onChange={handleChange} 
                className="w-full p-2 border rounded focus:ring-2 focus:ring-red-500 focus:border-transparent" 
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
                name="deadline" 
                value={formData.deadline} 
                onChange={handleChange} 
                className="w-full p-2 border rounded focus:ring-2 focus:ring-red-500 focus:border-transparent"
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Application Method <span className="text-sm text-gray-500">(link or email)</span>
              </label>
              <input 
                type="text" 
                name="apply_method" 
                value={formData.apply_method} 
                onChange={handleChange} 
                className="w-full p-2 border rounded focus:ring-2 focus:ring-red-500 focus:border-transparent" 
                placeholder="https://... or email@company.com"
              />
            </div>
          </div>
        </div>

        {/* Tips for Approval */}
        {originalStatus === 'rejected' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">Tips for Quick Approval:</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Address all feedback points from the admin</li>
              <li>• Provide complete and detailed job descriptions</li>
              <li>• Include salary range when possible</li>
              <li>• Avoid discriminatory language or unrealistic requirements</li>
              <li>• Set a reasonable application deadline (at least 2 weeks out)</li>
            </ul>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-4 pt-4">
          <button 
            type="submit" 
            disabled={isSubmitting}
            className="w-full bg-red-700 text-white px-4 py-2 rounded hover:bg-red-800 disabled:bg-gray-400 transition-colors"
          >
            {isSubmitting 
              ? 'Updating...' 
              : originalStatus === 'rejected' 
                ? 'Resubmit for Review' 
                : 'Update Job'}
          </button>
          <Link href="/rep/job-status" className="w-full">
            <button
              type="button"
              className="w-full bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
          </Link>
        </div>
      </form>
    </div>
  );
}