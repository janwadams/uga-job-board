// pages/student/dashboard.tsx - updated to remove all application functionality
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
  MapPinIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  Squares2X2Icon,
  ListBulletIcon,
  XMarkIcon,
  ChevronRightIcon,
  CheckCircleIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';
import { BookmarkIcon as BookmarkSolidIcon } from '@heroicons/react/24/solid';

// disabled: quick apply modal no longer needed
// import QuickApplyModal from '../../components/QuickApplyModal';

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

// changed tabs - merged browse and recommended into "for you"
type DashboardTab = 'for-you' | 'all-jobs' | 'saved' | 'applications' | 'deadlines';
type ViewMode = 'cards' | 'list' | 'split';

// deadline calendar widget component - handles the clickable calendar functionality  
interface DeadlineCalendarWidgetProps {
  upcomingDeadlines: Job[];
  getDaysUntilDeadline: (deadline: string) => number;
}

function DeadlineCalendarWidget({ 
  upcomingDeadlines, 
  getDaysUntilDeadline 
}: DeadlineCalendarWidgetProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  
  // filter deadlines based on selected date
  const filteredDeadlines = selectedDate 
    ? upcomingDeadlines.filter(job => {
        const deadline = new Date(job.deadline);
        return deadline.toDateString() === selectedDate.toDateString();
      })
    : upcomingDeadlines;

  // generate calendar days for the next 30 days
  const generateCalendarDays = () => {
    const days = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // start from sunday of the current week
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - today.getDay());
    
    // generate 5 weeks (35 days) to show a full month view
    for (let i = 0; i < 35; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      days.push(date);
    }
    
    return days;
  };

  const calendarDays = generateCalendarDays();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <>
      {/* calendar widget with clickable dates */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-gray-900">Deadline Calendar</h3>
          {selectedDate && (
            <button
              onClick={() => setSelectedDate(null)}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              Clear filter
            </button>
          )}
        </div>
        
        <div className="grid grid-cols-7 gap-1 text-center">
          {/* day headers */}
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-xs font-medium text-gray-500 py-2">
              {day}
            </div>
          ))}
          
          {/* calendar days - now clickable when they have deadlines */}
          {calendarDays.map((date, index) => {
            const hasDeadline = upcomingDeadlines.some(job => {
              const deadline = new Date(job.deadline);
              return deadline.toDateString() === date.toDateString();
            });
            
            const isToday = date.toDateString() === today.toDateString();
            const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString();
            const isPastDate = date < today;
            const isFutureMonth = date.getMonth() !== today.getMonth() && date > today;
            
            // count how many deadlines are on this date
            const deadlineCount = upcomingDeadlines.filter(job => {
              const deadline = new Date(job.deadline);
              return deadline.toDateString() === date.toDateString();
            }).length;
            
            return (
              <div
                key={index}
                onClick={() => {
                  // only allow clicking on dates that have deadlines and aren't in the past
                  if (hasDeadline && !isPastDate) {
                    setSelectedDate(date);
                  }
                }}
                className={`
                  relative p-2 rounded transition-colors
                  ${isPastDate ? 'text-gray-300' : ''}
                  ${isFutureMonth ? 'text-gray-400' : ''}
                  ${isToday ? 'bg-blue-50 font-semibold text-blue-600' : ''}
                  ${isSelected ? 'bg-red-100 ring-2 ring-red-500' : ''}
                  ${hasDeadline && !isPastDate && !isSelected ? 'cursor-pointer hover:bg-gray-100' : ''}
                  ${!hasDeadline || isPastDate ? 'cursor-default' : ''}
                `}
                title={hasDeadline && !isPastDate ? `${deadlineCount} deadline${deadlineCount > 1 ? 's' : ''} on ${date.toLocaleDateString()}` : ''}
              >
                <span className="text-sm">{date.getDate()}</span>
                {hasDeadline && (
                  <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2">
                    <div className={`w-1.5 h-1.5 ${isPastDate ? 'bg-gray-300' : 'bg-red-500'} rounded-full`}>
                      {deadlineCount > 1 && !isPastDate && (
                        <span className="absolute -top-1 -right-1 text-xs text-red-600 font-bold">
                          {deadlineCount}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        {/* legend explaining what the colors mean */}
        <div className="flex gap-4 mt-4 text-xs text-gray-600">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-blue-50 rounded"></div>
            <span>Today</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
            <span>Has deadline</span>
          </div>
          {selectedDate && (
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-red-100 ring-1 ring-red-500 rounded"></div>
              <span>Selected</span>
            </div>
          )}
        </div>
      </div>

      {/* deadline list - filtered by selected date if one is chosen */}
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="font-semibold text-gray-900 mb-4">
          {selectedDate 
            ? `Deadlines for ${selectedDate.toLocaleDateString()}` 
            : 'All Upcoming Deadlines'}
        </h3>
        
        {filteredDeadlines.length === 0 ? (
          <p className="text-gray-600 text-center py-4">
            {selectedDate 
              ? `No deadlines on ${selectedDate.toLocaleDateString()}`
              : 'No upcoming deadlines'}
          </p>
        ) : (
          <div className="space-y-3">
            {filteredDeadlines.map(job => {
              const daysLeft = getDaysUntilDeadline(job.deadline);
              const isUrgent = daysLeft <= 2;
              
              return (
                <div 
                  key={job.id} 
                  className={`flex justify-between items-center p-3 rounded-lg ${
                    isUrgent ? 'bg-red-50 border border-red-200' : 'bg-gray-50'
                  }`}
                >
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{job.title}</h4>
                    <p className="text-sm text-gray-600">{job.company}</p>
                    <div className="flex gap-3 mt-1 text-xs text-gray-500">
                      <span>{job.job_type}</span>
                      <span>•</span>
                      <span>{job.industry}</span>
                    </div>
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
                    <Link href={`/jobs/${job.id}`}>
                      <button className="mt-2 text-xs text-blue-600 hover:text-blue-700">
                        View Job →
                      </button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      
      {/* reminder tip - updated to explain the new clickable functionality */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Pro Tip:</strong> Click on any date with a red dot to filter deadlines for that specific day. 
          {selectedDate && ' Click "Clear filter" to see all deadlines again.'}
        </p>
      </div>
    </>
  );
}

export default function StudentDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<DashboardTab>('all-jobs'); // default to all jobs tab when students log in
  const [applications, setApplications] = useState<Application[]>([]);
  const [savedJobs, setSavedJobs] = useState<SavedJob[]>([]);
  const [recommendedJobs, setRecommendedJobs] = useState<Job[]>([]);
  const [upcomingDeadlines, setUpcomingDeadlines] = useState<Job[]>([]);
  const [allJobs, setAllJobs] = useState<Job[]>([]);
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);
  const [loadingApplications, setLoadingApplications] = useState(true);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [session, setSession] = useState<any>(null);
  
  // filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [jobTypeFilters, setJobTypeFilters] = useState<string[]>([]);
  const [industryFilter, setIndustryFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState<'all' | 'remote' | 'on-site'>('all');
  const [showFilters, setShowFilters] = useState(true); // sidebar visibility
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [selectedJob, setSelectedJob] = useState<Job | null>(null); // for split view

  // disabled: quick apply modal no longer needed
  // const [quickApplyModal, setQuickApplyModal] = useState<{
  //   isOpen: boolean;
  //   jobId: string;
  //   jobTitle: string;
  //   companyName: string;
  // }>({
  //   isOpen: false,
  //   jobId: '',
  //   jobTitle: '',
  //   companyName: ''
  // });

  // check authentication and fetch user session
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
        router.push('/login');
        return;
      }

      // check if user is a student
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

  // fetch all data when session is available
  useEffect(() => {
    if (session) {
      fetchApplications();
      fetchAllJobs();
      fetchSavedJobs();
      fetchStudentProfile();
      fetchUpcomingDeadlines();
    }
  }, [session]);

  // generate recommendations when profile and jobs are loaded
  useEffect(() => {
    if (studentProfile && allJobs.length > 0) {
      generateRecommendations();
    }
  }, [studentProfile, allJobs]);

  // auto-select first job in split view
  useEffect(() => {
    if (viewMode === 'split' && getDisplayedJobs().length > 0 && !selectedJob) {
      setSelectedJob(getDisplayedJobs()[0] as Job);
    }
  }, [viewMode, activeTab]);

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
          jobs (
            id, title, company, job_type, industry, description,
            deadline, status, created_at, location, salary_range, skills, requirements
          )
        `)
        .eq('student_id', session.user.id)
        .order('applied_at', { ascending: false });

      if (error) {
        console.error('Error fetching applications:', error);
      } else if (data) {
        const transformedApplications: Application[] = data
          .map((item: any) => {
            const jobData = Array.isArray(item.jobs) ? item.jobs[0] : item.jobs;
            if (!jobData) return null;
            return {
              id: item.id,
              applied_at: item.applied_at,
              status: item.status,
              job: jobData
            };
          })
          .filter((item): item is Application => item !== null);
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
      // get current date to filter out expired jobs
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('status', 'active')
        .gte('deadline', today.toISOString()) // only get jobs with deadline today or in the future
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching jobs:', error);
      } else {
        // additional client-side filter to double-check no expired jobs slip through
        const nonExpiredJobs = (data || []).filter(job => {
          if (!job.deadline) return true; // if no deadline, show it
          const deadlineDate = new Date(job.deadline);
          const now = new Date();
          return deadlineDate >= now; // only show if deadline is in the future
        });
        setAllJobs(nonExpiredJobs);
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
          jobs (
            id, title, company, job_type, industry, description,
            deadline, status, created_at, location, salary_range, skills, requirements
          )
        `)
        .eq('student_id', session.user.id)
        .order('saved_at', { ascending: false });

      if (error) {
        console.error('Error fetching saved jobs:', error);
      } else if (data) {
        // filter out expired saved jobs too
        const transformedSavedJobs: SavedJob[] = data
        .map((item: any) => {
            const jobData = Array.isArray(item.jobs) ? item.jobs[0] : item.jobs;
            if (!jobData) return null;
            
            // check if job is expired
            if (jobData.deadline) {
              const deadlineDate = new Date(jobData.deadline);
              const now = new Date();
              if (deadlineDate < now) {
                return null; // skip expired jobs
              }
            }
            
            const savedJob: SavedJob = {
                id: item.id,
                saved_at: item.saved_at,
                reminder_set: item.reminder_set,
                job: jobData
            };
            if(item.reminder_date) {
                savedJob.reminder_date = item.reminder_date;
            }
            return savedJob;
        })
        .filter((item): item is SavedJob => item !== null);
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
      const { data: savedData } = await supabase
        .from('saved_jobs')
        .select(`jobs (*)`)
        .eq('student_id', session.user.id)
        .eq('reminder_set', true);

      const { data: appliedData } = await supabase
        .from('job_applications')
        .select(`jobs (*)`)
        .eq('student_id', session.user.id);

      const savedJobsList = savedData?.map(item => Array.isArray(item.jobs) ? item.jobs[0] : item.jobs).filter(Boolean) || [];
      const appliedJobsList = appliedData?.map(item => Array.isArray(item.jobs) ? item.jobs[0] : item.jobs).filter(Boolean) || [];
      
      const allDeadlineJobs = [...savedJobsList, ...appliedJobsList];
      const uniqueJobs = Array.from(new Map(allDeadlineJobs.map(job => [job.id, job])).values());

      const upcomingJobs = uniqueJobs.filter(job => {
        if (!job.deadline) return false;
        const deadline = new Date(job.deadline);
        const now = new Date();
        const daysUntil = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
        return daysUntil >= 0 && daysUntil <= 7; // only upcoming, not expired
      }).sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());

      setUpcomingDeadlines(upcomingJobs);
    } catch (error) {
      console.error('Error fetching deadlines:', error);
    }
  };

  const generateRecommendations = () => {
    if (!studentProfile || !allJobs.length) return;

    const scoredJobs = allJobs.map(job => {
      let score = 0;
      
      // higher weight for job type match
      if (studentProfile.preferred_job_types?.includes(job.job_type)) score += 5;
      
      // high weight for industry match
      if (studentProfile.preferred_industries?.includes(job.industry)) score += 4;
      
      // skills matching gets highest weight
      if (job.skills && studentProfile.skills) {
        const matchingSkills = job.skills.filter(skill => 
          studentProfile.skills.some(s => s.toLowerCase() === skill.toLowerCase())
        );
        score += matchingSkills.length * 3;
      }
      
      // interest matching
      if (studentProfile.interests) {
        const jobText = `${job.title} ${job.description} ${job.industry}`.toLowerCase();
        studentProfile.interests.forEach(interest => {
          if (jobText.includes(interest.toLowerCase())) score += 2;
        });
      }
      
      return { ...job, matchScore: score };
    });

    const appliedJobIds = applications.map(app => app.job.id);
    const availableJobs = scoredJobs.filter(job => !appliedJobIds.includes(job.id));

    const recommendations = availableJobs
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 20)
      .filter(job => job.matchScore >= 5); // Require meaningful match score

    setRecommendedJobs(recommendations);
  };

  const toggleSaveJob = async (jobId: string) => {
    if (!session) return;

    const isCurrentlySaved = savedJobs.some(sj => sj.job.id === jobId);

    if (isCurrentlySaved) {
      try {
        const { error } = await supabase
          .from('saved_jobs')
          .delete()
          .eq('student_id', session.user.id)
          .eq('job_id', jobId);

        if (!error) setSavedJobs(prev => prev.filter(sj => sj.job.id !== jobId));
      } catch (error) {
        console.error('Error unsaving job:', error);
      }
    } else {
      try {
        const { data, error } = await supabase
          .from('saved_jobs')
          .insert({ student_id: session.user.id, job_id: jobId, saved_at: new Date().toISOString(), reminder_set: false })
          .select(`id, saved_at, reminder_set, jobs (*)`)
          .single();

        if (!error && data) {
          const jobData = Array.isArray(data.jobs) ? data.jobs[0] : data.jobs;
          if (jobData) {
            const newSavedJob: SavedJob = {
              id: data.id,
              saved_at: data.saved_at,
              reminder_set: data.reminder_set,
              job: jobData
            };
            setSavedJobs(prev => [newSavedJob, ...prev]);
          }
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
    const reminderDate = newReminderStatus ? new Date(new Date(jobDeadline).getTime() - 24 * 60 * 60 * 1000).toISOString() : null;

    try {
      const { error } = await supabase
        .from('saved_jobs')
        .update({ reminder_set: newReminderStatus, reminder_date: reminderDate })
        .eq('id', savedJobId);

      if (!error) {
        setSavedJobs(prev => prev.map(sj => sj.id === savedJobId ? { ...sj, reminder_set: newReminderStatus, reminder_date: reminderDate || undefined } : sj));
        fetchUpcomingDeadlines();
      }
    } catch (error) {
      console.error('Error toggling reminder:', error);
    }
  };

  // disabled: apply to job functionality is no longer available internally
  // const applyToJob = async (jobId: string, applicationData?: any) => {
  //   if (!session) return;
  //
  //   try {
  //     // build the insert data with optional application details
  //     const insertData = {
  //       student_id: session.user.id, 
  //       job_id: jobId, 
  //       applied_at: new Date().toISOString(), 
  //       status: 'applied',
  //       ...(applicationData || {}) // spread the form data if provided
  //     };
  //
  //     const { error } = await supabase
  //       .from('job_applications')
  //       .insert(insertData);
  //
  //     if (!error) {
  //       fetchApplications();
  //       setSavedJobs(prev => prev.filter(sj => sj.job.id !== jobId));
  //       alert('Application submitted successfully!');
  //       // close the modal if it was open
  //       setQuickApplyModal({ isOpen: false, jobId: '', jobTitle: '', companyName: '' });
  //     } else {
  //       throw error;
  //     }
  //   } catch (error) {
  //     console.error('Error applying to job:', error);
  //     alert('Failed to submit application');
  //   }
  // };

  // disabled: quick apply modal opener
  // const openQuickApplyModal = (job: Job) => {
  //   setQuickApplyModal({
  //     isOpen: true,
  //     jobId: job.id,
  //     jobTitle: job.title,
  //     companyName: job.company
  //   });
  // };

  // filter function - applies all filters
  const getFilteredJobs = (jobsToFilter: Job[]) => {
    return jobsToFilter.filter(job => {
      // search filter
      const matchesSearch = searchTerm === '' ||
        job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (job.location && job.location.toLowerCase().includes(searchTerm.toLowerCase()));

      // job type filter
      const matchesJobType = jobTypeFilters.length === 0 || 
        jobTypeFilters.includes(job.job_type);
      
      // industry filter
      const matchesIndustry = industryFilter === '' || 
        job.industry === industryFilter;

      // location filter
      const matchesLocation = locationFilter === 'all' ||
        (locationFilter === 'remote' && job.location?.toLowerCase().includes('remote')) ||
        (locationFilter === 'on-site' && !job.location?.toLowerCase().includes('remote'));

      return matchesSearch && matchesJobType && matchesIndustry && matchesLocation;
    });
  };

  // clear all filters
  const clearAllFilters = () => {
    setSearchTerm('');
    setJobTypeFilters([]);
    setIndustryFilter('');
    setLocationFilter('all');
  };

  // track when a student views a job's details page
  const handleViewDetails = async (jobId: string) => {
    // First, record that the student viewed this job
    await fetch('/api/jobs/track-event', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jobId: jobId,
        eventType: 'view',
        userId: session?.user?.id || null
      })
    });

    // Then take them to the job details page
    router.push(`/jobs/${jobId}`);
  };

  // get unique industries
  const uniqueIndustries = useMemo(() => {
    const industries = new Set(allJobs.map(job => job.industry));
    return Array.from(industries).sort();
  }, [allJobs]);

  // get displayed jobs based on tab and filters
  const getDisplayedJobs = () => {
    switch (activeTab) {
      case 'for-you':
        // always show only recommended/matched jobs
        return getFilteredJobs(recommendedJobs);
      case 'all-jobs':
        // show all active jobs
        return getFilteredJobs(allJobs);
      case 'saved':
        return savedJobs.filter(savedJob => {
          const job = savedJob.job;
          const matchesSearch = searchTerm === '' ||
            job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            job.company.toLowerCase().includes(searchTerm.toLowerCase());
          const matchesJobType = jobTypeFilters.length === 0 || 
            jobTypeFilters.includes(job.job_type);
          const matchesIndustry = industryFilter === '' || 
            job.industry === industryFilter;
          return matchesSearch && matchesJobType && matchesIndustry;
        });
      case 'applications':
        return applications;
      case 'deadlines':
        return upcomingDeadlines;
      default:
        return [];
    }
  };

  // calculate match percentage for a job
  const getMatchPercentage = (job: Job) => {
    const recommended = recommendedJobs.find(rj => rj.id === job.id);
    if (!recommended) return 0;
    
    // get the job with matchscore
    const jobWithScore = recommended as Job & { matchScore?: number };
    if (!jobWithScore.matchScore) return 0;
    
    // convert score to percentage (max score would be around 20-30)
    return Math.min(Math.round((jobWithScore.matchScore / 20) * 100), 100);
  };

  // check if job is recommended
  const isRecommended = (jobId: string) => recommendedJobs.some(rj => rj.id === jobId);

  // helper functions
  const getStatusColor = (status: string) => ({'applied': 'bg-blue-100 text-blue-800', 'viewed': 'bg-yellow-100 text-yellow-800', 'interview': 'bg-purple-100 text-purple-800', 'hired': 'bg-green-100 text-green-800', 'rejected': 'bg-red-100 text-red-800'}[status] || 'bg-gray-100 text-gray-800');
  const getStatusText = (status: string) => ({'applied': 'Applied', 'viewed': 'Viewed by Employer', 'interview': 'Interview Scheduled', 'hired': 'Hired!', 'rejected': 'Not Selected'}[status] || status);
  const getDaysUntilDeadline = (deadline: string) => Math.ceil((new Date(deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
  const isJobSaved = (jobId: string) => savedJobs.some(sj => sj.job.id === jobId);

  // get new jobs (last 48 hours)
  const newJobsCount = useMemo(() => {
    return allJobs.filter(job => {
      const hours = (new Date().getTime() - new Date(job.created_at).getTime()) / (1000 * 60 * 60);
      return hours <= 48;
    }).length;
  }, [allJobs]);

  // list view component - more compact than cards
  const JobListItem = ({ job, isSelected = false }: { job: Job; isSelected?: boolean }) => {
    const isSaved = isJobSaved(job.id);
    const hasApplied = applications.some(app => app.job.id === job.id);
    const daysUntil = job.deadline ? getDaysUntilDeadline(job.deadline) : null;
    const isExpired = daysUntil !== null && daysUntil < 0;
    const matchPercent = getMatchPercentage(job);

    // don't show expired jobs
    if (isExpired) return null;

    return (
      <div 
        className={`border-b hover:bg-gray-50 p-4 cursor-pointer transition-all ${
          isSelected ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
        }`}
        onClick={() => viewMode === 'split' && setSelectedJob(job)}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0 pr-4">
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-gray-900 truncate">{job.title}</h3>
              {matchPercent > 60 && (
                <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full whitespace-nowrap">
                  {matchPercent}% match
                </span>
              )}
              {/* disabled: no longer showing applied status
              {hasApplied && (
                <CheckCircleIcon className="h-5 w-5 text-green-600" />
              )}
              */}
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-600 mt-1">
              <span>{job.company}</span>
              <span>•</span>
              <span>{job.location || 'Location TBD'}</span>
              <span>•</span>
              <span className={`font-medium ${
                job.job_type === 'Full-Time' ? 'text-green-600' :
                job.job_type === 'Part-Time' ? 'text-blue-600' :
                'text-purple-600'
              }`}>{job.job_type}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {job.deadline && (
              <span className={`text-sm font-medium ${
                daysUntil !== null && daysUntil <= 3 ? 'text-orange-600' :
                'text-gray-600'
              }`}>
                {daysUntil === 0 ? 'Due today' :
                 `${daysUntil}d left`}
              </span>
            )}
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleSaveJob(job.id);
              }}
              className="p-2 hover:bg-gray-100 rounded transition-colors"
            >
              {isSaved ? (
                <BookmarkSolidIcon className="h-5 w-5 text-blue-600" />
              ) : (
                <BookmarkIcon className="h-5 w-5 text-gray-400" />
              )}
            </button>
            
            {viewMode === 'list' && (
              <Link href={`/jobs/${job.id}`} onClick={(e) => e.stopPropagation()}>
                <ChevronRightIcon className="h-5 w-5 text-gray-400" />
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  };

  // enhanced card component
  const JobCard = ({ job, savedJobId = null }: { job: Job; savedJobId?: string | null }) => {
    const isSaved = isJobSaved(job.id);
    const savedJob = savedJobs.find(sj => sj.job.id === job.id);
    const daysUntil = job.deadline ? getDaysUntilDeadline(job.deadline) : null;
    const isExpired = daysUntil !== null && daysUntil < 0;
    const hasApplied = applications.some(app => app.job.id === job.id);
    const matchPercent = getMatchPercentage(job);

    // don't render expired jobs at all
    if (isExpired) return null;

    return (
      <div className="bg-white rounded-lg shadow hover:shadow-lg transition-all duration-200 overflow-hidden">
        <div className={`h-1 ${
          job.job_type === 'Full-Time' ? 'bg-green-500' :
          job.job_type === 'Part-Time' ? 'bg-blue-500' :
          'bg-purple-500'
        }`}></div>
        
        <div className="p-6">
          {/* match score badge if high match */}
          {matchPercent > 60 && (
            <div className="mb-3 flex items-center gap-2 text-sm">
              <SparklesIcon className="h-4 w-4 text-green-600" />
              <span className="text-green-700 font-medium">
                {matchPercent}% Match - Matches your skills & preferences
              </span>
            </div>
          )}

          <div className="flex justify-between items-start mb-4">
            <div className="flex-1 pr-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-1 line-clamp-1">
                {job.title}
              </h3>
              <p className="text-gray-700 font-medium flex items-center gap-2">
                <BuildingOfficeIcon className="h-4 w-4 text-gray-500" />
                {job.company}
              </p>
              {job.location && (
                <p className="text-sm text-gray-600 flex items-center gap-2 mt-1">
                  <MapPinIcon className="h-4 w-4 text-gray-500" />
                  {job.location}
                </p>
              )}
            </div>
            
            <div className="flex flex-col items-end gap-2">
              <span className={`px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap ${
                job.job_type === 'Full-Time' ? 'bg-green-100 text-green-800' :
                job.job_type === 'Part-Time' ? 'bg-blue-100 text-blue-800' :
                'bg-purple-100 text-purple-800'
              }`}>
                {job.job_type}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleSaveJob(job.id);
                }}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                title={isSaved ? "Unsave job" : "Save job"}
              >
                {isSaved ? (
                  <BookmarkSolidIcon className="h-5 w-5 text-blue-600" />
                ) : (
                  <BookmarkIcon className="h-5 w-5 text-gray-400" />
                )}
              </button>
            </div>
          </div>

          <p className="text-gray-600 text-sm mb-4 line-clamp-2 break-words">
            {job.description}
          </p>

          <div className="flex flex-wrap items-center gap-3 mb-4 text-sm">
            <span className="flex items-center gap-1 text-gray-600">
              <BriefcaseIcon className="h-4 w-4" />
              {job.industry}
            </span>
            
            {job.salary_range && (
              <span className="flex items-center gap-1 text-gray-600">
                💰 {job.salary_range}
              </span>
            )}
            
            {job.deadline && (
              <span className={`flex items-center gap-1 font-medium ${
                daysUntil !== null && daysUntil <= 3 ? 'text-orange-600' :
                'text-gray-600'
              }`}>
                <CalendarIcon className="h-4 w-4" />
                {daysUntil === 0 ? 'Due today' :
                 daysUntil === 1 ? 'Due tomorrow' :
                 `${daysUntil} days left`}
              </span>
            )}
          </div>

          {job.skills && job.skills.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-4">
              {job.skills.slice(0, 3).map((skill, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs"
                >
                  {skill}
                </span>
              ))}
              {job.skills.length > 3 && (
                <span className="px-2 py-1 text-gray-500 text-xs">
                  +{job.skills.length - 3} more
                </span>
              )}
            </div>
          )}

          <div className="flex gap-2 pt-2 border-t">
            {/* view details button - now tracks when students view jobs */}
            <button 
              onClick={() => handleViewDetails(job.id)}
              className="flex-1 px-4 py-2 bg-uga-red text-white rounded-md hover:bg-red-800 transition-colors text-sm font-medium"
            >
              View Details
            </button>
            
            {/* disabled: quick apply and applied status buttons
            {!hasApplied && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  openQuickApplyModal(job);
                }}
                className="flex-1 px-4 py-2 bg-uga-red text-white rounded-md hover:bg-red-800 transition-colors text-sm font-medium"
              >
                Quick Apply
              </button>
            )}
            
            {hasApplied && (
              <span className="flex-1 px-4 py-2 bg-green-100 text-green-800 rounded-md text-sm font-medium text-center">
                ✔ Applied
              </span>
            )}
            */}
            
            {savedJob && job.deadline && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleReminder(savedJob.id, job.deadline);
                }}
                className={`px-3 py-2 rounded-md transition-colors ${
                  savedJob.reminder_set 
                    ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                title={savedJob.reminder_set ? "Reminder set" : "Set reminder"}
              >
                <BellIcon className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  // job detail panel for split view
  const JobDetailPanel = ({ job }: { job: Job }) => {
    const isSaved = isJobSaved(job.id);
    const hasApplied = applications.some(app => app.job.id === job.id);
    const daysUntil = job.deadline ? getDaysUntilDeadline(job.deadline) : null;
    const isExpired = daysUntil !== null && daysUntil < 0;
    const matchPercent = getMatchPercentage(job);

    // don't show expired jobs
    if (isExpired) return null;

    return (
      <div className="bg-white h-full overflow-y-auto">
        <div className="p-6">
          {/* match score if high */}
          {matchPercent > 60 && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2">
                <SparklesIcon className="h-5 w-5 text-green-600" />
                <span className="text-green-700 font-medium">
                  {matchPercent}% Match for You
                </span>
              </div>
              <p className="text-sm text-green-600 mt-1">
                This job matches your skills and preferences
              </p>
            </div>
          )}

          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{job.title}</h2>
            <p className="text-lg text-gray-700 mb-4">{job.company}</p>
            
            <div className="flex flex-wrap gap-3 text-sm">
              <span className={`px-3 py-1 rounded-full font-medium ${
                job.job_type === 'Full-Time' ? 'bg-green-100 text-green-800' :
                job.job_type === 'Part-Time' ? 'bg-blue-100 text-blue-800' :
                'bg-purple-100 text-purple-800'
              }`}>
                {job.job_type}
              </span>
              
              <span className="flex items-center gap-1 text-gray-600">
                <MapPinIcon className="h-4 w-4" />
                {job.location || 'Location TBD'}
              </span>
              
              <span className="flex items-center gap-1 text-gray-600">
                <BriefcaseIcon className="h-4 w-4" />
                {job.industry}
              </span>
              
              {job.salary_range && (
                <span className="flex items-center gap-1 text-gray-600">
                  💰 {job.salary_range}
                </span>
              )}
            </div>
          </div>

          {/* action buttons - removed apply now */}
          <div className="flex gap-3 mb-6">
            {/* disabled: apply button no longer available
            {!hasApplied ? (
              <button
                onClick={() => openQuickApplyModal(job)}
                className="flex-1 px-4 py-2 bg-uga-red text-white rounded-lg hover:bg-red-800 font-medium"
              >
                Apply Now
              </button>
            ) : (
              <span className="flex-1 px-4 py-2 bg-green-100 text-green-800 rounded-lg font-medium text-center">
                ✔ Applied
              </span>
            )}
            */}
            
            <button
              onClick={() => toggleSaveJob(job.id)}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                isSaved 
                  ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {isSaved ? 'Saved' : 'Save'}
            </button>
            
            <Link href={`/jobs/${job.id}`} className="flex-1">
              <button className="w-full px-4 py-2 bg-uga-red text-white rounded-lg hover:bg-red-800 font-medium">
                View Full Details
              </button>
            </Link>
          </div>

          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
              <p className="text-gray-600 whitespace-pre-wrap">{job.description}</p>
            </div>

            {job.requirements && job.requirements.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Requirements</h3>
                <ul className="list-disc list-inside text-gray-600 space-y-1">
                  {job.requirements.map((req, index) => (
                    <li key={index}>{req}</li>
                  ))}
                </ul>
              </div>
            )}

            {job.skills && job.skills.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {job.skills.map((skill, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {job.deadline && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Application Deadline</h3>
                <p className={`text-sm font-medium ${
                  daysUntil !== null && daysUntil <= 3 ? 'text-orange-600' :
                  'text-gray-600'
                }`}>
                  {new Date(job.deadline).toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                  {daysUntil !== null && ` (${daysUntil} days left)`}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // main render starts here
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Student Dashboard</h1>
            <p className="text-gray-600 mt-2">Find your perfect opportunity</p>
          </div>
          <div className="flex gap-2">
            <Link href="/student/profile">
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
                <UserCircleIcon className="h-5 w-5" />
                Edit Profile
              </button>
            </Link>
			
			{/* NEW button for account settings */}
			 <Link href="/profile/settings">
				<button className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2">
				  <UserCircleIcon className="h-5 w-5" />
				  Account Settings
				</button>
			 </Link>
			
			
			
			
          </div>
        </div>
        {/* overview stats cards - removed applications count */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          {/* disabled: showing application count
          <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-blue-500">
            <div className="text-2xl font-bold text-gray-900">{applications.length}</div>
            <div className="text-sm text-gray-600">Active Applications</div>
          </div>
          */}
          <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-purple-500">
            <div className="text-2xl font-bold text-gray-900">{savedJobs.length}</div>
            <div className="text-sm text-gray-600">Saved Jobs</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-green-500">
            <div className="text-2xl font-bold text-gray-900">{newJobsCount}</div>
            <div className="text-sm text-gray-600">New This Week</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-orange-500">
            <div className="text-2xl font-bold text-gray-900">{upcomingDeadlines.length}</div>
            <div className="text-sm text-gray-600">Due This Week</div>
          </div>
        </div>

        {/* urgent deadlines alert - only if deadlines exist */}
        {upcomingDeadlines.filter(job => getDaysUntilDeadline(job.deadline) <= 2).length > 0 && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <ClockIcon className="h-5 w-5 text-red-600" />
              <h3 className="font-semibold text-red-900">Urgent Deadlines!</h3>
            </div>
            <div className="space-y-2">
              {upcomingDeadlines
                .filter(job => getDaysUntilDeadline(job.deadline) <= 2)
                .slice(0, 3)
                .map(job => (
                  <div key={job.id} className="flex justify-between items-center text-sm">
                    <span className="text-gray-700">{job.title} at {job.company}</span>
                    <span className="text-red-600 font-medium">
                      {getDaysUntilDeadline(job.deadline) === 0 ? 'Due today!' : 
                       getDaysUntilDeadline(job.deadline) === 1 ? 'Due tomorrow!' :
                       `${getDaysUntilDeadline(job.deadline)} days left`}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}
        
        {/* improved tab navigation - removed applications tab */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('for-you')}
              className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'for-you'
                  ? 'border-uga-red text-uga-red'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span className="flex items-center gap-2">
                <SparklesIcon className="h-4 w-4" />
                For You
                {recommendedJobs.length > 0 && (
                  <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs">
                    {recommendedJobs.length} matches
                  </span>
                )}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('all-jobs')}
              className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'all-jobs'
                  ? 'border-uga-red text-uga-red'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span className="flex items-center gap-2">
                All Jobs ({allJobs.length})
              </span>
            </button>
            <button
              onClick={() => setActiveTab('saved')}
              className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'saved'
                  ? 'border-uga-red text-uga-red'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span className="flex items-center gap-2">
                <BookmarkIcon className="h-4 w-4" />
                Saved ({savedJobs.length})
              </span>
            </button>
            
            {/* disabled: applications tab no longer shown
            <button
              onClick={() => setActiveTab('applications')}
              className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'applications'
                  ? 'border-uga-red text-uga-red'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Applications ({applications.length})
            </button>
            */}
            
            <button
              onClick={() => setActiveTab('deadlines')}
              className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'deadlines'
                  ? 'border-uga-red text-uga-red'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span className="flex items-center gap-2">
                <BellIcon className="h-4 w-4" />
                Deadlines
                {upcomingDeadlines.length > 0 && (
                  <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs">
                    {upcomingDeadlines.length}
                  </span>
                )}
              </span>
            </button>
          </nav>
        </div>

        {/* main content area with sidebar filters */}
        <div className="flex gap-6">
          {/* improved: sidebar filters - persistent and better organized */}
          {(activeTab === 'for-you' || activeTab === 'all-jobs' || activeTab === 'saved') && showFilters && (
            <div className="w-64 bg-white p-4 rounded-lg shadow-sm h-fit sticky top-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-gray-900">Filters</h3>
                <button
                  onClick={() => setShowFilters(false)}
                  className="md:hidden p-1 hover:bg-gray-100 rounded"
                >
                  <XMarkIcon className="h-5 w-5 text-gray-500" />
                </button>
              </div>

              {/* search */}
              <div className="mb-4">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search jobs..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-uga-red focus:border-transparent"
                  />
                </div>
              </div>

              {/* for you tab specific toggle */}
              {/* job type */}
              <div className="mb-4">
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Job Type
                </label>
                <div className="space-y-2">
                  {['Internship', 'Part-Time', 'Full-Time'].map(type => (
                    <label key={type} className="flex items-center cursor-pointer hover:bg-gray-50 p-1 rounded">
                      <input
                        type="checkbox"
                        checked={jobTypeFilters.includes(type)}
                        onChange={() => {
                          setJobTypeFilters(prev =>
                            prev.includes(type) 
                              ? prev.filter(t => t !== type) 
                              : [...prev, type]
                          );
                        }}
                        className="mr-2 text-uga-red focus:ring-uga-red rounded"
                      />
                      <span className="text-sm text-gray-700">{type}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* location type */}
              <div className="mb-4">
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Location
                </label>
                <select
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value as 'all' | 'remote' | 'on-site')}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-uga-red"
                >
                  <option value="all">All Locations</option>
                  <option value="remote">Remote Only</option>
                  <option value="on-site">On-site Only</option>
                </select>
              </div>

              {/* industry */}
              <div className="mb-4">
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Industry
                </label>
                <select
                  value={industryFilter}
                  onChange={(e) => setIndustryFilter(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-uga-red"
                >
                  <option value="">All Industries</option>
                  {uniqueIndustries.map(industry => (
                    <option key={industry} value={industry}>{industry}</option>
                  ))}
                </select>
              </div>

              {/* clear filters */}
              {(searchTerm || jobTypeFilters.length > 0 || industryFilter || locationFilter !== 'all') && (
                <button
                  onClick={clearAllFilters}
                  className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium"
                >
                  Clear All Filters
                </button>
              )}
            </div>
          )}

          {/* toggle filter button for mobile when hidden */}
          {(activeTab === 'for-you' || activeTab === 'all-jobs' || activeTab === 'saved') && !showFilters && (
            <button
              onClick={() => setShowFilters(true)}
              className="fixed bottom-4 right-4 z-10 px-4 py-2 bg-uga-red text-white rounded-full shadow-lg hover:bg-red-800 flex items-center gap-2 md:hidden"
            >
              <FunnelIcon className="h-5 w-5" />
              Filters
            </button>
          )}

          {/* main content */}
          <div className="flex-1">
            {/* view mode toggle for for you and saved tabs */}
            {(activeTab === 'for-you' || activeTab === 'all-jobs' || activeTab === 'saved') && (
              <div className="flex justify-between items-center mb-4">
                <div className="text-sm text-gray-600">
                  {getDisplayedJobs().length} jobs found
                  {(searchTerm || jobTypeFilters.length > 0 || industryFilter || locationFilter !== 'all') && ' (filtered)'}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setViewMode('cards')}
                    className={`p-2 rounded ${viewMode === 'cards' ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
                    title="Card view"
                  >
                    <Squares2X2Icon className="h-5 w-5 text-gray-600" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded ${viewMode === 'list' ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
                    title="List view"
                  >
                    <ListBulletIcon className="h-5 w-5 text-gray-600" />
                  </button>
                  <button
                    onClick={() => setViewMode('split')}
                    className={`p-2 rounded ${viewMode === 'split' ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
                    title="Split view"
                  >
                    <svg className="h-5 w-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {/* for you tab */}
            {activeTab === 'for-you' && (
              <div>
                {loadingJobs ? (
                  <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                    <p className="mt-2 text-gray-600">Loading jobs...</p>
                  </div>
                ) : getDisplayedJobs().length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-lg shadow-sm">
                    <p className="text-gray-600 mb-4">
                      No jobs match your filters. Complete your profile for better matches.
                    </p>
                    {(searchTerm || jobTypeFilters.length > 0 || industryFilter || locationFilter !== 'all') && (
                      <button
                        onClick={clearAllFilters}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        Clear Filters
                      </button>
                    )}
                  </div>
                ) : viewMode === 'split' ? (
                  // split view layout
                  <div className="flex gap-4 h-[calc(100vh-300px)]">
                    <div className="w-1/2 bg-white rounded-lg shadow-sm overflow-y-auto">
                      {getDisplayedJobs().map((job) => (
                        <JobListItem 
                          key={job.id} 
                          job={job as Job} 
                          isSelected={selectedJob?.id === job.id}
                        />
                      ))}
                    </div>
                    <div className="w-1/2 bg-white rounded-lg shadow-sm overflow-hidden">
                      {selectedJob ? (
                        <JobDetailPanel job={selectedJob} />
                      ) : (
                        <div className="h-full flex items-center justify-center text-gray-500">
                          Select a job to view details
                        </div>
                      )}
                    </div>
                  </div>
                ) : viewMode === 'list' ? (
                  // list view
                  <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                    {getDisplayedJobs().map((job) => (
                      <JobListItem key={job.id} job={job as Job} />
                    ))}
                  </div>
                ) : (
                  // card view (default)
                  <div className="grid gap-4 md:grid-cols-2">
                    {getDisplayedJobs().map((job) => (
                      <JobCard key={job.id} job={job as Job} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* all jobs tab */}
            {activeTab === 'all-jobs' && (
              <div>
                {loadingJobs ? (
                  <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                    <p className="mt-2 text-gray-600">Loading jobs...</p>
                  </div>
                ) : getDisplayedJobs().length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-lg shadow-sm">
                    <p className="text-gray-600 mb-4">No jobs match your filters.</p>
                    {(searchTerm || jobTypeFilters.length > 0 || industryFilter || locationFilter !== 'all') && (
                      <button
                        onClick={clearAllFilters}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        Clear Filters
                      </button>
                    )}
                  </div>
                ) : viewMode === 'split' ? (
                  // split view layout
                  <div className="flex gap-4 h-[calc(100vh-300px)]">
                    <div className="w-1/2 bg-white rounded-lg shadow-sm overflow-y-auto">
                      {getDisplayedJobs().map((job) => (
                        <JobListItem 
                          key={job.id} 
                          job={job as Job} 
                          isSelected={selectedJob?.id === job.id}
                        />
                      ))}
                    </div>
                    <div className="w-1/2 bg-white rounded-lg shadow-sm overflow-hidden">
                      {selectedJob ? (
                        <JobDetailPanel job={selectedJob} />
                      ) : (
                        <div className="h-full flex items-center justify-center text-gray-500">
                          Select a job to view details
                        </div>
                      )}
                    </div>
                  </div>
                ) : viewMode === 'list' ? (
                  // list view
                  <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                    {getDisplayedJobs().map((job) => (
                      <JobListItem key={job.id} job={job as Job} />
                    ))}
                  </div>
                ) : (
                  // card view (default)
                  <div className="grid gap-4 md:grid-cols-2">
                    {getDisplayedJobs().map((job) => (
                      <JobCard key={job.id} job={job as Job} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* saved jobs tab */}
            {activeTab === 'saved' && (
              <div>
                {savedJobs.length === 0 ? (
                  <div className="text-center py-12">
                    <BookmarkIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">You haven't saved any jobs yet.</p>
                    <button
                      onClick={() => setActiveTab('for-you')}
                      className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      Browse Jobs
                    </button>
                  </div>
                ) : getDisplayedJobs().length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-lg shadow-sm">
                    <p className="text-gray-600 mb-4">
                      No saved jobs match your filters.
                    </p>
                    <button
                      onClick={clearAllFilters}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Clear Filters
                    </button>
                  </div>
                ) : viewMode === 'split' ? (
                  // split view for saved jobs
                  <div className="flex gap-4 h-[calc(100vh-300px)]">
                    <div className="w-1/2 bg-white rounded-lg shadow-sm overflow-y-auto">
                      {(getDisplayedJobs() as SavedJob[]).map((savedJob) => (
                        <JobListItem 
                          key={savedJob.id} 
                          job={savedJob.job} 
                          isSelected={selectedJob?.id === savedJob.job.id}
                        />
                      ))}
                    </div>
                    <div className="w-1/2 bg-white rounded-lg shadow-sm overflow-hidden">
                      {selectedJob ? (
                        <JobDetailPanel job={selectedJob} />
                      ) : (
                        <div className="h-full flex items-center justify-center text-gray-500">
                          Select a job to view details
                        </div>
                      )}
                    </div>
                  </div>
				  
				  ) : viewMode === 'list' ? (
                  // list view for saved jobs
                  <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                    {(getDisplayedJobs() as SavedJob[]).map((savedJob) => (
                      <JobListItem key={savedJob.id} job={savedJob.job} />
                    ))}
                  </div>
                ) : (
                  // card view for saved jobs
                  <div className="grid gap-4 md:grid-cols-2">
                    {(getDisplayedJobs() as SavedJob[]).map((savedJob) => (
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

            {/* disabled: applications tab is no longer shown
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
                      onClick={() => setActiveTab('for-you')}
                      className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      Browse Jobs
                    </button>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {applications.map((application) => (
                      <div key={application.id} className="bg-white rounded-lg shadow p-6">
                        <div className="mb-4">
                          <div className="flex items-center justify-between text-xs mb-2">
                            <span className={application.status === 'applied' ? 'font-semibold text-blue-600' : 'text-gray-400'}>Applied</span>
                            <span className={application.status === 'viewed' ? 'font-semibold text-yellow-600' : 'text-gray-400'}>Viewed</span>
                            <span className={application.status === 'interview' ? 'font-semibold text-purple-600' : 'text-gray-400'}>Interview</span>
                            <span className={application.status === 'hired' || application.status === 'rejected' ? 
                              (application.status === 'hired' ? 'font-semibold text-green-600' : 'font-semibold text-red-600') : 
                              'text-gray-400'}>Decision</span>
                          </div>
                          <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                              <div className="w-full border-t border-gray-300"></div>
                            </div>
                            <div className="relative flex justify-between">
                              <div className={`w-3 h-3 rounded-full ${application.status === 'applied' || application.status === 'viewed' || application.status === 'interview' || application.status === 'hired' ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
                              <div className={`w-3 h-3 rounded-full ${application.status === 'viewed' || application.status === 'interview' || application.status === 'hired' ? 'bg-yellow-600' : 'bg-gray-300'}`}></div>
                              <div className={`w-3 h-3 rounded-full ${application.status === 'interview' || application.status === 'hired' ? 'bg-purple-600' : 'bg-gray-300'}`}></div>
                              <div className={`w-3 h-3 rounded-full ${application.status === 'hired' ? 'bg-green-600' : application.status === 'rejected' ? 'bg-red-600' : 'bg-gray-300'}`}></div>
                            </div>
                          </div>
                        </div>

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
            */}

            {/* deadlines tab with calendar view */}
            {activeTab === 'deadlines' && (
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
                    {/* use the new calendar widget component with working date filtering */}
                    <DeadlineCalendarWidget 
                      upcomingDeadlines={upcomingDeadlines}
                      getDaysUntilDeadline={getDaysUntilDeadline}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* disabled: quick apply modal no longer needed */}
      {/* <QuickApplyModal
        isOpen={quickApplyModal.isOpen}
        onClose={() => setQuickApplyModal({ isOpen: false, jobId: '', jobTitle: '', companyName: '' })}
        onSubmit={(data) => applyToJob(quickApplyModal.jobId, data)}
        jobTitle={quickApplyModal.jobTitle}
        companyName={quickApplyModal.companyName}
        userEmail={session?.user?.email || ''}
      /> */}
    </div>
  );
}