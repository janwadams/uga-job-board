// admin dashboard with archived jobs section
// includes all expired jobs from all users

import { useEffect, useState, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

// initialize supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// data types for our users and jobs
interface AdminUser {
  user_id: string;
  role: string;
  is_active: boolean;
  email: string | null;
  last_sign_in_at: string | null;
  jobs_posted: number;
  first_name: string;
  last_name: string;
  company_name: string | null;
}

interface Job {
  id: string;
  title: string;
  company: string;
  status: 'active' | 'pending' | 'removed' | 'rejected' | 'archived';
  created_at: string;
  created_by: string;
  deadline: string;
  job_type?: string;
  location?: string;
  industry?: string;
  // added after fetching
  role?: string;
  email?: string;
  creator_name?: string;
}

// main admin dashboard component
export default function AdminDashboard() {
  // which tab is active
  const [activeTab, setActiveTab] = useState<'users' | 'jobs' | 'archived'>('users');

  // data storage
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [archivedJobs, setArchivedJobs] = useState<Job[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [loadingArchived, setLoadingArchived] = useState(true);

  // filter for jobs
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [archivedFilter, setArchivedFilter] = useState<string>(''); // filter for archived tab

  // modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [showCreateAdmin, setShowCreateAdmin] = useState(false);

  // fetch users from api
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

  // fetch active and pending jobs
  const fetchJobs = async () => {
    setLoadingJobs(true);
    
    // get today's date to compare
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .gte('deadline', today.toISOString()); // only get non-expired jobs

    if (error) {
      console.error('Error fetching jobs:', error);
      setJobs([]);
    } else if (data) {
      setJobs(data as Job[]);
    }
    setLoadingJobs(false);
  };

  // fetch archived (expired) jobs
  const fetchArchivedJobs = async () => {
    setLoadingArchived(true);
    
    // get today's date to compare
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .lt('deadline', today.toISOString()) // only get expired jobs
      .order('deadline', { ascending: false }); // newest expired first

    if (error) {
      console.error('Error fetching archived jobs:', error);
      setArchivedJobs([]);
    } else if (data) {
      // mark them as archived for display purposes
      const archived = data.map(job => ({
        ...job,
        status: 'archived' as const
      }));
      setArchivedJobs(archived);
    }
    setLoadingArchived(false);
  };

  // load data when component mounts
  useEffect(() => {
    fetchUsers();
    fetchJobs();
    fetchArchivedJobs();
  }, []);

  // handle user status toggle
  const handleStatusToggle = async (userId: string, currentStatus: boolean) => {
    try {
      const response = await fetch('/api/admin/update-user-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, isActive: !currentStatus }),
      });
      if (response.ok) fetchUsers();
      else alert('Failed to update user status.');
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  // handle job status changes
  const handleJobAction = async (jobId: string, newStatus: Job['status']) => {
    let rejectionNote = null;
    if (newStatus === 'rejected') {
      rejectionNote = prompt("Provide a rejection note (optional):");
      if (rejectionNote === null) return; // user cancelled
    }

    try {
      const response = await fetch('/api/admin/manage-job-posting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId, status: newStatus, rejectionNote }),
      });
      if (response.ok) {
        fetchJobs();
        fetchArchivedJobs(); // refresh both lists
      } else {
        alert('Failed to update job status.');
      }
    } catch (error) {
      console.error('Error updating job status:', error);
    }
  };

  // reactivate an archived job (admin can extend deadline)
  const handleReactivateJob = async (jobId: string) => {
    const newDeadline = prompt("Enter new deadline (YYYY-MM-DD):");
    if (!newDeadline) return;

    try {
      const { error } = await supabase
        .from('jobs')
        .update({ 
          deadline: newDeadline,
          status: 'active' 
        })
        .eq('id', jobId);

      if (!error) {
        alert('Job reactivated successfully!');
        fetchJobs();
        fetchArchivedJobs();
      } else {
        alert('Failed to reactivate job.');
      }
    } catch (error) {
      console.error('Error reactivating job:', error);
    }
  };

  const openEditModal = (user: AdminUser) => {
    setEditingUser(user);
    setIsModalOpen(true);
  };

  const closeEditModal = () => {
    setEditingUser(null);
    setIsModalOpen(false);
  };

  const handleUpdateUserDetails = async (updatedUser: AdminUser) => {
    try {
      const response = await fetch('/api/admin/update-user-details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedUser),
      });

      if (response.ok) {
        fetchUsers();
        closeEditModal();
      } else {
        const data = await response.json();
        alert('Failed to update user: ' + data.error);
      }
    } catch (error) {
      console.error('Error updating user details:', error);
      alert('An unexpected error occurred.');
    }
  };

  const handleDeleteUser = async (userToDelete: AdminUser) => {
    if (window.confirm(`Are you sure you want to permanently delete the user: ${userToDelete.email}? This action is irreversible.`)) {
        try {
            const response = await fetch('/api/admin/delete-user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userToDelete }),
            });

            const data = await response.json();

            if (response.ok) {
                alert('User deleted successfully.');
                fetchUsers();
            } else {
                alert('Failed to delete user: ' + (data.details || data.error));
            }
        } catch (error) {
            console.error('Error deleting user:', error);
            alert('An unexpected error occurred.');
        }
    }
  };

  // map user data to jobs for display
  const { userRoleMap, userEmailMap, userNameMap } = useMemo(() => {
    const roleMap = new Map<string, string>();
    const emailMap = new Map<string, string>();
    const nameMap = new Map<string, string>();
    users.forEach(user => {
      roleMap.set(user.user_id, user.role);
      if (user.email) {
        emailMap.set(user.user_id, user.email);
      }
      const fullName = user.role === 'rep' && user.company_name 
        ? user.company_name 
        : `${user.first_name} ${user.last_name}`;
      nameMap.set(user.user_id, fullName);
    });
    return { userRoleMap: roleMap, userEmailMap: emailMap, userNameMap: nameMap };
  }, [users]);

  // add user info to jobs
  const enrichedJobs = useMemo(() => {
    return jobs.map(job => ({
      ...job,
      role: userRoleMap.get(job.created_by) || 'N/A',
      email: userEmailMap.get(job.created_by) || 'N/A',
      creator_name: userNameMap.get(job.created_by) || 'Unknown'
    }));
  }, [jobs, userRoleMap, userEmailMap, userNameMap]);

  // add user info to archived jobs
  const enrichedArchivedJobs = useMemo(() => {
    return archivedJobs.map(job => ({
      ...job,
      role: userRoleMap.get(job.created_by) || 'N/A',
      email: userEmailMap.get(job.created_by) || 'N/A',
      creator_name: userNameMap.get(job.created_by) || 'Unknown'
    }));
  }, [archivedJobs, userRoleMap, userEmailMap, userNameMap]);

  // filter active jobs
  const filteredJobs = useMemo(() => {
    if (!statusFilter) return enrichedJobs;
    return enrichedJobs.filter(job => job.status === statusFilter);
  }, [enrichedJobs, statusFilter]);

  // filter archived jobs by creator role
  const filteredArchivedJobs = useMemo(() => {
    if (!archivedFilter) return enrichedArchivedJobs;
    if (archivedFilter === 'faculty') {
      return enrichedArchivedJobs.filter(job => job.role === 'faculty' || job.role === 'staff');
    }
    if (archivedFilter === 'rep') {
      return enrichedArchivedJobs.filter(job => job.role === 'rep');
    }
    return enrichedArchivedJobs;
  }, [enrichedArchivedJobs, archivedFilter]);

  // calculate days since expired
  const getDaysSinceExpired = (deadline: string) => {
    const deadlineDate = new Date(deadline);
    const today = new Date();
    const diffTime = today.getTime() - deadlineDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-red-800">Admin Dashboard</h1>
        <div className="flex space-x-4">
          <Link href="/admin/analytics">
            <button className="bg-red-700 text-white px-4 py-2 rounded hover:bg-red-800">
              View Analytics
            </button>
          </Link>
          {activeTab === 'users' && (
            <button
              onClick={() => setShowCreateAdmin(true)}
              className="bg-green-700 text-white px-4 py-2 rounded hover:bg-green-800"
            >
              + Create Admin Account
            </button>
          )}
        </div>
      </div>

      <div className="mb-4 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button 
            onClick={() => setActiveTab('users')} 
            className={`${activeTab === 'users' ? 'border-red-700 text-red-800' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-lg`}
          >
            Manage Users
          </button>
          <button 
            onClick={() => setActiveTab('jobs')} 
            className={`${activeTab === 'jobs' ? 'border-red-700 text-red-800' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-lg`}
          >
            Active Jobs ({jobs.length})
          </button>
          <button 
            onClick={() => setActiveTab('archived')} 
            className={`${activeTab === 'archived' ? 'border-red-700 text-red-800' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-lg`}
          >
            Archived Jobs ({archivedJobs.length})
          </button>
        </nav>
      </div>

      {activeTab === 'users' && <UsersManagementPanel users={users} loading={loadingUsers} onStatusToggle={handleStatusToggle} onEditUser={openEditModal} onDeleteUser={handleDeleteUser} />}
      {activeTab === 'jobs' && <JobsManagementPanel jobs={filteredJobs} loading={loadingJobs} onJobAction={handleJobAction} statusFilter={statusFilter} setStatusFilter={setStatusFilter} />}
      {activeTab === 'archived' && (
        <ArchivedJobsPanel 
          jobs={filteredArchivedJobs} 
          loading={loadingArchived} 
          filter={archivedFilter}
          setFilter={setArchivedFilter}
          onReactivate={handleReactivateJob}
          getDaysSinceExpired={getDaysSinceExpired}
        />
      )}

      {isModalOpen && editingUser && (
        <EditUserModal user={editingUser} onClose={closeEditModal} onSave={handleUpdateUserDetails} />
      )}

      {showCreateAdmin && (
        <CreateAdminModal 
          onClose={() => setShowCreateAdmin(false)}
          onSuccess={() => {
            setShowCreateAdmin(false);
            fetchUsers();
          }}
        />
      )}
    </div>
  );
}

// new component for archived jobs tab
function ArchivedJobsPanel({ 
  jobs, 
  loading, 
  filter, 
  setFilter, 
  onReactivate,
  getDaysSinceExpired 
}: { 
  jobs: Job[], 
  loading: boolean, 
  filter: string, 
  setFilter: (filter: string) => void,
  onReactivate: (jobId: string) => void,
  getDaysSinceExpired: (deadline: string) => number
}) {
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-gray-700">Archived Jobs (Past Deadline)</h2>
        <div>
          <label className="mr-2 font-medium">Posted by:</label>
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className="p-2 border rounded">
            <option value="">All Users</option>
            <option value="faculty">Faculty/Staff Only</option>
            <option value="rep">Company Reps Only</option>
          </select>
        </div>
      </div>

      {loading ? (
        <p>Loading archived jobs...</p>
      ) : jobs.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <p className="text-gray-600">No archived jobs found{filter && ' for selected filter'}.</p>
        </div>
      ) : (
        <div className="border border-gray-200 rounded-lg overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Job Title</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Posted By</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expired</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Days Ago</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {jobs.map((job) => {
                const daysAgo = getDaysSinceExpired(job.deadline);
                return (
                  <tr key={job.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-normal break-words text-sm font-medium text-gray-900">
                      {job.title}
                    </td>
                    <td className="px-6 py-4 whitespace-normal break-words text-sm text-gray-500">
                      {job.company}
                    </td>
                    <td className="px-6 py-4 whitespace-normal break-words text-sm text-gray-500">
                      {job.creator_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        job.role === 'faculty' || job.role === 'staff' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {job.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {job.job_type || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(job.deadline).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        daysAgo <= 7 ? 'bg-yellow-100 text-yellow-800' :
                        daysAgo <= 30 ? 'bg-orange-100 text-orange-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {daysAgo} {daysAgo === 1 ? 'day' : 'days'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                      <button 
                        onClick={() => onReactivate(job.id)}
                        className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                      >
                        Reactivate
                      </button>
                      <Link href={`/admin/view/${job.id}`}>
                        <button className="ml-2 px-3 py-1 bg-gray-600 text-white rounded text-xs hover:bg-gray-700">
                          View
                        </button>
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ... rest of your existing components (CreateAdminModal, UsersManagementPanel, JobsManagementPanel, EditUserModal) stay the same ...