// pages/admin/content-review.tsx - improved weekly review system with dropdown filter

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
  FlagIcon,
  ChevronDownIcon
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
  const [filterType, setFilterType] = useState<'all' | 'needs_review' | 'never' | 'recent'>('needs_review');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  
  // check if user is admin when page loads
  useEffect(() => {
    checkAuth();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showFilterDropdown && !(event.target as HTMLElement).closest('.filter-dropdown')) {
        setShowFilterDropdown(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showFilterDropdown]);

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
    if (!lastReviewed) return -1; // never reviewed (using -1 instead of 999 for cleaner logic)
    const reviewDate = new Date(lastReviewed);
    const today = new Date();
    const diffTime = today.getTime() - reviewDate.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  };

  // get color based on review status
  const getReviewStatusColor = (daysSince: number) => {
    if (daysSince === -1) return 'text-red-600 bg-red-50'; // never reviewed
    if (daysSince > 14) return 'text-red-600 bg-red-50';   // very overdue
    if (daysSince > 7) return 'text-yellow-600 bg-yellow-50'; // overdue
    return 'text-green-600 bg-green-50'; // recently reviewed
  };

  // get label for review status
  const getReviewStatusLabel = (daysSince: number) => {
    if (daysSince === -1) return 'Never Reviewed';
    if (daysSince === 0) return 'Reviewed Today';
    if (daysSince === 1) return 'Reviewed Yesterday';
    return `Reviewed ${daysSince} days ago`;
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

  // filter jobs based on review status - SIMPLIFIED LOGIC
  const filteredJobs = jobs.filter(job => {
    const daysSince = getDaysSinceReview(job.last_reviewed);
    
    switch (filterType) {
      case 'needs_review':
        // Jobs that need review: never reviewed OR overdue (>7 days)
        return daysSince === -1 || daysSince > 7;
      case 'never':
        // Only jobs that have NEVER been reviewed
        return daysSince === -1;
      case 'recent':
        // Jobs reviewed in the last 7 days
        return daysSince >= 0 && daysSince <= 7;
      case 'all':
      default:
        return true;
    }
  });

  // Get filter label and count
  const getFilterLabel = () => {
    const counts = {
      all: jobs.length,
      needs_review: jobs.filter(j => {
        const days = getDaysSinceReview(j.last_reviewed);
        return days === -1 || days > 7;
      }).length,
      never: jobs.filter(j => getDaysSinceReview(j.last_reviewed) === -1).length,
      recent: jobs.filter(j => {
        const days = getDaysSinceReview(j.last_reviewed);
        return days >= 0 && days <= 7;
      }).length,
    };

    const labels = {
      all: 'All Active Jobs',
      needs_review: 'Needs Review',
      never: 'Never Reviewed',
      recent: 'Recently Reviewed'
    };

    return `${labels[filterType]} (${counts[filterType]})`;
  };

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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/admin/dashboard">
            <button className="text-gray-600 hover:text-gray-900 mb-4 flex items-center">
              ← Back to Admin Dashboard
            </button>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Content Review Dashboard</h1>
          <p className="text-gray-600 mt-2">Review job postings for quality and compliance</p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="flex items-center">
              <DocumentMagnifyingGlassIcon className="h-8 sm:h-10 w-8 sm:w-10 text-blue-500 mr-3" />
              <div>
                <p className="text-xl sm:text-2xl font-bold">{jobs.length}</p>
                <p className="text-gray-600 text-xs sm:text-sm">Total Active</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="flex items-center">
              <ExclamationTriangleIcon className="h-8 sm:h-10 w-8 sm:w-10 text-red-500 mr-3" />
              <div>
                <p className="text-xl sm:text-2xl font-bold">
                  {jobs.filter(j => getDaysSinceReview(j.last_reviewed) === -1).length}
                </p>
                <p className="text-gray-600 text-xs sm:text-sm">Never Reviewed</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="flex items-center">
              <ClockIcon className="h-8 sm:h-10 w-8 sm:w-10 text-yellow-500 mr-3" />
              <div>
                <p className="text-xl sm:text-2xl font-bold">
                  {jobs.filter(j => {
                    const days = getDaysSinceReview(j.last_reviewed);
                    return days === -1 || days > 7;
                  }).length}
                </p>
                <p className="text-gray-600 text-xs sm:text-sm">Needs Review</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="flex items-center">
              <CheckCircleIcon className="h-8 sm:h-10 w-8 sm:w-10 text-green-500 mr-3" />
              <div>
                <p className="text-xl sm:text-2xl font-bold">
                  {jobs.filter(j => {
                    const days = getDaysSinceReview(j.last_reviewed);
                    return days >= 0 && days <= 7;
                  }).length}
                </p>
                <p className="text-gray-600 text-xs sm:text-sm">Recently Reviewed</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Dropdown - Better for Mobile */}
        <div className="bg-white rounded-lg shadow mb-6 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h2 className="text-lg font-semibold text-gray-900">Job Listings</h2>
            
            <div className="relative filter-dropdown">
              <button
                onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                className="w-full sm:w-auto px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center justify-between gap-2"
              >
                <span>{getFilterLabel()}</span>
                <ChevronDownIcon className={`h-4 w-4 transition-transform ${showFilterDropdown ? 'rotate-180' : ''}`} />
              </button>
              
              {showFilterDropdown && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                  <button
                    onClick={() => { setFilterType('all'); setShowFilterDropdown(false); }}
                    className={`w-full text-left px-4 py-2 hover:bg-gray-100 ${filterType === 'all' ? 'bg-blue-50 text-blue-600' : 'text-gray-700'}`}
                  >
                    All Active Jobs ({jobs.length})
                  </button>
                  <button
                    onClick={() => { setFilterType('needs_review'); setShowFilterDropdown(false); }}
                    className={`w-full text-left px-4 py-2 hover:bg-gray-100 ${filterType === 'needs_review' ? 'bg-blue-50 text-blue-600' : 'text-gray-700'}`}
                  >
                    Needs Review ({jobs.filter(j => {
                      const days = getDaysSinceReview(j.last_reviewed);
                      return days === -1 || days > 7;
                    }).length})
                  </button>
                  <button
                    onClick={() => { setFilterType('never'); setShowFilterDropdown(false); }}
                    className={`w-full text-left px-4 py-2 hover:bg-gray-100 ${filterType === 'never' ? 'bg-blue-50 text-blue-600' : 'text-gray-700'}`}
                  >
                    Never Reviewed ({jobs.filter(j => getDaysSinceReview(j.last_reviewed) === -1).length})
                  </button>
                  <button
                    onClick={() => { setFilterType('recent'); setShowFilterDropdown(false); }}
                    className={`w-full text-left px-4 py-2 hover:bg-gray-100 ${filterType === 'recent' ? 'bg-blue-50 text-blue-600' : 'text-gray-700'}`}
                  >
                    Recently Reviewed ({jobs.filter(j => {
                      const days = getDaysSinceReview(j.last_reviewed);
                      return days >= 0 && days <= 7;
                    }).length})
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* List of jobs to review */}
        <div className="bg-white rounded-lg shadow">
          {filteredJobs.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircleIcon className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <p className="text-gray-600">
                {filterType === 'needs_review' ? 'All jobs have been reviewed recently!' :
                 filterType === 'never' ? 'No jobs waiting for initial review!' :
                 filterType === 'recent' ? 'No recently reviewed jobs.' :
                 'No jobs found for this filter.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredJobs.map(job => {
                const daysSince = getDaysSinceReview(job.last_reviewed);
                const flags = getContentFlags(job);
                
                return (
                  <div key={job.id} className="p-4 sm:p-6 hover:bg-gray-50">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">{job.title}</h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getReviewStatusColor(daysSince)}`}>
                            {getReviewStatusLabel(daysSince)}
                          </span>
                        </div>
                        
                        <p className="text-gray-600 mb-2">
                          {job.company} • {job.job_type} • {job.location || 'No location'}
                        </p>
                        
                        <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-3">
                          <span className="flex items-center gap-1">
                            <CalendarDaysIcon className="h-4 w-4" />
                            Deadline: {new Date(job.deadline).toLocaleDateString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <ClockIcon className="h-4 w-4" />
                            Posted: {new Date(job.created_at).toLocaleDateString()}
                          </span>
                        </div>

                        {/* Show any issues found */}
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

                        {/* Show previous review notes if any */}
                        {job.review_notes && (
                          <div className="mt-2 p-2 bg-gray-50 rounded text-sm text-gray-600">
                            <strong>Last Review Notes:</strong> {job.review_notes}
                          </div>
                        )}
                      </div>

                      {/* Action buttons - stack on mobile */}
                      <div className="flex sm:flex-col gap-2">
                        <button
                          onClick={() => {
                            setSelectedJob(job);
                            setReviewNotes(job.review_notes || '');
                          }}
                          className="flex-1 sm:flex-initial px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                        >
                          Review
                        </button>
                        <Link href={`/admin/view/${job.id}`} className="flex-1 sm:flex-initial">
                          <button className="w-full px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700">
                            View
                          </button>
                        </Link>
                        {flags.some(f => f.type === 'error') && (
                          <button
                            onClick={() => removeJob(job.id)}
                            className="flex-1 sm:flex-initial px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
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

        {/* Review modal popup */}
        {selectedJob && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
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

              <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
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