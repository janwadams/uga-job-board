import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/router';
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
  location: string;
  deadline: string;
  job_type: string;
  status: 'active' | 'pending' | 'removed' | 'rejected';
  created_by: string;
}

// Reusable Job Card Component
const JobCard = ({ job, onRemove }: { job: Job, onRemove: (jobId: string) => void }) => {
  const statusColors: Record<Job['status'], string> = {
    active: 'bg-green-100 text-green-800',
    pending: 'bg-yellow-100 text-yellow-800',
    removed: 'bg-red-100 text-red-800',
    rejected: 'bg-gray-100 text-gray-800',
  };

  const isArchived = job.status === 'removed' || job.status === 'rejected';

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-md p-6 flex flex-col h-full">
      <div className="flex-grow">
        <div className="flex justify-between items-start">
            <h2 className="font-bold text-xl text-gray-800">{job.title}</h2>
            <span className={`px-3 py-1 text-xs font-semibold rounded-full ${statusColors[job.status]}`}>
                {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
            </span>
        </div>
        <p className="text-gray-600 mb-2">{job.company}</p>
        <p className="text-sm text-gray-500">
          Deadline: {new Date(job.deadline).toLocaleDateString()}
        </p>
      </div>

      <div className="mt-6 pt-4 border-t border-gray-200 flex items-center justify-end gap-3">
        <Link href={`/rep/edit/${job.id}`}>
          <button
            disabled={isArchived}
            className={`px-4 py-2 rounded font-semibold text-sm transition-colors ${
              isArchived
                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            Edit
          </button>
        </Link>
        <button
          onClick={() => onRemove(job.id)}
          disabled={isArchived}
          className={`px-4 py-2 rounded font-semibold text-sm transition-colors ${
            isArchived
              ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
              : 'bg-gray-600 text-white hover:bg-gray-700'
          }`}
        >
          Remove
        </button>
      </div>
    </div>
  );
};


export default function RepDashboard() {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const checkSession = async () => {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !sessionData.session) {
        router.push('/login');
        return;
      }

      const user = sessionData.session.user;
      
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();
        
      if (roleError || !roleData || roleData.role !== 'rep') {
          router.push('/unauthorized');
          return;
      }
      
      setUserRole(roleData.role);
      setSession(sessionData.session);
    };
    checkSession();
  }, [router]);

  useEffect(() => {
    const fetchJobs = async () => {
      if (!session?.user) {
        setLoading(false);
        return;
      }
      
      const userId = session.user.id;
      setLoading(true);

      let query = supabase
        .from('jobs')
        .select('*')
        .eq('created_by', userId)
        .order('created_at', { ascending: false });

      if (statusFilter) {
        query = query.eq('status', statusFilter);
      }
      
      const { data, error } = await query;

      if (error) {
        console.error('Error fetching jobs:', error);
        setJobs([]);
      } else {
        setJobs(data as Job[] || []);
      }

      setLoading(false);
    };

    if (session) {
      fetchJobs();
    }
  }, [session, statusFilter]);

  const handleRemove = async (jobId: string) => {
    if (!confirm('Are you sure you want to remove this posting?')) {
      return;
    }

    const { error } = await supabase
      .from('jobs')
      .update({ status: 'removed' })
      .eq('id', jobId);

    if (error) {
      alert('Failed to remove job.');
    } else {
      setJobs((prev) =>
        prev.map((job) =>
          job.id === jobId ? { ...job, status: 'removed' } : job
        )
      );
    }
  };
  
  // Calculate metrics from the jobs list
  const totalJobs = jobs.length;
  const activeJobs = useMemo(() => jobs.filter(j => j.status === 'active').length, [jobs]);
  const pendingJobs = useMemo(() => jobs.filter(j => j.status === 'pending').length, [jobs]);

  if (!session || !userRole) {
    return <p className="p-8 text-center">Loading dashboard...</p>;
  }

  return (
    <div className="bg-gray-50 min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-red-800">💼 Rep Dashboard</h1>
          <Link href="/rep/create">
            <button className="bg-red-700 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-800 transition-colors shadow-sm">
              + Post a New Job
            </button>
          </Link>
        </div>

        {/* --- METRICS CARDS --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                <h3 className="text-gray-500 font-semibold">Total Jobs Posted</h3>
                <p className="text-4xl font-bold text-gray-800 mt-2">{totalJobs}</p>
            </div>
             <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                <h3 className="text-gray-500 font-semibold">Pending Review</h3>
                <p className="text-4xl font-bold text-yellow-500 mt-2">{pendingJobs}</p>
            </div>
             <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                <h3 className="text-gray-500 font-semibold">Active Jobs</h3>
                <p className="text-4xl font-bold text-green-600 mt-2">{activeJobs}</p>
            </div>
        </div>

        {/* --- FILTER AND JOB LISTINGS --- */}
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Your Job Postings</h2>
            <div>
              <label htmlFor="statusFilter" className="mr-2 font-medium text-sm text-gray-700">Filter by Status:</label>
              <select
                id="statusFilter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="p-2 border border-gray-300 rounded-md shadow-sm focus:ring-red-500 focus:border-red-500"
              >
                <option value="">All</option>
                <option value="pending">Pending</option>
                <option value="active">Active</option>
                <option value="removed">Removed</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>

          {loading ? (
            <p className="text-center text-gray-500 py-10">Loading your jobs...</p>
          ) : jobs.length === 0 ? (
            <div className="text-center py-10">
              <h3 className="text-xl font-semibold text-gray-700">No jobs posted yet.</h3>
              <p className="text-gray-500 mt-2">Click the "Post a New Job" button to get started.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {jobs.map((job) => (
                <JobCard key={job.id} job={job} onRemove={handleRemove} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

