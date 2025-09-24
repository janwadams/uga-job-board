// pages/jobs/[id].tsx
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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
  const [backHref, setBackHref] = useState('/'); // Default to the main job board

  useEffect(() => {
    if (!id) return;

    const checkUserAndSetBackLink = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id)
          .single();
        
        if (roleData?.role === 'student') {
          setBackHref('/student/dashboard');
        }
      }
    };

    const fetchJob = async () => {
      setLoading(true);
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

    checkUserAndSetBackLink();
    fetchJob();
  }, [id]);

  if (loading) return <div className="text-center p-10">Loading...</div>;
  if (!job) return <div className="text-center p-10">Job not found.</div>;

  return (
    <div className="bg-white min-h-screen">
      <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <Link href={backHref}>
          <span className="text-red-700 hover:text-red-900 font-medium text-sm cursor-pointer">
            &larr; Back to Jobs
          </span>
        </Link>

        <div className="mt-4 bg-gray-50 p-8 rounded-lg border">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{job.title}</h1>
          <p className="text-lg font-medium text-gray-700">{job.company}{job.location ? ` — ${job.location}` : ''}</p>
          <p className="text-sm text-gray-500 mb-6">
            Apply by: {new Date(job.deadline).toLocaleDateString()}
          </p>

          <div className="prose max-w-none">
            <h2 className="text-xl font-semibold mt-6 mb-2">Description</h2>
            <p className="text-gray-800 mb-4">{job.description}</p>

            <h2 className="text-xl font-semibold mb-2">Job Type</h2>
            <p className="mb-4">{job.job_type}</p>

            {job.skills && job.skills.length > 0 && (
              <>
                <h2 className="text-xl font-semibold mb-2">Skills Required</h2>
                <ul className="list-disc list-inside mb-4 pl-4">
                  {job.skills.map((skill, index) => (
                    <li key={index}>{skill}</li>
                  ))}
                </ul>
              </>
            )}
          </div>

          {job.apply_method?.type === 'url' && job.apply_method.url && (
            <a
              href={job.apply_method.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-6 px-6 py-3 bg-red-700 text-white font-bold rounded-lg hover:bg-red-800 transition-colors"
            >
              Apply Now
            </a>
          )}
        </div>
      </div>
    </div>
  );
}








/*
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
*/