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

      // call the api endpoint to update the setting
      const response = await fetch('/api/admin/toggle-posting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      const updateData: any = { status: newStatus };
      if (rejectionNote) updateData.rejection_note = rejectionNote;

      const { error } = await supabase
        .from('jobs')
        .update(updateData)
        .eq('id', jobId);

      if (error) throw error;

      fetchJobs();
      fetchArchivedJobs();
    } catch (error) {
      console.error('Error updating job:', error);
      alert('Failed to update job status');
    }
  };

  // reactivate an archived job (set deadline to 30 days from now)
  const handleReactivate = async (jobId: string) => {
    const newDeadline = new Date();
    newDeadline.setDate(newDeadline.getDate() + 30);

    try {
      const { error } = await supabase
        .from('jobs')
        .update({ 
          status: 'active',
          deadline: newDeadline.toISOString()
        })
        .eq('id', jobId);

      if (error) throw error;

      fetchJobs();
      fetchArchivedJobs();
      alert('Job reactivated successfully with a 30-day deadline.');
    } catch (error) {
      console.error('Error reactivating job:', error);
      alert('Failed to reactivate job');
    }
  };

  // save edited user details
  const handleSaveUser = async (updatedUser: AdminUser) => {
    try {
      const response = await fetch('/api/admin/update-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedUser),
      });

      if (response.ok) {
        alert('User updated successfully');
        setIsModalOpen(false);
        setEditingUser(null);
        fetchUsers();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to update user');
      }
    } catch (error) {
      console.error('Error updating user:', error);
      alert('An error occurred while updating the user');
    }
  };

  // handle create admin form submission
  const handleCreateAdmin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirm_password') as string;
    const firstName = formData.get('first_name') as string;
    const lastName = formData.get('last_name') as string;

    if (password !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    try {
      const response = await fetch('/api/admin/create-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, firstName, lastName }),
      });

      if (response.ok) {
        alert('Admin user created successfully');
        setShowCreateAdmin(false);
        fetchUsers();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to create admin user');
      }
    } catch (error) {
      console.error('Error creating admin user:', error);
      alert('An error occurred while creating the admin user');
    }
  };

  // filter jobs based on selected status
  const filteredJobs = useMemo(() => {
    if (!statusFilter) return jobs;
    return jobs.filter(job => job.status === statusFilter);
  }, [jobs, statusFilter]);

  // filter archived jobs based on selected filter
  const filteredArchivedJobs = useMemo(() => {
    if (!archivedFilter) return archivedJobs;
    return archivedJobs.filter(job => job.status === archivedFilter);
  }, [archivedJobs, archivedFilter]);

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6">admin dashboard</h1>

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

        {/* tabs for switching between users, jobs, and archived */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              activeTab === 'users'
                ? 'bg-red-700 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            users ({users.length})
          </button>
          <button
            onClick={() => setActiveTab('jobs')}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              activeTab === 'jobs'
                ? 'bg-red-700 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            jobs ({jobs.length})
          </button>
          <button
            onClick={() => setActiveTab('archived')}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              activeTab === 'archived'
                ? 'bg-red-700 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            archived ({archivedJobs.length})
          </button>
        </div>

        {/* users tab content */}
        {activeTab === 'users' && (
          <UsersTab
            users={users}
            loading={loadingUsers}
            onStatusToggle={handleStatusToggle}
            onEditUser={(user) => {
              setEditingUser(user);
              setIsModalOpen(true);
            }}
            onDeleteUser={handleDeleteUser}
            onCreateAdmin={() => setShowCreateAdmin(true)}
          />
        )}

        {/* jobs tab content */}
        {activeTab === 'jobs' && (
          <JobsTab
            jobs={filteredJobs}
            loading={loadingJobs}
            onJobAction={handleJobAction}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
          />
        )}

        {/* archived tab content */}
        {activeTab === 'archived' && (
          <ArchivedTab
            jobs={filteredArchivedJobs}
            loading={loadingArchived}
            onReactivate={handleReactivate}
            archivedFilter={archivedFilter}
            onArchivedFilterChange={setArchivedFilter}
          />
        )}
      </div>

      {/* modals for editing user and creating admin */}
      {isModalOpen && editingUser && (
        <EditUserModal
          user={editingUser}
          onClose={() => {
            setIsModalOpen(false);
            setEditingUser(null);
          }}
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

// component to display users tab
function UsersTab({ 
  users, 
  loading, 
  onStatusToggle, 
  onEditUser, 
  onDeleteUser,
  onCreateAdmin 
}: { 
  users: AdminUser[], 
  loading: boolean, 
  onStatusToggle: (userId: string, currentStatus: boolean) => void, 
  onEditUser: (user: AdminUser) => void,
  onDeleteUser: (user: AdminUser) => void,
  onCreateAdmin: () => void
}) {
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-red-700"></div>
        <p className="mt-2 text-gray-600">loading users...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      {/* header with create admin button */}
      <div className="p-4 sm:p-6 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-xl font-semibold text-gray-900">manage users</h2>
        <button
          onClick={onCreateAdmin}
          className="w-full sm:w-auto px-4 py-2 bg-green-700 text-white rounded-md hover:bg-green-800 transition-colors"
        >
          + create admin user
        </button>
      </div>

      {/* mobile cards layout */}
      <div className="block sm:hidden">
        {users.map((user) => (
          <div key={user.user_id} className="p-4 border-b border-gray-200">
            <div className="flex justify-between items-start mb-2">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">{user.email}</p>
                <p className="text-sm text-gray-600">
                  {user.first_name} {user.last_name}
                </p>
                {user.company_name && (
                  <p className="text-xs text-gray-500">{user.company_name}</p>
                )}
              </div>
              <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ${
                user.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                user.role === 'faculty' ? 'bg-blue-100 text-blue-800' :
                user.role === 'rep' ? 'bg-green-100 text-green-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {user.role}
              </span>
            </div>
            
            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">jobs: {user.jobs_posted}</span>
                <button
                  onClick={() => onStatusToggle(user.user_id, user.is_active)}
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    user.is_active
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {user.is_active ? 'active' : 'inactive'}
                </button>
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => onEditUser(user)}
                  className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                >
                  edit
                </button>
                <button
                  onClick={() => onDeleteUser(user)}
                  className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
                >
                  delete
                </button>
              </div>
            </div>
            
            {user.last_sign_in_at && (
              <p className="text-xs text-gray-400 mt-2">
                last login: {new Date(user.last_sign_in_at).toLocaleDateString()}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* desktop table layout */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">user</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">jobs posted</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">last login</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.user_id}>
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-gray-900">{user.email}</div>
                  <div className="text-sm text-gray-500">{user.first_name} {user.last_name}</div>
                  {user.company_name && (
                    <div className="text-xs text-gray-400">{user.company_name}</div>
                  )}
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    user.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                    user.role === 'faculty' ? 'bg-blue-100 text-blue-800' :
                    user.role === 'rep' ? 'bg-green-100 text-green-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => onStatusToggle(user.user_id, user.is_active)}
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      user.is_active
                        ? 'bg-green-100 text-green-800 hover:bg-green-200'
                        : 'bg-red-100 text-red-800 hover:bg-red-200'
                    }`}
                  >
                    {user.is_active ? 'active' : 'inactive'}
                  </button>
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">{user.jobs_posted}</td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {user.last_sign_in_at 
                    ? new Date(user.last_sign_in_at).toLocaleDateString()
                    : 'never'}
                </td>
                <td className="px-6 py-4 text-sm font-medium">
                  <div className="flex gap-2">
                    <button
                      onClick={() => onEditUser(user)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      edit
                    </button>
                    <button
                      onClick={() => onDeleteUser(user)}
                      className="text-red-600 hover:text-red-900"
                    >
                      delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// component to display jobs tab
function JobsTab({ 
  jobs, 
  loading, 
  onJobAction, 
  statusFilter, 
  onStatusFilterChange 
}: { 
  jobs: Job[], 
  loading: boolean, 
  onJobAction: (jobId: string, status: Job['status']) => void,
  statusFilter: string,
  onStatusFilterChange: (filter: string) => void
}) {
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-red-700"></div>
        <p className="mt-2 text-gray-600">loading jobs...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      {/* header with filter */}
      <div className="p-4 sm:p-6 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-xl font-semibold text-gray-900">manage jobs</h2>
          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <option value="">all statuses</option>
            <option value="pending">pending</option>
            <option value="active">active</option>
            <option value="removed">removed</option>
            <option value="rejected">rejected</option>
          </select>
        </div>
      </div>

      {jobs.length === 0 ? (
        <div className="p-8 text-center text-gray-500">
          no jobs found with selected filter
        </div>
      ) : (
        <>
          {/* mobile cards layout */}
          <div className="block sm:hidden">
            {jobs.map((job) => (
              <div key={job.id} className="p-4 border-b border-gray-200">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900">{job.title}</p>
                    <p className="text-sm text-gray-600">{job.company}</p>
                    {job.location && (
                      <p className="text-xs text-gray-500">{job.location}</p>
                    )}
                  </div>
                  <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ${
                    job.status === 'active' ? 'bg-green-100 text-green-800' :
                    job.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    job.status === 'rejected' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {job.status}
                  </span>
                </div>
                
                <div className="text-xs text-gray-500 mb-3">
                  <p>deadline: {new Date(job.deadline).toLocaleDateString()}</p>
                  <p>posted: {new Date(job.created_at).toLocaleDateString()}</p>
                </div>
                
                <div className="flex flex-col gap-2">
                  <Link href={`/admin/view/${job.id}`}>
                    <button className="w-full px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
                      view
                    </button>
                  </Link>
                  <div className="flex gap-2">
                    {job.status === 'pending' && (
                      <>
                        <button
                          onClick={() => onJobAction(job.id, 'active')}
                          className="flex-1 px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                        >
                          approve
                        </button>
                        <button
                          onClick={() => onJobAction(job.id, 'rejected')}
                          className="flex-1 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                        >
                          reject
                        </button>
                      </>
                    )}
                    {job.status === 'active' && (
                      <button
                        onClick={() => onJobAction(job.id, 'removed')}
                        className="flex-1 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                      >
                        remove
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* desktop table layout */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">job title</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">company</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">deadline</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">posted</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {jobs.map((job) => (
                  <tr key={job.id}>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{job.title}</div>
                      {job.job_type && (
                        <div className="text-xs text-gray-500">{job.job_type}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{job.company}</div>
                      {job.location && (
                        <div className="text-xs text-gray-500">{job.location}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        job.status === 'active' ? 'bg-green-100 text-green-800' :
                        job.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        job.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {job.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(job.deadline).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(job.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium">
                      <div className="flex gap-2">
                        <Link href={`/admin/view/${job.id}`}>
                          <button className="text-blue-600 hover:text-blue-900">
                            view
                          </button>
                        </Link>
                        {job.status === 'pending' && (
                          <>
                            <button
                              onClick={() => onJobAction(job.id, 'active')}
                              className="text-green-600 hover:text-green-900"
                            >
                              approve
                            </button>
                            <button
                              onClick={() => onJobAction(job.id, 'rejected')}
                              className="text-red-600 hover:text-red-900"
                            >
                              reject
                            </button>
                          </>
                        )}
                        {job.status === 'active' && (
                          <button
                            onClick={() => onJobAction(job.id, 'removed')}
                            className="text-red-600 hover:text-red-900"
                          >
                            remove
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

// component to display archived jobs tab
function ArchivedTab({ 
  jobs, 
  loading, 
  onReactivate,
  archivedFilter,
  onArchivedFilterChange
}: { 
  jobs: Job[], 
  loading: boolean, 
  onReactivate: (jobId: string) => void,
  archivedFilter: string,
  onArchivedFilterChange: (filter: string) => void
}) {
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-red-700"></div>
        <p className="mt-2 text-gray-600">loading archived jobs...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      {/* header with info */}
      <div className="p-4 sm:p-6 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">archived jobs</h2>
            <p className="text-sm text-gray-500 mt-1">jobs with expired deadlines from all users</p>
          </div>
          <select
            value={archivedFilter}
            onChange={(e) => onArchivedFilterChange(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <option value="">all archived</option>
            <option value="removed">removed</option>
            <option value="rejected">rejected</option>
          </select>
        </div>
      </div>

      {jobs.length === 0 ? (
        <div className="p-8 text-center text-gray-500">
          no archived jobs found
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">job title</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">company</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">type</th>
                <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">expired</th>
                <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {jobs.map((job) => {
                const daysAgo = Math.floor((new Date().getTime() - new Date(job.deadline).getTime()) / (1000 * 60 * 60 * 24));
                
                return (
                  <tr key={job.id}>
                    <td className="px-3 py-4">
                      <div className="text-sm font-medium text-gray-900">{job.title}</div>
                      {/* show company on mobile since column is hidden */}
                      <div className="text-xs text-gray-500 sm:hidden mt-1">{job.company}</div>
                      {/* show type on mobile/tablet since column is hidden */}
                      {job.job_type && (
                        <div className="text-xs text-gray-500 md:hidden mt-1">{job.job_type}</div>
                      )}
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-900 hidden sm:table-cell">
                      {job.company}
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-500 hidden md:table-cell">
                      {job.job_type || 'n/a'}
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
                          reactivate
                        </button>
                        <Link href={`/admin/view/${job.id}`}>
                          <button className="w-full px-2 py-1 bg-gray-600 text-white rounded text-xs">
                            view
                          </button>
                        </Link>
                      </div>
                      {/* desktop: horizontal row */}
                      <div className="hidden sm:flex gap-2 justify-center">
                        <button 
                          onClick={() => onReactivate(job.id)}
                          className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                        >
                          reactivate
                        </button>
                        <Link href={`/admin/view/${job.id}`}>
                          <button className="px-3 py-1 bg-gray-600 text-white rounded text-xs hover:bg-gray-700">
                            view
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
      <div className="bg-white p-6 sm:p-8 rounded-lg shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl sm:text-2xl font-bold mb-4">edit user: {user.email}</h2>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="first_name" className="block text-sm font-medium text-gray-700">first name</label>
              <input type="text" name="first_name" id="first_name" value={formData.first_name} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
            </div>
            <div>
              <label htmlFor="last_name" className="block text-sm font-medium text-gray-700">last name</label>
              <input type="text" name="last_name" id="last_name" value={formData.last_name} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
            </div>
            {user.role === 'rep' && (
              <div>
                <label htmlFor="company_name" className="block text-sm font-medium text-gray-700">company name</label>
                <input type="text" name="company_name" id="company_name" value={formData.company_name || ''} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
              </div>
            )}
          </div>
          <div className="mt-6 flex flex-col sm:flex-row gap-3 sm:justify-end">
            <button type="button" onClick={onClose} className="w-full sm:w-auto px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">cancel</button>
            <button type="submit" className="w-full sm:w-auto px-4 py-2 bg-red-700 text-white rounded-md hover:bg-red-800">save changes</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// create admin modal component with password visibility toggle  
function CreateAdminModal({ onClose, onSubmit }: { onClose: () => void, onSubmit: (e: React.FormEvent<HTMLFormElement>) => void }) {
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
        <h2 className="text-xl sm:text-2xl font-bold mb-4">create new admin user</h2>
        <form onSubmit={onSubmit}>
          <div className="space-y-4">
            {/* first name and last name fields come first */}
            <div>
              <label htmlFor="first_name" className="block text-sm font-medium text-gray-700">first name</label>
              <input type="text" name="first_name" id="first_name" required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
            </div>
            <div>
              <label htmlFor="last_name" className="block text-sm font-medium text-gray-700">last name</label>
              <input type="text" name="last_name" id="last_name" required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
            </div>
            {/* then email field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">email</label>
              <input type="email" name="email" id="email" required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
            </div>
            {/* password field with visibility toggle */}
            <div className="relative">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">password</label>
              <input 
                type={showPassword ? 'text' : 'password'} 
                name="password" 
                id="password" 
                required 
                minLength={8} 
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 pr-10" 
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 px-3 flex items-center top-6"
                aria-label="toggle password visibility"
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
            {/* confirm password field with visibility toggle */}
            <div className="relative">
              <label htmlFor="confirm_password" className="block text-sm font-medium text-gray-700">confirm password</label>
              <input 
                type={showConfirmPassword ? 'text' : 'password'} 
                name="confirm_password" 
                id="confirm_password" 
                required 
                minLength={8} 
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 pr-10" 
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 px-3 flex items-center top-6"
                aria-label="toggle confirm password visibility"
              >
                {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>
          <div className="mt-6 flex flex-col sm:flex-row gap-3 sm:justify-end">
            <button type="button" onClick={onClose} className="w-full sm:w-auto px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">cancel</button>
            <button type="submit" className="w-full sm:w-auto px-4 py-2 bg-green-700 text-white rounded-md hover:bg-green-800">create admin</button>
          </div>
        </form>
      </div>
    </div>
  );
}