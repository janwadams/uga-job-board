//toggle component to control job postings

'use client';

import { useState, useEffect } from 'react';

export default function JobPostingToggles() {
  const [settings, setSettings] = useState({
    rep_can_post_jobs: true,
    faculty_can_post_jobs: true,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    const res = await fetch('/api/admin/settings');
    const data = await res.json();
    setSettings(data);
    setLoading(false);
  };

  const toggleSetting = async (setting_key: string) => {
    const newValue = !settings[setting_key as keyof typeof settings];
    setSettings(prev => ({ ...prev, [setting_key]: newValue }));

    await fetch('/api/admin/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ setting_key, setting_value: newValue }),
    });
  };

  if (loading) return <p className="text-gray-500">Loading settings...</p>;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Job Posting Permissions</h2>
      
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-gray-700">Allow Company Reps to Post Jobs</span>
          <button
            onClick={() => toggleSetting('rep_can_post_jobs')}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              settings.rep_can_post_jobs ? 'bg-red-600' : 'bg-gray-300'
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
              settings.faculty_can_post_jobs ? 'bg-red-600' : 'bg-gray-300'
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