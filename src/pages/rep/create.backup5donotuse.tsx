import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../utils/supabaseClient';

// Define a type for the job data
interface Job {
  id: string;
  title: string;
  company: string;
  status: string;
}

export default function RepDashboard() {
  const router = useRouter();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchJobs = async () => {
      setLoading(true);
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.push('/login');
        return;
      }

      // Fetch user role from 'user_roles' table
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

      // Fetch jobs created by the current user
      const { data: jobsData, error: jobsError } = await supabase
        .from('jobs')
        .select('id, title, company, status')
        .eq('created_by', user.id);

      if (jobsError) {
        console.error('Error fetching jobs:', jobsError.message);
        return;
      }

      setJobs(jobsData || []);
      setLoading(false);
    };

    fetchJobs();
  }, [router]);

  if (loading) {
    return <p>Loading...</p>;
  }

  if (!userRole) {
    return <p>Unauthorized access.</p>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-red-700 mb-6">Rep Dashboard</h1>
      <p className="mb-6">Hello, rep! Here are the jobs you have posted.</p>

      {jobs.length === 0 ? (
        <p>You have not posted any jobs yet.</p>
      ) : (
        <div className="space-y-4">
          {jobs.map((job) => (
            <div key={job.id} className="bg-gray-100 p-4 rounded-md shadow-md">
              <h2 className="text-xl font-semibold">{job.title}</h2>
              <p className="text-gray-600">{job.company}</p>
              <p className="text-sm font-bold mt-2">Status: <span className={job.status === 'pending' ? 'text-yellow-600' : 'text-green-600'}>{job.status}</span></p>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6">
        <a href="/rep/create" className="bg-red-700 text-white px-4 py-2 rounded hover:bg-red-800">
          Create New Job Posting
        </a>
      </div>
    </div>
  );
}
