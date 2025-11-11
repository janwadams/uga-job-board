// faculty dashboard without lucide-react
// pages/faculty/dashboard.tsx

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/router';
import Link from 'next/link';
import PostJobModal from '../../components/PostJobModal';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function FacultyDashboard() {
  const [userProfile, setUserProfile] = useState<any>(null);
  const [postedJobs, setPostedJobs] = useState<any[]>([]);
  const [totalApplications, setTotalApplications] = useState(0);
  const [activeJobsCount, setActiveJobsCount] = useState(0);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showPostJobModal, setShowPostJobModal] = useState(false);
  const router = useRouter();

  useEffect(() => {
    checkUserAndLoadData();
  }, []);

  const checkUserAndLoadData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/login');
        return;
      }

      // Fetch user profile
      const { data: profile } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      if (profile?.role !== 'faculty') {
        router.push('/');
        return;
      }

      setUserProfile(profile);

      // Fetch posted jobs
      const { data: jobs } = await supabase
        .from('jobs')
        .select('*')
        .eq('created_by', session.user.id)
        .order('created_at', { ascending: false });

      if (jobs) {
        setPostedJobs(jobs);
        setActiveJobsCount(jobs.filter(job => job.status === 'active').length);
        
        // Calculate total applications
        const total = jobs.reduce((sum, job) => sum + (job.application_count || 0), 0);
        setTotalApplications(total);
        
        // Create recent activity from jobs
        const activities = jobs.slice(0, 5).map(job => ({
          id: job.id,
          type: 'job_posted',
          title: job.title,
          date: job.created_at,
          status: job.status
        }));
        setRecentActivity(activities);
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-green-600 bg-green-100';
      case 'pending':
        return 'text-yellow-600 bg-yellow-100';
      case 'archived':
        return 'text-gray-600 bg-gray-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-800 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">Faculty Dashboard</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowPostJobModal(true)}
                className="bg-red-800 hover:bg-red-900 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
              >
                <span>+ Post New Job</span>
              </button>
              
              <div className="relative">
                <button
                  onClick={() => setShowUserDropdown(!showUserDropdown)}
                  className="flex items-center space-x-2 text-gray-700 hover:text-gray-900"
                >
                  <div className="h-8 w-8 bg-gray-300 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium">
                      {userProfile?.first_name?.[0]}{userProfile?.last_name?.[0]}
                    </span>
                  </div>
                  <span className="text-sm">▼</span>
                </button>
                
                {showUserDropdown && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10">
                    <div className="px-4 py-2 text-sm text-gray-700 border-b">
                      <div className="font-medium">{userProfile?.first_name} {userProfile?.last_name}</div>
                      <div className="text-gray-500 text-xs">Faculty</div>
                    </div>
                    {/* link to account settings page */}
                    <Link href="/faculty/account-settings">
                      <span className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">
                        Account Settings
                      </span>
                    </Link>
                    <button
                      onClick={handleSignOut}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Welcome back, {userProfile?.first_name}!
          </h2>
          <p className="text-gray-600">
            Here's an overview of your job postings and recruitment activity.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Total Jobs Posted</span>
              <span className="text-red-800 font-bold">💼</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{postedJobs.length}</div>
            <p className="text-xs text-gray-500 mt-1">All time</p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Active Jobs</span>
              <span className="text-green-600 font-bold">🎯</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{activeJobsCount}</div>
            <p className="text-xs text-gray-500 mt-1">Currently accepting applications</p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Total Applications</span>
              <span className="text-blue-600 font-bold">👥</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{totalApplications}</div>
            <p className="text-xs text-gray-500 mt-1">Across all jobs</p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Avg. per Job</span>
              <span className="text-purple-600 font-bold">📈</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {postedJobs.length > 0 ? Math.round(totalApplications / postedJobs.length) : 0}
            </div>
            <p className="text-xs text-gray-500 mt-1">Applications per posting</p>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Posted Jobs List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Your Posted Jobs</h3>
              </div>
              <div className="divide-y divide-gray-200">
                {postedJobs.length === 0 ? (
                  <div className="px-6 py-8 text-center text-gray-500">
                    <span className="text-4xl mb-3 block">💼</span>
                    <p>You haven't posted any jobs yet.</p>
                    <button
                      onClick={() => setShowPostJobModal(true)}
                      className="mt-4 text-red-800 hover:text-red-900 font-medium"
                    >
                      Post your first job →
                    </button>
                  </div>
                ) : (
                  postedJobs.map((job) => (
                    <div key={job.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="text-sm font-medium text-gray-900">{job.title}</h4>
                          <p className="text-sm text-gray-500 mt-1">
                            {job.location} • {job.job_type}
                          </p>
                          <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                            <span>Posted {formatDate(job.created_at)}</span>
                            <span>{job.application_count || 0} applications</span>
                            <span>{job.view_count || 0} views</span>
                          </div>
                        </div>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(job.status)}`}>
                          {job.status}
                        </span>
                      </div>
                      <div className="mt-3 flex space-x-3">
                        <Link href={`/jobs/${job.id}`}>
                          <span className="text-xs text-red-800 hover:text-red-900 cursor-pointer">View Details</span>
                        </Link>
                        <Link href={`/faculty/job/${job.id}/edit`}>
                          <span className="text-xs text-gray-600 hover:text-gray-800 cursor-pointer">Edit</span>
                        </Link>
                        <Link href={`/faculty/job/${job.id}/applications`}>
                          <span className="text-xs text-gray-600 hover:text-gray-800 cursor-pointer">Applications</span>
                        </Link>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
              </div>
              <div className="divide-y divide-gray-200">
                {recentActivity.length === 0 ? (
                  <div className="px-6 py-8 text-center text-gray-500">
                    <span className="text-4xl mb-3 block">📅</span>
                    <p className="text-sm">No recent activity</p>
                  </div>
                ) : (
                  recentActivity.map((activity) => (
                    <div key={activity.id} className="px-6 py-3">
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          <div className="h-8 w-8 bg-red-100 rounded-full flex items-center justify-center">
                            <span className="text-red-800 text-xs">💼</span>
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900">
                            Posted "{activity.title}"
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatDate(activity.date)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="mt-6 bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <button
                  onClick={() => setShowPostJobModal(true)}
                  className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors flex items-center space-x-3"
                >
                  <span className="text-gray-600">➕</span>
                  <span className="text-sm font-medium text-gray-900">Post New Job</span>
                </button>
                <Link href="/faculty/jobs">
                  <button className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors flex items-center space-x-3">
                    <span className="text-gray-600">📄</span>
                    <span className="text-sm font-medium text-gray-900">Manage All Jobs</span>
                  </button>
                </Link>
                <Link href="/faculty/applications">
                  <button className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors flex items-center space-x-3">
                    <span className="text-gray-600">👥</span>
                    <span className="text-sm font-medium text-gray-900">Review Applications</span>
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Post Job Modal */}
      {showPostJobModal && (
        <PostJobModal
          onClose={() => setShowPostJobModal(false)}
          onSuccess={() => {
            setShowPostJobModal(false);
            checkUserAndLoadData(); // Reload data after posting
          }}
        />
      )}
    </div>
  );
}
