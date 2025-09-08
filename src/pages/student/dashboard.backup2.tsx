// pages/student/dashboard.tsx
import { useEffect, useState } from 'react';
import { supabase } from '../../utils/supabaseClient';
import { useRouter } from 'next/router';
import Link from 'next/link';

interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  deadline: string;
  job_type: string;
}

export default function StudentDashboard() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState('');
  const router = useRouter();

  useEffect(() => {
    const fetchUserAndJobs = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      setUserEmail(user.email || '');

      const { data, error } = await supabase
        .from('jobs')
        .select('id, title, company, location, deadline, job_type')
        .eq('status', 'approved')
        .order('deadline', { ascending: true });

      if (error) {
        console.error('Error fetching jobs:', error.message);
      } else {
        setJobs(data || []);
      }

      setLoading(false);
    };

    fetchUserAndJobs();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-ugaRed mb-4">Available Jobs</h1>
      <p className="text-sm mb-6">Logged in as: <span className="font-semibold">{userEmail}</span></p>

      {loading ? (
        <p>Loading jobs...</p>
      ) : jobs.length === 0 ? (
        <p>No approved jobs available.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {jobs.map(job => (
            <Link href={`/jobs/${job.id}`} key={job.id}>
              <div className="border p-4 rounded shadow hover:bg-gray-50 cursor-pointer transition">
                <h2 className="text-xl font-semibold text-ugaRed">{job.title}</h2>
                <p className="text-sm text-gray-700">{job.company} — {job.location}</p>
                <p className="text-sm text-gray-500">Type: {job.job_type}</p>
                <p className="text-sm text-gray-500">Deadline: {job.deadline}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
