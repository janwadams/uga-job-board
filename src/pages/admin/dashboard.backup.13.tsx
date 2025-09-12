//admmin dashboard
//made changes for better layout


import { useEffect, useState, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

// NOTE: It's better practice to use the shared Supabase client from /utils, 
// but for simplicity and to match your existing files, we'll initialize it here.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// --- TypeScript Interfaces for our data ---
interface AdminUser {
  user_id: string;
  role: string;
  is_active: boolean;
  email: string | null;
  last_sign_in_at: string | null;
  jobs_posted: number;
}

interface Job {
  id: string;
  title: string;
  company: string;
  status: 'active' | 'pending' | 'removed' | 'rejected';
  created_at: string;
  created_by: string;
  user_email?: string; // We will add this after fetching
}

// --- Main Admin Dashboard Component ---
export default function AdminDashboard() {
  // State for the active tab
  const [activeTab, setActiveTab] = useState<'users' | 'jobs'>('users');

  // State for data
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingJobs, setLoadingJobs] = useState(true);
  
  // State for job filtering
  const [statusFilter, setStatusFilter] = useState<string>('');

  // --- Data Fetching Functions ---
  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const response = await fetch('/api/admin/list-users');
      const data = await response.json();
      if (response.ok) {
        setUsers(data.users);
      } else {
        console.error('Failed to fetch admin users:', data.error);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchJobs = async () => {
    setLoadingJobs(true);
    // This query fetches all jobs and joins with a view to get the creator's email
    // This assumes you have a view or function that links `created_by` (a UUID) to an email.
    // A direct join on `auth.users` is not possible with RLS by default.
    // Let's fetch jobs first.
    const { data, error } = await supabase
      .from('jobs')
      .select(`
        id,
        title,
        company,
        status,
        created_at,
        created_by
      `);

    if (error) {
      console.error('Error fetching jobs:', error);
      setJobs([]);
    } else if (data) {
        // NOTE: A performant way to get user emails is via an RPC function in Supabase.
        // For now, we are keeping it simple and will show the user ID.
        const formattedJobs = data.map((job: any) => ({
            ...job,
            user_email: job.created_by // Placeholder, ideally fetch email via RPC
        }));
        setJobs(formattedJobs);
    }
    setLoadingJobs(false);
  };

  // Fetch initial data
  useEffect(() => {
    fetchUsers();
    fetchJobs();
  }, []);

  // --- Action Handlers ---
  const handleStatusToggle = async (userId: string, currentStatus: boolean) => {
    try {
      const response = await fetch('/api/admin/update-user-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, isActive: !currentStatus }),
      });
      if (response.ok) fetchUsers(); // Re-fetch users after update
      else alert('Failed to update user status.');
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleJobAction = async (jobId: string, newStatus: Job['status']) => {
    let rejectionNote = null;
    if (newStatus === 'rejected') {
      rejectionNote = prompt("Provide a rejection note (optional):");
      if (rejectionNote === null) return; // User cancelled
    }
    
    try {
      const response = await fetch('/api/admin/manage-job-posting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId, status: newStatus, rejectionNote }),
      });
      if (response.ok) fetchJobs(); // Re-fetch jobs after update
      else alert('Failed to update job status.');
    } catch (error) {
        console.error('Error updating job status:', error);
    }
  };

  // --- Filtering Logic ---
  const filteredJobs = useMemo(() => {
    if (!statusFilter) return jobs;
    return jobs.filter(job => job.status === statusFilter);
  }, [jobs, statusFilter]);

  // --- Render ---
  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-red-800">👑 Admin Dashboard</h1>
        <Link href="/admin/analytics">
          <button className="bg-red-700 text-white px-4 py-2 rounded hover:bg-red-800">
            📊 View Analytics
          </button>
        </Link>
      </div>

      {/* Tab Navigation */}
      <div className="mb-4 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('users')}
            className={`${
              activeTab === 'users'
                ? 'border-red-700 text-red-800'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-lg`}
          >
            Manage Users
          </button>
          <button
            onClick={() => setActiveTab('jobs')}
            className={`${
              activeTab === 'jobs'
                ? 'border-red-700 text-red-800'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-lg`}
          >
            Manage Jobs
          </button>
        </nav>
      </div>

      {/* Conditional content based on active tab */}
      {activeTab === 'users' && <UsersManagementPanel users={users} loading={loadingUsers} onStatusToggle={handleStatusToggle} />}
      {activeTab === 'jobs' && <JobsManagementPanel jobs={filteredJobs} loading={loadingJobs} onJobAction={handleJobAction} statusFilter={statusFilter} setStatusFilter={setStatusFilter} />}
    </div>
  );
}


// --- Sub-component for Users Tab ---
function UsersManagementPanel({ users, loading, onStatusToggle }: { users: AdminUser[], loading: boolean, onStatusToggle: (userId: string, currentStatus: boolean) => void }) {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4 text-gray-700">👥 All Platform Users</h2>
      {loading ? (
        <p>Loading users...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto border-collapse border border-gray-200">
            {/* Table Head */}
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-4 py-2">Email</th>
                <th className="border px-4 py-2">Role</th>
                <th className="border px-4 py-2">Status</th>
                <th className="border px-4 py-2">Last Login</th>
                <th className="border px-4 py-2">Jobs Posted</th>
                <th className="border px-4 py-2">Actions</th>
              </tr>
            </thead>
            {/* Table Body */}
            <tbody>
              {users.map((user) => (
                <tr key={user.user_id} className="text-center">
                  <td className="border px-4 py-2 text-sm">{user.email}</td>
                  <td className="border px-4 py-2 capitalize">{user.role}</td>
                  <td className="border px-4 py-2">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {user.is_active ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td className="border px-4 py-2 text-sm">{user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : 'Never'}</td>
                  <td className="border px-4 py-2">{user.jobs_posted}</td>
                  <td className="border px-4 py-2">
                    <button onClick={() => onStatusToggle(user.user_id, user.is_active)} className={`px-3 py-1 rounded text-white ${user.is_active ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}>
                      {user.is_active ? 'Disable' : 'Enable'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// --- Sub-component for Jobs Tab ---
function JobsManagementPanel({ jobs, loading, onJobAction, statusFilter, setStatusFilter }: { jobs: Job[], loading: boolean, onJobAction: (jobId: string, newStatus: Job['status']) => void, statusFilter: string, setStatusFilter: (filter: string) => void }) {
  const statusColors: Record<Job['status'], string> = {
    active: 'bg-green-100 text-green-800',
    pending: 'bg-yellow-100 text-yellow-800',
    removed: 'bg-red-100 text-red-800',
    rejected: 'bg-gray-100 text-gray-800',
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-gray-700">💼 All Job Postings</h2>
        <div>
          <label className="mr-2 font-medium">Filter by Status:</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="p-2 border rounded">
            <option value="">All</option>
            <option value="pending">Pending</option>
            <option value="active">Active</option>
            <option value="removed">Removed</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>
      {loading ? (
        <p>Loading jobs...</p>
      ) : jobs.length === 0 ? (
        <p>No job postings found for the selected filter.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto border-collapse border border-gray-200">
            {/* Table Head */}
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-4 py-2">Job Title</th>
                <th className="border px-4 py-2">Company</th>
                <th className="border px-4 py-2">Posted By (User ID)</th>
                <th className="border px-4 py-2">Status</th>
                <th className="border px-4 py-2">Actions</th>
              </tr>
            </thead>
            {/* Table Body */}
            <tbody>
              {jobs.map((job) => (
                <tr key={job.id} className="text-center">
                  <td className="border px-4 py-2 text-left font-medium">{job.title}</td>
                  <td className="border px-4 py-2 text-left">{job.company}</td>
                  <td className="border px-4 py-2 text-sm truncate" title={job.user_email}>{job.user_email?.substring(0, 8)}...</td>
                  <td className="border px-4 py-2">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusColors[job.status]}`}>
                      {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                    </span>
                  </td>
                  <td className="border px-4 py-2 space-x-2">
                    {job.status === 'pending' && (
                      <>
                        <button onClick={() => onJobAction(job.id, 'active')} className="px-3 py-1 text-sm rounded bg-green-600 text-white hover:bg-green-700">Approve</button>
                        <button onClick={() => onJobAction(job.id, 'rejected')} className="px-3 py-1 text-sm rounded bg-red-600 text-white hover:bg-red-700">Reject</button>
                      </>
                    )}
                    {(job.status === 'active') && (
                        <button onClick={() => onJobAction(job.id, 'removed')} className="px-3 py-1 text-sm rounded bg-gray-500 text-white hover:bg-gray-600">Remove</button>
                    )}
                     {/* Placeholder for future edit functionality */}
                    <Link href={`/admin/edit/${job.id}`}>
                        <button className="px-3 py-1 text-sm rounded bg-blue-600 text-white hover:bg-blue-700">Edit</button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

