//admin dashboard
/src/pages/admin/dashboard file
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
// UPDATED: Added new fields to the AdminUser interface
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
  status: 'active' | 'pending' | 'removed' | 'rejected';
  created_at: string;
  created_by: string;
  // Properties to be added after fetching
  role?: string; 
  email?: string;
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

  // NEW: State for the Edit User Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);


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
    const { data, error } = await supabase
      .from('jobs')
      .select(`id, title, company, status, created_at, created_by`);

    if (error) {
      console.error('Error fetching jobs:', error);
      setJobs([]);
    } else if (data) {
        setJobs(data as Job[]);
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
  
    // NEW: Handlers for opening and closing the edit modal
    const openEditModal = (user: AdminUser) => {
        setEditingUser(user);
        setIsModalOpen(true);
    };

    const closeEditModal = () => {
        setEditingUser(null);
        setIsModalOpen(false);
    };
    
    // NEW: Handler to submit the user details update
    const handleUpdateUserDetails = async (updatedUser: AdminUser) => {
        try {
            const response = await fetch('/api/admin/update-user-details', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedUser),
            });

            if (response.ok) {
                fetchUsers(); // Refresh the user list
                closeEditModal(); // Close the modal on success
            } else {
                const data = await response.json();
                alert('Failed to update user: ' + data.error);
            }
        } catch (error) {
            console.error('Error updating user details:', error);
            alert('An unexpected error occurred.');
        }
    };


  // --- Derived Data for UI ---
  const { userRoleMap, userEmailMap } = useMemo(() => {
    const roleMap = new Map<string, string>();
    const emailMap = new Map<string, string>();
    users.forEach(user => {
        roleMap.set(user.user_id, user.role);
        if (user.email) {
            emailMap.set(user.user_id, user.email);
        }
    });
    return { userRoleMap: roleMap, userEmailMap: emailMap };
  }, [users]);
  
  const enrichedJobs = useMemo(() => {
    return jobs.map(job => ({
        ...job,
        role: userRoleMap.get(job.created_by) || 'N/A',
        email: userEmailMap.get(job.created_by) || 'N/A'
    }));
  }, [jobs, userRoleMap, userEmailMap]);
  
  const filteredJobs = useMemo(() => {
    if (!statusFilter) return enrichedJobs;
    return enrichedJobs.filter(job => job.status === statusFilter);
  }, [enrichedJobs, statusFilter]);

  // --- Render ---
  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-red-800">👑 Admin Dashboard</h1>
        <Link href="/admin/analytics">
          <button className="bg-red-700 text-white px-4 py-2 rounded hover:bg-red-800">
            📊 View Analytics
          </button>
        </Link>
      </div>

      <div className="mb-4 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button onClick={() => setActiveTab('users')} className={`${activeTab === 'users' ? 'border-red-700 text-red-800' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-lg`}>
            Manage Users
          </button>
          <button onClick={() => setActiveTab('jobs')} className={`${activeTab === 'jobs' ? 'border-red-700 text-red-800' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-lg`}>
            Manage Jobs
          </button>
        </nav>
      </div>

      {activeTab === 'users' && <UsersManagementPanel users={users} loading={loadingUsers} onStatusToggle={handleStatusToggle} onEditUser={openEditModal} />}
      {activeTab === 'jobs' && <JobsManagementPanel jobs={filteredJobs} loading={loadingJobs} onJobAction={handleJobAction} statusFilter={statusFilter} setStatusFilter={setStatusFilter} />}
    
      {/* NEW: Render the Edit User Modal */}
      {isModalOpen && editingUser && (
        <EditUserModal user={editingUser} onClose={closeEditModal} onSave={handleUpdateUserDetails} />
      )}
    </div>
  );
}


// --- Sub-component for Users Tab ---
function UsersManagementPanel({ users, loading, onStatusToggle, onEditUser }: { users: AdminUser[], loading: boolean, onStatusToggle: (userId: string, currentStatus: boolean) => void, onEditUser: (user: AdminUser) => void }) {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4 text-gray-700">👥 All Platform Users</h2>
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
                    <button onClick={() => onEditUser(user)} className="text-indigo-600 hover:text-indigo-900">Edit</button>
                    <button onClick={() => onStatusToggle(user.user_id, user.is_active)} className={`font-semibold ${user.is_active ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'}`}>
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
    const [openActionMenu, setOpenActionMenu] = useState<string | null>(null);
    const statusColors: Record<Job['status'], string> = { active: 'bg-green-100 text-green-800', pending: 'bg-yellow-100 text-yellow-800', removed: 'bg-red-100 text-red-800', rejected: 'bg-gray-100 text-gray-800' };

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-700">📋 All Job Postings</h2>
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
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Posted By (ID)</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
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
                                    <td className="px-6 py-4 whitespace-normal break-words text-sm text-gray-500 font-mono">{job.created_by}</td>
                                    <td className="px-6 py-4 whitespace-normal break-words text-sm text-gray-500">{job.email}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">{job.role}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center"><span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColors[job.status]}`}>{job.status}</span></td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                                        <div className="relative inline-block text-left">
                                            <button onClick={() => setOpenActionMenu(openActionMenu === job.id ? null : job.id)} className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 focus:outline-none">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>
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
                                                        {job.status === 'active' && (<a href="#" onClick={(e) => { e.preventDefault(); onJobAction(job.id, 'removed'); setOpenActionMenu(null); }} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Remove</a>)}
                                                        <Link href={`/admin/edit/${job.id}`}><span className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">Edit</span></Link>
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

// --- NEW: Sub-component for the Edit User Modal ---
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
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
                <div className="mt-3 text-center">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">Edit User Details</h3>
                    <div className="mt-2 px-7 py-3">
                        <form onSubmit={handleSubmit} className="space-y-4 text-left">
                            <div>
                                <label className="font-medium">First Name</label>
                                <input type="text" name="first_name" value={formData.first_name} onChange={handleChange} className="w-full mt-1 p-2 border rounded" />
                            </div>
                            <div>
                                <label className="font-medium">Last Name</label>
                                <input type="text" name="last_name" value={formData.last_name} onChange={handleChange} className="w-full mt-1 p-2 border rounded" />
                            </div>
                            {/* Only show company name for reps */}
                            {formData.role === 'rep' && (
                                <div>
                                    <label className="font-medium">Company Name</label>
                                    <input type="text" name="company_name" value={formData.company_name || ''} onChange={handleChange} className="w-full mt-1 p-2 border rounded" />
                                </div>
                            )}
                        </form>
                    </div>
                    <div className="items-center px-4 py-3 space-x-4">
                        <button onClick={handleSubmit} className="px-4 py-2 bg-red-700 text-white text-base font-medium rounded-md w-auto shadow-sm hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-red-500">
                            Save Changes
                        </button>
                        <button onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 text-base font-medium rounded-md w-auto shadow-sm hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500">
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

