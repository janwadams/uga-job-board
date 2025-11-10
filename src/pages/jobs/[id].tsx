// pages/jobs/[id].tsx - updated to require authentication and track link clicks
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

// initialize supabase client
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
  
  status: string;
}

export default function JobDetails() {
  const router = useRouter();
  const { id } = router.query;
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [backHref, setBackHref] = useState('/');
  
  // disabled: no longer tracking applications internally
  // const [hasApplied, setHasApplied] = useState(false);
  // const [isApplying, setIsApplying] = useState(false);
  
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    if (!id) return;

    const checkUserAndFetchJob = async () => {
      // first check if user is authenticated
      const { data: { session } } = await supabase.auth.getSession();
      
      // if no session, redirect to login page with return url
      if (!session?.user) {
        // user must be logged in to view job details
        router.push(`/login?redirect=/jobs/${id}`);
        return;
      }
      
      // user is logged in, set user data
      setUser(session.user);
      
      // check user role to set appropriate back link
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .single();
      
      if (roleData?.role === 'student') {
        setBackHref('/student/dashboard');
        
        // disabled: no longer checking if student has applied
        // const { data: applicationData } = await supabase
        //   .from('job_applications')
        //   .select('id')
        //   .eq('job_id', id)
        //   .eq('student_id', session.user.id)
        //   .single();
        // 
        // setHasApplied(!!applicationData);
      }

      // now fetch the job details since user is authenticated
      setLoading(true);
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', id)
        .eq('status', 'active') // only show active jobs
        .single();

      if (error) {
        console.error('Error fetching job:', error.message);
      } else {
        setJob(data);
      }
      setLoading(false);
    };

    checkUserAndFetchJob();
  }, [id, router]);

  // track when a student views this job posting
  // this helps faculty see how many students looked at their job
  useEffect(() => {
    const trackJobView = async () => {
      // only track if we have both job id and a logged-in user
      if (!id || !user?.id) return;
      
      try {
        console.log('tracking view for job:', id);
        
        // save a record that this user viewed this job
        const { data, error } = await supabase
          .from('job_views')
          .insert({
            job_id: id as string,
            user_id: user.id
          });
      
        if (error) {
          // if tracking fails, don't break the page - just log it
          console.error('error tracking job view:', error);
        } else {
          console.log('successfully tracked job view');
        }
      } catch (err) {
        console.error('exception tracking job view:', err);
      }
    };
    
    // run tracking when we have both id and user
    if (id && user) {
      trackJobView();
    }
  }, [id, user]);

  // track when someone clicks the company application link
  // this calls our api route instead of directly inserting into the database
  // the api route uses the service role key so it bypasses rls policies
  const trackLinkClick = async (jobId: string) => {
    if (!user) return;
    
    try {
      // get the current session token to authenticate the api request
      const { data: { session } } = await supabase.auth.getSession();
      
      // call our api route to track the click
      const response = await fetch('/api/jobs/track-click', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          job_id: jobId
        })
      });

      if (!response.ok) {
        console.error('failed to track click');
      } else {
        console.log('tracked link click for job:', jobId);
      }
    } catch (error) {
      console.error('error tracking link click:', error);
      // don't break the link functionality if tracking fails
    }
  };

  // disabled: no longer handling applications internally
  // const handleApply = async () => {
  //   if (!user) {
  //     router.push('/login?redirect=' + router.asPath);
  //     return;
  //   }
  //
  //   setIsApplying(true);
  //
  //   // track application in database
  //   const { error } = await supabase
  //     .from('job_applications')
  //     .insert([{
  //       job_id: job?.id,
  //       student_id: user.id,
  //       status: 'applied'
  //     }]);
  //
  //   if (!error) {
  //     setHasApplied(true);
  //   }
  //
  //   // handle different application methods
  //   if (job?.apply_method.startsWith('http')) {
  //     window.open(job.apply_method, '_blank');
  //   } else if (job?.apply_method.includes('@')) {
  //     window.location.href = `mailto:${job.apply_method}?subject=Application for ${job.title} position`;
  //   }
  //
  //   setIsApplying(false);
  // };

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
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Job Not Found</h1>
          <p className="text-gray-600 mb-6">The job posting you're looking for doesn't exist or has been removed.</p>
          <Link href={backHref}>
            <span className="text-red-700 hover:text-red-800 underline cursor-pointer">
              ← Back to Dashboard
            </span>
          </Link>
        </div>
      </div>
    );
  }

  const isExpired = new Date(job.deadline) < new Date();
  const daysUntilDeadline = getDaysUntilDeadline(job.deadline);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* back button */}
        <div className="mb-6">
          <Link href={backHref}>
            <span className="text-red-700 hover:text-red-800 font-medium cursor-pointer inline-flex items-center">
              ← Back to Dashboard
            </span>
          </Link>
        </div>

        {/* job card */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
          {/* header */}
          <div className="px-8 py-6 border-b bg-gradient-to-r from-red-50 to-white">
            <h1 className="text-3xl font-bold text-gray-900 mb-3">{job.title}</h1>
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-gray-600 mb-4">
              <div className="flex items-center">
                <span className="font-medium mr-2">🏢</span>
                <span className="font-semibold text-gray-900">{job.company}</span>
              </div>
              <div className="flex items-center">
                <span className="font-medium mr-2">📍</span>
                <span>{job.location || 'Remote/Not Specified'}</span>
              </div>
              <div className="flex items-center">
                <span className="font-medium mr-2">💼</span>
                <span className="capitalize">{job.job_type?.replace('_', ' ')}</span>
              </div>
              <div className="flex items-center">
                <span className="font-medium mr-2">🏭</span>
                <span className="capitalize">{job.industry?.replace('_', ' ')}</span>
              </div>
              {job.salary_range && (
                <div className="flex items-center">
                  <span className="font-medium mr-2">💰</span>
                  <span>{job.salary_range}</span>
                </div>
              )}
            </div>
          </div>

          {/* deadline banner */}
          {!isExpired ? (
            <div className="px-8 py-4 bg-green-50 border-b-2 border-green-200">
              <p className="text-sm font-semibold text-green-800">
                ⏰ Active Position - 
                Application deadline: {formatDate(job.deadline)}
                {' '}({daysUntilDeadline} {daysUntilDeadline === 1 ? 'day' : 'days'} remaining)
              </p>
            </div>
          ) : (
            <div className="px-8 py-4 bg-red-50 border-b-2 border-red-200">
              <p className="text-sm font-semibold text-red-800">
                ⌛ This position is no longer accepting applications (Deadline was {formatDate(job.deadline)})
              </p>
            </div>
          )}

          {/* disabled: removed internal apply section */}
          {/* original apply section code preserved below */}
          {/*
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
          */}

          {/* job details content */}
          <div className="px-8 py-6">
            {/* description section */}
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

            {/* requirements section */}
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

            {/* skills section */}
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

            {/* application method section - now always visible for authenticated users */}
            {/* this section shows the external application link */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 pb-2 border-b">
                How to Apply
              </h2>
              {!isExpired ? (
                <div className="bg-blue-50 border border-blue-200 p-6 rounded-lg">
                  <p className="text-gray-700">
                    {job.apply_method.startsWith('http') ? (
                      <>
                        <span className="font-medium block mb-3">Click the link below to apply directly on the company website:</span>
                        <a 
                          href={job.apply_method} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          onClick={() => trackLinkClick(job.id)}
                          className="inline-block px-6 py-3 bg-uga-red text-white rounded-lg hover:bg-red-800 font-medium transition-colors"
                        >
                          Apply on Company Website →
                        </a>
                        <br />
                        <span className="text-sm text-gray-600 mt-3 block">
                          You will be redirected to: {job.apply_method}
                        </span>
                      </>
                    ) : job.apply_method.includes('@') ? (
                      <>
                        <span className="font-medium block mb-3">Send your application via email:</span>
                        <a 
                          href={`mailto:${job.apply_method}?subject=Application for ${job.title} position at ${job.company}`}
                          onClick={() => trackLinkClick(job.id)}
                          className="inline-block px-6 py-3 bg-uga-red text-white rounded-lg hover:bg-red-800 font-medium transition-colors"
                        >
                          Send Application Email →
                        </a>
                        <br />
                        <span className="text-sm text-gray-600 mt-3 block">
                          Email will be sent to: {job.apply_method}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="font-medium block mb-2">Application Instructions:</span>
                        <p className="text-gray-700 bg-white p-4 rounded border border-gray-200">
                          {job.apply_method}
                        </p>
                      </>
                    )}
                  </p>
                </div>
              ) : (
                <div className="bg-gray-100 p-6 rounded-lg">
                  <p className="text-gray-600">
                    This position is no longer accepting applications as the deadline has passed.
                  </p>
                </div>
              )}
            </section>

            {/* additional information */}
            <section className="border-t pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                <div>
                  <span className="font-medium text-gray-700">Posted:</span> {formatDate(job.created_at)}
                </div>
                
              </div>
            </section>
          </div>
        </div>

        {/* action buttons */}
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
          
          {/* disabled: bookmark feature */}
          {/*
          <button
            onClick={() => {
              // you can implement a save/bookmark feature here
              alert('Bookmark feature coming soon!');
            }}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            <span>🔖</span> Save Job
          </button>
          */}
        </div>
      </div>
    </div>
  );
}
