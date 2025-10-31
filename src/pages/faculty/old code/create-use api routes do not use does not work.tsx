import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../utils/supabaseClient';
import Link from 'next/link';

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

  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [customSkill, setCustomSkill] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);
  
  const [descriptionLength, setDescriptionLength] = useState(0);

  const getDashboardPath = (role: string) => {
    switch(role) {
      case 'faculty':
        return '/faculty/dashboard';
      case 'rep':
        return '/rep/dashboard';
      case 'staff':
        return '/staff/dashboard';
      default:
        return '/dashboard';
    }
  };

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

    // get the current user and their session token
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session) {
        setError('User not authenticated. Please log in again.');
        setLoading(false);
        return;
    }

    // check that all required fields are filled in
    if (!formData.title || !formData.company || !formData.industry || 
        !formData.job_type || !formData.description || !formData.location || 
        !formData.deadline || !formData.apply_method) {
      setError('Please fill in all required fields.');
      setLoading(false);
      return;
    }

    // make sure at least one skill is selected
    if (selectedSkills.length === 0) {
      setError('Please select at least one required skill.');
      setLoading(false);
      return;
    }

    // job description needs to be at least 100 characters long
    if (formData.description.length < 100) {
      setError('Job description must be at least 100 characters.');
      setLoading(false);
      return;
    }

    // split requirements by line breaks into an array
    const requirementsArray = formData.requirements
      .split('\n')
      .map(req => req.trim())
      .filter(Boolean);

    // prepare the job data to send to the api
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
      application_link: formData.apply_method,
    };
    
    try {
      // call our secure api endpoint to create the job
      const response = await fetch('/api/faculty/jobs/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(newJob)
      });

      const result = await response.json();

      if (!response.ok) {
        // if the api returned an error, show it to the user
        throw new Error(result.error || 'Failed to create job posting');
      }

      // job was created successfully
      setSuccess(true);
      
      // clear out the form
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
      
      // wait 2 seconds then redirect to dashboard
      setTimeout(() => {
        const dashPath = getDashboardPath(userRole || '');
        router.push(dashPath);
      }, 2000);

    } catch (err: any) {
      console.error('error creating job:', err);
      setError(err.message || 'Failed to create job posting. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const dashboardPath = getDashboardPath(userRole || '');

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Create New Job Posting</h1>
        <p className="text-gray-600 mt-2">
          Fill out the form below to post a new opportunity for students
        </p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 font-medium">Error: {error}</p>
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800 font-medium">
            ✓ Job posting created successfully! Redirecting to dashboard...
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
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
                Company Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="company"
                placeholder="e.g., Acme Corporation"
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

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Required Skills <span className="text-red-500">*</span>
          </h2>
          
          <div className="space-y-4">
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

        <div className="flex items-center gap-4 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-red-700 text-white px-4 py-3 rounded-lg font-semibold hover:bg-red-800 disabled:bg-gray-400 transition-colors"
          >
            {loading ? 'Creating Job Posting...' : 'Create Job Posting'}
          </button>
          <Link href={dashboardPath} className="w-full">
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
