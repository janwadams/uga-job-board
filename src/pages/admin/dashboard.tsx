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

  const closeEditModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
  };

  const handleUpdateUserDetails = async (updatedUser: AdminUser) => {
    try {
      const response = await fetch('/api/admin/update-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: updatedUser.user_id, 
          firstName: updatedUser.first_name, 
          lastName: updatedUser.last_name, 
          companyName: updatedUser.company_name 
        }),
      });
      
      if (response.ok) {
        alert('User updated successfully!');
        fetchUsers();
        closeEditModal();
      } else {
        alert('Failed to update user.');
      }
    } catch (error) {
      console.error('Error updating user:', error);
      alert('Error updating user.');
    }
  };

  const handleDeleteUser = async (user: AdminUser) => {
    if (!confirm(`Are you sure you want to delete ${user.first_name} ${user.last_name}?`)) return;

    try {
      const response = await fetch('/api/admin/delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.user_id }),
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

  // calculate days since job expired
  const getDaysSinceExpired = (deadline: string) => {
    const deadlineDate = new Date(deadline);
    const today = new Date();
    const diff = Math.floor((today.getTime() - deadlineDate.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* header with admin dashboard title and action buttons */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-uga-red mb-4">Admin Dashboard</h1>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          <Link href="/admin/analytics" className="w-full">
            <button className="w-full lg:min-w-[140px] bg-uga-red text-white px-3 py-2 rounded hover:bg-red-800 text-center text-xs sm:text-sm">
              View Analytics
            </button>
          </Link>
          
          <Link href="/admin/content-review" className="w-full">
            <button className="w-full lg:min-w-[140px] bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700 text-center text-xs sm:text-sm">
              Content Review
            </button>
          </Link>
          
          <Link href="/admin/archive-reports" className="w-full">
            <button className="w-full lg:min-w-[140px] bg-green-600 text-white px-3 py-2 rounded hover:bg-green-700 text-center text-xs sm:text-sm">
              Archive Reports
            </button>
          </Link>
          
          <Link href="/admin/platform-effectiveness" className="w-full">
            <button className="w-full lg:min-w-[140px] bg-purple-600 text-white px-3 py-2 rounded hover:bg-purple-700 text-center text-xs sm:text-sm">
              Platform Health
            </button>
          </Link>
          
          {/* create admin button - same size as all others */}
          {activeTab === 'users' && (
            <button
              onClick={() => setShowCreateAdmin(true)}
              className="w-full lg:min-w-[140px] bg-green-700 text-white px-3 py-2 rounded hover:bg-green-800 text-center text-xs sm:text-sm"
            >
              + Create Admin
            </button>
          )}
        </div>
      </div>

      {/* tab navigation for switching between users, jobs, and archived */}
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
            Current Jobs ({jobs.length})
          </button>
          <button 
            onClick={() => setActiveTab('archived')} 
            className={`${activeTab === 'archived' ? 'border-red-700 text-red-800' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-lg`}
          >
            Archived Jobs ({archivedJobs.length})
          </button>
        </nav>
      </div>

      {/* conditional content based on active tab */}
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

      {/* modal for editing user details */}
      {isModalOpen && editingUser && (
        <EditUserModal user={editingUser} onClose={closeEditModal} onSave={handleUpdateUserDetails} />
      )}

      {/* modal for creating new admin */}
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

// create admin modal component with password visibility
function CreateAdminModal({ onClose, onSuccess }: { onClose: () => void, onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/admin/create-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email.trim(),
          password: formData.password,
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert('Admin account created successfully!');
        onSuccess();
      } else {
        setError(data.error || 'Failed to create admin account.');
      }
    } catch (err) {
      setError('An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  // eye icon components for showing/hiding passwords
  const EyeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  );

  const EyeOffIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a10.025 10.025 0 01-1.273-4M12 5a10.016 10.016 0 016.24 2.182M6.343 6.343A10.015 10.015 0 0112 5m0 14v-7m0 0a3 3 0 100-6m0 6a3 3 0 110 6m6.657-6.343a10.015 10.015 0 01-2.475 6.565M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">Create New Admin</h2>
        {error && <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
            <input 
              type="text" 
              id="firstName" 
              name="firstName" 
              value={formData.firstName} 
              onChange={handleChange} 
              required 
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="mb-4">
            <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
            <input 
              type="text" 
              id="lastName" 
              name="lastName" 
              value={formData.lastName} 
              onChange={handleChange} 
              required 
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="mb-4">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input 
              type="email" 
              id="email" 
              name="email" 
              value={formData.email} 
              onChange={handleChange} 
              required 
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="mb-4 relative">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input 
              type={showPassword ? 'text' : 'password'} 
              id="password" 
              name="password" 
              value={formData.password} 
              onChange={handleChange} 
              required 
              minLength={6}
              className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button 
              type="button" 
              onClick={() => setShowPassword(!showPassword)} 
              className="absolute right-3 top-9 text-gray-500 hover:text-gray-700"
            >
              {showPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
          <div className="mb-6 relative">
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
            <input 
              type={showConfirmPassword ? 'text' : 'password'} 
              id="confirmPassword" 
              name="confirmPassword" 
              value={formData.confirmPassword} 
              onChange={handleChange} 
              required 
              minLength={6}
              className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button 
              type="button" 
              onClick={() => setShowConfirmPassword(!showConfirmPassword)} 
              className="absolute right-3 top-9 text-gray-500 hover:text-gray-700"
            >
              {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
          <div className="flex justify-end space-x-3">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
              disabled={loading}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
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

// component for users tab - fixed mobile layout WITH STATUS FILTER
function UsersManagementPanel({ users, loading, onStatusToggle, onEditUser, onDeleteUser }: { users: AdminUser[], loading: boolean, onStatusToggle: (userId: string, currentStatus: boolean) => void, onEditUser: (user: AdminUser) => void, onDeleteUser: (user: AdminUser) => void }) {
  // filter for user status (active/disabled/all)
  const [userStatusFilter, setUserStatusFilter] = useState<string>('all');

  // filter users based on their active status
  const filteredUsers = useMemo(() => {
    if (userStatusFilter === 'all') return users;
    if (userStatusFilter === 'active') return users.filter(user => user.is_active);
    if (userStatusFilter === 'disabled') return users.filter(user => !user.is_active);
    return users;
  }, [users, userStatusFilter]);

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-gray-700">All Platform Users</h2>
        
        {/* status filter dropdown */}
        <div>
          <label className="mr-2 font-medium">Status:</label>
          <select 
            value={userStatusFilter} 
            onChange={(e) => setUserStatusFilter(e.target.value)} 
            className="p-2 border rounded"
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="disabled">Disabled</option>
          </select>
        </div>
      </div>

      {loading ? (<p>Loading users...</p>) : filteredUsers.length === 0 ? (
        <p>No users found{userStatusFilter !== 'all' && ' for selected filter'}.</p>
      ) : (
        <div className="overflow-x-auto border border-gray-200 rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Email</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Company</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Role</th>
                <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Status</th>
                <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr key={user.user_id}>
                  <td className="px-3 py-4 text-sm font-medium text-gray-900">
                    <div>{user.first_name} {user.last_name}</div>
                    {/* show role and status on mobile under name */}
                    <div className="text-xs text-gray-500 sm:hidden">{user.role}</div>
                    <div className="text-xs sm:hidden">
                      <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {user.is_active ? 'Active' : 'Disabled'}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-4 text-sm text-gray-500 hidden md:table-cell">{user.email}</td>
                  <td className="px-3 py-4 text-sm text-gray-500 hidden lg:table-cell">{user.company_name || 'N/A'}</td>
                  <td className="px-3 py-4 text-sm text-gray-500 capitalize hidden sm:table-cell">{user.role}</td>
                  <td className="px-3 py-4 text-center hidden sm:table-cell">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {user.is_active ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td className="px-3 py-4 text-center text-sm font-medium">
                    {/* mobile: vertical stack to prevent overflow */}
                    <div className="flex flex-col gap-1 sm:hidden">
                      <button onClick={() => onEditUser(user)} className="px-2 py-1 rounded text-white text-xs bg-indigo-600">
                        Edit
                      </button>
                      <button onClick={() => onStatusToggle(user.user_id, user.is_active)} className={`px-2 py-1 rounded text-white text-xs ${user.is_active ? 'bg-red-600' : 'bg-green-600'}`}>
                        {user.is_active ? 'Disable' : 'Enable'}
                      </button>
                      <button onClick={() => onDeleteUser(user)} className="px-2 py-1 rounded text-white text-xs bg-gray-700">
                        Delete
                      </button>
                    </div>
                    {/* desktop: horizontal row */}
                    <div className="hidden sm:flex gap-2 justify-center">
                      <button onClick={() => onEditUser(user)} className="px-3 py-1 rounded text-white text-xs bg-indigo-600 hover:bg-indigo-700">
                        Edit
                      </button>
                      <button onClick={() => onStatusToggle(user.user_id, user.is_active)} className={`px-3 py-1 rounded text-white text-xs ${user.is_active ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}>
                        {user.is_active ? 'Disable' : 'Enable'}
                      </button>
                      <button onClick={() => onDeleteUser(user)} className="px-3 py-1 rounded text-white text-xs bg-gray-700 hover:bg-gray-800">
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
  );
}

// component for jobs tab - fixed mobile button layout
function JobsManagementPanel({ jobs, loading, onJobAction, statusFilter, setStatusFilter }: { jobs: Job[], loading: boolean, onJobAction: (jobId: string, newStatus: Job['status']) => void, statusFilter: string, setStatusFilter: (filter: string) => void }) {
  const statusColors: Record<Job['status'], string> = { 
    active: 'bg-green-100 text-green-800', 
    pending: 'bg-yellow-100 text-yellow-800', 
    removed: 'bg-red-100 text-red-800', 
    rejected: 'bg-gray-100 text-gray-800', 
    archived: 'bg-gray-100 text-gray-800' 
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-gray-700">All Current Job Postings</h2>
        <div className="hidden sm:block">
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
      
      {/* mobile filter - full width for better usability */}
      <div className="sm:hidden mb-4">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full p-2 border rounded">
          <option value="">All Jobs</option>
          <option value="pending">Pending</option>
          <option value="active">Active</option>
          <option value="removed">Removed</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {loading ? (<p>Loading jobs...</p>) : jobs.length === 0 ? (<p>No job postings found for the selected filter.</p>) : (
        <div className="border border-gray-200 rounded-lg overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Job Title</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Company</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Posted By</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Email</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Role</th>
                <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {jobs.map((job) => (
                <tr key={job.id}>
                  <td className="px-4 py-4 text-sm font-medium text-gray-900">
                    <Link href={`/admin/view/${job.id}`}>
                      <span className="hover:text-blue-600 hover:underline cursor-pointer">
                        {job.title}
                      </span>
                    </Link>
                    {/* show company on mobile under title */}
                    <div className="text-xs text-gray-500 sm:hidden mt-1">{job.company}</div>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-500 hidden sm:table-cell">{job.company}</td>
                  <td className="px-4 py-4 text-sm text-gray-500 hidden md:table-cell">
                    <div>{job.creator_name}</div>
                    <span className="text-xs text-gray-400">{job.created_by}</span>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-500 hidden lg:table-cell">{job.email}</td>
                  <td className="px-3 py-4 text-sm text-gray-500 capitalize hidden sm:table-cell">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      job.role === 'faculty' || job.role === 'staff' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {job.role}
                    </span>
                  </td>
                  <td className="px-3 py-4 text-center">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColors[job.status]}`}>
                      {job.status}
                    </span>
                  </td>
                  <td className="px-3 py-4 text-center text-sm font-medium">
                    {/* mobile: vertical stack to prevent button overflow */}
                    <div className="flex flex-col gap-1 sm:hidden">
                      {job.status === 'pending' && (
                        <>
                          <button onClick={() => onJobAction(job.id, 'active')} className="px-2 py-1 bg-green-600 text-white rounded text-xs">
                            Approve
                          </button>
                          <button onClick={() => onJobAction(job.id, 'rejected')} className="px-2 py-1 bg-red-600 text-white rounded text-xs">
                            Reject
                          </button>
                        </>
                      )}
                      {job.status === 'active' && (
                        <button onClick={() => onJobAction(job.id, 'removed')} className="px-2 py-1 bg-red-600 text-white rounded text-xs">
                          Remove
                        </button>
                      )}
                    </div>
                    {/* desktop: horizontal row */}
                    <div className="hidden sm:flex gap-2 justify-center">
                      {job.status === 'pending' && (
                        <>
                          <button onClick={() => onJobAction(job.id, 'active')} className="px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700">
                            Approve
                          </button>
                          <button onClick={() => onJobAction(job.id, 'rejected')} className="px-3 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700">
                            Reject
                          </button>
                        </>
                      )}
                      {job.status === 'active' && (
                        <button onClick={() => onJobAction(job.id, 'removed')} className="px-3 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700">
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
                <input type="text" name="company_name" id="company_name" value={formData.company_name || ''} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm fo