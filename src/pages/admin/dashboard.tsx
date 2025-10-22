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
  
  // filter for user status (active/disabled/all)
  const [userStatusFilter, setUserStatusFilter] = useState<string>('all');

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

  // fetch active and pending jobs (actually all non-expired jobs)
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

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
  };

  const handleSaveUser = async (updatedUser: AdminUser) => {
    try {
      const response = await fetch('/api/admin/update-user-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedUser),
      });
      if (response.ok) {
        alert('User updated successfully!');
        fetchUsers();
        closeModal();
      } else {
        alert('Failed to update user.');
      }
    } catch (error) {
      console.error('Error updating user:', error);
      alert('Error updating user.');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
      const response = await fetch('/api/admin/delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      if (response.ok) {
        alert('User deleted successfully!');
        fetchUsers();
      } else {
        alert('Failed to delete user.');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Error deleting user.');
    }
  };

  // filter jobs based on selected status
  const filteredJobs = useMemo(() => {
    if (!statusFilter) return jobs;
    return jobs.filter(job => job.status === statusFilter);
  }, [jobs, statusFilter]);

  // filter archived jobs based on role
  const filteredArchivedJobs = useMemo(() => {
    if (!archivedFilter) return archivedJobs;
    if (archivedFilter === 'faculty') {
      return archivedJobs.filter(job => job.role === 'faculty' || job.role === 'staff');
    }
    if (archivedFilter === 'rep') {
      return archivedJobs.filter(job => job.role === 'rep');
    }
    return archivedJobs;
  }, [archivedJobs, archivedFilter]);

  // filter users based on their active status
  const filteredUsers = useMemo(() => {
    if (userStatusFilter === 'all') return users;
    if (userStatusFilter === 'active') return users.filter(user => user.is_active);
    if (userStatusFilter === 'disabled') return users.filter(user => !user.is_active);
    return users;
  }, [users, userStatusFilter]);

  // calculate days since job expired
  const getDaysSinceExpired = (deadline: string) => {
    const deadlineDate = new Date(deadline);
    const today = new Date();
    const diff = Math.floor((today.getTime() - deadlineDate.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* header with action buttons */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-uga-red">Admin Dashboard</h1>
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/analytics">
              <button className="px-4 py-2 bg-uga-red text-white rounded hover:bg-red-800 text-sm sm:text-base">
                View Analytics
              </button>
            </Link>
            <Link href="/admin/content-review">
              <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm sm:text-base">
                Content Review
              </button>
            </Link>
            <Link href="/admin/archive-reports">
              <button className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm sm:text-base">
                Archive Reports
              </button>
            </Link>
            <Link href="/admin/platform-health">
              <button className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm sm:text-base">
                Platform Health
              </button>
            </Link>
            <button 
              onClick={() => setShowCreateAdmin(true)}
              className="px-4 py-2 bg-green-700 text-white rounded hover:bg-green-800 text-sm sm:text-base"
            >
              + Create Admin
            </button>
          </div>
        </div>

        {/* tabs for switching between views */}
        <div className="bg-white rounded-lg shadow-md mb-6">
          <div className="flex flex-col sm:flex-row border-b">
            <button
              className={`flex-1 px-4 py-3 text-center font-medium transition-colors text-sm sm:text-base ${
                activeTab === 'users'
                  ? 'bg-uga-red text-white border-b-4 border-uga-red'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
              onClick={() => setActiveTab('users')}
            >
              Manage Users
            </button>
            <button
              className={`flex-1 px-4 py-3 text-center font-medium transition-colors text-sm sm:text-base ${
                activeTab === 'jobs'
                  ? 'bg-uga-red text-white border-b-4 border-uga-red'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
              onClick={() => setActiveTab('jobs')}
            >
              Current Jobs ({jobs.length})
            </button>
            <button
              className={`flex-1 px-4 py-3 text-center font-medium transition-colors text-sm sm:text-base ${
                activeTab === 'archived'
                  ? 'bg-uga-red text-white border-b-4 border-uga-red'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
              onClick={() => setActiveTab('archived')}
            >
              Archived Jobs ({archivedJobs.length})
            </button>
          </div>
        </div>

        {/* users tab */}
        {activeTab === 'users' && (
          <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-4">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-700">All Platform Users</h2>
              
              {/* status filter dropdown */}
              <div className="w-full sm:w-auto">
                <label className="mr-2 font-medium text-sm">Status:</label>
                <select 
                  value={userStatusFilter} 
                  onChange={(e) => setUserStatusFilter(e.target.value)} 
                  className="p-2 border rounded w-full sm:w-auto"
                >
                  <option value="all">All</option>
                  <option value="active">Active</option>
                  <option value="disabled">Disabled</option>
                </select>
              </div>
            </div>

            {loadingUsers ? (
              <p>Loading users...</p>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <p className="text-gray-600">No users found{userStatusFilter !== 'all' && ' for selected filter'}.</p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Email</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Company</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Role</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredUsers.map((user) => (
                      <tr key={user.user_id} className="hover:bg-gray-50">
                        <td className="px-3 py-4 text-sm font-medium text-gray-900">
                          <div>{user.first_name} {user.last_name}</div>
                          {/* show email on mobile */}
                          <div className="text-xs text-gray-500 sm:hidden">{user.email}</div>
                        </td>
                        <td className="px-3 py-4 text-sm text-gray-500 hidden sm:table-cell">
                          {user.email}
                        </td>
                        <td className="px-3 py-4 text-sm text-gray-500 hidden md:table-cell">
                          {user.company_name || 'N/A'}
                        </td>
                        <td className="px-3 py-4 text-sm text-gray-500 capitalize hidden lg:table-cell">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            user.role === 'admin' ? 'bg-red-100 text-red-800' :
                            user.role === 'faculty' || user.role === 'staff' ? 'bg-blue-100 text-blue-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="px-3 py-4 text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {user.is_active ? 'Active' : 'Disabled'}
                          </span>
                        </td>
                        <td className="px-3 py-4 text-center text-sm">
                          {/* mobile: vertical stack */}
                          <div className="flex flex-col gap-1 sm:hidden">
                            <button 
                              onClick={() => openEditModal(user)}
                              className="px-2 py-1 bg-blue-600 text-white rounded text-xs"
                            >
                              Edit
                            </button>
                            <button 
                              onClick={() => handleStatusToggle(user.user_id, user.is_active)}
                              className={`px-2 py-1 rounded text-xs ${
                                user.is_active 
                                  ? 'bg-red-600 text-white' 
                                  : 'bg-green-600 text-white'
                              }`}
                            >
                              {user.is_active ? 'Disable' : 'Enable'}
                            </button>
                            <button 
                              onClick={() => handleDeleteUser(user.user_id)}
                              className="px-2 py-1 bg-gray-800 text-white rounded text-xs"
                            >
                              Delete
                            </button>
                          </div>
                          {/* desktop: horizontal row */}
                          <div className="hidden sm:flex gap-2 justify-center">
                            <button 
                              onClick={() => openEditModal(user)}
                              className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                            >
                              Edit
                            </button>
                            <button 
                              onClick={() => handleStatusToggle(user.user_id, user.is_active)}
                              className={`px-3 py-1 rounded text-xs ${
                                user.is_active 
                                  ? 'bg-red-600 text-white hover:bg-red-700' 
                                  : 'bg-green-600 text-white hover:bg-green-700'
                              }`}
                            >
                              {user.is_active ? 'Disable' : 'Enable'}
                            </button>
                            <button 
                              onClick={() => handleDeleteUser(user.user_id)}
                              className="px-3 py-1 bg-gray-800 text-white rounded text-xs hover:bg-gray-900"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* jobs tab */}
        {activeTab === 'jobs' && (
          <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-4">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-700">Current Job Postings</h2>
              <div className="w-full sm:w-auto">
                <label className="mr-2 font-medium text-sm">Filter by Status:</label>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="p-2 border rounded w-full sm:w-auto">
                  <option value="">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>

            {loadingJobs ? (
              <p>Loading jobs...</p>
            ) : filteredJobs.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <p className="text-gray-600">No jobs found{statusFilter && ' for selected status'}.</p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Job Title</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Company</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Type</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Location</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredJobs.map((job) => (
                      <tr key={job.id} className="hover:bg-gray-50">
                        <td className="px-3 py-4 text-sm font-medium text-gray-900">
                          <div>{job.title}</div>
                          {/* show company on mobile */}
                          <div className="text-xs text-gray-500 sm:hidden">{job.company}</div>
                        </td>
                        <td className="px-3 py-4 text-sm text-gray-500 hidden sm:table-cell">
                          {job.company}
                        </td>
                        <td className="px-3 py-4 text-sm text-gray-500 hidden md:table-cell">
                          {job.job_type || 'N/A'}
                        </td>
                        <td className="px-3 py-4 text-sm text-gray-500 hidden lg:table-cell">
                          {job.location || 'N/A'}
                        </td>
                        <td className="px-3 py-4 text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            job.status === 'active' ? 'bg-green-100 text-green-800' :
                            job.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            job.status === 'rejected' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {job.status}
                          </span>
                        </td>
                        <td className="px-3 py-4 text-center text-sm">
                          {/* mobile: vertical stack */}
                          <div className="flex flex-col gap-1 sm:hidden">
                            <Link href={`/admin/view/${job.id}`}>
                              <button className="w-full px-2 py-1 bg-gray-600 text-white rounded text-xs">
                                View
                              </button>
                            </Link>
                            {job.status === 'pending' && (
                              <>
                                <button 
                                  onClick={() => handleJobAction(job.id, 'active')}
                                  className="px-2 py-1 bg-green-600 text-white rounded text-xs"
                                >
                                  Approve
                                </button>
                                <button 
                                  onClick={() => handleJobAction(job.id, 'rejected')}
                                  className="px-2 py-1 bg-red-600 text-white rounded text-xs"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                            {job.status === 'active' && (
                              <button 
                                onClick={() => handleJobAction(job.id, 'removed')}
                                className="px-2 py-1 bg-red-600 text-white rounded text-xs"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                          {/* desktop: horizontal row */}
                          <div className="hidden sm:flex gap-2 justify-center">
                            <Link href={`/admin/view/${job.id}`}>
                              <button className="px-3 py-1 bg-gray-600 text-white rounded text-xs hover:bg-gray-700">
                                View
                              </button>
                            </Link>
                            {job.status === 'pending' && (
                              <>
                                <button 
                                  onClick={() => handleJobAction(job.id, 'active')}
                                  className="px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                                >
                                  Approve
                                </button>
                                <button 
                                  onClick={() => handleJobAction(job.id, 'rejected')}
                                  className="px-3 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                            {job.status === 'active' && (
                              <button 
                                onClick={() => handleJobAction(job.id, 'removed')}
                                className="px-3 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* archived jobs tab */}
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

        {/* edit user modal */}
        {isModalOpen && editingUser && (
          <EditUserModal user={editingUser} onClose={closeModal} onSave={handleSaveUser} />
        )}

        {/* create admin modal */}
        {showCreateAdmin && (
          <CreateAdminModal onClose={() => setShowCreateAdmin(false)} onSuccess={fetchUsers} />
        )}
      </div>
    </div>
  );
}

// component for archived jobs tab - fixed mobile layout
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
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-4">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-700">Archived Jobs (Past Deadline)</h2>
        <div className="w-full sm:w-auto">
          <label className="mr-2 font-medium text-sm">Posted by:</label>
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className="p-2 border rounded w-full sm:w-auto">
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
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Job Title</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Company</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Posted By</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Role</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Type</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Expired</th>
                <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Days Ago</th>
                <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {jobs.map((job) => {
                const daysAgo = getDaysSinceExpired(job.deadline);
                return (
                  <tr key={job.id} className="hover:bg-gray-50">
                    <td className="px-3 py-4 text-sm font-medium text-gray-900">
                      <div>{job.title}</div>
                      {/* show company and days expired on mobile */}
                      <div className="text-xs text-gray-500 sm:hidden">{job.company}</div>
                      <div className="text-xs text-gray-400 sm:hidden">Expired {daysAgo} days ago</div>
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-500 hidden sm:table-cell">
                      {job.company}
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-500 hidden md:table-cell">
                      {job.creator_name}
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-500 capitalize hidden lg:table-cell">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        job.role === 'faculty' || job.role === 'staff' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {job.role}
                      </span>
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-500 hidden lg:table-cell">
                      {job.job_type || 'N/A'}
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-500 hidden md:table-cell">
                      {new Date(job.deadline).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-4 text-center hidden sm:table-cell">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        daysAgo <= 7 ? 'bg-yellow-100 text-yellow-800' :
                        daysAgo <= 30 ? 'bg-orange-100 text-orange-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {daysAgo} {daysAgo === 1 ? 'day' : 'days'}
                      </span>
                    </td>
                    <td className="px-3 py-4 text-center text-sm">
                      {/* mobile: vertical stack to prevent overflow */}
                      <div className="flex flex-col gap-1 sm:hidden">
                        <button 
                          onClick={() => onReactivate(job.id)}
                          className="px-2 py-1 bg-blue-600 text-white rounded text-xs"
                        >
                          Reactivate
                        </button>
                        <Link href={`/admin/view/${job.id}`}>
                          <button className="w-full px-2 py-1 bg-gray-600 text-white rounded text-xs">
                            View
                          </button>
                        </Link>
                      </div>
                      {/* desktop: horizontal row */}
                      <div className="hidden sm:flex gap-2 justify-center">
                        <button 
                          onClick={() => onReactivate(job.id)}
                          className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                        >
                          Reactivate
                        </button>
                        <Link href={`/admin/view/${job.id}`}>
                          <button className="px-3 py-1 bg-gray-600 text-white rounded text-xs hover:bg-gray-700">
                            View
                          </button>
                        </Link>
                      </div>
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

// component for edit user modal
function EditUserModal({ user, onClose, onSave }: { user: AdminUser, onClose: () => void, onSave: (user: AdminUser) => void }) {
  const [formData, setFormData] = useState(user);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4">Edit User: {user.email}</h2>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="first_name" className="block text-sm font-medium text-gray-700">First Name</label>
              <input type="text" name="first_name" id="first_name" value={formData.first_name} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
            </div>
            <div>
              <label htmlFor="last_name" className="block text-sm font-medium text-gray-700">Last Name</label>
              <input type="text" name="last_name" id="last_name" value={formData.last_name} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
            </div>
            {user.role === 'rep' && (
              <div>
                <label htmlFor="company_name" className="block text-sm font-medium text-gray-700">Company Name</label>
                <input type="text" name="company_name" id="company_name" value={formData.company_name || ''} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
              </div>
            )}
          </div>
          <div className="mt-6 flex justify-end space-x-4">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-red-700 text-white rounded-md hover:bg-red-800">Save Changes</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// component for create admin modal
function CreateAdminModal({ onClose, onSuccess }: { onClose: () => void, onSuccess: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/admin/create-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, firstName, lastName }),
      });

      if (response.ok) {
        alert('Admin created successfully!');
        onSuccess();
        onClose();
      } else {
        const data = await response.json();
        alert(`Failed to create admin: ${data.error}`);
      }
    } catch (error) {
      console.error('Error creating admin:', error);
      alert('Error creating admin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4">Create New Admin</h2>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
              <input 
                type="email" 
                id="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" 
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
              <input 
                type="password" 
                id="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required
                minLength={6}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" 
              />
            </div>
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">First Name</label>
              <input 
                type="text" 
                id="firstName" 
                value={firstName} 
                onChange={(e) => setFirstName(e.target.value)} 
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" 
              />
            </div>
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">Last Name</label>
              <input 
                type="text" 
                id="lastName" 
                value={lastName} 
                onChange={(e) => setLastName(e.target.value)} 
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" 
              />
            </div>
          </div>
          <div className="mt-6 flex justify-end space-x-4">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
              disabled={loading}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="px-4 py-2 bg-green-700 text-white rounded-md hover:bg-green-800"
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Admin'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}