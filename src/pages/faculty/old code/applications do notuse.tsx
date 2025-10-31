// src/pages/faculty/applications.tsx - faculty view to see applications for their jobs
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import {
  BriefcaseIcon,
  CalendarIcon,
  EnvelopeIcon,
  PhoneIcon,
  DocumentTextIcon,
  UserGroupIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ArrowTopRightOnSquareIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Job {
  id: string;
  title: string;
  company: string;
  job_type: string;
  deadline: string;
  created_at: string;
}

interface Application {
  id: string;
  applied_at: string;
  status: string;
  contact_email: string;
  contact_phone: string;
  resume_url: string;
  cover_letter: string;
  notes: string;
  student: {
    id: string;
    email: string;
  };
}

interface JobWithApplications {
  job: Job;
  applications: Application[];
  isExpanded: boolean;
}

export default function FacultyApplications() {
  const router = useRouter();
  const [jobsWithApplications, setJobsWithApplications] = useState<JobWithApplications[]>([]);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // check if user is authorized faculty
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
        router.push('/login');
        return;
      }

      // verify user is faculty
      const { data: userData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .single();

      if (userData?.role !== 'faculty') {
        router.push('/unauthorized');
        return;
      }

      setSession(session);
    };

    checkAuth();
  }, [router]);

  // fetch jobs and applications when session is ready
  useEffect(() => {
    if (session) {
      fetchJobsAndApplications();
    }
  }, [session]);

  const fetchJobsAndApplications = async () => {
    if (!session) return;
    
    setLoading(true);
    
    try {
      // get current session token
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (!currentSession) return;

      // fetch jobs and applications from api
      const response = await fetch('/api/faculty/applications/list', {
        headers: {
          'Authorization': `Bearer ${currentSession.access_token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('error fetching applications:', data.error);
        return;
      }

      // transform the data to include isExpanded property
      const jobsWithApps = (data.jobsWithApplications || []).map((item: any) => ({
        ...item,
        isExpanded: false
      }));

      setJobsWithApplications(jobsWithApps);
    } catch (error) {
      console.error('unexpected error:', error);
    } finally {
      setLoading(false);
    }
  };

  // toggle job expansion to show/hide applications
  const toggleJobExpansion = (jobId: string) => {
    setJobsWithApplications(prev =>
      prev.map(item =>
        item.job.id === jobId
          ? { ...item, isExpanded: !item.isExpanded }
          : item
      )
    );
  };

  // update application status
  const updateApplicationStatus = async (applicationId: string, newStatus: string) => {
    try {
      // get current session token
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (!currentSession) return;

      const response = await fetch('/api/faculty/applications/update-status', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${currentSession.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          applicationId,
          newStatus
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('error updating status:', data.error);
        return;
      }

      // refresh the data
      fetchJobsAndApplications();
    } catch (error) {
      console.error('error updating status:', error);
    }
  };

  // filter applications based on search and status
  const filterApplications = (applications: Application[]) => {
    return applications.filter(app => {
      const matchesSearch = searchTerm === '' ||
        app.contact_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (app.contact_phone && app.contact_phone.includes(searchTerm));
      
      const matchesStatus = selectedStatus === 'all' || app.status === selectedStatus;

      return matchesSearch && matchesStatus;
    });
  };

  // get color for application status badge
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'applied':
        return 'bg-blue-100 text-blue-800';
      case 'viewed':
        return 'bg-purple-100 text-purple-800';
      case 'interview':
        return 'bg-yellow-100 text-yellow-800';
      case 'hired':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // calculate total applications across all jobs
  const totalApplications = jobsWithApplications.reduce(
    (sum, item) => sum + item.applications.length,
    0
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-700 mx-auto"></div>
          <p className="mt-4 text-gray-600">loading applications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <UserGroupIcon className="h-8 w-8 text-red-700" />
              student applications
            </h1>
            <p className="text-gray-600 mt-1">
              review and manage applications for your job postings
            </p>
          </div>
          <Link href="/faculty/dashboard">
            <button className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">
              <ArrowLeftIcon className="h-4 w-4" />
              back to dashboard
            </button>
          </Link>
        </div>

        {/* summary stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <p className="text-sm text-gray-500">total applications</p>
            <p className="text-2xl font-bold text-gray-900">{totalApplications}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <p className="text-sm text-gray-500">job postings</p>
            <p className="text-2xl font-bold text-gray-900">{jobsWithApplications.length}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <p className="text-sm text-gray-500">new applications</p>
            <p className="text-2xl font-bold text-blue-600">
              {jobsWithApplications.reduce(
                (sum, item) => sum + item.applications.filter(a => a.status === 'applied').length,
                0
              )}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <p className="text-sm text-gray-500">interviews scheduled</p>
            <p className="text-2xl font-bold text-yellow-600">
              {jobsWithApplications.reduce(
                (sum, item) => sum + item.applications.filter(a => a.status === 'interview').length,
                0
              )}
            </p>
          </div>
        </div>

        {/* filters */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="search by email or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>
            <div>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full md:w-auto px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
              >
                <option value="all">all statuses</option>
                <option value="applied">applied</option>
                <option value="viewed">viewed</option>
                <option value="interview">interview</option>
                <option value="hired">hired</option>
                <option value="rejected">rejected</option>
              </select>
            </div>
          </div>
        </div>

        {/* applications list */}
        {jobsWithApplications.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <BriefcaseIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700">no job postings yet</h3>
            <p className="text-sm text-gray-500 mt-2">
              create your first job posting to start receiving applications
            </p>
            <Link href="/faculty/create">
              <button className="mt-4 px-6 py-2 bg-red-700 text-white rounded hover:bg-red-800">
                create job posting
              </button>
            </Link>
          </div>
        ) : totalApplications === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <UserGroupIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700">no applications yet</h3>
            <p className="text-sm text-gray-500 mt-2">
              students haven't applied to your jobs yet. check back later!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {jobsWithApplications.map((jobItem) => {
              // filter applications first if status is selected
              let displayedApplications = jobItem.applications;
              if (selectedStatus !== 'all') {
                displayedApplications = jobItem.applications.filter(app => app.status === selectedStatus);
              }
              
              // only show jobs that have applications matching the filter
              if (selectedStatus !== 'all' && displayedApplications.length === 0) {
                return null;
              }
              
              const filteredApps = filterApplications(displayedApplications);
              
              return (
                <div key={jobItem.job.id} className="bg-white rounded-lg shadow-sm">
                  {/* job header - clickable to expand */}
                  <div
                    className="p-4 cursor-pointer hover:bg-gray-50"
                    onClick={() => toggleJobExpansion(jobItem.job.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {jobItem.isExpanded ? (
                          <ChevronDownIcon className="h-5 w-5 text-gray-500" />
                        ) : (
                          <ChevronRightIcon className="h-5 w-5 text-gray-500" />
                        )}
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            {jobItem.job.title}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {jobItem.job.company} • {jobItem.job.job_type}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-2xl font-bold text-gray-900">
                            {selectedStatus === 'all' 
                              ? jobItem.applications.length 
                              : displayedApplications.length}
                          </p>
                          <p className="text-xs text-gray-500">
                            {displayedApplications.length === 1 ? 'application' : 'applications'}
                            {selectedStatus !== 'all' && ` (${selectedStatus})`}
                          </p>
                        </div>
                        {jobItem.job.deadline && (
                          <div className="text-right">
                            <p className="text-sm text-gray-600">
                              deadline
                            </p>
                            <p className="text-sm font-medium">
                              {new Date(jobItem.job.deadline).toLocaleDateString()}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* applications list - shown when expanded */}
                  {jobItem.isExpanded && (
                    <div className="border-t">
                      {filteredApps.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                          {jobItem.applications.length === 0 
                            ? "no applications yet for this job"
                            : "no applications match your filters"}
                        </div>
                      ) : (
                        <div className="divide-y">
                          {filteredApps.map((application) => (
                            <div key={application.id} className="p-4 hover:bg-gray-50">
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  {/* applicant info */}
                                  <div className="mb-3">
                                    {application.contact_email && (
                                      <div className="flex items-center gap-2 mb-2">
                                        <EnvelopeIcon className="h-4 w-4 text-gray-500" />
                                        <a 
                                          href={`mailto:${application.contact_email}`}
                                          className="text-blue-600 hover:underline"
                                        >
                                          {application.contact_email}
                                        </a>
                                      </div>
                                    )}
                                    
                                    {application.contact_phone && (
                                      <div className="flex items-center gap-2 mb-2">
                                        <PhoneIcon className="h-4 w-4 text-gray-500" />
                                        <a 
                                          href={`tel:${application.contact_phone}`}
                                          className="text-gray-700"
                                        >
                                          {application.contact_phone}
                                        </a>
                                      </div>
                                    )}
                                    
                                    {application.resume_url && (
                                      <div className="flex items-center gap-2 mb-2">
                                        <DocumentTextIcon className="h-4 w-4 text-gray-500" />
                                        <a 
                                          href={application.resume_url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-blue-600 hover:underline flex items-center gap-1"
                                        >
                                          view resume
                                          <ArrowTopRightOnSquareIcon className="h-3 w-3" />
                                        </a>
                                      </div>
                                    )}
                                    
                                    <div className="flex items-center gap-2 text-sm text-gray-500">
                                      <CalendarIcon className="h-4 w-4" />
                                      applied on {new Date(application.applied_at).toLocaleDateString()}
                                    </div>
                                  </div>

                                  {/* cover letter if exists */}
                                  {application.cover_letter && (
                                    <div className="mt-3 p-3 bg-gray-50 rounded">
                                      <p className="text-sm font-medium text-gray-700 mb-1">
                                        cover letter:
                                      </p>
                                      <p className="text-sm text-gray-600">
                                        {application.cover_letter}
                                      </p>
                                    </div>
                                  )}

                                  {/* notes if exists */}
                                  {application.notes && (
                                    <div className="mt-3 p-3 bg-yellow-50 rounded">
                                      <p className="text-sm font-medium text-gray-700 mb-1">
                                        additional notes:
                                      </p>
                                      <p className="text-sm text-gray-600">
                                        {application.notes}
                                      </p>
                                    </div>
                                  )}

                                  {/* show if missing contact info */}
                                  {!application.contact_email && !application.contact_phone && (
                                    <div className="text-sm text-gray-500 italic">
                                      no contact information provided (legacy application)
                                    </div>
                                  )}
                                </div>

                                {/* status and actions */}
                                <div className="ml-4">
                                  <select
                                    value={application.status}
                                    onChange={(e) => updateApplicationStatus(application.id, e.target.value)}
                                    className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(application.status)}`}
                                  >
                                    <option value="applied">applied</option>
                                    <option value="viewed">viewed</option>
                                    <option value="interview">interview</option>
                                    <option value="hired">hired</option>
                                    <option value="rejected">rejected</option>
                                  </select>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            }).filter(Boolean)}
          </div>
        )}
      </div>
    </div>
  );
}
