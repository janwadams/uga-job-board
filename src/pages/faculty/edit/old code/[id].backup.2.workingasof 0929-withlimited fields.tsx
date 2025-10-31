//edit job posting Faculty


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

export default function EditJobPosting() {
  const router = useRouter();
  const { id } = router.query;

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

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;

    const fetchJob = async () => {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !data) {
        setError('Job not found.');
        setLoading(false);
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
        });
        setLoading(false);
      }
    };

    fetchJob();
  }, [id]);

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

    const parsedSkills = formData.skills
      .split(',')
      .map((skill) => skill.trim())
      .filter(Boolean);

    const { error: updateError } = await supabase
      .from('jobs')
      .update({
        title: formData.title,
        company: formData.company,
        industry: formData.industry,
        job_type: formData.job_type,
        description: formData.description,
        skills: parsedSkills,
        deadline: formData.deadline,
        apply_method: formData.apply_method,
      })
      .eq('id', id);

    if (updateError) {
      setError('Failed to update job.');
    } else {
      setSuccess(true);
      setTimeout(() => {
        router.push('/faculty/dashboard');
      }, 1500);
    }
    setIsSubmitting(false);
  };

  if (loading) return <p className="p-4">Loading job...</p>;
  if (error) return <p className="p-4 text-red-600">{error}</p>;

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <Link href="/faculty/dashboard">
        <span className="text-red-700 underline hover:text-red-900 cursor-pointer mb-6 inline-block">
          ← Back to Faculty Dashboard
        </span>
      </Link>

      <h1 className="text-3xl font-bold text-red-700 mb-6">Edit Job Posting</h1>

      {success && <p className="text-green-600 mb-4">✅ Job updated successfully! Redirecting...</p>}
      {error && <p className="text-red-600 mb-4">{error}</p>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <input type="text" name="title" value={formData.title} onChange={handleChange} className="w-full p-2 border rounded" placeholder="Job Title" />
        <input type="text" name="company" value={formData.company} onChange={handleChange} className="w-full p-2 border rounded" placeholder="Company" />
        
        <select name="industry" value={formData.industry} onChange={handleChange} className="w-full p-2 border rounded">
          <option value="">Select Industry</option>
          {industries.map(ind => <option key={ind} value={ind}>{ind}</option>)}
        </select>

        <select name="job_type" value={formData.job_type} onChange={handleChange} className="w-full p-2 border rounded">
          <option value="">Select Job Type</option>
          <option value="Internship">Internship</option>
          <option value="Part-Time">Part-Time</option>
          <option value="Full-Time">Full-Time</option>
        </select>

        <textarea name="description" value={formData.description} onChange={handleChange} className="w-full p-2 border rounded" placeholder="Job Description" />

        <input type="text" name="skills" value={formData.skills} onChange={handleChange} className="w-full p-2 border rounded" placeholder="Required Skills (comma separated)" />

        <label className="block font-medium mb-1">
          Application Deadline <span className="text-sm text-gray-500">(last day students can apply)</span>
        </label>
        <input type="date" name="deadline" value={formData.deadline} onChange={handleChange} className="w-full p-2 border rounded" />

        <input type="text" name="apply_method" value={formData.apply_method} onChange={handleChange} className="w-full p-2 border rounded" placeholder="Application Method (e.g. link or email)" />
        
        <div className="flex items-center gap-4 pt-4">
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full bg-red-700 text-white px-4 py-2 rounded hover:bg-red-800 disabled:bg-gray-400"
            >
              {isSubmitting ? 'Updating...' : 'Update Job'}
            </button>
             <Link href="/faculty/dashboard" className="w-full">
                <button
                type="button"
                className="w-full bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300"
                >
                Cancel
                </button>
            </Link>
        </div>
      </form>
    </div>
  );
}

