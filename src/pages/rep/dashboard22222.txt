import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../utils/supabaseClient';
import JobCard from '../../components/JobCard';

export default function RepDashboard() {
  const router = useRouter();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchJobs = async () => {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.push('/login');
        return;
      }

      const { data: jobsData, error: jobsError } = await supabase
        .from('jobs')
        .select('*')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false });

      if (jobsError) {
        console.error('Error fetching jobs:', jobsError);
        setError('Failed to fetch jobs. Please try again.');
      } else {
        setJobs(jobsData || []);
      }

      setLoading(false);
    };

    fetchJobs();
  }, [router]);

  if (loading) {
    return <p className="text-center mt-8">Loading your job postings...</p>;
  }

  if (error) {
    return <p className="text-center mt-8 text-red-600">{error}</p>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-red-700">My Job Postings</h1>
        <a
          href="/rep/create"
          className="bg-red-700 text-white font-semibold py-2 px-4 rounded hover:bg-red-800"
        >
          Post a New Job
        </a>
      </div>

      {jobs.length === 0 ? (
        <div className="text-center mt-12">
          <p className="text-lg text-gray-600">You haven't posted any jobs yet.</p>
          <a
            href="/rep/create"
            className="inline-block mt-4 text-red-700 underline hover:text-red-900"
          >
            Click here to post your first job.
          </a>
        </div>
      ) : (
        <div className="space-y-6">
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      )}
    </div>
  );
}
