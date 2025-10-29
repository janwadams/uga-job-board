// admin dashboard with mobile-responsive improvements
// includes all expired jobs from all users

import { useEffect, useState, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

// initialize supabase client for database access
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
  // which tab is active (users, jobs, or archived)
  const [activeTab, setActiveTab] = useState<'users' | 'jobs' | 'archived'>('users');

  // data storage for users and jobs
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [archivedJobs, setArchivedJobs] = useState<Job[]>([]);
  
  // loading states to show spinners
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [loadingArchived, setLoadingArchived] = useState(true);
  
  // filters for different tabs
  const [statusFilter, setStatusFilter] = useState<string>(''); // filter for jobs tab
  const [archivedFilter, setArchivedFilter] = useState<string>(''); // filter for archived tab
  
  // modal states for editing users and creating admins
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [showCreateAdmin, setShowCreateAdmin] = useState(false);

  // fetch all data when component loads
  useEffect(() => {
    fetchUsers();
    fetchJobs();
    fetchArchivedJobs();
  }, []);

  // get all users from the database
  async function fetchUsers() {
    setLoadingUsers(true);
    try {
      const { data: userData, error } = await supabase
        .from('user_profiles')
        .select(`
          user_id,
          first_name,
          last_name,
          is_active,
          created_at,
          company_name
        `);

      if (error) throw error;

      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      const { data: authData, error: authError } = await supabase
        .from('auth.users')
        .select('id, email, last_sign_in_at');

      if (authError) {
        console.error('Error fetching auth data:', authError);
      }

      // combine all the data into one user object
      const combinedUsers = userData?.map(user => {
        const roleInfo = rolesData?.find(r => r.user_id === user.user_id);
        const authInfo = authData?.find(a => a.id === user.user_id);
        return {
          ...user,
          role: roleInfo?.role || 'unknown',
          email: authInfo?.email || null,
          last_sign_in_at: authInfo?.last_sign_in_at || null,
          jobs_posted: 0 // will be calculated separately if needed
        };
      }) || [];

      setUsers(combinedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
    setLoadingUsers(false);
  }

  // get all active and pending jobs from the database
  async function fetchJobs() {
    setLoadingJobs(true);
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .in('status', ['active', 'pending'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setJobs(data || []);
    } catch (error) {
      console.error('Error fetching jobs:', error);
    }
    setLoadingJobs(false);
  }

  // get all archived jobs (past deadline)
  async function fetchArchivedJobs() {
    setLoadingArchived(true);
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .lte('deadline', today.toISOString())
        .order('deadline', { ascending: false });

      if (error) throw error;
      setArchivedJobs(data || []);
    } catch (error) {
      console.error('Error fetching archived jobs:', error);
    }
    setLoadingArchived(false);
  }

  // toggle user active/inactive status
  async function handleStatusToggle(userId: string, currentStatus: boolean) {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ is_active: !currentStatus })
        .eq('user_id', userId);

      if (!error) {
        setUsers(users.map(u => 
          u.user_id === userId ? { ...u, is_active: !currentStatus } : u
        ));
      }
    } catch (error) {
      console.error('Error toggling status:', error);
    }
  }

  // handle job status changes (approve, reject, remove)
  async function handleJobAction(jobId: string, newStatus: string) {
    try {
      const { error } = await supabase
        .from('jobs')
        .update({ status: newStatus })
        .eq('id', jobId);

      if (!error) {
        fetchJobs(); // refresh the list
      }
    } catch (error) {
      console.error('Error updating job:', error);
    }
  }

  // reactivate an archived job (set new deadline 30 days out)
  async function handleReactivateJob(jobId: string) {
    try {
      const newDeadline = new Date();
      newDeadline.setDate(newDeadline.getDate() + 30); // 30 days from now
      
      const { error } = await supabase
        .from('jobs')
        .update({ 
          deadline: newDeadline.toISOString(),
          status: 'active'
        })
        .eq('id', jobId);

      if (!error) {
        fetchArchivedJobs(); // refresh archived list
        fetchJobs(); // refresh active jobs list
        alert('Job reactivated with new deadline set 30 days from today.');
      }
    } catch (error) {
      console.error('Error reactivating job:', error);
      alert('Failed to reactivate job.');
    }
  }

  // calculate days since job expired
  const getDaysSinceExpired = (deadline: string): number => {
    const deadlineDate = new Date(deadline);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - deadlineDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // handle saving edited user details
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

  // prepare jobs with creator info for display
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

  // prepare archived jobs with creator info and apply filter
  const archivedWithCreatorInfo = useMemo(() => {
    const jobsWithInfo = archivedJobs.map(job => {
      const creator = users.find(u => u.user_id === job.created_by);
      return {
        ...job,
        role: creator?.role || 'unknown',
        email: creator?.email || 'N/A',
        creator_name: creator ? `${creator.first_name} ${creator.last_name}` : 'Unknown'
      };
    });
    
    // apply the role filter if one is selected
    if (archivedFilter) {
      return jobsWithInfo.filter(job => job.role === archivedFilter);
    }
    return jobsWithInfo;
  }, [archivedJobs, users, archivedFilter]);

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-uga-red mb-8">Admin Dashboard</h1>

        {/* admin action buttons - responsive grid layout */}
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

        {/* tab navigation - scrollable on mobile */}
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

        {/* tab content area */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          {activeTab === 'users' && (
            <UserManagementPanel 
              users={users} 
              loading={loadingUsers} 
              onStatusToggle={handleStatusToggle}
              onEditUser={(user) => { setEditingUser(user); setIsModalOpen(true); }}
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

      {/* modals for editing users and creating admins */}
      {isModalOpen && editingUser && (
        <EditUserModal 
          user={editingUser} 
          onClose={() => { setIsModalOpen(false); setEditingUser(null); }}
          onSave={handleSaveUser}
        />
      )}
      
      {/* modal for creating new admin - properly formatted with password visibility */}
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

// user management panel - shows all users with filters
function UserManagementPanel({ users, loading, onStatusToggle, onEditUser }: { 
  users: AdminUser[], 
  loading: boolean, 
  onStatusToggle: (userId: string, currentStatus: boolean) => void,
  onEditUser: (user: AdminUser) => void 
}) {
  const [filters, setFilters] = useState({
    search: '',
    role: '',
    status: '',
  });

  // filter users based on search and filters
  const filteredUsers = users.filter(user => {
    const matchesSearch = !filters.search || 
      user.email?.toLowerCase().includes(filters.search.toLowerCase()) ||
      user.first_name.toLowerCase().includes(filters.search.toLowerCase()) ||
      user.last_name.toLowerCase().includes(filters.search.toLowerCase());
    
    const matchesRole = !filters.role || user.role === filters.role;
    const matchesStatus = !filters.status || 
      (filters.status === 'active' ? user.is_active : !user.is_active);
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  const handleRoleFilterChange = (role: string) => {
    setFilters(prev => ({ ...prev, role: prev.role === role ? '' : role }));
  };

  return (
    <div>
      <h2 className="text-xl sm:text-2xl font-bold text-gray-700 mb-4">User Management</h2>
      
      {/* search and filter controls - responsive layout */}
      <div className="mb-4 space-y-3">
        <input
          type="text"
          placeholder="Search by name or email..."
          className="w-full p-2 border rounded"
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
        />
        
        {/* filter controls for role and status */}
        <div className="flex flex-wrap gap-2">
          <div className="space-y-2">
            <label className="font-medium text-sm">Role:</label>
            <div className="flex flex-wrap gap-2">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={filters.role === 'faculty'}
                  onChange={() => handleRoleFilterChange('faculty')}
                />
                <span>Faculty</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={filters.role === 'rep'}
                  onChange={() => handleRoleFilterChange('rep')}
                />
                <span>Company Rep</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={filters.role === 'student'}
                  onChange={() => handleRoleFilterChange('student')}
                />
                <span>Student</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={filters.role === 'admin'}
                  onChange={() => handleRoleFilterChange('admin')}
                />
                <span>Admin</span>
              </label>
            </div>
          </div>
          
          <div className="space-y-2 ml-auto">
            <label className="font-medium text-sm">Status:</label>
            <select 
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="p-2 border rounded"
            >
              <option value="">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <p>Loading users...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Email</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Company</th>
                <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map(user => (
                <tr key={user.user_id}>
                  <td className="px-3 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {user.first_name} {user.last_name}
                    </div>
                    {/* show email on mobile under name */}
                    <div className="text-xs text-gray-500 sm:hidden">{user.email}</div>
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500 hidden sm:table-cell">
                    {user.email}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 
                      user.role === 'faculty' ? 'bg-blue-100 text-blue-800' :
                      user.role === 'rep' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500 hidden md:table-cell">
                    {user.company_name || '-'}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-center">
                    <button 
                      onClick={() => onStatusToggle(user.user_id, user.is_active)}
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        user.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {user.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-center">
                    <button 
                      onClick={() => onEditUser(user)}
                      className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                    >
                      Edit
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

// jobs panel - shows active and pending jobs
function JobsPanel({ jobs, loading, statusFilter, setStatusFilter, onJobAction }: { 
  jobs: Job[], 
  loading: boolean, 
  statusFilter: string, 
  setStatusFilter: (filter: string) => void,
  onJobAction: (jobId: string, action: string) => void
}) {
  const filteredJobs = statusFilter 
    ? jobs.filter(job => job.status === statusFilter)
    : jobs;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-4">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-700">Job Postings</h2>
        <div className="w-full sm:w-auto">
          <label className="mr-2 font-medium text-sm">Status:</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="p-2 border rounded w-full sm:w-auto">
            <option value="">All</option>
            <option value="pending">Pending Review</option>
            <option value="active">Active</option>
          </select>
        </div>
      </div>

      {loading ? (
        <p>Loading jobs...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Company</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Posted By</th>
                <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Status</th>
                <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredJobs.map(job => (
                <tr key={job.id}>
                  <td className="px-3 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{job.title}</div>
                    {/* show company on mobile */}
                    <div className="text-xs text-gray-500 sm:hidden">{job.company}</div>
                  </td>
                  <td className="px-3 py-4 text-sm text-gray-500 hidden sm:table-cell">{job.company}</td>
                  <td className="px-3 py-4 text-sm text-gray-500 hidden md:table-cell">{job.creator_name}</td>
                  <td className="px-3 py-4 hidden lg:table-cell">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      job.status === 'active' ? 'bg-green-100 text-green-800' : 
                      job.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                      'bg-red-100 text-red-800'
                    }`}>
                      {job.status}
                    </span>
                  </td>
                  <td className="px-3 py-4 text-center">
                    <div className="flex flex-col sm:flex-row gap-1 sm:gap-2 sm:justify-center">
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

// archived jobs panel - shows jobs past their deadline with filter
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
            <option value="faculty">Faculty Only</option>
            <option value="rep">Company Reps Only</option>
          </select>
        </div>
      </div>

      {loading ? (
        <p>Loading archived jobs...</p>
      ) : jobs.length === 0 ? (
        <p className="text-gray-500">No archived jobs found{filter && ' for the selected filter'}.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Job Title</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Company</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Posted By</th>
                <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Role</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden xl:table-cell">Type</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Expired</th>
                <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Days Ago</th>
                <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {jobs.map(job => {
                const daysAgo = getDaysSinceExpired(job.deadline);
                return (
                  <tr key={job.id}>
                    <td className="px-3 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {job.title}
                      </div>
                      {/* mobile: show company and days */}
                      <div className="text-xs text-gray-500 sm:hidden">
                        {job.company} • {daysAgo} days ago
                      </div>
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-500 hidden sm:table-cell">
                      {job.company}
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-500 hidden md:table-cell">
                      {job.creator_name}
                    </td>
                    <td className="px-3 py-4 hidden lg:table-cell text-center">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        job.role === 'faculty' ? 'bg-blue-100 text-blue-800' :
                        job.role === 'rep' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {job.role === 'faculty' ? 'Faculty' : job.role === 'rep' ? 'Rep' : 'Unknown'}
                      </span>
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-500 hidden xl:table-cell">
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
      <div className="bg-white p-6 sm:p-8 rounded-lg shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl sm:text-2xl font-bold mb-4">Edit User: {user.email}</h2>
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
          <div className="mt-6 flex flex-col sm:flex-row gap-3 sm:justify-end">
            <button type="button" onClick={onClose} className="w-full sm:w-auto px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Cancel</button>
            <button type="submit" className="w-full sm:w-auto px-4 py-2 bg-red-700 text-white rounded-md hover:bg-red-800">Save Changes</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// create admin modal component with password visibility toggle
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

    // validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    // validate password length
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);

    try {
      // call the correct api endpoint
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
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-red-800">Create New Admin User</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* first name and last name side by side */}
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
          
          {/* email field */}
          <input
            name="email"
            type="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleChange}
            required
            className="w-full border p-2 rounded"
          />
          
          {/* password field with visibility toggle */}
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
          
          {/* confirm password field with visibility toggle */}
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

          {/* error message display */}
          {error && <p className="text-red-600 text-sm">{error}</p>}

          {/* buttons */}
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
              className="px-4 py-2 bg-green-700 text-white rounded-md hover:bg-green-800 disabled:bg-gray-400"
            >
              {loading ? 'Creating...' : 'Create Admin'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}