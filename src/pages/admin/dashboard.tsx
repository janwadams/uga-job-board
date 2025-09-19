// admin dashboard
// ADDED AUDIT LOGS FOR DELETION AND STATUS CHANGES

import { useEffect, useState, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// --- TypeScript Interfaces ---
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
  role?: string; 
  email?: string;
}

interface DeletedUser {
    id: string;
    user_id: string;
    email: string | null;
    role: string | null;
    first_name: string | null;
    last_name: string | null;
    company_name: string | null;
    deleted_at: string;
    deleted_by_admin_email: string | null;
}

// NEW: Interface for the status change log
interface StatusLog {
    id: string;
    user_id: string;
    action: 'enabled' | 'disabled';
    changed_by_admin_email: string | null;
    changed_at: string;
    // Enriched data
    user_email?: string;
    user_name?: string;
}


// --- Main Admin Dashboard Component ---
export default function AdminDashboard() {
  // UPDATED: Added 'status_log' to the possible tabs
  const [activeTab, setActiveTab] = useState<'users' | 'jobs' | 'audit' | 'status_log'>('users');

  // State for data
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [deletedUsers, setDeletedUsers] = useState<DeletedUser[]>([]);
  const [statusLogs, setStatusLogs] = useState<StatusLog[]>([]); // NEW: State for status logs
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [loadingDeletedUsers, setLoadingDeletedUsers] = useState(true);
  const [loadingStatusLogs, setLoadingStatusLogs] = useState(true); // NEW: Loading state
  
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);

  // --- Data Fetching Functions ---
  const fetchUsers = async () => { /* ... no change ... */ };
  const fetchJobs = async () => { /* ... no change ... */ };
  const fetchDeletedUsers = async () => { /* ... no change ... */ };

  // NEW: Function to fetch status logs
  const fetchStatusLogs = async () => {
    setLoadingStatusLogs(true);
    try {
        const response = await fetch('/api/admin/list-status-logs');
        const data = await response.json();
        if (response.ok) {
            setStatusLogs(data.statusLogs);
        } else {
            console.error('Failed to fetch status logs:', data.error);
        }
    } catch (error) {
        console.error('Error fetching status logs:', error);
    } finally {
        setLoadingStatusLogs(false);
    }
  };

  // UPDATED: Fetch all data on initial load
  useEffect(() => {
    fetchUsers();
    fetchJobs();
    fetchDeletedUsers();
    fetchStatusLogs();
  }, []);
  
  // --- Action Handlers ---
  const handleStatusToggle = async (userId: string, currentStatus: boolean) => {
    try {
      const response = await fetch('/api/admin/update-user-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, isActive: !currentStatus }),
      });
      if (response.ok) {
        fetchUsers(); // Re-fetch users to show updated status
        fetchStatusLogs(); // Re-fetch logs to show the new entry
      } else {
        alert('Failed to update user status.');
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };
  
  const handleJobAction = async (jobId: string, newStatus: Job['status']) => { /* ... no change ... */ };
  const openEditModal = (user: AdminUser) => { /* ... no change ... */ };
  const closeEditModal = () => { /* ... no change ... */ };
  const handleUpdateUserDetails = async (updatedUser: AdminUser) => { /* ... no change ... */ };
  const handleDeleteUser = async (userId: string, userName: string) => { /* ... no change ... */ };

  // --- Derived Data for UI ---
  const { userRoleMap, userEmailMap, userNameMap } = useMemo(() => {
    const roleMap = new Map<string, string>();
    const emailMap = new Map<string, string>();
    const nameMap = new Map<string, string>();
    users.forEach(user => {
        roleMap.set(user.user_id, user.role);
        if (user.email) emailMap.set(user.user_id, user.email);
        nameMap.set(user.user_id, `${user.first_name} ${user.last_name}`);
    });
    return { userRoleMap: roleMap, userEmailMap: emailMap, userNameMap: nameMap };
  }, [users]);
  
  const enrichedJobs = useMemo(() => { /* ... no change ... */ });
  const filteredJobs = useMemo(() => { /* ... no change ... */ });

  // NEW: Enrich status logs with current user data
  const enrichedStatusLogs = useMemo(() => {
    return statusLogs.map(log => ({
        ...log,
        user_email: userEmailMap.get(log.user_id) || 'N/A (User Deleted)',
        user_name: userNameMap.get(log.user_id) || 'N/A (User Deleted)'
    }));
  }, [statusLogs, userEmailMap, userNameMap]);


  // --- Render ---
  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-6">
          {/* ... no change ... */}
      </div>

      <div className="mb-4 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button onClick={() => setActiveTab('users')} className={`${activeTab === 'users' ? 'border-red-700 text-red-800' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-lg`}>
            Manage Users
          </button>
          <button onClick={() => setActiveTab('jobs')} className={`${activeTab === 'jobs' ? 'border-red-700 text-red-800' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-lg`}>
            Manage Jobs
          </button>
           <button onClick={() => setActiveTab('audit')} className={`${activeTab === 'audit' ? 'border-red-700 text-red-800' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-lg`}>
            Deletion Log
          </button>
          {/* NEW: Status Log Tab */}
           <button onClick={() => setActiveTab('status_log')} className={`${activeTab === 'status_log' ? 'border-red-700 text-red-800' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-lg`}>
            Status Log
          </button>
        </nav>
      </div>

      {activeTab === 'users' && <UsersManagementPanel users={users} loading={loadingUsers} onStatusToggle={handleStatusToggle} onEditUser={openEditModal} onDeleteUser={handleDeleteUser} />}
      {activeTab === 'jobs' && <JobsManagementPanel jobs={filteredJobs} loading={loadingJobs} onJobAction={handleJobAction} statusFilter={statusFilter} setStatusFilter={setStatusFilter} />}
      {activeTab === 'audit' && <AuditLogPanel deletedUsers={deletedUsers} loading={loadingDeletedUsers} />}
      {/* NEW: Render the Status Log Panel */}
      {activeTab === 'status_log' && <StatusLogPanel statusLogs={enrichedStatusLogs} loading={loadingStatusLogs} />}
    
      {isModalOpen && editingUser && (
        <EditUserModal user={editingUser} onClose={closeEditModal} onSave={handleUpdateUserDetails} />
      )}
    </div>
  );
}


// --- Sub-components (Users, Jobs, Modals, etc.) ---
function UsersManagementPanel({ users, loading, onStatusToggle, onEditUser, onDeleteUser }: { /*...*/ }) { /* ... no change ... */ }
function JobsManagementPanel({ jobs, loading, onJobAction, statusFilter, setStatusFilter }: { /*...*/ }) { /* ... no change ... */ }
function EditUserModal({ user, onClose, onSave }: { /*...*/ }) { /* ... no change ... */ }
function AuditLogPanel({ deletedUsers, loading }: { /*...*/ }) { /* ... no change ... */ }

// --- NEW: Sub-component for the Status Log Tab ---
function StatusLogPanel({ statusLogs, loading }: { statusLogs: StatusLog[], loading: boolean }) {
    return (
        <div>
            <h2 className="text-2xl font-bold mb-4 text-gray-700">User Status Change Log</h2>
            {loading ? (<p>Loading status log...</p>) : statusLogs.length === 0 ? (<p>No status changes found in the log.</p>) : (
                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User Email</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Action Taken</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date of Change</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Changed By (Admin)</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {statusLogs.map((log) => (
                                <tr key={log.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{log.user_name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{log.user_email}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${log.action === 'enabled' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                        {log.action}
                                      </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(log.changed_at).toLocaleString()}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{log.changed_by_admin_email}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}