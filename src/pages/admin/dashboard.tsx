import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AdminDashboard() {
  const router = useRouter();
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.push('/login');
      } else {
        setSession(data.session);
      }
    };

    checkSession();
  }, []);

  useEffect(() => {
    const fetchJobs = async () => {
      const { data, error } = await supabase.from('jobs').select('*');
      if (!error) {
        setJobs(data || []);
      }

      setLoading(false);
    };

    if (session) {
      fetchJobs();
    }
  }, [session]);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4 text-red-800">🔧 Admin Dashboard</h1>

      {loading ? (
        <p>Loading all jobs...</p>
      ) : (
        <ul className="space-y-4">
          {jobs.map((job) => (
            <li key={job.id} className="border p-4 rounded shadow bg-white">
              <h2 className="font-semibold">{job.title}</h2>
              <p>{job.company}</p>
              <p>Status: <strong>{job.status}</strong></p>
              <p className="text-sm">Posted by: {job.created_by}</p>
              <p className="text-sm text-gray-500">Deadline: {new Date(job.deadline).toLocaleDateString()}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
