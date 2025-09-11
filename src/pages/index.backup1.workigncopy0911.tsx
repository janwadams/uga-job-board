import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export default function HomePage() {
  const [jobs, setJobs] = useState<any[]>([]);

  useEffect(() => {
    async function fetchJobs() {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('status', 'active')
        .gte('deadline', new Date().toISOString());

      if (!error) setJobs(data);
    }

    fetchJobs();
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6 text-red-800">UGA Job Board</h1>
      {jobs.length === 0 ? (
        <p>No active jobs available.</p>
      ) : (
        <ul className="space-y-4">
          {jobs.map((job) => (
            <li key={job.id} className="border p-4 rounded shadow">
              <h2 className="text-xl font-semibold">{job.title}</h2>
              <p className="text-gray-600">{job.company}</p>
              <p>{job.description}</p>
              <p className="text-sm text-gray-500">Deadline: {job.deadline}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
