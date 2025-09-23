// admin dashboard - using direct Supabase queries (no API routes)

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/router';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

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
  jobs_posted?: number;
  first_name: string;
  last_name: string;
  company_name: string | null;
}

interface Job {
  id: string;
  title: string;
  company: string;
  status: 'active' | 'pending' | 'removed' | 'rejected';
  created_at: string;
  created_by: string;
  rejection_note?: string;
  // Properties to be added after fetching
  creator?: AdminUser;
}

// --- Main Admin Dashboard Component ---
export default function AdminDashboard() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  
  // State for the active tab
  const [activeTab, setActiveTab] = useState<'users' | 'jobs'>('users');

  // State for data
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingJobs, setLoadingJobs] = useState(true);

  // State for job filtering
  const [statusFilter, setStatusFilter] = useState<string>('');

  // State for the Edit User Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);

  // State for Create Admin Modal
  const [showCreateAdmin, setShowCreateAdmin] = useState(false);

  // Check authentication
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error || !session) {
      router.push('/login');
      return;
    }

    // Check if user is an admin
    const { data: userData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', session.user.id)
      .single();

    if (userData?.role !== 'admin') {
      router.push('/unauthorized');
      return;
    }

    setSession(session);
    fetchUsers();
    fetchJobs();
  };

  // --- Data Fetching Functions ---
  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      // Get all users from user_roles table
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');

      if (rolesError) {
        console.error('Error fetching roles:', rolesError);
        setUsers([]);
        return;
      }

      // Get profiles data for these users
      const userIds = rolesData.map(r => r.user_id);
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', userIds);

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
      }

      // Combine the data
      const combinedUsers = rolesData.map(role => {
        const profile = profilesData?.find(p => p.id === role.user_id);
        
        // Try to get name from different possible fields in profiles
        let firstName = profile?.first_name || '';
        let lastName = profile?.last_name || '';
        
        // If no first/last name, try to split full_name if it exists
        if (!firstName && !lastName && profile?.full_name) {
          const nameParts = profile.full_name.split(' ');
          firstName = nameParts[0] || '';
          lastName = nameParts.slice(1).join(' ') || '';
        }
        
        // Fallback to "User" if still no name
        if (!firstName && !lastName) {
          firstName = 'User';
          lastName = role.user_id.substring(0, 8);
        }
        
        return {
          user_id: role.user_id,
          role: role.role,
          is_active: role.is_active !== false, // Default to true if not set
          email: profile?.email || `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
          first_name: firstName,
          last_name: lastName,
          company_name: profile?.company_name || null,
          last_sign_in_at: null
        };
      });

      setUsers(combinedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      setUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchJobs = async () => {
    setLoadingJobs(true);
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching jobs:', error);
        setJobs([]);
      } else {
        setJobs(data || []);
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      setJobs([]);
    } finally {
      setLoadingJobs(false);
    }
  };

  // --- Action Handlers ---
  const handleStatusToggle = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ is_active: !currentStatus })
        .eq('user_id', userId);

      if (error) {
        alert('Failed to update user status.');
        console.error(error);
      } else {
        fetchUsers(); // Re-fetch users after update
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleJobAction = async (jobId: string, newStatus: Job['status']) => {
    let rejectionNote = null;
    if (newStatus === 'rejected') {
      rejectionNote = prompt("Provide a rejection note (required):");
      if (!rejectionNote || rejectionNote.trim().length < 10) {
        alert('Please provide a detailed rejection reason (at least 10 characters)');
        return;
      }
    }

    try {
      const updateData: any = { status: newStatus };
      if (rejectionNote) {
        updateData.rejection_note = rejectionNote;
      } else if (newStatus === 'active') {
        updateData.rejection_note = null; // Clear rejection note when approving
      }

      const { error } = await supabase
        .from('jobs')
        .update(updateData)
        .eq('id', jobId);

      if (error) {
        alert('Failed to update job status.');
        console.error(error);
      } else {
        fetchJobs(); // Re-fetch jobs after update
      }
    } catch (error) {
      console.error('Error updating job status:', error);
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
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: updatedUser.first_name,
          last_name: updatedUser.last_name,
          company_name: updatedUser.company_name
        })
        .eq('id', updatedUser.user_id);

      if (error) {
        alert('Failed to update user: ' + error.message);
      } else {
        fetchUsers(); // Refresh the user list
        closeEditModal(); // Close the modal on success
      }
    } catch (error) {
      console.error('Error updating user details:', error);
      alert('An unexpected error occurred.');
    }
  };

  const handleDeleteUser = async (userToDelete: AdminUser) => {
    alert('User deletion is disabled for safety. Please deactivate the user instead.');
    // In production, you'd implement proper user deletion with all related data cleanup
  };

  // --- Derived Data for UI ---
  const enrichedJobs = useMemo(() => {
    return jobs.map(job => {
      const creator = users.find(u => u.user_id === job.created_by);
      return {
        ...job,
        creator
      };
    });
  }, [jobs, users]);

  const filteredJobs = useMemo(() => {
    if (!statusFilter) return enrichedJobs;
    return enrichedJobs.filter(job => job.status === statusFilter);
  }, [enrichedJobs, statusFilter]);

  // Calculate pending jobs count
  const pendingJobsCount = useMemo(() => {
    return jobs.filter(job => job.status === 'pending').length;
  }, [jobs]);

  if (!session) {
    return <p className="p-8 text-center">Loading...</p>;
  }

  // --- Render ---
  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-red-800">Admin Dashboard</h1>
        <div className="flex space-x-4">
          <Link href="/admin/job-reviews">
            <button className="relative bg-blue-700 text-white px-4 py-2 rounded hover:bg-blue-800">
              Review Jobs
              {pendingJobsCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center">
                  {pendingJobsCount}
                </span>
              )}
            </button>
          </Link>
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
          <button onClick={() => setActiveTab('users')} className={`${activeTab === 'users' ? 'border-red-700 text-red-800' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-lg`}>
            Manage Users
          </button>
          <button onClick={() => setActiveTab('jobs')} className={`${activeTab === 'jobs' ? 'border-red-700 text-red-800' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-lg`}>
            Manage Jobs ({jobs.length})
          </button>
        </nav>
      </div>

      {/* Alert for pending jobs */}
      {pendingJobsCount > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <svg className="h-5 w-5 text-yellow-600 mt-0.5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="text-yellow-800 font-medium">
                {pendingJobsCount} job{pendingJobsCount > 1 ? 's' : ''} pending review
              </p>
              <Link href="/admin/job-reviews">
                <button className="text-yellow-700 underline text-sm font-medium mt-1 hover:text-yellow-800">
                  Review pending jobs →
                </button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'users' && <UsersManagementPanel users={users} loading={loadingUsers} onStatusToggle={handleStatusToggle} onEditUser={openEditModal} onDeleteUser={handleDeleteUser} />}
      {activeTab === 'jobs' && <JobsManagementPanel jobs={filteredJobs} loading={loadingJobs} onJobAction={handleJobAction} statusFilter={statusFilter} setStatusFilter={setStatusFilter} />}

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

// --- Create Admin Modal Component ---
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
      // Create the user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email.trim(),
        password: formData.password,
        options: {
          data: {
            first_name: formData.firstName.trim(),
            last_name: formData.lastName.trim(),
          }
        }
      });

      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }

      if (authData.user) {
        // Add user role as admin
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({
            user_id: authData.user.id,
            role: 'admin',
            is_active: true
          });

        if (roleError) {
          setError('User created but failed to assign admin role. Please update manually.');
        }

        // Add to profiles table
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: authData.user.id,
            email: formData.email.trim(),
            first_name: formData.firstName.trim(),
            last_name: formData.lastName.trim(),
            full_name: `${formData.firstName.trim()} ${formData.lastName.trim()}`
          });

        if (!roleError && !profileError) {
          alert('Admin account created successfully! The user will receive a confirmation email.');
          onSuccess();
        }
      }
    } catch (err) {
      setError('An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  // Eye icon components
  const EyeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  );

  const EyeOffIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a9.969 9.969 0 012.635-3.993m2.507-1.517A9.966 9.966 0 0112 5c4.478 0 8.268 2.943 9.542 7a10.018 10.018 0 01-3.563 4.229m-3.49.771a3 3 0 11-4.243-4.243" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18" />
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

// --- Sub-component for Users Tab ---
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
function JobsManagementPanel({ jobs, loading, onJobAction, statusFilter, setStatusFilter }: { jobs: any[], loading: boolean, onJobAction: (jobId: string, newStatus: Job['status']) => void, statusFilter: string, setStatusFilter: (filter: string) => void }) {
  const [openActionMenu, setOpenActionMenu] = useState<string | null>(null);
  const statusColors: Record<Job['status'], string> = { active: 'bg-green-100 text-green-800', pending: 'bg-yellow-100 text-yellow-800', removed: 'bg-red-100 text-red-800', rejected: 'bg-gray-100 text-gray-800' };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-gray-700">All Job Postings</h2>
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
        <div className="border border-gray-200 rounded-lg overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Job Title</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Posted By</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {jobs.map((job) => (
                <tr key={job.id}>
                  <td className="px-6 py-4 whitespace-normal break-words text-sm font-medium text-gray-900">{job.title}</td>
                  <td className="px-6 py-4 whitespace-normal break-words text-sm text-gray-500">{job.company}</td>
                  <td className="px-6 py-4 whitespace-normal break-words text-sm text-gray-500">
                    {job.creator ? `${job.creator.first_name} ${job.creator.last_name}` : 'Unknown'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                    {job.creator?.role || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColors[job.status]}`}>
                      {job.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                    <div className="relative inline-block text-left">
                      <button onClick={() => setOpenActionMenu(openActionMenu === job.id ? null : job.id)} className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 focus:outline-none">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>
                      </button>
                      {openActionMenu === job.id && (
                        <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10" onMouseLeave={() => setOpenActionMenu(null)}>
                          <div className="py-1" role="menu" aria-orientation="vertical">
                            {job.status === 'pending' && (
                              <>
                                <a href="#" onClick={(e) => { e.preventDefault(); onJobAction(job.id, 'active'); setOpenActionMenu(null); }} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Approve</a>
                                <a href="#" onClick={(e) => { e.preventDefault(); onJobAction(job.id, 'rejected'); setOpenActionMenu(null); }} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Reject</a>
                              </>
                            )}
                            {job.status === 'active' && (
                              <a href="#" onClick={(e) => { e.preventDefault(); onJobAction(job.id, 'removed'); setOpenActionMenu(null); }} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Remove</a>
                            )}
                            {job.status === 'rejected' && (
                              <a href="#" onClick={(e) => { e.preventDefault(); onJobAction(job.id, 'pending'); setOpenActionMenu(null); }} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Reactivate for Review</a>
                            )}
                            <Link href={`/admin/edit/${job.id}`}>
                              <span className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">Edit</span>
                            </Link>
                          </div>
                        </div>
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

// --- Sub-component for the Edit User Modal ---
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