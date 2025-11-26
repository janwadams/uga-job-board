'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// initialize supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function JobPostingToggles() {
  const [settings, setSettings] = useState({
    rep_can_post_jobs: true,
    faculty_can_post_jobs: true,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/admin/settings');
      const data = await res.json();
      if (res.ok) {
        setSettings(data);
      } else {
        setError(data.error || 'Failed to load settings');
      }
    } catch (err) {
      setError('Failed to fetch settings');
    }
    setLoading(false);
  };

  const toggleSetting = async (setting_key: string) => {
    const newValue = !settings[setting_key as keyof typeof settings];
    const oldValue = settings[setting_key as keyof typeof settings];
    
    // update ui immediately
    setSettings(prev => ({ ...prev, [setting_key]: newValue }));
    setError(null);

    try {
      // get the current session token
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        setSettings(prev => ({ ...prev, [setting_key]: oldValue }));
        setError('Not authenticated');
        return;
      }

      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ setting_key, setting_value: newValue }),
      });

      const data = await res.json();
      
      if (!res.ok) {
        // revert on failure
        setSettings(prev => ({ ...prev, [setting_key]: oldValue }));
        setError(data.error || 'Failed to save setting');
      }
    } catch (err) {
      // revert on failure
      setSettings(prev => ({ ...prev, [setting_key]: oldValue }));
      setError('Failed to save setting');
    }
  };

  if (loading) return <p className="text-gray-500 mb-8">Loading settings...</p>;

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-8">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Job Posting Permissions</h2>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}
      
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-gray-700">Allow Company Reps to Post Jobs</span>
          <button
            onClick={() => toggleSetting('rep_can_post_jobs')}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              settings.rep_can_post_jobs ? 'bg-green-600' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.rep_can_post_jobs ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-gray-700">Allow Faculty to Post Jobs</span>
          <button
            onClick={() => toggleSetting('faculty_can_post_jobs')}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              settings.faculty_can_post_jobs ? 'bg-green-600' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.faculty_can_post_jobs ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
}