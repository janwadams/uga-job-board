// pages/admin/dashboard.tsx
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/router';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AdminDashboard() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.push('/login');
      } else {
        setSession(data.session);
      }
    };

    checkSession();
  }, []);

  useEffect(() => {
    const fetchUsers = async () => {
      const { data, error } = await supabase.from('user_roles').select('*');
      if (!error) {
        setUsers(data || []);
      }
      setLoading(false);
    };

    if (session) {
      fetchUsers();
    }
  }, [session]);

  const handleRoleChange = async (userId: string, newRole: string) => {
    await supabase
      .from('user_roles')
      .update({ role: newRole })
      .eq('user_id', userId);

    setUsers((prev) =>
      prev.map((user) =>
        user.user_id === userId ? { ...user, role: newRole } : user
      )
    );
  };

  const handleToggleActive = async (userId: string, currentStatus: boolean) => {
    const updatedStatus = !currentStatus;

    await supabase
      .from('user_roles')
      .update({ is_active: updatedStatus })
      .eq('user_id', userId);

    setUsers((prev) =>
      prev.map((user) =>
        user.user_id === userId ? { ...user, is_active: updatedStatus } : user
      )
    );
  };

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-red-800 mb-6">👤 Admin: Manage Users</h1>

      {loading ? (
        <p>Loading users...</p>
      ) : users.length === 0 ? (
        <p>No users found.</p>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="border px-4 py-2">User ID</th>
              <th className="border px-4 py-2">Role</th>
              <th className="border px-4 py-2">Status</th>
              <th className="border px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.user_id}>
                <td className="border px-4 py-2 text-xs break-all">{user.user_id}</td>
                <td className="border px-4 py-2">
                  <select
                    value={user.role}
                    onChange={(e) => handleRoleChange(user.user_id, e.target.value)}
                    className="border rounded px-2 py-1"
                  >
                    <option value="student">Student</option>
                    <option value="faculty">Faculty</option>
                    <option value="rep">Rep</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
                <td className="border px-4 py-2">
                  {user.is_active ? (
                    <span className="text-green-600 font-semibold">Active</span>
                  ) : (
                    <span className="text-red-600 font-semibold">Disabled</span>
                  )}
                </td>
                <td className="border px-4 py-2">
                  <button
                    onClick={() => handleToggleActive(user.user_id, user.is_active)}
                    className={`px-3 py-1 rounded text-white ${
                      user.is_active ? 'bg-red-600' : 'bg-green-600'
                    }`}
                  >
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
