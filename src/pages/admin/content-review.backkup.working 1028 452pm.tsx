// src/pages/admin/content-review.tsx - weekly review system to check job quality

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import {
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  DocumentMagnifyingGlassIcon,
  CalendarDaysIcon,
  FlagIcon
} from '@heroicons/react/24/outline';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Job {
  id: string;
  title: string;
  company: string;
  created_by: string;
  created_at: string;
  deadline: string;
  status: string;
  last_reviewed: string | null;
  review_notes: string | null;
  description: string;
  requirements: string[];
  location: string;
  job_type: string;
}

interface ReviewFlag {
  type: 'warning' | 'error' | 'info';
  message: string;
}

export default function ContentReview() {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'overdue' | 'never'>('overdue');
  
  // check if user is admin when page loads
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      router.push('/login');
      return;
    }

    const { data: userData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', session.user.id)
      .single();

    if (userData?.role !== 'admin') {
      router.push('/unauthorized');
      return;
    }

    fetchJobsForReview();
  };

  const fetchJobsForReview = async () => {
    setLoading(true);
    
    try {
      // get all active jobs sorted by when they were last reviewed
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('status', 'active')
        .order('last_reviewed', { ascending: true, nullsFirst: true });

      if (error) throw error;

      setJobs(data || []);
    } catch (error) {
      console.error('Error fetching jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  // calculate how many days since job was reviewed
  const getDaysSinceReview = (lastReviewed: string | null): number => {
    if (!lastReviewed) return 999; // never reviewed
    const reviewDate = new Date(lastReviewed);
    const today = new Date();
    const diffTime = today.getTime() - reviewDate.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  };

  // get color based on review status
  const getReviewStatusColor = (daysSince: number) => {
    if (daysSince === 999) return 'text-red-600 bg-red-50';
    if (daysSince > 14) return 'text-red-600 bg-red-50';
    if (daysSince > 7) return 'text-yellow-600 bg-yellow-50';
    return 'text-green-600 bg-green-50';
  };

  // check for potential issues with job posting
  const getContentFlags = (job: Job): ReviewFlag[] => {
    const flags: ReviewFlag[] = [];
    const today = new Date();
    const deadline = new Date(job.deadline);
    
    // check if deadline already passed
    if (deadline < today) {
      flags.push({ type: 'error', message: 'Deadline has passed' });
    }
    
    // check if deadline is very soon
    const daysUntilDeadline = Math.floor((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntilDeadline <= 3 && daysUntilDeadline >= 0) {
      flags.push({ type: 'warning', message: `Deadline in ${daysUntilDeadline} days` });
    }
    
    // check for short description
    if (!job.description || job.description.length < 100) {
      flags.push({ type: 'warning', message: 'Description seems too short' });
    }
    
    // check for missing location
    if (!job.location || job.location.trim() === '') {
      flags.push({ type: 'info', message: 'No location specified' });
    }
    
    // check for missing requirements
    if (!job.requirements || job.requirements.length === 0) {
      flags.push({ type: 'warning', message: 'No requirements listed' });
    }
    
    return flags;
  };

  // save review status for a job
  const markAsReviewed = async (jobId: string, notes: string) => {
    try {
      const { error } = await supabase
        .from('jobs')
        .update({
          last_reviewed: new Date().toISOString(),
          review_notes: notes
        })
        .eq('id', jobId);

      if (error) throw error;

      // reload the job list
      fetchJobsForReview();
      setSelectedJob(null);
      setReviewNotes('');
      alert('Job marked as reviewed successfully!');
    } catch (error) {
      console.error('Error updating review status:', error);
      alert('Failed to update review status');
    }
  };

  // remove job that has serious problems
  const removeJob = async (jobId: string) => {
    if (!confirm('Are you sure you want to remove this job? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('jobs')
        .update({ status: 'removed' })
        .eq('id', jobId);

      if (error) throw error;

      fetchJobsForReview();
      setSelectedJob(null);
      alert('Job has been removed');
    } catch (error) {
      console.error('Error removing job:', error);
      alert('Failed to remove job');
    }
  };

  // filter jobs based on review status
  const filteredJobs = jobs.filter(job => {
    const daysSince = getDaysSinceReview(job.last_reviewed);
    if (filterType === 'overdue') return daysSince > 7;
    if (filterType === 'never') return daysSince === 999;
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <p className="mt-2 text-gray-600">Loading content for review...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* page header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Content Review Dashboard</h1>
              <p className="text-gray-600 mt-2">Weekly review of active job postings for quality and compliance</p>
            </div>
            <Link href="/admin/dashboard">
              <button className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600">
                ← Back to Admin
              </button>
            </Link>
          </div>
        </div>

        {/* stats cards showing review status */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <DocumentMagnifyingGlassIcon className="h-10 w-10 text-blue-500 mr-3" />
              <div>
                <p className="text-2xl font-bold">{jobs.length}</p>
                <p className="text-gray-600 text-sm">Total Active Jobs</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <ExclamationTriangleIcon className="h-10 w-10 text-yellow-500 mr-3" />
              <div>
                <p className="text-2xl font-bold">
                  {jobs.filter(j => getDaysSinceReview(j.last_reviewed) > 7).length}
                </p>
                <p className="text-gray-600 text-sm">Need Review (7+ days)</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <FlagIcon className="h-10 w-10 text-red-500 mr-3" />
              <div>
                <p className="text-2xl font-bold">
                  {jobs.filter(j => getDaysSinceReview(j.last_reviewed) === 999).length}
                </p>
                <p className="text-gray-600 text-sm">Never Reviewed</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <CheckCircleIcon className="h-10 w-10 text-green-500 mr-3" />
              <div>
                <p className="text-2xl font-bold">
                  {jobs.filter(j => getDaysSinceReview(j.last_reviewed) <= 7 && j.last_reviewed).length}
                </p>
                <p className="text-gray-600 text-sm">Recently Reviewed</p>
              </div>
            </div>
          </div>
        </div>

        {/* filter tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex">
              <button
                onClick={() => setFilterType('all')}
                className={`py-2 px-6 border-b-2 font-medium text-sm ${
                  filterType === 'all'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                All Active ({jobs.length})
              </button>
              <button
                onClick={() => setFilterType('overdue')}
                className={`py-2 px-6 border-b-2 font-medium text-sm ${
                  filterType === 'overdue'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Overdue Review ({jobs.filter(j => getDaysSinceReview(j.last_reviewed) > 7).length})
              </button>
              <button
                onClick={() => setFilterType('never')}
                className={`py-2 px-6 border-b-2 font-medium text-sm ${
                  filterType === 'never'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Never Reviewed ({jobs.filter(j => getDaysSinceReview(j.last_reviewed) === 999).length})
              </button>
            </nav>
          </div>
        </div>

        {/* list of jobs to review */}
        <div className="bg-white rounded-lg shadow">
          {filteredJobs.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircleIcon className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <p className="text-gray-600">All jobs have been reviewed recently!</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredJobs.map(job => {
                const daysSince = getDaysSinceReview(job.last_reviewed);
                const flags = getContentFlags(job);
                
                return (
                  <div key={job.id} className="p-6 hover:bg-gray-50">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">{job.title}</h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getReviewStatusColor(daysSince)}`}>
                            {daysSince === 999 ? 'Never Reviewed' : `${daysSince} days ago`}
                          </span>
                        </div>
                        
                        <p className="text-gray-600 mb-2">
                          {job.company} • {job.job_type} • {job.location || 'No location'}
                        </p>
                        
                        <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                          <span className="flex items-center gap-1">
                            <CalendarDaysIcon className="h-4 w-4" />
                            Deadline: {new Date(job.deadline).toLocaleDateString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <ClockIcon className="h-4 w-4" />
                            Posted: {new Date(job.created_at).toLocaleDateString()}
                          </span>
                        </div>

                        {/* show any issues found */}
                        {flags.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-3">
                            {flags.map((flag, index) => (
                              <span
                                key={index}
                                className={`px-2 py-1 rounded text-xs font-medium ${
                                  flag.type === 'error' ? 'bg-red-100 text-red-800' :
                                  flag.type === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-blue-100 text-blue-800'
                                }`}
                              >
                                {flag.message}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* show previous review notes if any */}
                        {job.review_notes && (
                          <div className="mt-2 p-2 bg-gray-50 rounded text-sm text-gray-600">
                            <strong>Last Review Notes:</strong> {job.review_notes}
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => {
                            setSelectedJob(job);
                            setReviewNotes(job.review_notes || '');
                          }}
                          className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                        >
                          Review
                        </button>
                        <Link href={`/admin/view/${job.id}`}>
                          <button className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700">
                            View
                          </button>
                        </Link>
                        {flags.some(f => f.type === 'error') && (
                          <button
                            onClick={() => removeJob(job.id)}
                            className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* review modal popup */}
        {selectedJob && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full p-6">
              <h2 className="text-xl font-semibold mb-4">Review Job: {selectedJob.title}</h2>
              
              <div className="mb-4 p-4 bg-gray-50 rounded">
                <p className="text-sm text-gray-600 mb-2">
                  <strong>Company:</strong> {selectedJob.company}
                </p>
                <p className="text-sm text-gray-600 mb-2">
                  <strong>Type:</strong> {selectedJob.job_type}
                </p>
                <p className="text-sm text-gray-600 mb-2">
                  <strong>Location:</strong> {selectedJob.location || 'Not specified'}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Deadline:</strong> {new Date(selectedJob.deadline).toLocaleDateString()}
                </p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Review Notes (optional)
                </label>
                <textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Add any notes about this job posting..."
                />
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setSelectedJob(null);
                    setReviewNotes('');
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => markAsReviewed(selectedJob.id, reviewNotes)}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Mark as Reviewed
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}