//create job posting for rep/faculty/create.tsx - improved version

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../utils/supabaseClient';
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

export default function CreateJobPosting() {
  const router = useRouter();
  const [userRole, setUserRole] = useState<string | null>(null);

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
    apply_method: '',
  });

  // Skills as array for better management
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [customSkill, setCustomSkill] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);
  
  // For rich text description (basic formatting)
  const [descriptionLength, setDescriptionLength] = useState(0);

  useEffect(() => {
    const fetchUserRole = async () => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        router.push('/login');
        return;
      }

      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (roleError || !roleData) {
        router.push('/unauthorized');
        return;
      }

      const role = roleData.role;
      setUserRole(role);

      if (role !== 'rep' && role !== 'faculty' && role !== 'staff') {
        router.push('/unauthorized');
      }
    };
    fetchUserRole();
  }, [router]);

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
    setLoading(true);
    setError(null);
    setSuccess(false);

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
        setError('User not authenticated. Please log in again.');
        setLoading(false);
        return;
    }

    // Validation
    if (!formData.title || !formData.company || !formData.industry || 
        !formData.job_type || !formData.description || !formData.location || 
        !formData.deadline || !formData.apply_method) {
      setError('Please fill in all required fields.');
      setLoading(false);
      return;
    }

    if (selectedSkills.length === 0) {
      setError('Please select at least one required skill.');
      setLoading(false);
      return;
    }

    if (formData.description.length < 100) {
      setError('Job description must be at least 100 characters.');
      setLoading(false);
      return;
    }

    // Parse requirements into array (split by newline)
    const requirementsArray = formData.requirements
      .split('\n')
      .map(req => req.trim())
      .filter(Boolean);

    const newJob = {
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
      apply_method: formData.apply_method,
      created_by: user.id,
      status: 'pending',
    };
    
    const { error: insertError } = await supabase.from('jobs').insert([newJob]);

    if (insertError) {
      console.error('Supabase insert error:', insertError.message, insertError.details);
      setError('Failed to create job posting. Please try again.');
    } else {
      setSuccess(true);
      // Reset form
      setFormData({
        title: '',
        company: '',
        industry: '',
        job_type: '',
        location: '',
        salary_range: '',
        description: '',
        requirements: '',
        deadline: '',
        apply_method: '',
      });
      setSelectedSkills([]);
      setDescriptionLength(0);
      
      // Redirect after 2 seconds
      setTimeout(() => {
        router.push('/rep/dashboard');
      }, 2000);
    }
    setLoading(false);
  };

  if (!userRole) return <p className="p-6 text-center">Loading...</p>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Link href="/rep/dashboard">
        <span className="text-red-700 underline hover:text-red-900 cursor-pointer mb-6 inline-block">
          ← Back to Dashboard
        </span>
      </Link>
      
      <h1 className="text-3xl font-bold text-red-700 mb-6">Create Job Posting</h1>

      {error && (
        <div className="bg-red-50 border border-red-300 text-red-800 p-4 rounded mb-4">
          ⚠️ {error}
        </div>
      )}

      {success && (
        <div className="bg-green-100 text-green-800 p-4 rounded mb-4 border border-green-300">
          ✅ Job created successfully! Your posting is awaiting review. Redirecting...
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
                name="apply_method"
                placeholder="e.g., https://... or hr@company.com"
                value={formData.apply_method}
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
            disabled={loading}
            className="w-full bg-red-700 text-white px-4 py-3 rounded-lg font-semibold hover:bg-red-800 disabled:bg-gray-400 transition-colors"
          >
            {loading ? 'Creating Job Posting...' : 'Create Job Posting'}
          </button>
          <Link href="/rep/dashboard" className="w-full">
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