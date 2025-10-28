// pages/student/dashboard.tsx - student dashboard where they browse jobs, save favorites, and manage their profile
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
  UserCircleIcon
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
type DashboardTab = 'for-you' | 'saved' | 'applications' | 'deadlines';
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
                  <div className={`absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 rounded-full ${
                    isPastDate ? 'bg-gray-300' : 'bg-red-500'
                  }`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* list of jobs with deadlines on selected date or all upcoming */}
      <div className="bg-white rounded-lg shadow p-4 mt-4">
        <h3 className="font-semibold text-gray-900 mb-3">
          {selectedDate 
            ? `Deadlines on ${selectedDate.toLocaleDateString()}` 
            : 'All Upcoming Deadlines (Next 7 Days)'}
        </h3>
        
        {filteredDeadlines.length === 0 ? (
          <p className="text-gray-500 text-sm">
            {selectedDate 
              ? 'No deadlines on this date' 
              : 'No upcoming deadlines'}
          </p>
        ) : (
          <div className="space-y-3">
            {filteredDeadlines.map((job) => {
              const daysLeft = getDaysUntilDeadline(job.deadline);
              const isUrgent = daysLeft <= 2;
              
              return (
                <div key={job.id} className={`border rounded-lg p-3 ${
                  isUrgent ? 'border-red-200 bg-red-50' : 'border-gray-200'
                }`}>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <Link href={`/jobs/${job.id}`}>
                        <h4 className="font-medium text-gray-900 hover:text-blue-600 cursor-pointer">
                          {job.title}
                        </h4>
                      </Link>
                      <p className="text-sm text-gray-600">{job.company}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <CalendarIcon className={`h-4 w-4 ${isUrgent ? 'text-red-500' : 'text-gray-400'}`} />
                        <span className={`text-sm ${isUrgent ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                          {daysLeft === 0 
                            ? 'Due today!' 
                            : daysLeft === 1 
                              ? 'Due tomorrow' 
                              : `${daysLeft} days left`}
                        </span>
                      </div>
                    </div>
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
    </>
  );
}

export default function StudentDashboard() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<DashboardTab>('for-you');
  
  // state for all the different data
  const [allJobs, setAllJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [savedJobs, setSavedJobs] = useState<SavedJob[]>([]);
  const [recommendedJobs, setRecommendedJobs] = useState<Job[]>([]);
  const [loadingApplications, setLoadingApplications] = useState(false);
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);
  
  // ui state
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [jobTypeFilters, setJobTypeFilters] = useState<string[]>([]);
  const [industryFilter, setIndustryFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [showOnlyRecommended, setShowOnlyRecommended] = useState(false);
  const [upcomingDeadlines, setUpcomingDeadlines] = useState<Job[]>([]);

  // disabled: quick apply modal state
  // const [quickApplyModal, setQuickApplyModal] = useState({
  //   isOpen: false,
  //   jobId: '',
  //   jobTitle: '',
  //   companyName: ''
  // });

  // get unique values for filter dropdowns
  const uniqueIndustries = useMemo(() => {
    return ['', ...new Set(allJobs.map(job => job.industry).filter(Boolean))];
  }, [allJobs]);

  const uniqueLocations = useMemo(() => {
    const locations = allJobs.map(job => job.location).filter(Boolean);
    return ['all', ...new Set(locations)];
  }, [allJobs]);

  // check if user is logged in
  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      if (!session) {
        router.push('/auth/signin');
      } else {
        setLoading(false);
      }
    };
    getSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) {
        router.push('/auth/signin');
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [router]);

  // load all data when user logs in
  useEffect(() => {
    if (session) {
      fetchJobs();
      fetchApplications();
      fetchSavedJobs();
      fetchUpcomingDeadlines();
      fetchStudentProfile();
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
        .from('applications')
        .select(`
          *,
          job:jobs(*)
        `)
        .eq('student_id', session.user.id)
        .order('applied_at', { ascending: false });

      if (error) {
        console.error('Error fetching applications:', error);
      } else {
        setApplications(data || []);
      }
    } catch (error) {
      console.error('Unexpected error:', error);
    } finally {
      setLoadingApplications(false);
    }
  };

  const fetchJobs = async () => {
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
      console.error('Unexpected error fetching jobs:', error);
    }
  };

  const fetchSavedJobs = async () => {
    if (!session) return;

    try {
      const { data, error } = await supabase
        .from('saved_jobs')
        .select(`
          *,
          job:jobs(*)
        `)
        .eq('student_id', session.user.id)
        .order('saved_at', { ascending: false });

      if (error) {
        console.error('Error fetching saved jobs:', error);
      } else {
        setSavedJobs(data || []);
      }
    } catch (error) {
      console.error('Unexpected error:', error);
    }
  };

  // disabled: apply to job functionality
  // const applyToJob = async (jobId: string, applicationData: any) => {
  //   if (!session) return;
  //   
  //   try {
  //     const { error } = await supabase
  //       .from('applications')
  //       .insert({
  //         job_id: jobId,
  //         student_id: session.user.id,
  //         status: 'applied',
  //         cover_letter: applicationData.coverLetter,
  //         resume_url: applicationData.resumeUrl
  //       });
  //
  //     if (error) throw error;
  //     
  //     await fetchApplications();
  //     setQuickApplyModal({ isOpen: false, jobId: '', jobTitle: '', companyName: '' });
  //   } catch (error) {
  //     console.error('Error applying to job:', error);
  //   }
  // };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'applied':
        return 'bg-blue-100 text-blue-700';
      case 'viewed':
        return 'bg-yellow-100 text-yellow-700';
      case 'interview':
        return 'bg-purple-100 text-purple-700';
      case 'hired':
        return 'bg-green-100 text-green-700';
      case 'rejected':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'applied':
        return 'Application Sent';
      case 'viewed':
        return 'Under Review';
      case 'interview':
        return 'Interview Stage';
      case 'hired':
        return 'Offer Received';
      case 'rejected':
        return 'Not Selected';
      default:
        return status;
    }
  };

  // fetch student profile data for matching
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
      const savedJobIds = savedJobs.map(sj => sj.job.id);
      const relevantJobs = allJobs.filter(job => 
        savedJobIds.includes(job.id) && job.deadline
      );

      const deadlines = relevantJobs.filter(job => {
        const daysUntil = getDaysUntilDeadline(job.deadline);
        return daysUntil >= 0 && daysUntil <= 7; // only upcoming, not expired
      }).sort((a, b) => {
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      });

      setUpcomingDeadlines(deadlines);
    } catch (error) {
      console.error('Error fetching deadlines:', error);
    }
  };

  // generate job recommendations based on profile
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
      .filter(job => job.matchScore > 0);

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
          .insert({
            student_id: session.user.id,
            job_id: jobId,
            reminder_set: false
          })
          .select(`
            *,
            job:jobs(*)
          `)
          .single();

        if (!error && data) setSavedJobs(prev => [...prev, data]);
      } catch (error) {
        console.error('Error saving job:', error);
      }
    }
  };

  const isJobSaved = (jobId: string) => savedJobs.some(sj => sj.job.id === jobId);

  const getDaysUntilDeadline = (deadline: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadlineDate = new Date(deadline);
    deadlineDate.setHours(0, 0, 0, 0);
    const diffTime = deadlineDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const clearAllFilters = () => {
    setSearchTerm('');
    setJobTypeFilters([]);
    setIndustryFilter('');
    setLocationFilter('all');
    setShowOnlyRecommended(false);
  };

  const hasActiveFilters = () => {
    return searchTerm !== '' || 
           jobTypeFilters.length > 0 || 
           industryFilter !== '' || 
           locationFilter !== 'all' ||
           showOnlyRecommended;
  };

  const getFilteredJobs = (jobList: Job[]) => {
    return jobList.filter(job => {
      const matchesSearch = searchTerm === '' ||
        job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.description.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesJobType = jobTypeFilters.length === 0 || 
        jobTypeFilters.includes(job.job_type);

      const matchesIndustry = industryFilter === '' || 
        job.industry === industryFilter;

      const matchesLocation = locationFilter === 'all' ||
        job.location === locationFilter;

      return matchesSearch && matchesJobType && matchesIndustry && matchesLocation;
    });
  };

  const getDisplayedJobs = () => {
    switch(activeTab) {
      case 'for-you':
        if (showOnlyRecommended && recommendedJobs.length > 0) {
          return getFilteredJobs(recommendedJobs);
        } else {
          // show recommended jobs first, then all others
          const recommendedJobIds = new Set(recommendedJobs.map(j => j.id));
          const otherJobs = allJobs.filter(j => !recommendedJobIds.has(j.id));
          const combinedJobs = [...recommendedJobs, ...otherJobs];
          return getFilteredJobs(combinedJobs);
        }
      case 'saved':
        const filteredSaved = savedJobs.filter(savedJob => {
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
        return filteredSaved;
      default:
        return [];
    }
  };

  const getJobMatchDetails = (job: Job) => {
    const recommended = recommendedJobs.find(rj => rj.id === job.id);
    if (!recommended || !studentProfile) return null;

    const matchingSkills = job.skills?.filter(skill => 
      studentProfile.skills?.some(s => s.toLowerCase() === skill.toLowerCase())
    ) || [];

    const matchesJobType = studentProfile.preferred_job_types?.includes(job.job_type);
    const matchesIndustry = studentProfile.preferred_industries?.includes(job.industry);

    return { matchingSkills, matchesJobType, matchesIndustry };
  };

  const isRecommended = (jobId: string) => recommendedJobs.some(rj => rj.id === jobId);

  // job card component
  const JobCard = ({ job, savedJobId = null }: { job: Job; savedJobId?: string | null }) => {
    const matchDetails = getJobMatchDetails(job);
    const recommended = isRecommended(job.id);

    return (
      <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-6 border border-gray-200">
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            {recommended && (
              <div className="flex items-center gap-1 mb-2">
                <SparklesIcon className="h-4 w-4 text-green-600" />
                <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full whitespace-nowrap">
                  Recommended for you
                </span>
              </div>
            )}
            <Link href={`/jobs/${job.id}`}>
              <h3 className="text-lg font-semibold text-gray-900 hover:text-blue-600 cursor-pointer">
                {job.title}
              </h3>
            </Link>
            <p className="text-gray-600 flex items-center gap-2 mt-1">
              <BuildingOfficeIcon className="h-4 w-4 flex-shrink-0" />
              {job.company}
            </p>
            {job.location && (
              <p className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                <MapPinIcon className="h-4 w-4 flex-shrink-0" />
                {job.location}
              </p>
            )}
          </div>
          <button
            onClick={() => toggleSaveJob(job.id)}
            className="ml-2 p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {isJobSaved(job.id) ? (
              <BookmarkSolidIcon className="h-5 w-5 text-blue-600" />
            ) : (
              <BookmarkIcon className="h-5 w-5 text-gray-400 hover:text-blue-600" />
            )}
          </button>
        </div>

        {matchDetails && (
          <div className="mb-3 p-3 bg-green-50 rounded-lg border border-green-200">
            <p className="text-sm font-medium text-green-800 mb-2">
              Why this job matches:
            </p>
            <div className="space-y-1">
              {matchDetails.matchesJobType && (
                <p className="text-xs text-green-700">
                  ✓ Matches your preferred job type
                </p>
              )}
              {matchDetails.matchesIndustry && (
                <p className="text-xs text-green-700">
                  ✓ In your preferred industry
                </p>
              )}
              {matchDetails.matchingSkills.length > 0 && (
                <p className="text-xs text-green-700">
                  ✓ Matches skills: {matchDetails.matchingSkills.join(', ')}
                </p>
              )}
            </div>
          </div>
        )}

        <p className="text-gray-700 line-clamp-2 mb-4">{job.description}</p>

        <div className="flex flex-wrap items-center gap-2 mb-4 text-sm text-gray-500">
          <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded">
            {job.job_type}
          </span>
          <span className="flex items-center gap-1">
            <BriefcaseIcon className="h-4 w-4" />
            {job.industry}
          </span>
          {job.salary_range && (
            <span className="text-green-700 font-medium">
              {job.salary_range}
            </span>
          )}
        </div>

        {job.deadline && (
          <div className="flex items-center gap-2 text-sm">
            <ClockIcon className="h-4 w-4 text-gray-400" />
            <span className={`${getDaysUntilDeadline(job.deadline) <= 7 ? 'text-orange-600 font-medium' : 'text-gray-500'}`}>
              Deadline: {new Date(job.deadline).toLocaleDateString()}
              {getDaysUntilDeadline(job.deadline) <= 7 && ` (${getDaysUntilDeadline(job.deadline)} days left)`}
            </span>
          </div>
        )}

        <div className="mt-4 flex gap-2">
          <Link href={`/jobs/${job.id}`} className="flex-1">
            <button className="w-full px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors">
              View Details
            </button>
          </Link>
          {/* disabled: quick apply
          <button
            onClick={() => setQuickApplyModal({
              isOpen: true,
              jobId: job.id,
              jobTitle: job.title,
              companyName: job.company
            })}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Quick Apply
          </button>
          */}
        </div>
      </div>
    );
  };

  // job list item component
  const JobListItem = ({ job, isSelected = false }: { job: Job; isSelected?: boolean }) => {
    const recommended = isRecommended(job.id);
    
    return (
      <div 
        onClick={() => setSelectedJob(job)}
        className={`p-4 border-b hover:bg-gray-50 cursor-pointer transition-colors ${
          isSelected ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''
        }`}
      >
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900">{job.title}</h3>
              {recommended && (
                <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
                  Recommended
                </span>
              )}
            </div>
            <p className="text-gray-600 text-sm mt-1">{job.company}</p>
            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
              <span>{job.job_type}</span>
              <span>{job.industry}</span>
              {job.location && <span>{job.location}</span>}
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleSaveJob(job.id);
            }}
            className={`p-2 rounded-lg transition-colors ${
              isJobSaved(job.id) 
                ? 'bg-blue-100 text-blue-600' 
                : 'hover:bg-gray-100 text-gray-400'
            }`}
          >
            {isJobSaved(job.id) ? (
              <BookmarkSolidIcon className="h-4 w-4" />
            ) : (
              <BookmarkIcon className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    );
  };

  // job detail panel for split view
  const JobDetailPanel = ({ job }: { job: Job }) => {
    const matchDetails = getJobMatchDetails(job);
    const recommended = isRecommended(job.id);

    return (
      <div className="h-full overflow-y-auto p-6">
        {recommended && (
          <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center gap-2 mb-2">
              <SparklesIcon className="h-5 w-5 text-green-600" />
              <span className="text-green-700 font-medium">
                Recommended for you
              </span>
            </div>
            <p className="text-sm text-green-600">
              This job matches your skills and preferences
            </p>
          </div>
        )}

        <h2 className="text-2xl font-bold text-gray-900 mb-2">{job.title}</h2>
        <p className="text-lg text-gray-700 mb-4">{job.company}</p>

        <div className="flex flex-wrap gap-2 mb-6">
          <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
            {job.job_type}
          </span>
          <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
            {job.industry}
          </span>
          {job.location && (
            <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
              📍 {job.location}
            </span>
          )}
        </div>

        <div className="space-y-6">
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
            <p className="text-gray-700 whitespace-pre-line">{job.description}</p>
          </div>

          {job.requirements && job.requirements.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Requirements</h3>
              <ul className="list-disc list-inside space-y-1">
                {job.requirements.map((req, index) => (
                  <li key={index} className="text-gray-700">{req}</li>
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
                    className={`px-3 py-1 rounded-full text-sm ${
                      matchDetails?.matchingSkills.includes(skill)
                        ? 'bg-green-100 text-green-700 font-medium'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              onClick={() => toggleSaveJob(job.id)}
              className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                isJobSaved(job.id)
                  ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {isJobSaved(job.id) ? 'Saved' : 'Save Job'}
            </button>
            <Link href={`/jobs/${job.id}`} className="flex-1">
              <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                View Full Details
              </button>
            </Link>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* header with title and profile button */}
        <div className="mb-6 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Student Dashboard</h1>
            <p className="text-gray-600 mt-2">Find your perfect opportunity</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600 mb-2">Welcome, {session?.user?.email}</p>
            <Link href="/student/profile">
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2">
                <UserCircleIcon className="h-5 w-5" />
                Edit Profile
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
            <div className="text-2xl font-bold text-gray-900">
              {allJobs.filter(job => {
                const createdDate = new Date(job.created_at);
                const oneWeekAgo = new Date();
                oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
                return createdDate >= oneWeekAgo;
              }).length}
            </div>
            <div className="text-sm text-gray-600">New This Week</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-orange-500">
            <div className="text-2xl font-bold text-gray-900">{upcomingDeadlines.length}</div>
            <div className="text-sm text-gray-600">Due This Week</div>
          </div>
        </div>

        {/* urgent deadlines alert */}
        {upcomingDeadlines.filter(job => getDaysUntilDeadline(job.deadline) <= 2).length > 0 && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <BellIcon className="h-5 w-5 text-red-600" />
              <h3 className="font-semibold text-red-900">Urgent Deadlines!</h3>
            </div>
            <div className="space-y-2">
              {upcomingDeadlines
                .filter(job => getDaysUntilDeadline(job.deadline) <= 2)
                .slice(0, 3)
                .map(job => (
                  <div key={job.id} className="flex justify-between items-center">
                    <div className="text-sm">
                      <span className="font-medium text-gray-900">{job.title}</span>
                      <span className="text-gray-600"> at {job.company}</span>
                    </div>
                    <span className="text-sm font-medium text-red-600">
                      {getDaysUntilDeadline(job.deadline) === 0 
                        ? 'Due today!' 
                        : getDaysUntilDeadline(job.deadline) === 1 
                          ? 'Due tomorrow!' 
                          : `Due in ${getDaysUntilDeadline(job.deadline)} days`}
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
              onClick={() => setActiveTab('saved')}
              className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'saved'
                  ? 'border-uga-red text-uga-red'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span className="flex items-center gap-2">
                <BookmarkIcon className="h-4 w-4" />
                Saved
                {savedJobs.length > 0 && (
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full text-xs">
                    {savedJobs.length}
                  </span>
                )}
              </span>
            </button>
            {/* disabled: applications tab hidden
            <button
              onClick={() => setActiveTab('applications')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'applications'
                  ? 'border-uga-red text-uga-red'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Applications
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

        {/* search and filter controls */}
        {(activeTab === 'for-you' || activeTab === 'saved') && (
          <div className="mb-4 space-y-4">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search jobs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`px-4 py-2 border rounded-lg transition-colors flex items-center gap-2 ${
                  showFilters ? 'bg-blue-50 border-blue-300' : 'border-gray-300 hover:bg-gray-50'
                }`}
              >
                <FunnelIcon className="h-5 w-5" />
                Filters
                {hasActiveFilters() && (
                  <span className="bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded-full">
                    {[searchTerm ? 1 : 0, jobTypeFilters.length, industryFilter ? 1 : 0, locationFilter !== 'all' ? 1 : 0, showOnlyRecommended ? 1 : 0].reduce((a, b) => a + b, 0)}
                  </span>
                )}
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => setViewMode('cards')}
                  className={`p-2 rounded-lg ${viewMode === 'cards' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:bg-gray-100'}`}
                >
                  <Squares2X2Icon className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:bg-gray-100'}`}
                >
                  <ListBulletIcon className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setViewMode('split')}
                  className={`p-2 rounded-lg ${viewMode === 'split' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:bg-gray-100'}`}
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h2m10-16h2a2 2 0 012 2v12a2 2 0 01-2 2h-2m-4-16v16" />
                  </svg>
                </button>
              </div>
            </div>

            {/* filter panel */}
            {showFilters && (
              <div className="bg-white rounded-lg shadow-sm border p-4 space-y-4">
                {activeTab === 'for-you' && recommendedJobs.length > 0 && (
                  <div>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={showOnlyRecommended}
                        onChange={(e) => setShowOnlyRecommended(e.target.checked)}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm text-gray-700">Show only recommended</span>
                    </label>
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Job Type
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {['Internship', 'Part-Time', 'Full-Time'].map(type => (
                      <label key={type} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={jobTypeFilters.includes(type)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setJobTypeFilters([...jobTypeFilters, type]);
                            } else {
                              setJobTypeFilters(jobTypeFilters.filter(t => t !== type));
                            }
                          }}
                          className="rounded border-gray-300"
                        />
                        <span className="text-sm text-gray-700">{type}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Industry
                  </label>
                  <select
                    value={industryFilter}
                    onChange={(e) => setIndustryFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Industries</option>
                    {uniqueIndustries.slice(1).map(industry => (
                      <option key={industry} value={industry}>{industry}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Location
                  </label>
                  <select
                    value={locationFilter}
                    onChange={(e) => setLocationFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Locations</option>
                    {uniqueLocations.slice(1).map(location => (
                      <option key={location} value={location}>{location}</option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={clearAllFilters}
                  className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium"
                >
                  Clear All Filters
                </button>
              </div>
            )}
          </div>
        )}

        {/* tab content */}
        <div>
          {/* for you tab */}
          {activeTab === 'for-you' && (
            <div>
              <div className="text-sm text-gray-600 mb-4">
                {getDisplayedJobs().length} jobs found
                {recommendedJobs.length > 0 && !showOnlyRecommended && (
                  <span className="ml-2 text-green-600">
                    ({recommendedJobs.length} recommended based on your profile)
                  </span>
                )}
              </div>
              
              {getDisplayedJobs().length === 0 ? (
                <div className="text-center py-12 bg-white rounded-lg shadow-sm">
                  <BriefcaseIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-2">
                    {hasActiveFilters() 
                      ? showOnlyRecommended
                        ? 'No recommended jobs match your filters. Complete your profile for better matches.'
                        : 'No jobs match your filters'
                      : 'No jobs available at the moment'}
                  </p>
                  {hasActiveFilters() && (
                    <button
                      onClick={clearAllFilters}
                      className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Clear Filters
                    </button>
                  )}
                </div>
              ) : viewMode === 'split' ? (
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
                <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                  {getDisplayedJobs().map((job) => (
                    <JobListItem key={job.id} job={job as Job} />
                  ))}
                </div>
              ) : (
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
                <div className="text-center py-12 bg-white rounded-lg shadow-sm">
                  <BookmarkIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">You haven't saved any jobs yet.</p>
                  <button
                    onClick={() => setActiveTab('for-you')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Browse Jobs
                  </button>
                </div>
              ) : getDisplayedJobs().length === 0 ? (
                <div className="text-center py-12 bg-white rounded-lg shadow-sm">
                  <p className="text-gray-600 mb-4">No saved jobs match your filters.</p>
                  <button
                    onClick={clearAllFilters}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Clear Filters
                  </button>
                </div>
              ) : viewMode === 'split' ? (
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
                <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                  {(getDisplayedJobs() as SavedJob[]).map((savedJob) => (
                    <JobListItem key={savedJob.id} job={savedJob.job} />
                  ))}
                </div>
              ) : (
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
                      application content here
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