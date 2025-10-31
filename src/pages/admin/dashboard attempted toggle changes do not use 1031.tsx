// admin dashboard with mobile-responsive improvements
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

  // state for faculty posting permission toggle
  const [facultyCanPost, setFacultyCanPost] = useState(true);
  const [updatingToggle, setUpdatingToggle] = useState(false);
  const [toggleMessage, setToggleMessage] = useState('');

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

  // get the current setting for whether faculty can post jobs or not
  const fetchFacultyPermission = async () => {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('setting_value')
        .eq('setting_key', 'faculty_can_post_jobs')
        .single();

      if (error) {
        console.error('error fetching permission:', error);
        return;
      }

      if (data) {
        setFacultyCanPost(data.setting_value);
      }
    } catch (error) {
      console.error('error fetching faculty permission:', error);
    }
  };

  // handle when admin clicks the toggle button
  const handleToggleChange = async () => {
    setUpdatingToggle(true);
    setToggleMessage('');

    try {
      // flip the current setting (true becomes false, false becomes true)
      const newValue = !facultyCanPost;

      // get the current user's session token so we can prove we're logged in
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setToggleMessage('not authenticated. please log in again.');
        setUpdatingToggle(false);
        return;
      }

      // call the api endpoint to update the setting
      const response = await fetch('/api/admin/toggle-posting', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ 
          settingKey: 'faculty_can_post_jobs',
          enabled: newValue 
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'failed to update permission');
      }

      // update what we show on screen
      setFacultyCanPost(newValue);
      setToggleMessage(
        newValue 
          ? 'faculty members can now post jobs' 
          : 'faculty members cannot post jobs anymore'
      );

      // clear the message after 3 seconds
      setTimeout(() => setToggleMessage(''), 3000);
    } catch (error) {
      console.error('error updating permission:', error);
      setToggleMessage('failed to update permission. please try again.');
    } finally {
      setUpdatingToggle(false);
    }
  };

  // load data when component mounts
  useEffect(() => {
    fetchUsers();
    fetchJobs();
    fetchArchivedJobs();
    fetchFacultyPermission();
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

  // handle user deletion
  const handleDeleteUser = async (user: AdminUser) => {
    if (window.confirm(`Are you sure you want to delete ${user.email}? This action cannot be undone.`)) {
      try {
        const response = await fetch('/api/admin/delete-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userToDelete: user })
		  
        });

        if (response.ok) {
          alert('User deleted successfully');
          fetchUsers();
        } else {
          const data = await response.json();
          alert(data.error || 'Failed to delete user');
        }
      } catch (error) {
        console.error('Error deleting user:', error);
        alert('An error occurred while deleting the user');
      }
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
      }
    } catch (error) {
      console.error('Error reactivating job:', error);
      alert('Failed to reactivate job.');
    }
  };

  // calculate days since job expired
  const getDaysSinceExpired = (deadline: string): number => {
    const deadlineDate = new Date(deadline);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - deadlineDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // handle saving edited user
  const handleSaveUser = async (updatedUser: AdminUser) => {
    try {
      const response = await fetch('/api/admin/update-user-details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedUser),
      });
      
      if (response.ok) {
        fetchUsers();
        setIsModalOpen(false);
        setEditingUser(null);
      } else {
        alert('Failed to update user details.');
      }
    } catch (error) {
      console.error('Error updating user:', error);
    }
  };

  // handle create admin form submission
  const handleCreateAdmin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    
    try {
      const response = await fetch('/api/admin/create-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.get('email'),
          password: formData.get('password'),
          firstName: formData.get('first_name'),  // api expects camelCase
          lastName: formData.get('last_name'),    // api expects camelCase
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        alert('Admin user created successfully!');
        setShowCreateAdmin(false);
        fetchUsers(); // refresh the user list
        form.reset();
      } else {
        alert(data.error || 'Failed to create admin user.');
      }
    } catch (error) {
      console.error('Error creating admin:', error);
      alert('An error occurred while creating the admin user.');
    }
  };

  // prepare filtered jobs with creator info
  const jobsWithCreatorInfo = useMemo(() => {
    return jobs.map(job => {
      const creator = users.find(u => u.user_id === job.created_by);
      return {
        ...job,
        role: creator?.role || 'unknown',
        email: creator?.email || 'N/A',
        creator_name: creator ? `${creator.first_name} ${creator.last_name}` : 'Unknown'
      };
    });
  }, [jobs, users]);

  // prepare archived jobs with creator info
  const archivedWithCreatorInfo = useMemo(() => {
    return archivedJobs.map(job => {
      const creator = users.find(u => u.user_id === job.created_by);
      return {
        ...job,
        role: creator?.role || 'unknown',
        email: creator?.email || 'N/A',
        creator_name: creator ? `${creator.first_name} ${creator.last_name}` : 'Unknown'
      };
    });
  }, [archivedJobs, users]);

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-uga-red mb-8">Admin Dashboard</h1>

        {/* toggle control for faculty posting permission */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                faculty job posting permission
              </h2>
              <p className="text-sm text-gray-600">
                {facultyCanPost 
                  ? 'faculty members can currently post new jobs' 
                  : 'faculty members cannot post new jobs (button is hidden)'}
              </p>
            </div>

            {/* the actual toggle switch button */}
            <button
              onClick={handleToggleChange}
              disabled={updatingToggle}
              className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 flex-shrink-0 ${
                updatingToggle 
                  ? 'bg-gray-300 cursor-not-allowed' 
                  : facultyCanPost 
                    ? 'bg-green-600' 
                    : 'bg-gray-400'
              }`}
            >
              {/* the sliding circle part of the toggle */}
              <span
                className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                  facultyCanPost ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* message that appears after toggle is clicked */}
          {toggleMessage && (
            <div className={`mt-4 p-3 rounded ${
              toggleMessage.includes('failed') || toggleMessage.includes('error')
                ? 'bg-red-50 text-red-700'
                : 'bg-green-50 text-green-700'
            }`}>
              <p className="text-sm">{toggleMessage}</p>
            </div>
          )}

          {/* extra info about what the toggle does */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              <strong>current status:</strong> {facultyCanPost ? 'enabled ✓' : 'disabled ✗'}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              when disabled, the "post a new job" button will be hidden from all faculty dashboards.
            </p>
          </div>
        </div>

        {/* IMPROVED: Admin action buttons - properly responsive grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-8">
          <Link href="/admin/analytics" className="w-full">
            <button className="w-full px-4 py-3 bg-uga-red text-white rounded-lg font-medium hover:bg-red-700 transition-colors">
              View Analytics
            </button>
          </Link>
          <Link href="/admin/content-review" className="w-full">
            <button className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">
              Content Review
            </button>
          </Link>
          <Link href="/admin/archive-reports" className="w-full">
            <button className="w-full px-4 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors">
              Archive Reports
            </button>
          </Link>
          <Link href="/admin/platform-effectiveness" className="w-full">
            <button className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors">
              Platform Health
            </button>
          </Link>
          <button 
            onClick={() => setShowCreateAdmin(true)}
            className="w-full px-4 py-3 bg-green-700 text-white rounded-lg font-medium hover:bg-green-800 transition-colors"
          >
            + Create Admin
          </button>
        </div>

        {/* Tab Navigation - scrollable on mobile */}
        <div className="flex space-x-1 mb-6 overflow-x-auto">
          <button onClick={() => setActiveTab('users')} className={`px-4 py-2 font-medium rounded-t-lg whitespace-nowrap ${activeTab === 'users' ? 'bg-white text-uga-red border-b-2 border-uga-red' : 'bg-gray-100 text-gray-600'}`}>
            Users ({users.length})
          </button>
          <button onClick={() => setActiveTab('jobs')} className={`px-4 py-2 font-medium rounded-t-lg whitespace-nowrap ${activeTab === 'jobs' ? 'bg-white text-uga-red border-b-2 border-uga-red' : 'bg-gray-100 text-gray-600'}`}>
            Active Jobs ({jobs.length})
          </button>
          <button onClick={() => setActiveTab('archived')} className={`px-4 py-2 font-medium rounded-t-lg whitespace-nowrap ${activeTab === 'archived' ? 'bg-white text-uga-red border-b-2 border-uga-red' : 'bg-gray-100 text-gray-600'}`}>
            Archived ({archivedJobs.length})
          </button>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          {activeTab === 'users' && (
            <UserManagementPanel 
              users={users} 
              loading={loadingUsers} 
              onStatusToggle={handleStatusToggle}
              onEditUser={(user) => { setEditingUser(user); setIsModalOpen(true); }}
              onDeleteUser={handleDeleteUser}
            />
          )}
          {activeTab === 'jobs' && (
            <JobsPanel 
              jobs={jobsWithCreatorInfo} 
              loading={loadingJobs} 
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              onJobAction={handleJobAction}
            />
          )}
          {activeTab === 'archived' && (
            <ArchivedJobsPanel 
              jobs={archivedWithCreatorInfo}
              loading={loadingArchived}
              filter={archivedFilter}
              setFilter={setArchivedFilter}
              onReactivate={handleReactivateJob}
              getDaysSinceExpired={getDaysSinceExpired}
            />
          )}
        </div>
      </div>

      {/* Modals */}
      {isModalOpen && editingUser && (
        <EditUserModal 
          user={editingUser} 
          onClose={() => { setIsModalOpen(false); setEditingUser(null); }}
          onSave={handleSaveUser}
        />
      )}

      {showCreateAdmin && (
        <CreateAdminModal 
          onClose={() => setShowCreateAdmin(false)}
          onSubmit={handleCreateAdmin}
        />
      )}
    </div>
  );
}

// IMPROVED: User Management Panel with mobile card view
function UserManagementPanel({ users, loading, onStatusToggle, onEditUser, onDeleteUser }: { 
  users: AdminUser[], 
  loading: boolean, 
  onStatusToggle: (id: string, status: boolean) => void,
  onEditUser: (user: AdminUser) => void,
  onDeleteUser: (user: AdminUser) => void
}) {
  // Filter state
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [statusFilterLocal, setStatusFilterLocal] = useState<string>('');

  // Apply filters
  const filteredUsers = users.filter(user => {
    if (roleFilter && user.role !== roleFilter) return false;
    if (statusFilterLocal === 'active' && !user.is_active) return false;
    if (statusFilterLocal === 'inactive' && user.is_active) return false;
    return true;
  });

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-700">Manage Users</h2>
        <div className="flex flex-col sm:flex-row gap-2">
          <select 
            value={statusFilterLocal} 
            onChange={(e) => setStatusFilterLocal(e.target.value)} 
            className="px-3 py-2 border rounded-lg text-sm"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <select 
            value={roleFilter} 
            onChange={(e) => setRoleFilter(e.target.value)} 
            className="px-3 py-2 border rounded-lg text-sm"
          >
            <option value="">All Roles</option>
            <option value="student">Students</option>
            <option value="faculty">Faculty</option>
           
            <option value="rep">Company Reps</option>
            <option value="admin">Admins</option>
          </select>
        </div>
      </div>

      <h3 className="text-lg font-semibold mb-4">All Platform Users</h3>

      {loading ? (
        <p>Loading users...</p>
      ) : filteredUsers.length === 0 ? (
        <p className="text-gray-600">No users found{roleFilter || statusFilterLocal ? ' for selected filters' : ''}.</p>
      ) : (
        <>
          {/* Desktop table view */}
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">NAME</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ROLE</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">STATUS</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">LAST SIGN IN</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">JOBS POSTED</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.map((user) => (
                  <tr key={user.user_id}>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{user.first_name} {user.last_name}</div>
                      <div className="text-xs text-gray-500">{user.email}</div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">{user.role}</td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 text-center">{user.jobs_posted}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-center text-sm font-medium">
                      <button onClick={() => onStatusToggle(user.user_id, user.is_active)} className="text-indigo-600 hover:text-indigo-900 mr-3">
                        {user.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                      <button onClick={() => onEditUser(user)} className="text-blue-600 hover:text-blue-900 mr-3">Edit</button>
                      <button onClick={() => onDeleteUser(user)} className="text-red-600 hover:text-red-900">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile card view */}
          <div className="md:hidden space-y-4">
            {filteredUsers.map((user) => (
              <div key={user.user_id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="font-semibold text-gray-900">{user.first_name} {user.last_name}</p>
                    <p className="text-sm text-gray-500">{user.email}</p>
                    <p className="text-xs text-gray-400 capitalize mt-1">{user.role}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {user.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mb-3">
                  <div><span className="font-medium">Last Sign In:</span> {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString() : 'Never'}</div>
                  <div><span className="font-medium">Jobs Posted:</span> {user.jobs_posted}</div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => onStatusToggle(user.user_id, user.is_active)} className="flex-1 px-3 py-2 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700">
                    {user.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button onClick={() => onEditUser(user)} className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">Edit</button>
                  <button onClick={() => onDeleteUser(user)} className="flex-1 px-3 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700">Delete</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// Jobs Panel Component
function JobsPanel({ jobs, loading, statusFilter, setStatusFilter, onJobAction }: {
  jobs: Job[],
  loading: boolean,
  statusFilter: string,
  setStatusFilter: (filter: string) => void,
  onJobAction: (jobId: string, status: Job['status']) => void
}) {
  // Apply filter
  const filteredJobs = statusFilter ? jobs.filter(job => job.status === statusFilter) : jobs;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-700">Manage Jobs</h2>
        <select 
          value={statusFilter} 
          onChange={(e) => setStatusFilter(e.target.value)} 
          className="px-3 py-2 border rounded-lg text-sm"
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending Approval</option>
          <option value="active">Active</option>
          <option value="rejected">Rejected</option>
          <option value="removed">Removed</option>
        </select>
      </div>

      {loading ? (
        <p>Loading jobs...</p>
      ) : filteredJobs.length === 0 ? (
        <p className="text-gray-600">No jobs found{statusFilter ? ' for this status' : ''}.</p>
      ) : (
        <>
          {/* Desktop table view */}
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">JOB TITLE</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">COMPANY</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">POSTED BY</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">STATUS</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">DEADLINE</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredJobs.map((job) => (
                  <tr key={job.id}>
                    <td className="px-4 py-4">
                      <Link href={`/admin/view/${job.id}`} className="text-blue-600 hover:underline">
                        <div className="text-sm font-medium">{job.title}</div>
                      </Link>
                      <div className="text-xs text-gray-500">{job.job_type}</div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{job.company}</td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{job.creator_name}</div>
                      <div className="text-xs text-gray-500 capitalize">{job.role}</div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        job.status === 'active' ? 'bg-green-100 text-green-800' :
                        job.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        job.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(job.deadline).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-center text-sm font-medium">
                      {job.status === 'pending' && (
                        <>
                          <button onClick={() => onJobAction(job.id, 'active')} className="text-green-600 hover:text-green-900 mr-3">Approve</button>
                          <button onClick={() => onJobAction(job.id, 'rejected')} className="text-red-600 hover:text-red-900">Reject</button>
                        </>
                      )}
                      {job.status === 'active' && (
                        <button onClick={() => onJobAction(job.id, 'removed')} className="text-red-600 hover:text-red-900">Remove</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile card view */}
          <div className="md:hidden space-y-4">
            {filteredJobs.map((job) => (
              <div key={job.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <Link href={`/admin/view/${job.id}`} className="text-blue-600 hover:underline">
                  <h3 className="font-semibold text-gray-900 mb-1">{job.title}</h3>
                </Link>
                <p className="text-sm text-gray-600 mb-2">{job.company}</p>
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs text-gray-500">
                    <div>Posted by: {job.creator_name}</div>
                    <div className="capitalize">{job.role}</div>
                  </div>
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    job.status === 'active' ? 'bg-green-100 text-green-800' :
                    job.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    job.status === 'rejected' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                  </span>
                </div>
                <div className="text-xs text-gray-500 mb-3">
                  Deadline: {new Date(job.deadline).toLocaleDateString()}
                </div>
                {job.status === 'pending' && (
                  <div className="flex gap-2">
                    <button onClick={() => onJobAction(job.id, 'active')} className="flex-1 px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700">Approve</button>
                    <button onClick={() => onJobAction(job.id, 'rejected')} className="flex-1 px-3 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700">Reject</button>
                  </div>
                )}
                {job.status === 'active' && (
                  <button onClick={() => onJobAction(job.id, 'removed')} className="w-full px-3 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700">Remove</button>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// Archived Jobs Panel Component
function ArchivedJobsPanel({ jobs, loading, filter, setFilter, onReactivate, getDaysSinceExpired }: {
  jobs: Job[],
  loading: boolean,
  filter: string,
  setFilter: (filter: string) => void,
  onReactivate: (jobId: string) => void,
  getDaysSinceExpired: (deadline: string) => number
}) {
  // Apply filter
  const filteredJobs = filter ? jobs.filter(job => job.status === filter) : jobs;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-700">Archived Jobs</h2>
        <select 
          value={filter} 
          onChange={(e) => setFilter(e.target.value)} 
          className="px-3 py-2 border rounded-lg text-sm"
        >
          <option value="">All Archived</option>
          <option value="rejected">Rejected</option>
          <option value="removed">Removed</option>
        </select>
      </div>

      {loading ? (
        <p>Loading archived jobs...</p>
      ) : filteredJobs.length === 0 ? (
        <p className="text-gray-600">No archived jobs found{filter ? ' for this filter' : ''}.</p>
      ) : (
        <>
          {/* Desktop table view */}
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">JOB TITLE</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">COMPANY</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">POSTED BY</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">EXPIRED</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredJobs.map((job) => {
                  const daysExpired = getDaysSinceExpired(job.deadline);
                  return (
                    <tr key={job.id}>
                      <td className="px-4 py-4">
                        <Link href={`/admin/view/${job.id}`} className="text-blue-600 hover:underline">
                          <div className="text-sm font-medium">{job.title}</div>
                        </Link>
                        <div className="text-xs text-gray-500">{job.job_type}</div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{job.company}</td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{job.creator_name}</div>
                        <div className="text-xs text-gray-500 capitalize">{job.role}</div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        {daysExpired} day{daysExpired !== 1 ? 's' : ''} ago
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-center text-sm font-medium">
                        <button onClick={() => onReactivate(job.id)} className="text-blue-600 hover:text-blue-900 mr-3">Reactivate</button>
                        <Link href={`/admin/view/${job.id}`} className="text-gray-600 hover:text-gray-900">View</Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile card view */}
          <div className="md:hidden space-y-4">
            {filteredJobs.map((job) => {
              const daysExpired = getDaysSinceExpired(job.deadline);
              return (
                <div key={job.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <Link href={`/admin/view/${job.id}`} className="text-blue-600 hover:underline">
                    <h3 className="font-semibold text-gray-900 mb-1">{job.title}</h3>
                  </Link>
                  <p className="text-sm text-gray-600 mb-2">{job.company}</p>
                  <div className="text-xs text-gray-500 mb-3">
                    <div>Posted by: {job.creator_name}</div>
                    <div className="capitalize">{job.role}</div>
                    <div className="mt-1">Expired {daysExpired} day{daysExpired !== 1 ? 's' : ''} ago</div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => onReactivate(job.id)} className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">Reactivate</button>
                    <Link href={`/admin/view/${job.id}`} className="flex-1">
                      <button className="w-full px-3 py-2 bg-gray-600 text-white text-sm rounded hover:bg-gray-700">View</button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// Edit User Modal
function EditUserModal({ user, onClose, onSave }: { 
  user: AdminUser, 
  onClose: () => void, 
  onSave: (user: AdminUser) => void 
}) {
  const [formData, setFormData] = useState<AdminUser>(user);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
      <div className="bg-white p-6 sm:p-8 rounded-lg shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl sm:text-2xl font-bold mb-4">Edit User: {user.email}</h2>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">First Name</label>
              <input 
                type="text" 
                value={formData.first_name} 
                onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Last Name</label>
              <input 
                type="text" 
                value={formData.last_name} 
                onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            {formData.role === 'rep' && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Company Name</label>
                <input 
                  type="text" 
                  value={formData.company_name || ''} 
                  onChange={(e) => setFormData({...formData, company_name: e.target.value})}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            )}
          </div>
          <div className="mt-6 flex flex-col sm:flex-row gap-3 sm:justify-end">
            <button type="button" onClick={onClose} className="w-full sm:w-auto px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Cancel</button>
            <button type="submit" className="w-full sm:w-auto px-4 py-2 bg-uga-red text-white rounded-md hover:bg-red-700">Save Changes</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Create Admin Modal  
function CreateAdminModal({ onClose, onSubmit }: { 
  onClose: () => void, 
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void 
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // eye icon components for showing/hiding passwords
  const EyeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  );

  const EyeOffIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
      <div className="bg-white p-6 sm:p-8 rounded-lg shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl sm:text-2xl font-bold mb-4">Create New Admin User</h2>
        <form onSubmit={onSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">First Name</label>
              <input type="text" name="first_name" required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Last Name</label>
              <input type="text" name="last_name" required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input type="email" name="email" required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
            </div>
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700">Password</label>
              <input 
                type={showPassword ? 'text' : 'password'} 
                name="password" 
                required 
                minLength={8} 
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 pr-10" 
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 px-3 flex items-center top-6"
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700">Confirm Password</label>
              <input 
                type={showConfirmPassword ? 'text' : 'password'} 
                name="confirm_password" 
                required 
                minLength={8} 
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 pr-10" 
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 px-3 flex items-center top-6"
              >
                {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>
          <div className="mt-6 flex flex-col sm:flex-row gap-3 sm:justify-end">
            <button type="button" onClick={onClose} className="w-full sm:w-auto px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Cancel</button>
            <button type="submit" className="w-full sm:w-auto px-4 py-2 bg-green-700 text-white rounded-md hover:bg-green-800">Create Admin</button>
          </div>
        </form>
      </div>
    </div>
  );
}
