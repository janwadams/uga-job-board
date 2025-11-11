// simple delete account button with tracking
// components/SimpleDeleteAccount.tsx

import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/router';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function SimpleDeleteAccount() {
  const [showConfirm, setShowConfirm] = useState(false);
  const [deletionReason, setDeletionReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleDelete = async () => {
    setLoading(true);
    setError('');
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('You must be logged in to delete your account');
        return;
      }

      // call delete endpoint with optional reason
      const response = await fetch('/api/delete-account', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          reason: deletionReason 
        })
      });

      if (response.ok) {
        // sign out and redirect to home
        await supabase.auth.signOut();
        router.push('/?message=account-deleted');
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to delete account');
      }
    } catch (error) {
      console.error('Error deleting account:', error);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border-t-4 border-red-600">
      <h3 className="text-lg font-bold text-red-800 mb-2">Delete Account</h3>
      <p className="text-sm text-gray-600 mb-4">
        This will permanently delete your account and all associated data. This action cannot be undone.
      </p>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">
          {error}
        </div>
      )}
      
      {!showConfirm ? (
        <button
          onClick={() => setShowConfirm(true)}
          className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded"
        >
          Delete My Account
        </button>
      ) : (
        <div className="space-y-4">
          <div className="p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800 font-semibold mb-3">
              ⚠️ Are you absolutely sure?
            </p>
            <ul className="text-sm text-red-700 space-y-1 mb-4">
              <li>• All your profile information will be deleted</li>
              <li>• Your job applications will be removed</li>
              <li>• You cannot recover your account</li>
            </ul>
            
            {/* optional reason field */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Help us improve (optional):
              </label>
              <textarea
                value={deletionReason}
                onChange={(e) => setDeletionReason(e.target.value)}
                className="w-full border rounded-md p-2 text-sm"
                rows={3}
                placeholder="Tell us why you're leaving..."
              />
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                disabled={loading}
                className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded disabled:bg-gray-400"
              >
                {loading ? 'Deleting...' : 'Yes, Delete Permanently'}
              </button>
              <button
                onClick={() => {
                  setShowConfirm(false);
                  setDeletionReason('');
                }}
                disabled={loading}
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-2 px-4 rounded"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
