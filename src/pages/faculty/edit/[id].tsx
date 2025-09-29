// pages/faculty/edit/[id].tsx - Enhanced version matching create page

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

// Common skills for quick selection
const commonSkills = [
  'Communication',
  'Teamwork',
  'Problem Solving',
  'Microsoft Office',
  'Excel',
  'Project Management',
  'Customer Service',
  'Leadership',
  'Data Analysis',
  'Social Media',
  'Marketing',
  'Sales',
  'Python',
  'JavaScript',
  'SQL',
  'Research',
  'Writing',
  'Presentation'
];

export default function EditJobPosting() {
  const router = useRouter();
  const { id } = router.query;

  const [formData, setFormData] = useState({
    title: '',
    company: '',
    industry: '',
    job_type: '',
    location: '',
    salary_range: '',
    description: '',
    requirements: '',
    deadline: '',
    application_link: '', // Changed from apply_method to match database
  });

  // Skills as array for better management
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [customSkill, setCustomSkill] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // For rich text description (basic formatting)
  const [descriptionLength, setDescriptionLength] = useState(0);
  
  // Store original creator to verify ownership
  const [originalCreator, setOriginalCreator] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchJob = async () => {
      try {
        // First check if user is authenticated
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
          router.push('/login');
          return;
        }

        // Fetch the job data
        const { data, error } = await supabase
          .from('jobs')
          .select('*')
          .eq('id', id)
          .single();

        if (error || !data) {
          setError('Job not found.');
          setLoading(false);
          return;
        }

        // Store the original creator
        setOriginalCreator(data.created_by);

        // Check if current user is the creator (faculty can only edit their own posts)
        if (data.created_by !== user.id) {
          setError('You are not authorized to edit this job posting.');
          setLoading(false);
          return;
        }

        // Populate the form with existing data
        setFormData({
          title: data.title || '',
          company: data.company || '',
          industry: data.industry || '',
          job_type: data.job_type || '',
          location: data.location || '',
          salary_range: data.salary_range || '',
          description: data.description || '',
          requirements: Array.isArray(data.requirements) 
            ? data.requirements.join('\n') 
            : '',
          deadline: data.deadline || '',
          application_link: data.application_link || data.apply_method || '', // Handle both field names
        });

        // Set selected skills
        if (Array.isArray(data.skills)) {
          setSelectedSkills(data.skills);
        }

        // Set description length
        setDescriptionLength((data.description || '').length);

        setLoading(false);
      } catch (err) {
        console.error('Error fetching job:', err);
        setError('An error occurred while loading the job.');
        setLoading(false);
      }
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
    
    if (name === 'description') {
      setDescriptionLength(value.length);
    }
  };

  const handleSkillToggle = (skill: string) => {
    setSelectedSkills(prev => 
      prev.includes(skill) 
        ? prev.filter(s => s !== skill)
        : [...prev, skill]
    );
  };

  const handleAddCustomSkill = () => {
    if (customSkill.trim() && !selectedSkills.includes(customSkill.trim())) {
      setSelectedSkills(prev => [...prev, customSkill.trim()]);
      setCustomSkill('');
    }
  };

  const handleRemoveSkill = (skill: string) => {
    setSelectedSkills(prev => prev.filter(s => s !== skill));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    // Validation
    if (!formData.title || !formData.company || !formData.industry || 
        !formData.job_type || !formData.description || !formData.location || 
        !formData.deadline || !formData.application_link) {
      setError('Please fill in all required fields.');
      setIsSubmitting(false);
      return;
    }

    if (selectedSkills.length === 0) {
      setError('Please select at least one required skill.');
      setIsSubmitting(false);
      return;
    }

    if (formData.description.length < 100) {
      setError('Job description must be at least 100 characters.');
      setIsSubmitting(false);
      return;
    }

    // Parse requirements into array (split by newline)
    const requirementsArray = formData.requirements
      .split('\n')
      .map(req => req.trim())
      .filter(Boolean);

    const { error: updateError } = await supabase
      .from('jobs')
      .update({
        title: formData.title,
        company: formData.company,
        industry: formData.industry,
        job_type: formData.job_type,
        location: formData.location,
        salary_range: formData.salary_range || null,
        description: formData.description,
        requirements: requirementsArray,
        skills: selectedSkills,
        deadline: formData.deadline,
        application_link: formData.application_link, // Use correct field name
        // Don't update created_by or status - keep original values
      })
      .eq('id', id);

    if (updateError) {
      console.error('Update error:', updateError);
      setError('Failed to update job. Please try again.');
    } else {
      setSuccess(true);
      // Scroll to top to show success message
      window.scrollTo(0, 0);
      setTimeout(() => {
        router.push('/faculty/dashboard');
      }, 2000);
    }
    setIsSubmitting(false);
  };

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-red-700"></div>
          <p className="mt-4 text-gray-600">Loading job details...</p>
        </div>
      </div>
    );
  }

  if (error && !formData.title) {
    // Show error if we couldn't load the job
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Link href="/faculty/dashboard">
          <span className="text-red-700 underline hover:text-red-900 cursor-pointer mb-6 inline-block">
            ← Back to Faculty Dashboard
          </span>
        </Link>
        <div className="bg-red-50 border border-red-300 text-red-800 p-4 rounded">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Link href="/faculty/dashboard">
        <span className="text-red-700 underline hover:text-red-900 cursor-pointer mb-6 inline-block">
          ← Back to Faculty Dashboard
        </span>
      </Link>

      <h1 className="text-3xl font-bold text-red-700 mb-6">Edit Job Posting</h1>

      {error && (
        <div className="bg-red-50 border border-red-300 text-red-800 p-4 rounded mb-4">
          ⚠️ {error}
        </div>
      )}

      {success && (
        <div className="bg-green-100 text-green-800 p-4 rounded mb-4 border border-green-300">
          ✅ Job updated successfully! Redirecting to dashboard...
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Job Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="title"
                placeholder="e.g., Marketing Intern"
                value={formData.title}
                onChange={handleChange}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-red-500 focus:border-transparent"
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
                placeholder="e.g., ABC Corporation"
                value={formData.company}
                onChange={handleChange}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-red-500 focus:border-transparent"
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
                {industries.map((industry) => (
                  <option key={industry} value={industry}>
                    {industry}
                  </option>
                ))}
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="location"
                placeholder="e.g., New York, NY or Remote"
                value={formData.location}
                onChange={handleChange}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-red-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Salary/Pay Range <span className="text-gray-500 text-xs">(optional)</span>
              </label>
              <input
                type="text"
                name="salary_range"
                placeholder="e.g., $15-20/hour or $50,000-$60,000"
                value={formData.salary_range}
                onChange={handleChange}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Job Description Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Job Details</h2>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Job Description <span className="text-red-500">*</span>
              <span className="float-right text-xs text-gray-500">
                {descriptionLength}/5000 characters (min. 100)
              </span>
            </label>
            <textarea
              name="description"
              placeholder="Provide a detailed description of the role, responsibilities, and what you're looking for in a candidate..."
              value={formData.description}
              onChange={handleChange}
              className="w-full p-3 border rounded focus:ring-2 focus:ring-red-500 focus:border-transparent"
              rows={8}
              maxLength={5000}
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Tip: Include day-to-day responsibilities, team structure, and growth opportunities
            </p>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Requirements <span className="text-gray-500 text-xs">(one per line)</span>
            </label>
            <textarea
              name="requirements"
              placeholder="Enter each requirement on a new line:&#10;• Bachelor's degree in relevant field&#10;• 2+ years of experience&#10;• Strong communication skills"
              value={formData.requirements}
              onChange={handleChange}
              className="w-full p-3 border rounded focus:ring-2 focus:ring-red-500 focus:border-transparent"
              rows={5}
            />
          </div>
        </div>

        {/* Skills Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Required Skills <span className="text-red-500">*</span>
          </h2>
          
          <div className="space-y-4">
            {/* Common Skills Grid */}
            <div>
              <p className="text-sm text-gray-600 mb-2">Select from common skills:</p>
              <div className="flex flex-wrap gap-2">
                {commonSkills.map(skill => (
                  <button
                    key={skill}
                    type="button"
                    onClick={() => handleSkillToggle(skill)}
                    className={`px-3 py-1 rounded-full text-sm transition-colors ${
                      selectedSkills.includes(skill)
                        ? 'bg-red-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {skill}
                  </button>
                ))}
              </div>
            </div>

            {/* Add Custom Skill */}
            <div>
              <p className="text-sm text-gray-600 mb-2">Add custom skills:</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customSkill}
                  onChange={(e) => setCustomSkill(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCustomSkill())}
                  placeholder="Type a skill and press Enter"
                  className="flex-1 p-2 border rounded focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={handleAddCustomSkill}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Selected Skills Display */}
            {selectedSkills.length > 0 && (
              <div>
                <p className="text-sm text-gray-600 mb-2">Selected skills ({selectedSkills.length}):</p>
                <div className="flex flex-wrap gap-2">
                  {selectedSkills.map(skill => (
                    <span
                      key={skill}
                      className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm flex items-center gap-1"
                    >
                      {skill}
                      <button
                        type="button"
                        onClick={() => handleRemoveSkill(skill)}
                        className="ml-1 text-red-600 hover:text-red-800"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Application Details Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Application Details</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Application Deadline <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="deadline"
                value={formData.deadline}
                onChange={handleChange}
                min={new Date().toISOString().split('T')[0]}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-red-500 focus:border-transparent"
                required
              />
              <p className="text-xs text-gray-500 mt-1">Last day students can apply</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Application Method <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="application_link"
                placeholder="e.g., https://... or hr@company.com"
                value={formData.application_link}
                onChange={handleChange}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-red-500 focus:border-transparent"
                required
              />
              <p className="text-xs text-gray-500 mt-1">Link or email where students should apply</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-4 pt-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-red-700 text-white px-4 py-3 rounded-lg font-semibold hover:bg-red-800 disabled:bg-gray-400 transition-colors"
          >
            {isSubmitting ? 'Updating Job...' : 'Update Job'}
          </button>
          <Link href="/faculty/dashboard" className="w-full">
            <button
              type="button"
              className="w-full bg-gray-200 text-gray-800 px-4 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
          </Link>
        </div>
      </form>
    </div>
  );
}