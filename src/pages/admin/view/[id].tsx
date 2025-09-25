// /src/pages/admin/view/[id].tsx
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Job {
  id: string;
  title: string;
  company: string;
  job_type: string;
  industry: string;
  location?: string;
  salary_range?: string;
  description: string;
  requirements?: string[];
  skills?: string[];
  deadline: string;
  status: string;
  created_at: string;
  created_by: string;
  application_link?: string;
}

interface Creator {
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  company_name?: string;
}

export default function ViewJobPage() {
  const router = useRouter();
  const { id } = router.query;
  const [job, setJob] = useState<Job | null>(null);
  const [creator, setCreator] = useState<Creator | null>(null);
  const [loading, setLoading] = useState(true);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (id) {
      fetchJobDetails(id as string);
    }
  }, [id]);

  const fetchJobDetails = async (jobId: string) => {
    try {
      // Fetch job details
      const { data: jobData, error: jobError } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', jobId)
        .single();

      if (jobError) throw jobError;
      
      setJob(jobData);

      // Check if job is expired
      const deadline = new Date(jobData.deadline);
      const today = new Date();
      setIsExpired(deadline < today);

      // Fetch creator details
      const { data: userData, error: userError } = await supabase
        .from('user_roles')
        .select('first_name, last_name, role, company_name')
        .eq('user_id', jobData.created_by)
        .single();

      if (!userError && userData) {
        // Get email from auth.users
        const { data: authData } = await supabase
          .from('auth.users')
          .select('email')
          .eq('id', jobData.created_by)
          .single();

        setCreator({
          ...userData,
          email: authData?.email || 'N/A'
        });
      }
    } catch (error) {
      console.error('Error fetching job details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReactivate = async () => {
    const newDeadline = prompt("Enter new deadline (YYYY-MM-DD):");
    if (!newDeadline || !job) return;

    try {
      const { error } = await supabase
        .from('jobs')
        .update({ 
          deadline: newDeadline,
          status: 'active' 
        })
        .eq('id', job.id);

      if (!error) {
        alert('Job reactivated successfully!');
        router.push('/admin/dashboard');
      } else {
        alert('Failed to reactivate job.');
      }
    } catch (error) {
      console.error('Error reactivating job:', error);
    }
  };

  const handleDelete = async () => {
    if (!job || !window.confirm('Are you sure you want to permanently delete this job posting?')) return;

    try {
      const { error } = await supabase
        .from('jobs')
        .delete()
        .eq('id', job.id);

      if (!error) {
        alert('Job deleted successfully!');
        router.push('/admin/dashboard');
      } else {
        alert('Failed to delete job.');
      }
    } catch (error) {
      console.error('Error deleting job:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getDaysUntilDeadline = (deadline: string) => {
    const deadlineDate = new Date(deadline);
    const today = new Date();
    const diffTime = deadlineDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-lg">Loading job details...</div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen">
        <div className="text-lg mb-4">Job not found</div>
        <Link href="/admin/dashboard">
          <button className="px-4 py-2 bg-red-700 text-white rounded hover:bg-red-800">
            Back to Dashboard
          </button>
        </Link>
      </div>
    );
  }

  const daysUntilDeadline = getDaysUntilDeadline(job.deadline);

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">{job.title}</h1>
          <p className="text-xl text-gray-600 mt-2">{job.company}</p>
        </div>
        <Link href="/admin/dashboard">
          <button className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">
            Back to Dashboard
          </button>
        </Link>
      </div>

      {/* Status Badge */}
      <div className="mb-6">
        {isExpired ? (
          <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-semibold">
            Archived (Expired {Math.abs(daysUntilDeadline)} days ago)
          </span>
        ) : (
          <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
            job.status === 'active' ? 'bg-green-100 text-green-800' :
            job.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
            job.status === 'rejected' ? 'bg-red-100 text-red-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
            {!isExpired && job.status === 'active' && ` (${daysUntilDeadline} days until deadline)`}
          </span>
        )}
      </div>

      {/* Job Details Card */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">Job Information</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <p className="text-sm text-gray-500">Type</p>
            <p className="font-medium">{job.job_type}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Industry</p>
            <p className="font-medium">{job.industry}</p>
          </div>
          {job.location && (
            <div>
              <p className="text-sm text-gray-500">Location</p>
              <p className="font-medium">{job.location}</p>
            </div>
          )}
          {job.salary_range && (
            <div>
              <p className="text-sm text-gray-500">Salary Range</p>
              <p className="font-medium">{job.salary_range}</p>
            </div>
          )}
          <div>
            <p className="text-sm text-gray-500">Application Deadline</p>
            <p className="font-medium">{formatDate(job.deadline)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Posted On</p>
            <p className="font-medium">{formatDate(job.created_at)}</p>
          </div>
        </div>

        {job.skills && job.skills.length > 0 && (
          <div className="mb-6">
            <p className="text-sm text-gray-500 mb-2">Required Skills</p>
            <div className="flex flex-wrap gap-2">
              {job.skills.map((skill, index) => (
                <span key={index} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="mb-6">
          <p className="text-sm text-gray-500 mb-2">Description</p>
          <p className="whitespace-pre-wrap">{job.description}</p>
        </div>

        {job.requirements && job.requirements.length > 0 && (
          <div className="mb-6">
            <p className="text-sm text-gray-500 mb-2">Requirements</p>
            <ul className="list-disc list-inside space-y-1">
              {job.requirements.map((req, index) => (
                <li key={index}>{req}</li>
              ))}
            </ul>
          </div>
        )}

        {job.application_link && (
          <div>
            <p className="text-sm text-gray-500 mb-2">Application Link</p>
            <a href={job.application_link} target="_blank" rel="noopener noreferrer" 
               className="text-blue-600 hover:text-blue-800 underline">
              {job.application_link}
            </a>
          </div>
        )}
      </div>

      {/* Creator Information Card */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">Posted By</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">Name</p>
            <p className="font-medium">
              {creator?.role === 'rep' && creator?.company_name 
                ? creator.company_name 
                : `${creator?.first_name || ''} ${creator?.last_name || ''}`}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Email</p>
            <p className="font-medium">{creator?.email || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Role</p>
            <p className="font-medium capitalize">{creator?.role || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">User ID</p>
            <p className="font-medium font-mono text-sm">{job.created_by}</p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <Link href={`/admin/edit/${job.id}`}>
          <button className="px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium">
            Edit Job
          </button>
        </Link>
        
        {isExpired && (
          <button 
            onClick={handleReactivate}
            className="px-6 py-3 bg-green-600 text-white rounded hover:bg-green-700 font-medium"
          >
            Reactivate Job
          </button>
        )}
        
        <button 
          onClick={handleDelete}
          className="px-6 py-3 bg-red-600 text-white rounded hover:bg-red-700 font-medium"
        >
          Delete Job
        </button>
      </div>
    </div>
  );
}