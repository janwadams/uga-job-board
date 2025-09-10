import { useEffect, useState } from 'react';

// UPDATED: Added the email field to the interface
interface AdminUser {
  user_id: string;
  role: string;
  is_active: boolean;
  email: string | null; // ADDED: New email field
  last_sign_in_at: string | null;
  jobs_posted: number;
}

export default function AdminDashboard() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        // CHANGED: Fetch data from our new API route instead of calling Supabase directly
        const response = await fetch('/api/admin/list-users');
        const data = await response.json();

        if (response.ok) {
          setUsers(data.users);
        } else {
          console.error('Failed to fetch admin data:', data.error);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchAdminData();
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4 text-red-800">👥 Admin: Manage Users</h1>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <table className="min-w-full table-auto border-collapse border border-gray-200">
          <thead className="bg-gray-100">
            <tr>
              <th className="border px-4 py-2">User ID</th>
              <th className="border px-4 py-2">Current Role</th>
              <th className="border px-4 py-2">Status</th>
              <th className="border px-4 py-2">Email</th> {/* ADDED: New table header */}
              <th className="border px-4 py-2">Last Login</th>
              <th className="border px-4 py-2">Jobs Posted</th>
              <th className="border px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.user_id} className="text-center">
                <td className="border px-4 py-2">{user.user_id}</td>
                <td className="border px-4 py-2 capitalize">{user.role}</td>
                <td className="border px-4 py-2">
                  {user.is_active ? (
                    <span className="text-green-600 font-semibold">Active</span>
                  ) : (
                    <span className="text-red-600 font-semibold">Disabled</span>
                  )}
                </td>
                <td className="border px-4 py-2 text-sm">{user.email}</td> {/* ADDED: New table cell for email */}
                <td className="border px-4 py-2 text-sm">
                  {user.last_sign_in_at
                    ? new Date(user.last_sign_in_at).toLocaleString()
                    : 'Never'}
                </td>
                <td className="border px-4 py-2">{user.jobs_posted}</td>
                <td className="border px-4 py-2">
                  <button className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700">
                    {user.is_active ? 'Disable' : 'Enable'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}