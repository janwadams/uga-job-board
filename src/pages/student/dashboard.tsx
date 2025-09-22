//student/dashboard.tsx

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import { 
  BookmarkIcon, 
  BellIcon, 
  BriefcaseIcon, 
  ClockIcon,
  SparklesIcon,
  CalendarIcon,
  BuildingOfficeIcon,
  MapPinIcon
} from '@heroicons/react/24/outline';
import { BookmarkIcon as BookmarkSolidIcon } from '@heroicons/react/24/solid';

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
  location?: string;
  salary_range?: string;
  requirements?: string[];
  skills?: string[];
}

interface Application {
  id: string;
  applied_at: string;
  status: 'applied' | 'viewed' | 'rejected' | 'interview' | 'hired';
  job: Job;
}

interface SavedJob {
  id: string;
  saved_at: string;
  job: Job;
  reminder_set: boolean;
  reminder_date?: string;
}

interface StudentProfile {
  id: string;
  interests: string[];
  skills: string[];
  preferred_job_types: string[];
  preferred_industries: string[];
}

type DashboardTab = 'browse' | 'applications' | 'saved' | 'recommended' | 'reminders';

export default function StudentDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<DashboardTab>('browse');
  const [applications, setApplications] = useState<Application[]>([]);
  const [savedJobs, setSavedJobs] = useState<SavedJob[]>([]);
  const [recommendedJobs, setRecommendedJobs] = useState<Job[]>([]);
  const [upcomingDeadlines, setUpcomingDeadlines] = useState<Job[]>([]);
  const [allJobs, setAllJobs] = useState<Job[]>([]);
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);
  const [loadingApplications, setLoadingApplications] = useState(true);
  const [loadingJobs, setLoadingJobs] = useState(true);
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

  // Fetch all data when session is available
  useEffect(() => {
    if (session) {
      fetchApplications();
      fetchAllJobs();
      fetchSavedJobs();
      fetchStudentProfile();
      fetchUpcomingDeadlines();
    }
  }, [session]);

  // Generate recommendations when profile and jobs are loaded
  useEffect(() => {
    if (studentProfile && allJobs.length > 0) {
      generateRecommendations();
    }
  }, [studentProfile, allJobs]);

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
            created_at,
            location,
            salary_range
          )
        `)
        .eq('student_id', session.user.id)
        .order('applied_at', { ascending: false });

      if (error) {
        console.error('Error fetching applications:', error);
      } else if (data) {
        const transformedApplications: Application[] = data.map((item: any) => ({
          id: item.id,
          applied_at: item.applied_at,
          status: item.status,
          job: item.jobs
        }));
        setApplications(transformedApplications);
      }
    } catch (error) {
      console.error('Unexpected error:', error);
    } finally {
      setLoadingApplications(false);
    }
  };

  const fetchAllJobs = async () => {
    setLoadingJobs(true);
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching jobs:', error);
      } else {
        setAllJobs(data || []);
      }
    } catch (error) {
      console.error('Unexpected error:', error);
    } finally {
      setLoadingJobs(false);
    }
  };

  const fetchSavedJobs = async () => {
    if (!session) return;

    try {
      const { data, error } = await supabase
        .from('saved_jobs')
        .select(`
          id,
          saved_at,
          reminder_set,
          reminder_date,
          jobs!saved_jobs_job_id_fkey (
            id,
            title,
            company,
            job_type,
            industry,
            description,
            deadline,
            status,
            created_at,
            location,
            salary_range
          )
        `)
        .eq('student_id', session.user.id)
        .order('saved_at', { ascending: false });

      if (error) {
        console.error('Error fetching saved jobs:', error);
      } else if (data) {
        const transformedSavedJobs: SavedJob[] = data.map((item: any) => ({
          id: item.id,
          saved_at: item.saved_at,
          reminder_set: item.reminder_set,
          reminder_date: item.reminder_date,
          job: item.jobs
        }));
        setSavedJobs(transformedSavedJobs);
      }
    } catch (error) {
      console.error('Unexpected error:', error);
    }
  };

  const fetchStudentProfile = async () => {
    if (!session) return;

    try {
      const { data, error } = await supabase
        .from('student_profiles')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        // If profile doesn't exist, create a default one
        if (error.code === 'PGRST116') {
          createDefaultProfile();
        }
      } else {
        setStudentProfile(data);
      }
    } catch (error) {
      console.error('Unexpected error:', error);
    }
  };

  const createDefaultProfile = async () => {
    if (!session) return;

    const defaultProfile = {
      user_id: session.user.id,
      interests: [],
      skills: [],
      preferred_job_types: [],
      preferred_industries: []
    };

    try {
      const { data, error } = await supabase
        .from('student_profiles')
        .insert(defaultProfile)
        .select()
        .single();

      if (!error && data) {
        setStudentProfile(data);
      }
    } catch (error) {
      console.error('Error creating profile:', error);
    }
  };

  const fetchUpcomingDeadlines = async () => {
    if (!session) return;

    try {
      // Get saved jobs with reminders
      const { data: savedData } = await supabase
        .from('saved_jobs')
        .select(`
          jobs!saved_jobs_job_id_fkey (
            id,
            title,
            company,
            deadline
          )
        `)
        .eq('student_id', session.user.id)
        .eq('reminder_set', true);

      // Get applied jobs
      const { data: appliedData } = await supabase
        .from('job_applications')
        .select(`
          jobs!job_applications_job_id_fkey (
            id,
            title,
            company,
            deadline
          )
        `)
        .eq('student_id', session.user.id);

      // Combine and filter jobs with upcoming deadlines (next 7 days)
      const allDeadlineJobs = [
        ...(savedData?.map(item => item.jobs) || []),
        ...(appliedData?.map(item => item.jobs) || [])
      ];

      const uniqueJobs = Array.from(
        new Map(allDeadlineJobs.map(job => [job.id, job])).values()
      );

      const upcomingJobs = uniqueJobs.filter(job => {
        if (!job.deadline) return false;
        const deadline = new Date(job.deadline);
        const now = new Date();
        const daysUntil = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
        return daysUntil >= 0 && daysUntil <= 7;
      }).sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());

      setUpcomingDeadlines(upcomingJobs);
    } catch (error) {
      console.error('Error fetching deadlines:', error);
    }
  };

  const generateRecommendations = () => {
    if (!studentProfile || !allJobs.length) return;

    // Score each job based on profile match
    const scoredJobs = allJobs.map(job => {
      let score = 0;

      // Check job type preference
      if (studentProfile.preferred_job_types?.includes(job.job_type)) {
        score += 3;
      }

      // Check industry preference
      if (studentProfile.preferred_industries?.includes(job.industry)) {
        score += 3;
      }

      // Check skills match (if job has skills field)
      if (job.skills && studentProfile.skills) {
        const matchingSkills = job.skills.filter(skill => 
          studentProfile.skills.includes(skill)
        );
        score += matchingSkills.length * 2;
      }

      // Check if job aligns with interests
      if (studentProfile.interests) {
        const jobText = `${job.title} ${job.description} ${job.industry}`.toLowerCase();
        studentProfile.interests.forEach(interest => {
          if (jobText.includes(interest.toLowerCase())) {
            score += 1;
          }
        });
      }

      return { ...job, score };
    });

    // Filter out already applied jobs
    const appliedJobIds = applications.map(app => app.job.id);
    const availableJobs = scoredJobs.filter(job => !appliedJobIds.includes(job.id));

    // Sort by score and take top 10
    const recommendations = availableJobs
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .filter(job => job.score > 0); // Only show jobs with some match

    setRecommendedJobs(recommendations);
  };

  const toggleSaveJob = async (jobId: string) => {
    if (!session) return;

    const isCurrentlySaved = savedJobs.some(sj => sj.job.id === jobId);

    if (isCurrentlySaved) {
      // Unsave the job
      try {
        const { error } = await supabase
          .from('saved_jobs')
          .delete()
          .eq('student_id', session.user.id)
          .eq('job_id', jobId);

        if (!error) {
          setSavedJobs(prev => prev.filter(sj => sj.job.id !== jobId));
        }
      } catch (error) {
        console.error('Error unsaving job:', error);
      }
    } else {
      // Save the job
      try {
        const { data, error } = await supabase
          .from('saved_jobs')
          .insert({
            student_id: session.user.id,
            job_id: jobId,
            saved_at: new Date().toISOString(),
            reminder_set: false
          })
          .select(`
            id,
            saved_at,
            reminder_set,
            jobs!saved_jobs_job_id_fkey (*)
          `)
          .single();

        if (!error && data) {
          const newSavedJob: SavedJob = {
            id: data.id,
            saved_at: data.saved_at,
            reminder_set: data.reminder_set,
            job: data.jobs
          };
          setSavedJobs(prev => [newSavedJob, ...prev]);
        }
      } catch (error) {
        console.error('Error saving job:', error);
      }
    }
  };

  const toggleReminder = async (savedJobId: string, jobDeadline: string) => {
    const savedJob = savedJobs.find(sj => sj.id === savedJobId);
    if (!savedJob) return;

    const newReminderStatus = !savedJob.reminder_set;
    const reminderDate = newReminderStatus 
      ? new Date(new Date(jobDeadline).getTime() - 24 * 60 * 60 * 1000).toISOString() // 1 day before deadline
      : null;

    try {
      const { error } = await supabase
        .from('saved_jobs')
        .update({
          reminder_set: newReminderStatus,
          reminder_date: reminderDate
        })
        .eq('id', savedJobId);

      if (!error) {
        setSavedJobs(prev => prev.map(sj => 
          sj.id === savedJobId 
            ? { ...sj, reminder_set: newReminderStatus, reminder_date: reminderDate || undefined }
            : sj
        ));
        
        // Refresh deadlines if reminder was toggled
        fetchUpcomingDeadlines();
      }
    } catch (error) {
      console.error('Error toggling reminder:', error);
    }
  };

  const applyToJob = async (jobId: string) => {
    if (!session) return;

    try {
      const { error } = await supabase
        .from('job_applications')
        .insert({
          student_id: session.user.id,
          job_id: jobId,
          applied_at: new Date().toISOString(),
          status: 'applied'
        });

      if (!error) {
        // Refresh applications
        fetchApplications();
        // Remove from saved if it was saved
        setSavedJobs(prev => prev.filter(sj => sj.job.id !== jobId));
      }
    } catch (error) {
      console.error('Error applying to job:', error);
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

  const getDaysUntilDeadline = (deadline: string) => {
    const deadlineDate = new Date(deadline);
    const today = new Date();
    const daysUntil = Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntil;
  };

  const isJobSaved = (jobId: string) => {
    return savedJobs.some(sj => sj.job.id === jobId);
  };

  const JobCard = ({ job, showApplyButton = true, showSaveButton = true, savedJobId = null }: { 
    job: Job, 
    showApplyButton?: boolean, 
    showSaveButton?: boolean,
    savedJobId?: string | null 
  }) => {
    const isSaved = isJobSaved(job.id);
    const savedJob = savedJobs.find(sj => sj.job.id === job.id);
    const daysUntil = job.deadline ? getDaysUntilDeadline(job.deadline) : null;

    return (
      <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">{job.title}</h3>
            <p className="text-gray-600 flex items-center gap-2 mt-1">
              <BuildingOfficeIcon className="h-4 w-4" />
              {job.company}
            </p>
            {job.location && (
              <p className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                <MapPinIcon className="h-4 w-4" />
                {job.location}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
              {job.job_type}
            </span>
            {showSaveButton && (
              <button
                onClick={() => toggleSaveJob(job.id)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                title={isSaved ? "Unsave job" : "Save job"}
              >
                {isSaved ? (
                  <BookmarkSolidIcon className="h-5 w-5 text-blue-600" />
                ) : (
                  <BookmarkIcon className="h-5 w-5 text-gray-400" />
                )}
              </button>
            )}
          </div>
        </div>

        <p className="text-gray-700 mb-4 line-clamp-2">{job.description}</p>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <BriefcaseIcon className="h-4 w-4" />
              {job.industry}
            </span>
            {job.deadline && (
              <span className={`flex items-center gap-1 ${daysUntil && daysUntil <= 3 ? 'text-red-600 font-medium' : ''}`}>
                <CalendarIcon className="h-4 w-4" />
                {daysUntil !== null && (
                  daysUntil === 0 ? 'Due today' :
                  daysUntil === 1 ? 'Due tomorrow' :
                  daysUntil < 0 ? 'Expired' :
                  `${daysUntil} days left`
                )}
              </span>
            )}
          </div>

          <div className="flex gap-2">
            {savedJob && job.deadline && (
              <button
                onClick={() => toggleReminder(savedJob.id, job.deadline)}
                className={`p-2 rounded-full transition-colors ${
                  savedJob.reminder_set 
                    ? 'bg-yellow-100 text-yellow-600' 
                    : 'hover:bg-gray-100 text-gray-400'
                }`}
                title={savedJob.reminder_set ? "Reminder set" : "Set reminder"}
              >
                <BellIcon className="h-4 w-4" />
              </button>
            )}
            {showApplyButton && (
              <button
                onClick={() => applyToJob(job.id)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                Apply Now
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Student Dashboard</h1>
          <p className="text-gray-600 mt-2">Find your perfect opportunity</p>
        </div>

        {/* Upcoming Deadlines Alert */}
        {upcomingDeadlines.length > 0 && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <ClockIcon className="h-5 w-5 text-yellow-600" />
              <h3 className="font-semibold text-yellow-900">Upcoming Deadlines</h3>
            </div>
            <div className="space-y-2">
              {upcomingDeadlines.slice(0, 3).map(job => (
                <div key={job.id} className="flex justify-between items-center text-sm">
                  <span className="text-gray-700">{job.title} at {job.company}</span>
                  <span className="text-yellow-600 font-medium">
                    {getDaysUntilDeadline(job.deadline)} days left
                  </span>
                </div>
              ))}
            </div>
            {upcomingDeadlines.length > 3 && (
              <button
                onClick={() => setActiveTab('reminders')}
                className="text-sm text-yellow-600 hover:text-yellow-700 mt-2"
              >
                View all {upcomingDeadlines.length} deadlines →
              </button>
            )}
          </div>
        )}
        
        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8 overflow-x-auto">
            <button
              onClick={() => setActiveTab('browse')}
              className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'browse'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span className="flex items-center gap-2">
                <BriefcaseIcon className="h-4 w-4" />
                Browse Jobs
              </span>
            </button>
            <button
              onClick={() => setActiveTab('recommended')}
              className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'recommended'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span className="flex items-center gap-2">
                <SparklesIcon className="h-4 w-4" />
                Recommended ({recommendedJobs.length})
              </span>
            </button>
            <button
              onClick={() => setActiveTab('saved')}
              className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'saved'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span className="flex items-center gap-2">
                <BookmarkIcon className="h-4 w-4" />
                Saved ({savedJobs.length})
              </span>
            </button>
            <button
              onClick={() => setActiveTab('applications')}
              className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'applications'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              My Applications ({applications.length})
            </button>
            <button
              onClick={() => setActiveTab('reminders')}
              className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'reminders'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span className="flex items-center gap-2">
                <BellIcon className="h-4 w-4" />
                Deadlines ({upcomingDeadlines.length})
              </span>
            </button>
          </nav>
        </div>

        {/* Browse Jobs Tab */}
        {activeTab === 'browse' && (
          <div>
            {loadingJobs ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                <p className="mt-2 text-gray-600">Loading jobs...</p>
              </div>
            ) : allJobs.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-600">No jobs available at the moment.</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {allJobs.map(job => (
                  <JobCard key={job.id} job={job} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Recommended Jobs Tab */}
        {activeTab === 'recommended' && (
          <div>
            {!studentProfile || (!studentProfile.interests?.length && !studentProfile.preferred_job_types?.length) ? (
              <div className="text-center py-12">
                <SparklesIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">Complete your profile to get personalized job recommendations</p>
                <Link href="/student/profile">
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                    Complete Profile
                  </button>
                </Link>
              </div>
            ) : recommendedJobs.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-600">No recommendations available yet. Try updating your profile interests.</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {recommendedJobs.map(job => (
                  <JobCard key={job.id} job={job} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Saved Jobs Tab */}
        {activeTab === 'saved' && (
          <div>
            {savedJobs.length === 0 ? (
              <div className="text-center py-12">
                <BookmarkIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">You haven't saved any jobs yet.</p>
                <button
                  onClick={() => setActiveTab('browse')}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Browse Jobs
                </button>
              </div>
            ) : (
              <div className="grid gap-4">
                {savedJobs.map(savedJob => (
                  <JobCard 
                    key={savedJob.id} 
                    job={savedJob.job} 
                    savedJobId={savedJob.id}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Applications Tab */}
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
                        <p className="text-gray-600 flex items-center gap-2 mt-1">
                          <BuildingOfficeIcon className="h-4 w-4" />
                          {application.job.company}
                        </p>
                        {application.job.location && (
                          <p className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                            <MapPinIcon className="h-4 w-4" />
                            {application.job.location}
                          </p>
                        )}
                        <p className="text-sm text-gray-500 mt-2">
                          Applied on {new Date(application.applied_at).toLocaleDateString()}
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(application.status)}`}>
                        {getStatusText(application.status)}
                      </span>
                    </div>
                    
                    <p className="text-gray-700 mt-4 line-clamp-2">{application.job.description}</p>
                    
                    <div className="flex items-center gap-4 mt-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <BriefcaseIcon className="h-4 w-4" />
                        {application.job.industry}
                      </span>
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                        {application.job.job_type}
                      </span>
                      {application.job.deadline && (
                        <span className="flex items-center gap-1">
                          <CalendarIcon className="h-4 w-4" />
                          Deadline: {new Date(application.job.deadline).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Reminders/Deadlines Tab */}
        {activeTab === 'reminders' && (
          <div>
            {upcomingDeadlines.length === 0 ? (
              <div className="text-center py-12">
                <BellIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No upcoming deadlines in the next 7 days.</p>
                <p className="text-sm text-gray-500 mt-2">
                  Save jobs and set reminders to track important deadlines.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-white rounded-lg shadow p-4">
                  <h3 className="font-semibold text-gray-900 mb-4">Deadlines in the Next 7 Days</h3>
                  <div className="space-y-3">
                    {upcomingDeadlines.map(job => {
                      const daysLeft = getDaysUntilDeadline(job.deadline);
                      const isUrgent = daysLeft <= 2;
                      
                      return (
                        <div 
                          key={job.id} 
                          className={`flex justify-between items-center p-3 rounded-lg ${
                            isUrgent ? 'bg-red-50 border border-red-200' : 'bg-gray-50'
                          }`}
                        >
                          <div>
                            <h4 className="font-medium text-gray-900">{job.title}</h4>
                            <p className="text-sm text-gray-600">{job.company}</p>
                          </div>
                          <div className="text-right">
                            <p className={`font-semibold ${isUrgent ? 'text-red-600' : 'text-yellow-600'}`}>
                              {daysLeft === 0 ? 'Due Today!' :
                               daysLeft === 1 ? 'Due Tomorrow!' :
                               `${daysLeft} days left`}
                            </p>
                            <p className="text-xs text-gray-500">
                              {new Date(job.deadline).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    💡 <strong>Tip:</strong> Set reminders for saved jobs to never miss a deadline. 
                    We'll notify you 24 hours before each deadline.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}