import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../utils/supabaseClient';

export default function CreateJobPosting() {
  const router = useRouter();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    company: '',
    industry: '',
    job_type: '',
    description: '',
    skills: '',
    deadline: '',
    apply_method: '',
  });

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  // ✅ Fetch user + role on mount
  useEffect(() => {
    const fetchUserRole = async () => {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.push('/login');
        return;
      }

      setUserId(user.id);

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

      if (role !== 'faculty' && role !== 'staff') {
        router.push('/unauthorized');
      }
    };

    fetchUserRole();
  }, [router]);

  // ✅ Handle input changes
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // ✅ Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const requiredFields = [
      'title',
      'company',
      'industry',
      'job_type',
      'description',
      'skills',
      'deadline',
      'apply_method',
    ];
    for (const field of requiredFields) {
      if (!formData[field as keyof typeof formData]) {
        setError(`Field "${field}" is required.`);
        return;
      }
    }

    // ✅ Convert comma-separated string to array
    const parsedSkills = formData.skills
      .split(',')
      .map((skill) => skill.trim())
      .filter(Boolean);

    const newJob = {
      title: formData.title,
      company: formData.company,
      industry: formData.industry,
      job_type: formData.job_type,
      description: formData.description,
      skills: parsedSkills,
      deadline: formData.deadline,
      apply_method: formData.apply_method,
      created_by: userId,
      status: 'active',
    };

    const { error: insertError } = await supabase.from('jobs').insert([newJob]);

    if (insertError) {
      console.error('Supabase insert error:', insertError.message, insertError.details);
      setError('Failed to create job posting. Please try again.');
    } else {
      setSuccess(true);
      setFormData({
        title: '',
        company: '',
        industry: '',
        job_type: '',
        description: '',
        skills: '',
        deadline: '',
        apply_method: '',
      });
    }
  };

  if (!userRole) return <p>Loading...</p>;

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-red-700 mb-6">Create Job Posting</h1>

      {error && <p className="text-red-600 mb-4">{error}</p>}

      {success && (
        <div className="bg-green-100 text-green-800 p-4 rounded mb-4 border border-green-300">
          ✅ Job created successfully!{' '}
          <a
            href="/faculty/dashboard"
            className="underline text-red-700 font-medium hover:text-red-900 ml-2"
          >
            ← Back to Faculty Dashboard
          </a>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          name="title"
          placeholder="Job Title"
          value={formData.title}
          onChange={handleChange}
          className="w-full p-2 border rounded"
        />
        <input
          type="text"
          name="company"
          placeholder="Company"
          value={formData.company}
          onChange={handleChange}
          className="w-full p-2 border rounded"
        />
        <input
          type="text"
          name="industry"
          placeholder="Industry"
          value={formData.industry}
          onChange={handleChange}
          className="w-full p-2 border rounded"
        />

        <select
          name="job_type"
          value={formData.job_type}
          onChange={handleChange}
          className="w-full p-2 border rounded"
        >
          <option value="">Select Job Type</option>
          <option value="Internship">Internship</option>
          <option value="Part-Time">Part-Time</option>
          <option value="Full-Time">Full-Time</option>
        </select>

        <textarea
          name="description"
          placeholder="Job Description"
          value={formData.description}
          onChange={handleChange}
          className="w-full p-2 border rounded"
        />
        <input
          type="text"
          name="skills"
          placeholder="Required Skills (comma separated)"
          value={formData.skills}
          onChange={handleChange}
          className="w-full p-2 border rounded"
        />

        <label className="block font-medium mb-1">
          Application Deadline{' '}
          <span className="text-sm text-gray-500">(last day students can apply)</span>
        </label>
        <input
          type="date"
          name="deadline"
          value={formData.deadline}
          onChange={handleChange}
          className="w-full p-2 border rounded"
          placeholder="Deadline"
          title="This is the last day students can apply"
        />

        <input
          type="text"
          name="apply_method"
          placeholder="Application Method (e.g. link or email)"
          value={formData.apply_method}
          onChange={handleChange}
          className="w-full p-2 border rounded"
        />

        <button
          type="submit"
          className="bg-red-700 text-white px-4 py-2 rounded hover:bg-red-800"
        >
          Create Job
        </button>
      </form>
    </div>
  );
}
