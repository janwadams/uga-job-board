// pages/jobs/[id].tsx - Enhanced version with all fields and fixed overflow
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Job {
  id: string;
  title: string;
  company: string;
  description: string;
  job_type: string;
  industry: string;
  skills: string[];
  requirements: string[] | null;
  location: string;
  salary_range: string | null;
  deadline: string;
  apply_method: string;
  created_at: string;
  updated_at: string;
  status: string;
}

export default function JobDetails() {
  const router = useRouter();
  const { id } = router.query;
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [backHref, setBackHref] = useState('/');
  const [hasApplied, setHasApplied] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    if (!id) return;

    const checkUserAndSetBackLink = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id)
          .single();
        
        if (roleData?.role === 'student') {
          setBackHref('/student/dashboard');
          
          // Check if already applied
          const { data: applicationData } = await supabase
            .from('job_applications')
            .select('id')
            .eq('job_id', id)
            .eq('student_id', session.user.id)
            .single();
          
          setHasApplied(!!applicationData);
        }
      }
    };

    const fetchJob = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', id)
        .eq('status', 'active') // Only show active jobs
        .single();

      if (error) {
        console.error('Error fetching job:', error.message);
      } else {
        setJob(data);
      }
      setLoading(false);
    };

    checkUserAndSetBackLink();
    fetchJob();
  }, [id]);

  const handleApply = async () => {
    if (!user) {
      router.push('/login?redirect=' + router.asPath);
      return;
    }

    setIsApplying(true);

    // Track application in database
    const { error } = await supabase
      .from('job_applications')
      .insert([{
        job_id: job?.id,
        student_id: user.id,
        status: 'applied'
      }]);

    if (!error) {
      setHasApplied(true);
    }

    // Handle different application methods
    if (job?.apply_method.startsWith('http')) {
      window.open(job.apply_method, '_blank');
    } else if (job?.apply_method.includes('@')) {
      window.location.href = `mailto:${job.apply_method}?subject=Application for ${job.title} position`;
    }

    setIsApplying(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getDaysUntilDeadline = (deadline: string) => {
    const today = new Date();
    const deadlineDate = new Date(deadline);
    const diffTime = deadlineDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-700 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading job details...</p>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Job not found or no longer available</p>
          <Link href={backHref}>
            <span className="text-red-700 underline hover:text-red-900 cursor-pointer">
              ← Back to Jobs
            </span>
          </Link>
        </div>
      </div>
    );
  }

  const daysUntilDeadline = getDaysUntilDeadline(job.deadline);
  const isDeadlineSoon = daysUntilDeadline <= 7 && daysUntilDeadline > 0;
  const isExpired = daysUntilDeadline < 0;

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Back button */}
        <Link href={backHref}>
          <span className="text-red-700 hover:text-red-900 font-medium inline-flex items-center cursor-pointer mb-6">
            ← Back to Jobs
          </span>
        </Link>

        {/* Main job card */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Header Section */}
          <div className="bg-gradient-to-r from-red-700 to-red-600 text-white px-8 py-6">
            <h1 className="text-3xl font-bold mb-2">{job.title}</h1>
            <p className="text-xl opacity-95 mb-4">{job.company}</p>
            
            {/* Key Info Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="opacity-75">Location</span>
                <p className="font-semibold">{job.location}</p>
              </div>
              <div>
                <span className="opacity-75">Job Type</span>
                <p className="font-semibold">{job.job_type}</p>
              </div>
              <div>
                <span className="opacity-75">Industry</span>
                <p className="font-semibold">{job.industry}</p>
              </div>
              {job.salary_range && (
                <div>
                  <span className="opacity-75">Salary Range</span>
                  <p className="font-semibold">{job.salary_range}</p>
                </div>
              )}
            </div>
          </div>

          {/* Deadline Alert */}
          {!isExpired ? (
            <div className={`px-8 py-4 ${isDeadlineSoon ? 'bg-yellow-50 border-b-2 border-yellow-200' : 'bg-gray-50 border-b'}`}>
              <p className={`text-sm font-medium ${isDeadlineSoon ? 'text-yellow-800' : 'text-gray-600'}`}>
                {isDeadlineSoon && '⚠️ '}
                Application deadline: {formatDate(job.deadline)}
                {' '}({daysUntilDeadline} {daysUntilDeadline === 1 ? 'day' : 'days'} remaining)
              </p>
            </div>
          ) : (
            <div className="px-8 py-4 bg-red-50 border-b-2 border-red-200">
              <p className="text-sm font-semibold text-red-800">
                ❌ This position is no longer accepting applications (Deadline was {formatDate(job.deadline)})
              </p>
            </div>
          )}

          {/* Apply Section */}
          <div className="px-8 py-6 bg-gray-50 border-b">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                {hasApplied && (
                  <p className="text-green-700 font-semibold text-lg">
                    ✅ You have applied to this position
                  </p>
                )}
                {!user && !hasApplied && (
                  <p className="text-gray-600">
                    <Link href="/login">
                      <span className="text-red-700 underline cursor-pointer">Sign in</span>
                    </Link>
                    {' '}to apply for this position
                  </p>
                )}
              </div>
              
              <button
                onClick={handleApply}
                disabled={isExpired || hasApplied || isApplying}
                className={`px-8 py-3 rounded-lg font-semibold text-lg transition-all ${
                  isExpired || hasApplied
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-red-700 text-white hover:bg-red-800 hover:shadow-md'
                }`}
              >
                {isApplying ? 'Processing...' :
                 hasApplied ? 'Already Applied' :
                 isExpired ? 'Position Closed' :
                 job.apply_method.startsWith('http') ? 'Apply on Company Site →' :
                 job.apply_method.includes('@') ? 'Apply via Email →' :
                 'Apply Now'}
              </button>
            </div>
          </div>

          {/* Job Details Content */}
          <div className="px-8 py-6">
            {/* Description Section */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 pb-2 border-b">
                Job Description
              </h2>
              <div className="prose max-w-none text-gray-700">
                <p className="whitespace-pre-wrap break-words">
                  {job.description}
                </p>
              </div>
            </section>

            {/* Requirements Section */}
            {job.requirements && job.requirements.length > 0 && (
              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 pb-2 border-b">
                  Requirements
                </h2>
                <ul className="space-y-2">
                  {job.requirements.map((req, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-red-600 mr-2 mt-1">•</span>
                      <span className="text-gray-700">{req}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Skills Section */}
            {job.skills && job.skills.length > 0 && (
              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 pb-2 border-b">
                  Required Skills
                </h2>
                <div className="flex flex-wrap gap-2">
                  {job.skills.map((skill, index) => (
                    <span
                      key={index}
                      className="px-4 py-2 bg-red-50 text-red-700 rounded-full text-sm font-medium border border-red-200"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* Application Method Section */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 pb-2 border-b">
                How to Apply
              </h2>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-700">
                  {job.apply_method.startsWith('http') ? (
                    <>
                      <span className="font-medium">Apply directly on the company website:</span>
                      <br />
                      <a 
                        href={job.apply_method} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-red-700 underline hover:text-red-900 break-all"
                      >
                        {job.apply_method}
                      </a>
                    </>
                  ) : job.apply_method.includes('@') ? (
                    <>
                      <span className="font-medium">Send your application to:</span>
                      <br />
                      <a 
                        href={`mailto:${job.apply_method}`}
                        className="text-red-700 underline hover:text-red-900"
                      >
                        {job.apply_method}
                      </a>
                    </>
                  ) : (
                    <>
                      <span className="font-medium">Application Instructions:</span>
                      <br />
                      {job.apply_method}
                    </>
                  )}
                </p>
              </div>
            </section>

            {/* Additional Information */}
            <section className="border-t pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                <div>
                  <span className="font-medium text-gray-700">Posted:</span> {formatDate(job.created_at)}
                </div>
                {job.updated_at !== job.created_at && (
                  <div>
                    <span className="font-medium text-gray-700">Last Updated:</span> {formatDate(job.updated_at)}
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            <span>🖨️</span> Print
          </button>
          <button
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              alert('Job link copied to clipboard!');
            }}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            <span>🔗</span> Share Link
          </button>
          <button
            onClick={() => {
              // You can implement a save/bookmark feature here
              alert('Bookmark feature coming soon!');
            }}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            <span>🔖</span> Save Job
          </button>
        </div>
      </div>
    </div>
  );
}