// components/SimplePermissionsToggle.tsx
// SIMPLE COMPONENT - just two toggle switches

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function SimplePermissionsToggle() {
  const [facultyCanPost, setFacultyCanPost] = useState(true);
  const [repCanPost, setRepCanPost] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    const { data } = await supabase
      .from('app_settings')
      .select('*')
      .in('setting_key', ['faculty_can_post_jobs', 'rep_can_post_jobs']);

    if (data) {
      const facultySetting = data.find(s => s.setting_key === 'faculty_can_post_jobs');
      const repSetting = data.find(s => s.setting_key === 'rep_can_post_jobs');
      
      if (facultySetting) setFacultyCanPost(facultySetting.setting_value);
      if (repSetting) setRepCanPost(repSetting.setting_value);
    }
    setLoading(false);
  };

  const handleToggle = async (settingKey: string, currentValue: boolean) => {
    const newValue = !currentValue;
    
    // Optimistic update
    if (settingKey === 'faculty_can_post_jobs') setFacultyCanPost(newValue);
    if (settingKey === 'rep_can_post_jobs') setRepCanPost(newValue);

    try {
      const response = await fetch('/api/admin/toggle-posting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settingKey, enabled: newValue }),
      });

      if (!response.ok) {
        // Revert on error
        if (settingKey === 'faculty_can_post_jobs') setFacultyCanPost(currentValue);
        if (settingKey === 'rep_can_post_jobs') setRepCanPost(currentValue);
        alert('Failed to update setting');
      }
    } catch (error) {
      // Revert on error
      if (settingKey === 'faculty_can_post_jobs') setFacultyCanPost(currentValue);
      if (settingKey === 'rep_can_post_jobs') setRepCanPost(currentValue);
      alert('Error updating setting');
    }
  };

  if (loading) {
    return <div className="animate-pulse">Loading settings...</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 max-w-2xl">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Job Posting Controls</h2>
      <p className="text-gray-600 mb-6">
        Enable or disable job posting for each role. Changes take effect immediately.
      </p>

      <div className="space-y-4">
        {/* Faculty Toggle */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <h3 className="font-semibold text-gray-800">Faculty Job Posting</h3>
            <p className="text-sm text-gray-600">
              Allow faculty members to create job postings
            </p>
          </div>
          <button
            onClick={() => handleToggle('faculty_can_post_jobs', facultyCanPost)}
            className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
              facultyCanPost ? 'bg-uga-red' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                facultyCanPost ? 'translate-x-7' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Rep Toggle */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <h3 className="font-semibold text-gray-800">Rep Job Posting</h3>
            <p className="text-sm text-gray-600">
              Allow company reps to create job postings
            </p>
          </div>
          <button
            onClick={() => handleToggle('rep_can_post_jobs', repCanPost)}
            className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
              repCanPost ? 'bg-uga-red' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                repCanPost ? 'translate-x-7' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      <div className="mt-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800">
          💡 <strong>Tip:</strong> When disabled, users will see a message explaining job posting is temporarily unavailable.
        </p>
      </div>
    </div>
  );
}
