// pages/student/dashboard.tsx

import { useEffect, useState } from 'react';
import { supabase } from '../../utils/supabaseClient';
import { useRouter } from 'next/router';

interface Job {
  id: string;
  title: string;
  company: string;
  description: string;
  job_type: string;
  location: string;
  deadline: string;
  skills: string[];
  apply_method: {
    type: 'email' | 'url';
    email?: string;
    url?: string;
  };
}

export default function StudentDashboard() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchJobs = async () => {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('status', 'active')
        .order('deadline', { ascending: true });

      if (error) {
        console.error('Error fetching jobs:', error.message);
      } else {
        setJobs(data as Job[]);
      }

      setLoading(false);
    };

    fetchJobs();
  }, []);

  const renderApplyButton = (apply: Job['apply_method']) => {
    if (apply?.type === 'email' && apply.email) {
      return (
        <a
          href={`mailto:${apply.email}`}
          className="text-red-700 font-semibold hover:underline"
        >
          Apply by Email
        </a>
      );
    } else if (apply?.type === 'url' && apply.url) {
      return (
        <a
          href={apply.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-red-700 font-semibold hover:underline"
        >
          Apply Online
        </a>
      );
    }
    return null;
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-red-800 mb-6">Available Job Postings</h1>

      {loading ? (
        <p className="text-gray-600">Loading jobs...</p>
      ) : jobs.length === 0 ? (
        <p className="text-gray-600">No active jobs found.</p>
      ) : (
        <div className="space-y-6">
          {jobs.map((job) => (
            <div
              key={job.id}
              className="border border-gray-300 p-4 rounded-lg shadow-sm bg-white"
            >
              <h2 className="text-xl font-bold text-red-700">{job.title}</h2>
              <p className="text-gray-700">
                <strong>Company:</strong> {job.company}
              </p>
              <p className="text-gray-700">
                <strong>Type:</strong> {job.job_type}
              </p>
              <p className="text-gray-700">
                <strong>Location:</strong> {job.location || 'N/A'}
              </p>
              <p className="text-gray-700">
                <strong>Deadline:</strong>{' '}
                {new Date(job.deadline).toLocaleDateString()}
              </p>

              {job.skills?.length > 0 && (
                <div className="mt-2">
                  <strong className="text-gray-700">Skills:</strong>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {job.skills.map((skill, idx) => (
                      <span
                        key={idx}
                        className="bg-red-100 text-red-800 px-2 py-1 rounded text-sm"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-4">{renderApplyButton(job.apply_method)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
