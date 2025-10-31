//faculty dashboard 

import { useEffect, useState } from 'react';
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
  status: string;
  created_by: string;
}

export default function FacultyDashboard() {
  const router = useRouter();
  const [jobs, setJobs] = useState<any[]>([]);
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
        
      if (roleError || !roleData || roleData.role !== 'faculty') {
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
      // Ensure session and user are available before fetching
      if (!session?.user) {
        setLoading(false);
        return;
      }
      
      const userId = session.user.id;
      setLoading(true);

      let query = supabase
        .from('jobs')
        .select('*')
        // THIS IS THE CRITICAL FIX: Only fetch jobs created by the logged-in user
        .eq('created_by', userId);

      if (statusFilter) {
        query = query.eq('status', statusFilter);
      }
      
      const { data, error } = await query;

      if (error) {
        console.error('Error fetching jobs:', error);
        setJobs([]);
      } else {
        setJobs(data || []);
      }

      setLoading(false);
    };

    // Only fetch jobs if the session is confirmed
    if (session) {
      fetchJobs();
    }
  }, [session, statusFilter]);

  const handleRemove = async (jobId: string) => {
    // We'll use a custom modal for confirmation in a real app,
    // but window.confirm is fine for this context.
    if (!confirm('Are you sure you want to remove this posting?')) {
      return;
    }

    const { error } = await supabase
      .from('jobs')
      .update({ status: 'removed' })
      .eq('id', jobId);

    if (error) {
      // Similarly, a custom alert/toast would be better here.
      alert('Failed to remove job.');
    } else {
      setJobs((prev) =>
        prev.map((job) =>
          job.id === jobId ? { ...job, status: 'removed' } : job
        )
      );
    }
  };

  // Render a loading state until the session and role are confirmed
  if (!session || !userRole) {
    return <p className="p-8 text-center">Loading dashboard...</p>;
  }

  const statusColors: { [key: string]: string } = {
    pending: 'text-blue-600',
    active: 'text-green-600',
    removed: 'text-red-600',
    rejected: 'text-gray-600'
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-red-800">🏫 Faculty Dashboard</h1>
        <Link href="/faculty/create">
          <button className="bg-red-700 text-white px-4 py-2 rounded hover:bg-red-800">
            + Post a Job
          </button>
        </Link>
      </div>

      <div className="mb-4">
        <label className="mr-2 font-medium">Filter by Status:</label>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="p-2 border rounded"
        >
          <option value="">All</option>
          <option value="active">Active</option>
          <option value="removed">Removed</option>
          {/* Faculty jobs are active by default, but pending could be a future state */}
          <option value="pending">Pending</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {loading ? (
        <p>Loading your jobs...</p>
      ) : jobs.length === 0 ? (
        <p>You have not posted any jobs yet.</p>
      ) : (
        <ul className="space-y-4">
          {jobs.map((job) => (
            <li key={job.id} className="border p-4 rounded shadow bg-white">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="font-semibold text-lg">{job.title}</h2>
                  <p className="text-gray-700">{job.company}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Deadline: {new Date(job.deadline).toLocaleDateString()}
                  </p>
                  <p className="text-sm mt-1">
                    <span className="font-medium">Status:</span>{' '}
                    <span className={`${statusColors[job.status] || 'text-gray-600'} font-semibold capitalize`}>
                      {job.status}
                    </span>
                  </p>
                </div>

                <div className="flex flex-col gap-2 ml-4">
                    <>
                      <Link href={`/faculty/edit/${job.id}`}>
                        <button
                          disabled={job.status === 'removed' || job.status === 'rejected'}
                          className={`px-3 py-1 rounded font-medium text-sm ${
                            job.status === 'removed' || job.status === 'rejected'
                              ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                              : 'bg-blue-600 text-white hover:bg-blue-700'
                          }`}
                        >
                          Edit
                        </button>
                      </Link>

                      <button
                        onClick={() => handleRemove(job.id)}
                        disabled={job.status === 'removed' || job.status === 'rejected'}
                        className={`px-3 py-1 rounded font-medium text-sm ${
                          job.status === 'removed' || job.status === 'rejected'
                            ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                            : 'bg-gray-600 text-white hover:bg-gray-700'
                          }`}
                      >
                        Remove
                      </button>
                    </>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

