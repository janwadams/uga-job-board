import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface AdminUser {
  user_id: string;
  role: string;
  is_active: boolean;
  email: string | null;
  last_sign_in_at: string | null;
  jobs_posted: number;
}

interface PendingJob {
  id: string;
  title: string;
  company: string;
  status: string;
  created_at: string;
}

export default function AdminDashboard() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [pendingJobs, setPendingJobs] = useState<PendingJob[]>([]); // ADDED: New state for pending jobs
  const [loading, setLoading] = useState(true);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const usersResponse = await fetch('/api/admin/list-users');
      const usersData = await usersResponse.json();
      if (usersResponse.ok) {
        setUsers(usersData.users);
      } else {
        console.error('Failed to fetch admin users:', usersData.error);
      }
      
      // ADDED: Fetch pending jobs
      const jobsResponse = await fetch('/api/admin/list-pending-jobs');
      const jobsData = await jobsResponse.json();
      if (jobsResponse.ok) {
        setPendingJobs(jobsData.jobs);
      } else {
        console.error('Failed to fetch pending jobs:', jobsData.error);
      }

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleStatusToggle = async (userId: string, currentStatus: boolean) => {
    // Logic for toggling user status (already exists)
  };
  
  // ADDED: New function to approve/reject a job
  const handleJobAction = async (jobId: string, status: 'active' | 'rejected') => {
      let rejectionNote = null;
      if (status === 'rejected') {
          rejectionNote = prompt("Please provide a rejection note (optional):");
          if (rejectionNote === null) {
              return; // User canceled the prompt
          }
      }
      
      const response = await fetch('/api/admin/manage-job-posting', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jobId, status, rejectionNote }),
      });
      
      if (response.ok) {
          fetchAdminData(); // Refresh the list
      } else {
          alert('Failed to update job status.');
      }
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold mb-4 text-red-800">👥 Admin: Manage Users</h1>
        <Link href="/admin/analytics">
          <button className="bg-red-700 text-white px-4 py-2 rounded hover:bg-red-800">
            View Analytics
          </button>
        </Link>
      </div>
      
      {/* User Management Table */}
      {/* ... your existing code for the user table goes here ... */}

      {/* ADDED: Pending Job Postings Section */}
      <h2 className="text-2xl font-bold text-red-800 mt-8 mb-4">Awaiting Job Postings ({pendingJobs.length})</h2>
      {loading ? (
        <p>Loading pending jobs...</p>
      ) : pendingJobs.length === 0 ? (
        <p>No job postings are awaiting review.</p>
      ) : (
        <ul className="space-y-4">
          {pendingJobs.map((job) => (
            <li key={job.id} className="border p-4 rounded shadow bg-white flex justify-between items-center">
              <div>
                <h3 className="font-semibold">{job.title}</h3>
                <p className="text-sm text-gray-500">{job.company}</p>
                <p className="text-sm text-gray-500">Submitted: {new Date(job.created_at).toLocaleDateString()}</p>
              </div>
              <div className="space-x-2">
                <button
                  onClick={() => handleJobAction(job.id, 'active')}
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                >
                  Approve
                </button>
                <button
                  onClick={() => handleJobAction(job.id, 'rejected')}
                  className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                >
                  Reject
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}