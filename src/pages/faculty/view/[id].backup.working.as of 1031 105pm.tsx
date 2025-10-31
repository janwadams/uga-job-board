// /src/pages/faculty/view/[id].tsx
// page for faculty to view their job details (especially archived ones)

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

export default function ViewJobPage() {
  const router = useRouter();
  const { id } = router.query;
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [isExpired, setIsExpired] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    // check if user is logged in and is faculty
    const checkAuth = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
        router.push('/login');
        return;
      }

      // check if user is faculty
      const { data: userData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .single();

      if (userData?.role !== 'faculty') {
        router.push('/unauthorized');
        return;
      }

      setSession(session);
    };

    checkAuth();
  }, [router]);

  useEffect(() => {
    if (id && session) {
      fetchJobDetails(id as string);
    }
  }, [id, session]);

  const fetchJobDetails = async (jobId: string) => {
    try {
      // fetch job details
      const { data: jobData, error: jobError } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', jobId)
        .single();

      if (jobError) throw jobError;
      
      setJob(jobData);

      // check if job is expired
      const deadline = new Date(jobData.deadline);
      const today = new Date();
      setIsExpired(deadline < today);

      // check if current user owns this job
      if (session) {
        setIsOwner(jobData.created_by === session.user.id);
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

    // validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(newDeadline)) {
      alert('Please enter date in YYYY-MM-DD format');
      return;
    }

    // check if date is in the future
    const selectedDate = new Date(newDeadline);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate <= today) {
      alert('Please select a future date');
      return;
    }

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
        router.push('/faculty/dashboard');
      } else {
        alert('Failed to reactivate job.');
      }
    } catch (error) {
      console.error('Error reactivating job:', error);
    }
  };

  const handleDelete = async () => {
    if (!job || !window.confirm('Are you sure you want to permanently delete this job posting? This action cannot be undone.')) return;

    try {
      const { error } = await supabase
        .from('jobs')
        .delete()
        .eq('id', job.id);

      if (!error) {
        alert('Job deleted successfully!');
        router.push('/faculty/dashboard');
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
        <Link href="/faculty/dashboard">
          <button className="px-4 py-2 bg-red-700 text-white rounded hover:bg-red-800">
            Back to Dashboard
          </button>
        </Link>
      </div>
    );
  }

  // check if user owns this job
  if (!isOwner) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen">
        <div className="text-lg mb-4">You don't have permission to view this job</div>
        <Link href="/faculty/dashboard">
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
      {/* header with job title and back button */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">{job.title}</h1>
          <p className="text-xl text-gray-600 mt-2">{job.company}</p>
        </div>
        <Link href="/faculty/dashboard">
          <button className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">
            Back to Dashboard
          </button>
        </Link>
      </div>

      {/* status badge - shows if expired or active */}
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

      {/* main job details card */}
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

        {/* skills section if they exist */}
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

        {/* job description */}
        <div className="mb-6">
          <p className="text-sm text-gray-500 mb-2">Description</p>
          <p className="whitespace-pre-wrap">{job.description}</p>
        </div>

        {/* requirements if they exist */}
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

        {/* application link if it exists */}
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

      {/* posting status card */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">Posting Status</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">Current Status</p>
            <p className="font-medium capitalize">{isExpired ? 'Archived (Expired)' : job.status}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Created</p>
            <p className="font-medium">{formatDate(job.created_at)}</p>
          </div>
        </div>
      </div>

      {/* action buttons */}
      <div className="flex gap-4">
        {!isExpired && job.status !== 'removed' && job.status !== 'rejected' && (
          <Link href={`/faculty/edit/${job.id}`}>
            <button className="px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium">
              Edit Job
            </button>
          </Link>
        )}
        
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