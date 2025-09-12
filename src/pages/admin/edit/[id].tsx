import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

// It's better practice to use the shared Supabase client, but we initialize it here
// to keep the component self-contained, matching your other files.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// A complete Job interface for the form
interface JobFormData {
  title: string;
  company: string;
  industry: string;
  job_type: 'Internship' | 'Part-Time' | 'Full-Time' | '';
  description: string;
  skills: string; // Stored as a comma-separated string for the input field
  deadline: string;
  apply_method: string;
  status: 'active' | 'pending' | 'removed' | 'rejected';
}

// Predefined list of industries for the dropdown
const industries = [
  "Technology", "Healthcare", "Finance", "Education", "Marketing",
  "Engineering", "Sales", "Design", "Consulting", "Non-Profit", "Other"
];

export default function AdminEditJobPage() {
  const router = useRouter();
  const { id } = router.query;

  const [formData, setFormData] = useState<JobFormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Fetch the specific job's data when the component mounts or the ID changes
  useEffect(() => {
    if (!id) return;

    const fetchJob = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching job:', error.message);
        setError('Job not found.');
      } else if (data) {
        // Format the fetched data to match our form state shape
        setFormData({
          ...data,
          skills: Array.isArray(data.skills) ? data.skills.join(', ') : '',
          deadline: new Date(data.deadline).toISOString().split('T')[0], // Format for date input
        });
      }
      setLoading(false);
    };

    fetchJob();
  }, [id]);

  // Handle changes in any form input
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => prev ? { ...prev, [name]: value } : null);
  };

  // Handle form submission to update the job
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    // Prepare data for Supabase (e.g., parse skills back to an array)
    const updatedJob = {
      ...formData,
      skills: formData.skills.split(',').map(skill => skill.trim()).filter(Boolean),
    };

    const { error: updateError } = await supabase
      .from('jobs')
      .update(updatedJob)
      .eq('id', id);

    if (updateError) {
      console.error('Supabase update error:', updateError.message);
      setError('Failed to update job posting. Please try again.');
    } else {
      setSuccess('Job posting updated successfully!');
    }
    setLoading(false);
  };

  if (loading) return <p className="p-8 text-center">Loading job details...</p>;
  if (error) return <p className="p-8 text-center text-red-600">{error}</p>;
  if (!formData) return <p className="p-8 text-center">No job data available.</p>;

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <Link href="/admin/dashboard">
        <span className="text-red-700 underline mb-6 inline-block hover:text-red-900">
          &larr; Back to Admin Dashboard
        </span>
      </Link>

      <h1 className="text-3xl font-bold text-red-800 mb-6">Edit Job Posting</h1>
      
      {success && <p className="bg-green-100 text-green-800 p-3 rounded mb-4 border border-green-300">{success}</p>}
      {error && <p className="bg-red-100 text-red-800 p-3 rounded mb-4 border border-red-300">{error}</p>}
      
      <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 rounded-lg shadow-md border">
        {/* Job Title */}
        <input type="text" name="title" value={formData.title} onChange={handleChange} className="w-full p-2 border rounded" placeholder="Job Title" />
        {/* Company */}
        <input type="text" name="company" value={formData.company} onChange={handleChange} className="w-full p-2 border rounded" placeholder="Company" />
        
        {/* Industry Dropdown */}
        <select name="industry" value={formData.industry} onChange={handleChange} className="w-full p-2 border rounded">
          <option value="">Select Industry</option>
          {industries.map(industry => <option key={industry} value={industry}>{industry}</option>)}
        </select>

        {/* Job Type Dropdown */}
        <select name="job_type" value={formData.job_type} onChange={handleChange} className="w-full p-2 border rounded">
          <option value="">Select Job Type</option>
          <option value="Internship">Internship</option>
          <option value="Part-Time">Part-Time</option>
          <option value="Full-Time">Full-Time</option>
        </select>
        
        {/* Description */}
        <textarea name="description" value={formData.description} onChange={handleChange} className="w-full p-2 border rounded" placeholder="Job Description" rows={5} />
        
        {/* Skills */}
        <input type="text" name="skills" value={formData.skills} onChange={handleChange} className="w-full p-2 border rounded" placeholder="Skills (comma-separated)" />
        
        {/* Deadline */}
        <input type="date" name="deadline" value={formData.deadline} onChange={handleChange} className="w-full p-2 border rounded" />
        
        {/* Application Method */}
        <input type="text" name="apply_method" value={formData.apply_method} onChange={handleChange} className="w-full p-2 border rounded" placeholder="Application Method (URL or email)" />

        {/* Status Dropdown */}
         <select name="status" value={formData.status} onChange={handleChange} className="w-full p-2 border rounded">
          <option value="pending">Pending</option>
          <option value="active">Active</option>
          <option value="removed">Removed</option>
          <option value="rejected">Rejected</option>
        </select>

        <button type="submit" disabled={loading} className="w-full bg-red-700 text-white px-4 py-2 rounded hover:bg-red-800 disabled:bg-red-400">
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
    </div>
  );
}

