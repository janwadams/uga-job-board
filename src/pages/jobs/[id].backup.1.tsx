// pages/jobs/[id].tsx
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { supabase } from '../../utils/supabaseClient';
import Link from 'next/link';

interface Job {
  id: string;
  title: string;
  company: string;
  description: string;
  job_type: string;
  skills: string[];
  location: string;
  deadline: string;
  apply_method: { url?: string; type?: string } | null;
}

export default function JobDetails() {
  const router = useRouter();
  const { id } = router.query;
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    const fetchJob = async () => {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching job:', error.message);
      } else {
        setJob(data);
      }

      setLoading(false);
    };

    fetchJob();
  }, [id]);

  if (loading) return <p className="p-4">Loading...</p>;
  if (!job) return <p className="p-4">Job not found.</p>;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <Link href="/student/dashboard">
        <p className="text-blue-600 underline mb-4">&larr; Back to Jobs</p>
      </Link>

      <h1 className="text-3xl font-bold text-ugaRed mb-2">{job.title}</h1>
      <p className="text-lg font-medium">{job.company} — {job.location}</p>
      <p className="text-sm text-gray-500 mb-6">Deadline: {job.deadline}</p>

      <h2 className="text-xl font-semibold mt-6 mb-2">Description</h2>
      <p className="text-gray-800 mb-4">{job.description}</p>

      <h2 className="text-xl font-semibold mb-2">Job Type</h2>
      <p className="mb-4">{job.job_type}</p>

      {job.skills && (
        <>
          <h2 className="text-xl font-semibold mb-2">Skills Required</h2>
          <ul className="list-disc list-inside mb-4">
            {job.skills.map((skill, index) => (
              <li key={index}>{skill}</li>
            ))}
          </ul>
        </>
      )}

      {job.apply_method?.type === 'url' && job.apply_method.url && (
        <a
          href={job.apply_method.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block mt-4 px-4 py-2 bg-ugaRed text-white rounded hover:bg-red-800"
        >
          Apply Now
        </a>
      )}
    </div>
  );
}
