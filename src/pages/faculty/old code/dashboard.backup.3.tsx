import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function FacultyDashboard() {
  const router = useRouter();
  const [jobs, setJobs] = useState<any[]>([]);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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
      const userId = session?.user.id;
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('created_by', userId);

      if (!error) {
        setJobs(data || []);
      }

      setLoading(false);
    };

    if (session) {
      fetchJobs();
    }
  }, [session]);

  const handleRemove = async (jobId: string) => {
    const confirm = window.confirm('Are you sure you want to remove this posting?');
    if (!confirm) return;

    const { error } = await supabase
      .from('jobs')
      .update({ status: 'removed' })
      .eq('id', jobId);

    if (error) {
      alert('Failed to remove job.');
    } else {
      setJobs((prev) => prev.filter((job) => job.id !== jobId));
    }
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-red-800">🏫 Faculty Dashboard</h1>
        <Link href="/faculty/create">
          <button className="bg-red-700 text-white px-4 py-2 rounded hover:bg-red-800">
            + Post a Job
          </button>
        </Link>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : jobs.length === 0 ? (
        <p>No job postings found.</p>
      ) : (
        <ul className="space-y-4">
          {jobs.map((job) => (
            <li key={job.id} className="border p-4 rounded shadow bg-white">
              <h2 className="font-semibold">{job.title}</h2>
              <p>{job.company}</p>
              <p className="text-sm text-gray-500">
                Deadline: {new Date(job.deadline).toLocaleDateString()}
              </p>

              <div className="mt-4 flex gap-3">
                <Link href={`/faculty/edit/${job.id}`}>
                  <button className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700">
                    Edit
                  </button>
                </Link>

                <button
                  onClick={() => handleRemove(job.id)}
                  className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
