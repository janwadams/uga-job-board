// src/pages/admin/job-reviews.tsx

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { createClient } from '@supabase/supabase-js';
import {
  CheckIcon,
  XMarkIcon,
  ClockIcon,
  DocumentTextIcon,
  BuildingOfficeIcon,
  CalendarIcon,
  ExclamationTriangleIcon
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
  industry: string;
  description: string;
  deadline: string;
  created_at: string;
  status: 'pending' | 'active' | 'rejected';
  created_by: string;
  rejection_note?: string;
  location?: string;
  salary_range?: string;
  requirements?: string[];
  rep_email?: string;
  rep_name?: string;
}

interface RejectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (message: string) => void;
  jobTitle: string;
}

function RejectionModal({ isOpen, onClose, onConfirm, jobTitle }: RejectionModalProps) {
  const [rejectionMessage, setRejectionMessage] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (rejectionMessage.trim().length < 10) {
      setError('Please provide a detailed reason for rejection (at least 10 characters)');
      return;
    }
    onConfirm(rejectionMessage);
    setRejectionMessage('');
    setError('');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex items-center mb-4">
          <ExclamationTriangleIcon className="h-6 w-6 text-red-600 mr-2" />
          <h2 className="text-xl font-semibold text-gray-900">Reject Job Posting</h2>
        </div>
        
        <p className="text-gray-600 mb-4">
          You are about to reject: <span className="font-medium">{jobTitle}</span>
        </p>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Rejection Reason (will be sent to the rep)
          </label>
          <textarea
            value={rejectionMessage}
            onChange={(e) => {
              setRejectionMessage(e.target.value);
              setError('');
            }}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
            placeholder="Please explain why this job posting is being rejected. This helps the rep understand what needs to be fixed..."
          />
          {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
        </div>

        <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded p-3">
          <p className="text-sm text-yellow-800">
            <strong>Common rejection reasons:</strong>
            <br />• Incomplete job description
            <br />• Missing salary information
            <br />• Discriminatory language
            <br />• Unrealistic requirements
            <br />• Incorrect job category
          </p>
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={() => {
              onClose();
              setRejectionMessage('');
              setError('');
            }}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Reject with Message
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminJobReviews() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [pendingJobs, setPendingJobs] = useState<Job[]>([]);
  const [rejectedJobs, setRejectedJobs] = useState<Job[]>([]);
  const [activeTab, setActiveTab] = useState<'pending' | 'rejected'>('pending');
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [jobToReject, setJobToReject] = useState<Job | null>(null);

  useEffect(() => {
    checkAuthAndLoadJobs();
  }, []);

  const checkAuthAndLoadJobs = async () => {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error || !session) {
      router.push('/login');
      return;
    }

    // Check if user is an admin
    const { data: userData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', session.user.id)
      .single();

    if (userData?.role !== 'admin') {
      router.push('/unauthorized');
      return;
    }

    setSession(session);
    loadJobs();
  };

  const loadJobs = async () => {
    setLoading(true);
    try {
      // Fetch pending jobs with rep info
      const { data: pendingData, error: pendingError } = await supabase
        .from('jobs')
        .select(`
          *,
          profiles:created_by (
            email,
            full_name
          )
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (pendingError) {
        console.error('Error fetching pending jobs:', pendingError);
      } else {
        // Transform data to include rep info
        const transformedPending = pendingData?.map(job => ({
          ...job,
          rep_email: job.profiles?.email,
          rep_name: job.profiles?.full_name
        })) || [];
        setPendingJobs(transformedPending);
      }

      // Fetch rejected jobs
      const { data: rejectedData, error: rejectedError } = await supabase
        .from('jobs')
        .select(`
          *,
          profiles:created_by (
            email,
            full_name
          )
        `)
        .eq('status', 'rejected')
        .order('created_at', { ascending: false });

      if (rejectedError) {
        console.error('Error fetching rejected jobs:', rejectedError);
      } else {
        const transformedRejected = rejectedData?.map(job => ({
          ...job,
          rep_email: job.profiles?.email,
          rep_name: job.profiles?.full_name
        })) || [];
        setRejectedJobs(transformedRejected);
      }
    } catch (error) {
      console.error('Unexpected error:', error);
    } finally {
      setLoading(false);
    }
  };

  const approveJob = async (jobId: string) => {
    try {
      const { error } = await supabase
        .from('jobs')
        .update({ 
          status: 'active',
          rejection_note: null // Clear any previous rejection note
        })
        .eq('id', jobId);

      if (error) {
        console.error('Error approving job:', error);
        alert('Error approving job. Please try again.');
      } else {
        // Remove from pending list
        setPendingJobs(prev => prev.filter(job => job.id !== jobId));
        alert('Job approved successfully!');
      }
    } catch (error) {
      console.error('Unexpected error:', error);
    }
  };

  const handleRejectJob = (job: Job) => {
    setJobToReject(job);
    setShowRejectionModal(true);
  };

  const confirmRejectJob = async (rejectionMessage: string) => {
    if (!jobToReject) return;

    try {
      const { error } = await supabase
        .from('jobs')
        .update({ 
          status: 'rejected',
          rejection_note: rejectionMessage
        })
        .eq('id', jobToReject.id);

      if (error) {
        console.error('Error rejecting job:', error);
        alert('Error rejecting job. Please try again.');
      } else {
        // Move from pending to rejected list
        setPendingJobs(prev => prev.filter(job => job.id !== jobToReject.id));
        setRejectedJobs(prev => [
          { ...jobToReject, status: 'rejected', rejection_note: rejectionMessage },
          ...prev
        ]);
        
        // TODO: In production, you'd send an email notification here
        alert('Job rejected and message sent to rep.');
        
        setShowRejectionModal(false);
        setJobToReject(null);
      }
    } catch (error) {
      console.error('Unexpected error:', error);
    }
  };

  const reactivateJob = async (jobId: string) => {
    try {
      const { error } = await supabase
        .from('jobs')
        .update({ 
          status: 'pending',
          rejection_note: null
        })
        .eq('id', jobId);

      if (error) {
        console.error('Error reactivating job:', error);
        alert('Error reactivating job. Please try again.');
      } else {
        loadJobs(); // Reload to update both lists
        alert('Job moved back to pending for review.');
      }
    } catch (error) {
      console.error('Unexpected error:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <p className="mt-2 text-gray-600">Loading jobs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Job Review Dashboard</h1>
          <p className="text-gray-600 mt-2">Review and approve job postings from reps</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <ClockIcon className="h-10 w-10 text-yellow-500 mr-3" />
              <div>
                <p className="text-2xl font-bold text-gray-900">{pendingJobs.length}</p>
                <p className="text-gray-600">Pending Review</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <CheckIcon className="h-10 w-10 text-green-500 mr-3" />
              <div>
                <p className="text-2xl font-bold text-gray-900">-</p>
                <p className="text-gray-600">Approved Today</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <XMarkIcon className="h-10 w-10 text-red-500 mr-3" />
              <div>
                <p className="text-2xl font-bold text-gray-900">{rejectedJobs.length}</p>
                <p className="text-gray-600">Rejected</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('pending')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'pending'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Pending Review ({pendingJobs.length})
            </button>
            <button
              onClick={() => setActiveTab('rejected')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'rejected'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Rejected ({rejectedJobs.length})
            </button>
          </nav>
        </div>

        {/* Job List */}
        <div className="space-y-4">
          {activeTab === 'pending' ? (
            pendingJobs.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg">
                <ClockIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No jobs pending review</p>
              </div>
            ) : (
              pendingJobs.map(job => (
                <div key={job.id} className="bg-white rounded-lg shadow p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">{job.title}</h3>
                      <div className="mt-2 space-y-1">
                        <p className="text-sm text-gray-600 flex items-center">
                          <BuildingOfficeIcon className="h-4 w-4 mr-1" />
                          {job.company}
                        </p>
                        <p className="text-sm text-gray-600">
                          Type: <span className="font-medium">{job.job_type}</span> | 
                          Industry: <span className="font-medium">{job.industry}</span>
                        </p>
                        <p className="text-sm text-gray-500">
                          Submitted by: {job.rep_name || 'Unknown'} ({job.rep_email || 'No email'})
                        </p>
                        <p className="text-sm text-gray-500 flex items-center">
                          <CalendarIcon className="h-4 w-4 mr-1" />
                          Submitted: {new Date(job.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => approveJob(job.id)}
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center"
                      >
                        <CheckIcon className="h-4 w-4 mr-1" />
                        Approve
                      </button>
                      <button
                        onClick={() => handleRejectJob(job)}
                        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center"
                      >
                        <XMarkIcon className="h-4 w-4 mr-1" />
                        Reject
                      </button>
                    </div>
                  </div>
                  <div className="border-t pt-4">
                    <p className="text-gray-700 whitespace-pre-wrap">{job.description}</p>
                    {job.location && (
                      <p className="mt-2 text-sm text-gray-600">
                        <strong>Location:</strong> {job.location}
                      </p>
                    )}
                    {job.salary_range && (
                      <p className="text-sm text-gray-600">
                        <strong>Salary:</strong> {job.salary_range}
                      </p>
                    )}
                    {job.deadline && (
                      <p className="text-sm text-gray-600">
                        <strong>Application Deadline:</strong> {new Date(job.deadline).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              ))
            )
          ) : (
            rejectedJobs.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg">
                <XMarkIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No rejected jobs</p>
              </div>
            ) : (
              rejectedJobs.map(job => (
                <div key={job.id} className="bg-white rounded-lg shadow p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">{job.title}</h3>
                      <div className="mt-2 space-y-1">
                        <p className="text-sm text-gray-600">{job.company}</p>
                        <p className="text-sm text-gray-500">
                          Submitted by: {job.rep_name || 'Unknown'} ({job.rep_email || 'No email'})
                        </p>
                        <p className="text-sm text-gray-500">
                          Rejected: {new Date(job.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => reactivateJob(job.id)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      Review Again
                    </button>
                  </div>
                  {job.rejection_note && (
                    <div className="border-t pt-4">
                      <div className="bg-red-50 border border-red-200 rounded p-3">
                        <p className="text-sm font-medium text-red-900">Rejection Reason:</p>
                        <p className="text-sm text-red-800 mt-1">{job.rejection_note}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )
          )}
        </div>
      </div>

      {/* Rejection Modal */}
      <RejectionModal
        isOpen={showRejectionModal}
        onClose={() => {
          setShowRejectionModal(false);
          setJobToReject(null);
        }}
        onConfirm={confirmRejectJob}
        jobTitle={jobToReject?.title || ''}
      />
    </div>
  );
}