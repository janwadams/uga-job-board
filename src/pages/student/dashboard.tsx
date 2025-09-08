import { useEffect, useState } from 'react';
import { supabase } from '../../utils/supabaseClient';
import JobCard from '@/components/JobCard';

interface Job {
  id: string;
  title: string;
  description: string;
  created_by: string;
  status: string;
}

export default function Dashboard() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchJobs = async () => {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        console.error('Error fetching user:', userError.message);
        return;
      }

      console.log('Current user ID:', user?.id); // ✅ Log user ID

      setUserId(user?.id ?? null);

      const { data: jobsData, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('status', 'active');

      if (error) {
        console.error('Error fetching jobs:', error.message);
        return;
      }

      setJobs(jobsData || []);
    };

    fetchJobs();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-red-700 mb-6">Student Dashboard</h1>
      {jobs.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      ) : (
        <p>No jobs found.</p>
      )}
    </div>
  );
}
