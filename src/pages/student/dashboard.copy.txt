// src/pages/student/dashboard.tsx
import { useEffect, useState } from 'react';
//import { supabase } from '@/utils/supabaseClient';
import { supabase } from '../../utils/supabaseClient';
import { useRouter } from 'next/router';

type Job = {
  id: number;
  title: string;
  company: string;
  description: string;
  deadline: string;
};

export default function StudentDashboard() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const router = useRouter();

  useEffect(() => {
    const fetchJobs = async () => {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('status', 'approved');

      if (error) {
        console.error('Error fetching jobs:', error);
      } else {
        setJobs(data || []);
      }
    };

    fetchJobs();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6 text-uga-red">Available Jobs</h1>

      {jobs.length === 0 ? (
        <p>No active jobs available.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {jobs.map((job) => (
            <div key={job.id} className="border p-4 rounded shadow-sm bg-white">
              <h2 className="text-xl font-semibold">{job.title}</h2>
              <p className="text-gray-600">{job.company}</p>
              <p className="mt-2 text-sm">{job.description}</p>
              <p className="text-sm mt-2 text-gray-500">Deadline: {job.deadline}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
