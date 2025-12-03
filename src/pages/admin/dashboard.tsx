// admin dashboard with mobile-responsive improvements
// includes all expired jobs from all users
//added toggle for job posting 11/26/25

import { useEffect, useState, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import JobPostingToggles from 'components/admin/JobPostingToggles';


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
  // populated from user lookup
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
  const [uniqueJobViews, setUniqueJobViews] = useState<number>(0); // unique views per student on active jobs
  const [totalJobViews, setTotalJobViews] = useState<number>(0); // total views including repeats on active jobs
  const [jobClicks, setJobClicks] = useState<number>(0); // total apply clicks on active jobs

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

  // fetch analytics data for active jobs
  const fetchAnalytics = async () => {
    try {
      // get active job ids
      const activeJobIds = jobs.filter(j => j.status === 'active').map(j => j.id);
      
      if (activeJobIds.length > 0) {
        // fetch view events for active jobs
        const { data: viewData, error: viewError } = await supabase
          .from('job_analytics')
          .select('*')
          .in('job_id', activeJobIds)
          .eq('event_type', 'view');
        
        if (!viewError && viewData) {
          // count total views (including repeats)
          setTotalJobViews(viewData.length);
          
          // count unique views per student-job combination
          const uniqueViews = new Set(
            viewData
              .filter(v => v.user_id) // only count logged-in views
              .map(v => `${v.user_id}-${v.job_id}`) // create unique key per student-job
          ).size;
          setUniqueJobViews(uniqueViews);
        }
        
        // fetch click events for active jobs
        const { data: clickData, error: clickError } = await supabase
          .from('job_link_clicks')
          .select('*')
          .in('job_id', activeJobIds);
        
        if (!clickError && clickData) {
          // clicks are already unique per student-job due to database constraint
          setJobClicks(clickData.length);
        }
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  // load data when component mounts
  useEffect(() => {
    fetchUsers();
    fetchJobs();
    fetchArchivedJobs();
  }, []);

  // fetch analytics data after jobs are loaded
  useEffect(() => {
    if (jobs.length > 0) {
      fetchAnalytics();
    }
  }, [jobs]);

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
        // Get the current admin's email from session
        const { data: { session } } = await supabase.auth.getSession();
        const adminEmail = session?.user?.email;

        if (!adminEmail) {
          alert('Could not determine admin email. Please log in again.');
          return;
        }

        const response = await fetch('/api/admin/delete-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            userToDelete: user,
            adminEmail: adminEmail
          })
		  
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

  // prepare archived jobs with creator info AND apply filter
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

    // Apply filter based on archivedFilter state
    if (!archivedFilter) {
      return jobsWithInfo; // "All Users" - return all jobs
    } else if (archivedFilter === 'faculty') {
      return jobsWithInfo.filter(job => job.role === 'faculty');
    } else if (archivedFilter === 'rep') {
      return jobsWithInfo.filter(job => job.role === 'rep');
    }
    
    return jobsWithInfo;
  }, [archivedJobs, users, archivedFilter]);

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-uga-red mb-8">Admin Dashboard</h1>

        {/* platform health metrics cards - quick overview of platform activity */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <div className="bg-white p-4 rounded-lg shadow-md border-l-4 border-l-blue-500">
            <div className="text-sm font-medium text-gray-500">Active Jobs</div>
            <div className="mt-1 text-2xl font-bold text-gray-900">{jobs.filter(j => j.status === 'active').length}</div>
            <div className="text-xs text-gray-500">Currently posted</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-md border-l-4 border-l-green-500">
            <div className="text-sm font-medium text-gray-500">Unique Views</div>
            <div className="mt-1 text-2xl font-bold text-gray-900">{uniqueJobViews}</div>
            <div className="text-xs text-gray-500">Individual students</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-md border-l-4 border-l-teal-500">
            <div className="text-sm font-medium text-gray-500">Total Views</div>
            <div className="mt-1 text-2xl font-bold text-gray-900">{totalJobViews}</div>
            <div className="text-xs text-gray-500">Including revisits</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-md border-l-4 border-l-purple-500">
            <div className="text-sm font-medium text-gray-500">Apply Clicks</div>
            <div className="mt-1 text-2xl font-bold text-gray-900">{jobClicks}</div>
            <div className="text-xs text-gray-500">To company sites</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-md border-l-4 border-l-yellow-500">
            <div className="text-sm font-medium text-gray-500">Pending Review</div>
            <div className="mt-1 text-2xl font-bold text-gray-900">{jobs.filter(j => j.status === 'pending').length}</div>
            <div className="text-xs text-gray-500">Awaiting approval</div>
          </div>
        </div>

        {/* admin action buttons - responsive grid for 2 buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
          <Link href="/admin/analytics" className="w-full">
            <button className="w-full px-4 py-3 bg-uga-red text-white rounded-lg font-medium hover:bg-red-700 transition-colors">
              View Analytics
            </button>
          </Link>
          <button 
            onClick={() => setShowCreateAdmin(true)}
            className="w-full px-4 py-3 bg-green-700 text-white rounded-lg font-medium hover:bg-green-800 transition-colors"
          >
            + Create Admin
          </button>
        </div>
		
		  {/* for job posting toggle */}
        <JobPostingToggles />
		

        {/* Tab Navigation - scrollable on mobile */}
        <div className="flex space-x-1 mb-6 overflow-x-auto">
          <button onClick={() => setActiveTab('users')} className={`px-4 py-2 font-medium rounded-t-lg whitespace-nowrap ${activeTab === 'users' ? 'bg-white text-uga-red border-b-2 border-uga-red' : 'bg-gray-100 text-gray-600'}`}>
            Users ({users.length})
          </button>
          <button onClick={() => setActiveTab('jobs')} className={`px-4 py-2 font-medium rounded-t-lg whitespace-nowrap ${activeTab === 'jobs' ? 'bg-white text-uga-red border-b-2 border-uga-red' : 'bg-gray-100 text-gray-600'}`}>
            Jobs ({jobs.length})
          </button>
          <button onClick={() => setActiveTab('archived')} className={`px-4 py-2 font-medium rounded-t-lg whitespace-nowrap ${activeTab === 'archived' ? 'bg-white text-uga-red border-b-2 border-uga-red' : 'bg-gray-100 text-gray-600'}`}>
            Archived ({archivedJobs.length})
          </button>
          <Link href="/admin/deleted-users" className="px-4 py-2 font-medium rounded-t-lg whitespace-nowrap bg-gray-100 text-gray-600 hover:bg-gray-200">
            Deleted Users
          </Link>
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
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{user.jobs_posted || 0}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-center">
                      <div className="flex gap-2 justify-center">
                        <button onClick={() => onEditUser(user)} className="px-3 py-1 bg-purple-600 text-white rounded text-xs hover:bg-purple-700">
                          Edit
                        </button>
                        <button onClick={() => onStatusToggle(user.user_id, user.is_active)} className={`px-3 py-1 rounded text-xs ${user.is_active ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-green-600 text-white hover:bg-green-700'}`}>
                          {user.is_active ? 'Disable' : 'Enable'}
                        </button>
                        <button onClick={() => onDeleteUser(user)} className="px-3 py-1 bg-gray-700 text-white rounded text-xs hover:bg-gray-800">
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* IMPROVED: Mobile card view */}
          <div className="md:hidden space-y-3">
            {filteredUsers.map((user) => (
              <div key={user.user_id} className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="mb-3">
                  <div className="font-medium text-gray-900">{user.first_name} {user.last_name}</div>
                  <div className="text-sm text-gray-600">{user.email}</div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-gray-500 capitalize">{user.role}</span>
                    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
                
                {/* Action buttons - stacked vertically on mobile */}
                <div className="flex flex-col gap-2">
                  <button onClick={() => onEditUser(user)} className="w-full px-3 py-2 bg-purple-600 text-white rounded text-sm">
                    Edit
                  </button>
                  <button onClick={() => onStatusToggle(user.user_id, user.is_active)} className={`w-full px-3 py-2 rounded text-sm ${user.is_active ? 'bg-red-600 text-white' : 'bg-green-600 text-white'}`}>
                    {user.is_active ? 'Disable' : 'Enable'}
                  </button>
                  <button onClick={() => onDeleteUser(user)} className="w-full px-3 py-2 bg-gray-700 text-white rounded text-sm">
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// Jobs panel remains similar with minor responsive improvements
function JobsPanel({ jobs, loading, statusFilter, setStatusFilter, onJobAction }: { 
  jobs: Job[], 
  loading: boolean, 
  statusFilter: string, 
  setStatusFilter: (filter: string) => void,
  onJobAction: (id: string, status: Job['status']) => void
}) {
  // Filter jobs
  const filteredJobs = jobs.filter(job => !statusFilter || job.status === statusFilter);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-700">Active Job Postings</h2>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 border rounded-lg text-sm">
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {loading ? (
        <p>Loading jobs...</p>
      ) : filteredJobs.length === 0 ? (
        <p className="text-gray-600">No jobs found{statusFilter ? ' for selected status' : ''}.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Job Title</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Company</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Posted By</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Posted</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden xl:table-cell">Status</th>
                <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredJobs.map((job) => (
                <tr key={job.id}>
                  <td className="px-3 py-4 text-sm">
                    <Link href={`/admin/view/${job.id}`}>
                      <div className="font-medium text-blue-600 hover:text-blue-800 hover:underline cursor-pointer">{job.title}</div>
                    </Link>
                    <div className="text-xs text-gray-500 sm:hidden">{job.company}</div>
                  </td>
                  <td className="px-3 py-4 text-sm text-gray-500 hidden sm:table-cell">{job.company}</td>
                  <td className="px-3 py-4 text-sm text-gray-500 hidden md:table-cell">{job.creator_name}</td>
                  <td className="px-3 py-4 text-sm text-gray-500 hidden lg:table-cell">
                    {new Date(job.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-3 py-4 hidden xl:table-cell">
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

// Archived jobs panel - already has mobile improvements from original
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
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Posted</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden xl:table-cell">Role</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden xl:table-cell">Type</th>
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
                      <Link href={`/admin/view/${job.id}`}>
                        <div className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer">{job.title}</div>
                      </Link>
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
                    <td className="px-3 py-4 text-sm text-gray-500 hidden lg:table-cell">
                      {new Date(job.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-500 capitalize hidden xl:table-cell">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        job.role === 'faculty' || job.role === 'staff' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {job.role}
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
        <h2 className="text-xl sm:text-2xl font-bold mb-4">Create New Admin User</h2>
        <form onSubmit={onSubmit}>
          <div className="space-y-4">
            {/* first name and last name fields come first */}
            <div>
              <label htmlFor="first_name" className="block text-sm font-medium text-gray-700">First Name</label>
              <input type="text" name="first_name" id="first_name" required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
            </div>
            <div>
              <label htmlFor="last_name" className="block text-sm font-medium text-gray-700">Last Name</label>
              <input type="text" name="last_name" id="last_name" required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
            </div>
            {/* then email field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
              <input type="email" name="email" id="email" required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
            </div>
            {/* password field with visibility toggle */}
            <div className="relative">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
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
                aria-label="Toggle password visibility"
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
            {/* confirm password field with visibility toggle */}
            <div className="relative">
              <label htmlFor="confirm_password" className="block text-sm font-medium text-gray-700">Confirm Password</label>
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
                aria-label="Toggle confirm password visibility"
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