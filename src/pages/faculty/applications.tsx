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
      // first get all jobs posted by this faculty member
      const { data: jobs, error: jobsError } = await supabase
        .from('jobs')
        .select('*')
        .eq('created_by', session.user.id)  // using created_by field
        .order('created_at', { ascending: false });

      if (jobsError) {
        console.error('Error fetching jobs:', jobsError);
        return;
      }

      console.log('Jobs found:', jobs?.length); // debug log to see how many jobs were found

      if (!jobs || jobs.length === 0) {
        setJobsWithApplications([]);
        setLoading(false);
        return;
      }

      // for each job, get its applications
      const jobsWithApps = await Promise.all(
        jobs.map(async (job) => {
          const { data: applications, error: appsError } = await supabase
            .from('job_applications')
            .select('*')
            .eq('job_id', job.id)
            .order('applied_at', { ascending: false });

          if (appsError) {
            console.error('Error fetching applications for job', job.id, ':', appsError);
            return {
              job,
              applications: [],
              isExpanded: false
            };
          }

          console.log(`Job "${job.title}" has ${applications?.length || 0} applications`); // debug log

          return {
            job,
            applications: applications || [],
            isExpanded: false
          };
        })
      );

      setJobsWithApplications(jobsWithApps);
    } catch (error) {
      console.error('Unexpected error:', error);
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
      const { error } = await supabase
        .from('job_applications')
        .update({ status: newStatus })
        .eq('id', applicationId);

      if (!error) {
        // refresh the data
        fetchJobsAndApplications();
      }
    } catch (error) {
      console.error('Error updating status:', error);
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

  // get status color for badges
  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'applied': 'bg-blue-100 text-blue-800',
      'viewed': 'bg-yellow-100 text-yellow-800',
      'interview': 'bg-purple-100 text-purple-800',
      'hired': 'bg-green-100 text-green-800',
      'rejected': 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  // calculate total applications count based on filter
  const getFilteredTotalApplications = () => {
    if (selectedStatus === 'all') {
      return jobsWithApplications.reduce(
        (sum, item) => sum + item.applications.length,
        0
      );
    }
    // if a status is selected, only count applications with that status
    return jobsWithApplications.reduce(
      (sum, item) => sum + item.applications.filter(app => app.status === selectedStatus).length,
      0
    );
  };

  // calculate jobs with at least one application matching the filter
  const getFilteredJobsWithAppsCount = () => {
    if (selectedStatus === 'all') {
      return jobsWithApplications.filter(
        item => item.applications.length > 0
      ).length;
    }
    // if a status is selected, only count jobs that have at least one application with that status
    return jobsWithApplications.filter(
      item => item.applications.some(app => app.status === selectedStatus)
    ).length;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <p className="mt-2 text-gray-600">Loading applications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* back to dashboard link */}
        <div className="mb-4">
          <Link href="/faculty/dashboard">
            <button className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors">
              <ArrowLeftIcon className="h-4 w-4" />
              Back to Dashboard
            </button>
          </Link>
        </div>

        {/* header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Job Applications</h1>
          <p className="text-gray-600 mt-2">
            View and manage applications for your posted jobs
          </p>
        </div>

        {/* stats cards with explanations - now updates based on filter */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-blue-500">
            <div className="text-2xl font-bold text-gray-900">{jobsWithApplications.length}</div>
            <div className="text-sm text-gray-600">Active Jobs</div>
            <div className="text-xs text-gray-500 mt-1">Total jobs you've posted</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-green-500">
            <div className="text-2xl font-bold text-gray-900">{getFilteredTotalApplications()}</div>
            <div className="text-sm text-gray-600">
              {selectedStatus === 'all' ? 'Total Applications' : `${selectedStatus.charAt(0).toUpperCase() + selectedStatus.slice(1)} Applications`}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {selectedStatus === 'all' ? 'All applications across all jobs' : `Applications with ${selectedStatus} status`}
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-purple-500">
            <div className="text-2xl font-bold text-gray-900">{getFilteredJobsWithAppsCount()}</div>
            <div className="text-sm text-gray-600">Jobs with Applications</div>
            <div className="text-xs text-gray-500 mt-1">
              {selectedStatus === 'all' ? 'Jobs that have received applications' : `Jobs with ${selectedStatus} applications`}
            </div>
          </div>
        </div>

        {/* filters */}
        <div className="bg-white p-4 rounded-lg shadow-sm mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <input
              type="text"
              placeholder="Search by email or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="applied">Applied</option>
              <option value="viewed">Viewed</option>
              <option value="interview">Interview</option>
              <option value="hired">Hired</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>

        {/* jobs with applications list */}
        {jobsWithApplications.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <BriefcaseIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">You haven't posted any jobs yet.</p>
            <Link href="/faculty/post-job">
              <button className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                Post a Job
              </button>
            </Link>
          </div>
        ) : getFilteredTotalApplications() === 0 && selectedStatus === 'all' ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <UserGroupIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No applications received yet.</p>
            <p className="text-sm text-gray-500 mt-2">
              Students haven't applied to your jobs yet. Check back later!
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
                return null; // don't show this job if no applications match the status filter
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
                            {displayedApplications.length === 1 ? 'Application' : 'Applications'}
                            {selectedStatus !== 'all' && ` (${selectedStatus})`}
                          </p>
                        </div>
                        {jobItem.job.deadline && (
                          <div className="text-right">
                            <p className="text-sm text-gray-600">
                              Deadline
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
                            ? "No applications yet for this job"
                            : "No applications match your filters"}
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
                                          View Resume
                                          <ArrowTopRightOnSquareIcon className="h-3 w-3" />
                                        </a>
                                      </div>
                                    )}
                                    
                                    <div className="flex items-center gap-2 text-sm text-gray-500">
                                      <CalendarIcon className="h-4 w-4" />
                                      Applied on {new Date(application.applied_at).toLocaleDateString()}
                                    </div>
                                  </div>

                                  {/* cover letter if exists */}
                                  {application.cover_letter && (
                                    <div className="mt-3 p-3 bg-gray-50 rounded">
                                      <p className="text-sm font-medium text-gray-700 mb-1">
                                        Cover Letter:
                                      </p>
                                      <p className="text-sm text-gray-600">
                                        {application.cover_letter}
                                      </p>
                                    </div>
                                  )}

                                  {/* notes if exists (old field) */}
                                  {application.notes && (
                                    <div className="mt-3 p-3 bg-yellow-50 rounded">
                                      <p className="text-sm font-medium text-gray-700 mb-1">
                                        Additional Notes:
                                      </p>
                                      <p className="text-sm text-gray-600">
                                        {application.notes}
                                      </p>
                                    </div>
                                  )}

                                  {/* show if missing contact info */}
                                  {!application.contact_email && !application.contact_phone && (
                                    <div className="text-sm text-gray-500 italic">
                                      No contact information provided (legacy application)
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
                                    <option value="applied">Applied</option>
                                    <option value="viewed">Viewed</option>
                                    <option value="interview">Interview</option>
                                    <option value="hired">Hired</option>
                                    <option value="rejected">Rejected</option>
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
            }).filter(Boolean)} {/* filter out null entries for jobs that don't match the status filter */}
          </div>
        )}
      </div>
    </div>
  );
}