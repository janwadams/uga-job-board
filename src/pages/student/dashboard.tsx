//student/dashboard.tsx

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Job {
  id: string;
  title: string;
  company: string;
  job_type: 'Internship' | 'Part-Time' | 'Full-Time';
  industry: string;
  description: string;
  deadline: string;
  created_at: string;
  status: string;
}

interface Application {
  id: string;
  applied_at: string;
  status: 'applied' | 'viewed' | 'rejected' | 'interview' | 'hired';
  job: Job;
}

type DashboardTab = 'browse' | 'applications';

export default function StudentDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<DashboardTab>('browse');
  const [applications, setApplications] = useState<Application[]>([]);
  const [loadingApplications, setLoadingApplications] = useState(true);
  const [session, setSession] = useState<any>(null);

  // Check authentication and fetch user session
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
        router.push('/login');
        return;
      }

      // Check if user is a student
      const { data: userData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .single();

      if (userData?.role !== 'student') {
        router.push('/unauthorized');
        return;
      }

      setSession(session);
    };

    checkAuth();
  }, [router]);

  // Fetch applications when session is available
  useEffect(() => {
    if (session) {
      fetchApplications();
    }
  }, [session]);

  const fetchApplications = async () => {
    if (!session) return;
    
    setLoadingApplications(true);
    
    try {
      const { data, error } = await supabase
        .from('job_applications')
        .select(`
          id,
          applied_at,
          status,
          jobs!job_applications_job_id_fkey (
            id,
            title,
            company,
            job_type,
            industry,
            description,
            deadline,
            status,
            created_at
          )
        `)
        .eq('student_id', session.user.id)
        .order('applied_at', { ascending: false });

      if (error) {
        console.error('Error fetching applications:', error);
      } else if (data) {
        // Transform the data to match our Application interface
        const transformedApplications: Application[] = data.map((item: any) => ({
          id: item.id,
          applied_at: item.applied_at,
          status: item.status,
          job: item.jobs // Supabase returns the joined table with its name
        }));
        setApplications(transformedApplications);
      }
    } catch (error) {
      console.error('Unexpected error:', error);
    } finally {
      setLoadingApplications(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'applied': return 'bg-blue-100 text-blue-800';
      case 'viewed': return 'bg-yellow-100 text-yellow-800';
      case 'interview': return 'bg-purple-100 text-purple-800';
      case 'hired': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'applied': return 'Applied';
      case 'viewed': return 'Viewed';
      case 'interview': return 'Interview';
      case 'hired': return 'Hired';
      case 'rejected': return 'Rejected';
      default: return status;
    }
  };

  // Rest of your component code would go here...
  // Since the file was cut off, I'll add a basic render structure

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Student Dashboard</h1>
        
        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('browse')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'browse'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Browse Jobs
            </button>
            <button
              onClick={() => setActiveTab('applications')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'applications'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              My Applications ({applications.length})
            </button>
          </nav>
        </div>

        {/* Content */}
        {activeTab === 'applications' && (
          <div>
            {loadingApplications ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                <p className="mt-2 text-gray-600">Loading applications...</p>
              </div>
            ) : applications.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-600">You haven't applied to any jobs yet.</p>
                <button
                  onClick={() => setActiveTab('browse')}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Browse Jobs
                </button>
              </div>
            ) : (
              <div className="grid gap-4">
                {applications.map((application) => (
                  <div key={application.id} className="bg-white rounded-lg shadow p-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {application.job.title}
                        </h3>
                        <p className="text-gray-600">{application.job.company}</p>
                        <p className="text-sm text-gray-500 mt-1">
                          Applied on {new Date(application.applied_at).toLocaleDateString()}
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(application.status)}`}>
                        {getStatusText(application.status)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'browse' && (
          <div className="text-center py-12">
            <p className="text-gray-600">Job browsing functionality coming soon...</p>
          </div>
        )}
      </div>
    </div>
  );
}