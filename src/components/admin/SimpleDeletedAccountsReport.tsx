// simple admin report for tracking deleted accounts
// components/admin/SimpleDeletedAccountsReport.tsx

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface DeletedAccount {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  company_name: string;
  deleted_at: string;
  self_deleted: boolean;
  deleted_by_admin_email: string | null;
  deletion_reason: string | null;
}

export default function SimpleDeletedAccountsReport() {
  const [deletedAccounts, setDeletedAccounts] = useState<DeletedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'student' | 'rep' | 'faculty'>('all');

  useEffect(() => {
    fetchDeletedAccounts();
  }, []);

  const fetchDeletedAccounts = async () => {
    setLoading(true);
    
    try {
      const { data, error } = await supabase
        .from('deleted_users_audit')
        .select('*')
        .order('deleted_at', { ascending: false });

      if (error) {
        console.error('Error fetching deleted accounts:', error);
      } else {
        setDeletedAccounts(data || []);
      }
    } catch (err) {
      console.error('Unexpected error:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const exportToCSV = () => {
    // create csv content
    const headers = ['Name', 'Email', 'Role', 'Company', 'Deleted Date', 'Deleted By', 'Reason'];
    const rows = filteredAccounts.map(account => [
      `${account.first_name} ${account.last_name}`,
      account.email,
      account.role,
      account.company_name || '',
      formatDate(account.deleted_at),
      account.self_deleted ? 'Self' : (account.deleted_by_admin_email || 'Admin'),
      account.deletion_reason || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // download csv
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `deleted-accounts-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  // filter accounts by role
  const filteredAccounts = filter === 'all' 
    ? deletedAccounts 
    : deletedAccounts.filter(account => account.role === filter);

  // calculate stats
  const stats = {
    total: deletedAccounts.length,
    students: deletedAccounts.filter(a => a.role === 'student').length,
    reps: deletedAccounts.filter(a => a.role === 'rep').length,
    faculty: deletedAccounts.filter(a => a.role === 'faculty').length,
    selfDeleted: deletedAccounts.filter(a => a.self_deleted).length,
    adminDeleted: deletedAccounts.filter(a => !a.self_deleted).length
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Deleted Accounts Report</h2>
        <button
          onClick={exportToCSV}
          className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded"
        >
          Export CSV
        </button>
      </div>

      {/* summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <div className="bg-gray-50 p-3 rounded">
          <p className="text-xs text-gray-600">Total Deleted</p>
          <p className="text-xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="bg-blue-50 p-3 rounded">
          <p className="text-xs text-gray-600">Students</p>
          <p className="text-xl font-bold text-blue-600">{stats.students}</p>
        </div>
        <div className="bg-green-50 p-3 rounded">
          <p className="text-xs text-gray-600">Reps</p>
          <p className="text-xl font-bold text-green-600">{stats.reps}</p>
        </div>
        <div className="bg-purple-50 p-3 rounded">
          <p className="text-xs text-gray-600">Faculty</p>
          <p className="text-xl font-bold text-purple-600">{stats.faculty}</p>
        </div>
        <div className="bg-yellow-50 p-3 rounded">
          <p className="text-xs text-gray-600">Self-Deleted</p>
          <p className="text-xl font-bold text-yellow-600">{stats.selfDeleted}</p>
        </div>
        <div className="bg-red-50 p-3 rounded">
          <p className="text-xs text-gray-600">Admin-Deleted</p>
          <p className="text-xl font-bold text-red-600">{stats.adminDeleted}</p>
        </div>
      </div>

      {/* filter buttons */}
      <div className="flex space-x-2 mb-4">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1 rounded ${filter === 'all' ? 'bg-red-800 text-white' : 'bg-gray-200 text-gray-700'}`}
        >
          All ({stats.total})
        </button>
        <button
          onClick={() => setFilter('student')}
          className={`px-3 py-1 rounded ${filter === 'student' ? 'bg-red-800 text-white' : 'bg-gray-200 text-gray-700'}`}
        >
          Students ({stats.students})
        </button>
        <button
          onClick={() => setFilter('rep')}
          className={`px-3 py-1 rounded ${filter === 'rep' ? 'bg-red-800 text-white' : 'bg-gray-200 text-gray-700'}`}
        >
          Reps ({stats.reps})
        </button>
        <button
          onClick={() => setFilter('faculty')}
          className={`px-3 py-1 rounded ${filter === 'faculty' ? 'bg-red-800 text-white' : 'bg-gray-200 text-gray-700'}`}
        >
          Faculty ({stats.faculty})
        </button>
      </div>

      {/* accounts table */}
      {loading ? (
        <p className="text-center py-8 text-gray-500">Loading deleted accounts...</p>
      ) : filteredAccounts.length === 0 ? (
        <p className="text-center py-8 text-gray-500">No deleted accounts found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Company</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Deleted</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">By</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAccounts.map((account) => (
                <tr key={account.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {account.first_name} {account.last_name}
                      </div>
                      <div className="text-sm text-gray-500">{account.email}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                      {account.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    {account.company_name || '-'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(account.deleted_at)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                    {account.self_deleted ? (
                      <span className="text-blue-600">Self</span>
                    ) : (
                      <span className="text-red-600">Admin</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {account.deletion_reason || '-'}
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
