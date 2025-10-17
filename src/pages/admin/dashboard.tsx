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

  // filter current jobs by status
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
    {/* header section with title and buttons - fixed for mobile */}
    <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 mb-6">
      <h1 className="text-2xl sm:text-3xl font-bold text-red-800">Admin Dashboard</h1>
      {/* buttons container - vertical stack on mobile, grid on tablet, flex on desktop */}
      <div className="flex flex-col sm:grid sm:grid-cols-3 lg:flex lg:flex-row gap-2 lg:gap-4">
        <Link href="/admin/analytics" className="w-full">
          <button className="w-full lg:min-w-[140px] bg-red-700 text-white px-3 py-2 rounded hover:bg-red-800 text-center text-xs sm:text-sm">
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
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7 1.274-4.057-5.064 7-9.542 7 .847 0 1.673.124 2.468.352M10.582 10.582a3 3 0 11-4.243 4.243M8 12a4 4 0 004 4m0 0l6-6m-6 6l-6-6" />
    </svg>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-red-800">Create New Admin Account</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-4">
            <input
              name="firstName"
              type="text"
              placeholder="First Name"
              value={formData.firstName}
              onChange={handleChange}
              required
              className="w-full border p-2 rounded"
            />
            <input
              name="lastName"
              type="text"
              placeholder="Last Name"
              value={formData.lastName}
              onChange={handleChange}
              required
              className="w-full border p-2 rounded"
            />
          </div>
          
          <input
            name="email"
            type="email"
            placeholder="Admin Email"
            value={formData.email}
            onChange={handleChange}
            required
            className="w-full border p-2 rounded"
          />
          
          <div className="relative">
            <input
              name="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              value={formData.password}
              onChange={handleChange}
              required
              className="w-full border p-2 rounded pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 px-3 flex items-center"
              aria-label="Toggle password visibility"
            >
              {showPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
          
          <div className="relative">
            <input
              name="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="Confirm Password"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              className="w-full border p-2 rounded pr-10"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute inset-y-0 right-0 px-3 flex items-center"
              aria-label="Toggle confirm password visibility"
            >
              {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <div className="flex justify-end space-x-4 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-red-700 text-white rounded-md hover:bg-red-800 disabled:bg-gray-400"
            >
              {loading ? 'Creating...' : 'Create Admin'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// component for users tab
function UsersManagementPanel({ users, loading, onStatusToggle, onEditUser, onDeleteUser }: { users: AdminUser[], loading: boolean, onStatusToggle: (userId: string, currentStatus: boolean) => void, onEditUser: (user: AdminUser) => void, onDeleteUser: (user: AdminUser) => void }) {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4 text-gray-700">All Platform Users</h2>
      {loading ? (<p>Loading users...</p>) : (
        <div className="overflow-x-auto border border-gray-200 rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.user_id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.first_name} {user.last_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.company_name || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">{user.role}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {user.is_active ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium space-x-2">
                    <button onClick={() => onEditUser(user)} className="px-3 py-1 rounded text-white text-xs bg-indigo-600 hover:bg-indigo-700">Edit</button>
                    <button onClick={() => onStatusToggle(user.user_id, user.is_active)} className={`px-3 py-1 rounded text-white text-xs ${user.is_active ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}>
                      {user.is_active ? 'Disable' : 'Enable'}
                    </button>
                    <button onClick={() => onDeleteUser(user)} className="px-3 py-1 rounded text-white text-xs bg-gray-700 hover:bg-gray-800">Delete</button>
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


// component for jobs tab - wider table to prevent horizontal scroll and smart dropdown positioning
function JobsManagementPanel({ jobs, loading, onJobAction, statusFilter, setStatusFilter }: { jobs: Job[], loading: boolean, onJobAction: (jobId: string, newStatus: Job['status']) => void, statusFilter: string, setStatusFilter: (filter: string) => void }) {
  const [openActionMenu, setOpenActionMenu] = useState<string | null>(null);
  const [dropdownDirection, setDropdownDirection] = useState<{ [key: string]: 'up' | 'down' }>({});
  
  const statusColors: Record<Job['status'], string> = { 
    active: 'bg-green-100 text-green-800', 
    pending: 'bg-yellow-100 text-yellow-800', 
    removed: 'bg-red-100 text-red-800', 
    rejected: 'bg-gray-100 text-gray-800', 
    archived: 'bg-gray-100 text-gray-800' 
  };

  // function to check if dropdown should open upward based on position
  const handleMenuClick = (jobId: string, event: React.MouseEvent<HTMLButtonElement>) => {
    const button = event.currentTarget;
    const rect = button.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const menuHeight = 150; // approximate height of dropdown menu
    
    // decide if menu should open up or down based on available space
    setDropdownDirection(prev => ({
      ...prev,
      [jobId]: spaceBelow < menuHeight ? 'up' : 'down'
    }));
    
    // toggle the menu open/closed
    setOpenActionMenu(openActionMenu === jobId ? null : jobId);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-gray-700">All Current Job Postings</h2>
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
      {loading ? (<p>Loading jobs...</p>) : jobs.length === 0 ? (<p>No job postings found for the selected filter.</p>) : (
        <div className="border border-gray-200 rounded-lg overflow-visible"> {/* changed from overflow-x-auto to overflow-visible */}
          <div className="min-w-full overflow-x-auto"> {/* wrapper div for scroll if needed */}
            <table className="w-full divide-y divide-gray-200"> {/* changed from min-w-full to w-full */}
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Job Title</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Posted By</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Email</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[140px]">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {jobs.map((job) => (
                  <tr key={job.id}>
                    {/* make the job title clickable to view details */}
                    <td className="px-4 py-4 text-sm font-medium text-gray-900">
                      <Link href={`/admin/view/${job.id}`}>
                        <span className="hover:text-blue-600 hover:underline cursor-pointer line-clamp-2">
                          {job.title}
                        </span>
                      </Link>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-500">
                      <span className="line-clamp-1">{job.company}</span>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-500">
                      <div className="line-clamp-1">{job.creator_name}</div>
                      <span className="text-xs text-gray-400 block truncate">{job.created_by}</span>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-500 hidden lg:table-cell">
                      <span className="truncate block max-w-[150px]">{job.email}</span>
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">{job.role}</td>
                    <td className="px-3 py-4 whitespace-nowrap text-center">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColors[job.status]}`}>
                        {job.status}
                      </span>
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-center text-sm font-medium">
                      <div className="flex justify-center items-center gap-2">
                        {/* view button - always visible for easy access */}
                        <Link href={`/admin/view/${job.id}`}>
                          <button className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700">
                            View
                          </button>
                        </Link>
                        
                        {/* actions menu for other operations like edit, approve, reject */}
                        <div className="relative inline-block text-left">
                          <button 
                            onClick={(e) => handleMenuClick(job.id, e)}
                            className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 focus:outline-none"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                            </svg>
                          </button>
                          {openActionMenu === job.id && (
                            <div 
                              className={`absolute right-0 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50 ${
                                dropdownDirection[job.id] === 'up' 
                                  ? 'bottom-full mb-2' // opens upward with margin
                                  : 'top-full mt-2'    // opens downward with margin
                              }`}
                              style={{ 
                                // extra safety to ensure dropdown is visible
                                position: 'absolute',
                                [dropdownDirection[job.id] === 'up' ? 'bottom' : 'top']: '100%'
                              }}
                              onMouseLeave={() => setOpenActionMenu(null)}
                            >
                              <div className="py-1" role="menu" aria-orientation="vertical">
                                {/* show approve/reject options for pending jobs */}
                                {job.status === 'pending' && (
                                  <>
                                    <a 
                                      href="#" 
                                      onClick={(e) => { 
                                        e.preventDefault(); 
                                        onJobAction(job.id, 'active'); 
                                        setOpenActionMenu(null); 
                                      }} 
                                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                    >
                                      Approve
                                    </a>
                                    <a 
                                      href="#" 
                                      onClick={(e) => { 
                                        e.preventDefault(); 
                                        onJobAction(job.id, 'rejected'); 
                                        setOpenActionMenu(null); 
                                      }} 
                                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                    >
                                      Reject
                                    </a>
                                  </>
                                )}
                                {/* show remove option for active jobs */}
                                {job.status === 'active' && (
                                  <a 
                                    href="#" 
                                    onClick={(e) => { 
                                      e.preventDefault(); 
                                      onJobAction(job.id, 'removed'); 
                                      setOpenActionMenu(null); 
                                    }} 
                                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                  >
                                    Remove
                                  </a>
                                )}
                                {/* edit option is always available */}
                                <Link href={`/admin/edit/${job.id}`}>
                                  <span className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">
                                    Edit
                                  </span>
                                </Link>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
























// component for archived jobs tab
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