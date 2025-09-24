// pages/index.tsx - Enhanced main job board page
import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import { useRouter } from 'next/router';

// Initialize Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Job interface with all fields
interface Job {
  id: string;
  title: string;
  company: string;
  job_type: 'Internship' | 'Part-Time' | 'Full-Time';
  industry: string;
  description: string;
  deadline: string;
  created_at: string;
  created_by: string;
  location?: string;
  salary_range?: string;
  skills?: string[];
  requirements?: string[];
  status: string;
  // enhanced fields
  creator_role?: string;
  creator_name?: string;
}

type JobFilter = 'all' | 'faculty' | 'companies';

// Loading skeleton component for better UX
const JobCardSkeleton = () => (
  <div className="border border-gray-200 bg-white rounded-lg p-6 animate-pulse">
    <div className="h-6 bg-gray-200 rounded w-3/4 mb-3"></div>
    <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
    <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
    <div className="h-3 bg-gray-200 rounded w-full mb-4"></div>
    <div className="flex gap-2">
      <div className="h-10 bg-gray-200 rounded flex-1"></div>
      <div className="h-10 bg-gray-200 rounded flex-1"></div>
    </div>
  </div>
);

// Simplified job card without auth checks
const JobCard = ({ job, isStudent, hasApplied, onApply }: { 
  job: Job;
  isStudent: boolean;
  hasApplied: boolean;
  onApply: (jobId: string) => void;
}) => {
  const router = useRouter();
  
  // calculate deadline info
  const daysUntilDeadline = Math.ceil(
    (new Date(job.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );
  const isExpired = daysUntilDeadline < 0;
  const isUrgent = daysUntilDeadline >= 0 && daysUntilDeadline <= 3;
  const isNew = (new Date().getTime() - new Date(job.created_at).getTime()) / (1000 * 60 * 60) <= 48;

  const jobTypeColors = {
    'Internship': 'bg-purple-100 text-purple-800 border-purple-200',
    'Part-Time': 'bg-blue-100 text-blue-800 border-blue-200',
    'Full-Time': 'bg-green-100 text-green-800 border-green-200',
  };

  return (
    <div className={`border bg-white rounded-lg p-6 flex flex-col transition-all duration-300 ${
      isExpired 
        ? 'opacity-60 border-gray-200' 
        : 'border-gray-200 hover:shadow-lg hover:border-gray-300'
    }`}>
      <div className="flex-grow">
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1 pr-2">
            <div className="flex items-start gap-2">
              <h3 className="font-bold text-xl text-gray-800 line-clamp-1">
                {job.title}
              </h3>
              {isNew && !isExpired && (
                <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full shrink-0">
                  NEW
                </span>
              )}
            </div>
            <p className="text-gray-700 font-medium mt-1">{job.company}</p>
          </div>
          
          {/* job source badge */}
          <span className={`text-xs px-2 py-1 rounded-full shrink-0 ${
            job.creator_role === 'rep' 
              ? 'bg-green-100 text-green-800' 
              : 'bg-blue-100 text-blue-800'
          }`}>
            {job.creator_role === 'rep' ? 'External' : 'UGA'}
          </span>
        </div>

        {/* location and salary */}
        <div className="flex flex-wrap gap-3 text-sm text-gray-600 mb-3">
          {job.location && (
            <span className="flex items-center gap-1">
              📍 {job.location}
            </span>
          )}
          {job.salary_range && (
            <span className="flex items-center gap-1">
              💰 {job.salary_range}
            </span>
          )}
          <span className="flex items-center gap-1">
            🏢 {job.industry}
          </span>
        </div>
        
        {/* description with proper overflow */}
        <p className="text-sm text-gray-600 line-clamp-2 mb-3">
          {job.description}
        </p>

        {/* show first few skills if available */}
        {job.skills && job.skills.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {job.skills.slice(0, 3).map((skill, idx) => (
              <span key={idx} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                {skill}
              </span>
            ))}
            {job.skills.length > 3 && (
              <span className="px-2 py-0.5 text-gray-500 text-xs">
                +{job.skills.length - 3} more
              </span>
            )}
          </div>
        )}
      </div>
      
      <div className="mt-auto pt-3 border-t">
        {/* job type and deadline */}
        <div className="flex justify-between items-center mb-3">
          <span className={`px-3 py-1 text-sm font-medium rounded-full border ${
            jobTypeColors[job.job_type] || 'bg-gray-100 text-gray-800 border-gray-200'
          }`}>
            {job.job_type}
          </span>
          
          <span className={`text-sm font-medium ${
            isExpired ? 'text-red-600' :
            isUrgent ? 'text-orange-600' :
            'text-gray-600'
          }`}>
            {isExpired ? 'Expired' :
             daysUntilDeadline === 0 ? 'Due today!' :
             daysUntilDeadline === 1 ? 'Due tomorrow' :
             isUrgent ? `${daysUntilDeadline} days left` :
             new Date(job.deadline).toLocaleDateString()}
          </span>
        </div>

        {/* action buttons */}
        <div className="flex gap-2">
          <Link href={`/jobs/${job.id}`} className="flex-1">
            <button className="w-full bg-gray-700 text-white font-medium py-2 px-4 rounded-lg hover:bg-gray-800 transition-colors">
              View Details
            </button>
          </Link>
          
          {/* only show apply for students */}
          {isStudent && !isExpired && (
            <>
              {hasApplied ? (
                <button 
                  disabled
                  className="flex-1 bg-green-100 text-green-800 font-medium py-2 px-4 rounded-lg cursor-not-allowed"
                >
                  ✓ Applied
                </button>
              ) : (
                <button
                  onClick={() => onApply(job.id)}
                  className="flex-1 bg-red-700 text-white font-medium py-2 px-4 rounded-lg hover:bg-red-800 transition-colors"
                >
                  Quick Apply
                </button>
              )}
            </>
          )}
          
          {/* prompt non-students to sign up */}
          {!isStudent && !isExpired && (
            <button
              onClick={() => router.push('/login')}
              className="flex-1 bg-red-700 text-white font-medium py-2 px-4 rounded-lg hover:bg-red-800 transition-colors"
            >
              Sign in to Apply
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Main component - properly named now
export default function JobBoard() {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<JobFilter>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [userSession, setUserSession] = useState<any>(null);
  const [isStudent, setIsStudent] = useState(false);
  const [applications, setApplications] = useState<Set<string>>(new Set());
  
  // filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [jobTypeFilters, setJobTypeFilters] = useState<string[]>([]);
  const [industryFilter, setIndustryFilter] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [quickFilter, setQuickFilter] = useState<string>('');
  
  const JOBS_PER_PAGE = 12;

  // check user session once on mount
  useEffect(() => {
    checkUserSession();
  }, []);

  // fetch jobs on mount
  useEffect(() => {
    fetchJobsWithCreatorInfo();
  }, []);

  // fetch applications if student
  useEffect(() => {
    if (isStudent && userSession) {
      fetchUserApplications();
    }
  }, [isStudent, userSession]);

  const checkUserSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUserSession(session);
        
        // check if user is a student
        const { data: userData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id)
          .single();
        
        if (userData?.role === 'student') {
          setIsStudent(true);
        }
      }
    } catch (error) {
      console.error('Error checking session:', error);
    }
  };

  const fetchUserApplications = async () => {
    if (!userSession) return;
    
    try {
      const { data } = await supabase
        .from('job_applications')
        .select('job_id')
        .eq('student_id', userSession.user.id);
      
      if (data) {
        setApplications(new Set(data.map(app => app.job_id)));
      }
    } catch (error) {
      console.error('Error fetching applications:', error);
    }
  };

  const fetchJobsWithCreatorInfo = async () => {
    setLoading(true);
    
    try {
      // get all active jobs
      const { data: jobsData, error: jobsError } = await supabase
        .from('jobs')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (jobsError) throw jobsError;

      if (!jobsData || jobsData.length === 0) {
        setJobs([]);
        setLoading(false);
        return;
      }

      // get creator info
      const creatorIds = [...new Set(jobsData.map(job => job.created_by))];
      const { data: creatorsData } = await supabase
        .from('user_roles')
        .select('user_id, role, first_name, last_name, company_name')
        .in('user_id', creatorIds);

      // create lookup map
      const creatorsMap = new Map();
      creatorsData?.forEach(creator => {
        creatorsMap.set(creator.user_id, creator);
      });

      // enrich jobs with creator info
      const enrichedJobs = jobsData.map(job => {
        const creator = creatorsMap.get(job.created_by);
        return {
          ...job,
          creator_role: creator?.role || 'unknown',
          creator_name: creator?.role === 'rep' 
            ? creator?.company_name 
            : `${creator?.first_name || ''} ${creator?.last_name || ''}`.trim()
        };
      });

      setJobs(enrichedJobs);
    } catch (error) {
      console.error('Error fetching jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickApply = async (jobId: string) => {
    if (!userSession) {
      router.push('/login');
      return;
    }

    try {
      const { error } = await supabase
        .from('job_applications')
        .insert({
          job_id: jobId,
          student_id: userSession.user.id,
          status: 'applied'
        });

      if (!error) {
        setApplications(prev => new Set(prev).add(jobId));
        alert('Application submitted successfully!');
      }
    } catch (error) {
      console.error('Error applying:', error);
      alert('Failed to submit application');
    }
  };

  // handle quick filters
  const handleQuickFilter = (filter: string) => {
    setQuickFilter(filter);
    setCurrentPage(1);
    
    switch(filter) {
      case 'remote':
        // filter for remote jobs - check location field
        break;
      case 'urgent':
        setSortBy('deadline');
        break;
      case 'new':
        setSortBy('created_at');
        break;
      default:
        break;
    }
  };

  // clear all filters
  const clearAllFilters = () => {
    setSearchTerm('');
    setJobTypeFilters([]);
    setIndustryFilter('');
    setSortBy('created_at');
    setQuickFilter('');
    setCurrentPage(1);
  };

  // calculate derived data
  const industries = useMemo(() => {
    const uniqueIndustries = new Set(jobs.map(job => job.industry));
    return Array.from(uniqueIndustries).sort();
  }, [jobs]);

  // filter jobs based on tab
  const filteredJobsByTab = useMemo(() => {
    switch (activeTab) {
      case 'faculty':
        return jobs.filter(job => 
          job.creator_role === 'faculty' || job.creator_role === 'staff'
        );
      case 'companies':
        return jobs.filter(job => job.creator_role === 'rep');
      default:
        return jobs;
    }
  }, [jobs, activeTab]);

  // apply all filters
  const finalFilteredJobs = useMemo(() => {
    let filtered = filteredJobsByTab.filter(job => {
      // search filter
      const matchesSearch = searchTerm === '' ||
        job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.description.toLowerCase().includes(searchTerm.toLowerCase());

      // job type filter
      const matchesJobType = jobTypeFilters.length === 0 || 
        jobTypeFilters.includes(job.job_type);
      
      // industry filter
      const matchesIndustry = industryFilter === '' || 
        job.industry === industryFilter;
      
      // quick filters
      let matchesQuickFilter = true;
      if (quickFilter === 'remote') {
        matchesQuickFilter = job.location?.toLowerCase().includes('remote') || false;
      } else if (quickFilter === 'urgent') {
        const days = Math.ceil((new Date(job.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
        matchesQuickFilter = days >= 0 && days <= 7;
      } else if (quickFilter === 'new') {
        const hours = (new Date().getTime() - new Date(job.created_at).getTime()) / (1000 * 60 * 60);
        matchesQuickFilter = hours <= 48;
      }
      
      return matchesSearch && matchesJobType && matchesIndustry && matchesQuickFilter;
    });

    // sorting
    filtered.sort((a, b) => {
      if (sortBy === 'deadline') {
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return filtered;
  }, [filteredJobsByTab, searchTerm, jobTypeFilters, industryFilter, sortBy, quickFilter]);

  // paginate
  const paginatedJobs = useMemo(() => {
    const startIndex = (currentPage - 1) * JOBS_PER_PAGE;
    return finalFilteredJobs.slice(startIndex, startIndex + JOBS_PER_PAGE);
  }, [finalFilteredJobs, currentPage]);

  const totalPages = Math.ceil(finalFilteredJobs.length / JOBS_PER_PAGE);

  // get counts
  const jobCounts = useMemo(() => ({
    all: jobs.length,
    faculty: jobs.filter(job => 
      job.creator_role === 'faculty' || job.creator_role === 'staff'
    ).length,
    companies: jobs.filter(job => job.creator_role === 'rep').length
  }), [jobs]);

  // stats for hero section
  const stats = useMemo(() => {
    const activeJobs = jobs.filter(job => 
      new Date(job.deadline) >= new Date()
    ).length;
    const newJobs = jobs.filter(job => {
      const hours = (new Date().getTime() - new Date(job.created_at).getTime()) / (1000 * 60 * 60);
      return hours <= 48;
    }).length;
    
    return { activeJobs, newJobs, totalJobs: jobs.length };
  }, [jobs]);

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* hero section */}
      <header className="bg-gradient-to-r from-red-700 to-red-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h1 className="text-4xl font-bold mb-3">UGA Job Board</h1>
          <p className="text-xl opacity-95 mb-6">Find your next opportunity at the University of Georgia</p>
          
          {/* quick stats */}
          <div className="grid grid-cols-3 gap-4 max-w-md">
            <div>
              <p className="text-3xl font-bold">{stats.activeJobs}</p>
              <p className="text-sm opacity-90">Active Jobs</p>
            </div>
            <div>
              <p className="text-3xl font-bold">{stats.newJobs}</p>
              <p className="text-sm opacity-90">New This Week</p>
            </div>
            <div>
              <p className="text-3xl font-bold">{jobCounts.companies}</p>
              <p className="text-sm opacity-90">Companies</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="border-b">
            <nav className="flex -mb-px">
              <button
                onClick={() => {setActiveTab('all'); setCurrentPage(1);}}
                className={`px-6 py-3 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'all'
                    ? 'border-red-700 text-red-700'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                All Jobs
                <span className="ml-2 px-2 py-0.5 bg-gray-100 rounded-full text-xs">
                  {jobCounts.all}
                </span>
              </button>
              
              <button
                onClick={() => {setActiveTab('faculty'); setCurrentPage(1);}}
                className={`px-6 py-3 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'faculty'
                    ? 'border-red-700 text-red-700'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Faculty & Staff
                <span className="ml-2 px-2 py-0.5 bg-blue-100 rounded-full text-xs">
                  {jobCounts.faculty}
                </span>
              </button>
              
              <button
                onClick={() => {setActiveTab('companies'); setCurrentPage(1);}}
                className={`px-6 py-3 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'companies'
                    ? 'border-red-700 text-red-700'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Companies
                <span className="ml-2 px-2 py-0.5 bg-green-100 rounded-full text-xs">
                  {jobCounts.companies}
                </span>
              </button>
            </nav>
          </div>

          {/* quick filters */}
          <div className="p-4 flex flex-wrap gap-2">
            <button
              onClick={() => handleQuickFilter(quickFilter === 'new' ? '' : 'new')}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                quickFilter === 'new'
                  ? 'bg-red-700 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              🆕 New Jobs
            </button>
            <button
              onClick={() => handleQuickFilter(quickFilter === 'urgent' ? '' : 'urgent')}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                quickFilter === 'urgent'
                  ? 'bg-red-700 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              ⏰ Deadline Soon
            </button>
            <button
              onClick={() => handleQuickFilter(quickFilter === 'remote' ? '' : 'remote')}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                quickFilter === 'remote'
                  ? 'bg-red-700 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              🌍 Remote
            </button>
            
            {(quickFilter || searchTerm || jobTypeFilters.length > 0 || industryFilter) && (
              <button
                onClick={clearAllFilters}
                className="px-4 py-1.5 rounded-full text-sm font-medium bg-gray-200 text-gray-700 hover:bg-gray-300 ml-auto"
              >
                Clear All Filters
              </button>
            )}
          </div>
        </div>

        {/* filters section */}
        <div className="bg-white p-4 rounded-lg shadow-sm mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <input
                type="text"
                placeholder="Search jobs, companies, or keywords..."
                value={searchTerm}
                onChange={(e) => {setSearchTerm(e.target.value); setCurrentPage(1);}}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>
            
            <select
              value={industryFilter}
              onChange={(e) => {setIndustryFilter(e.target.value); setCurrentPage(1);}}
              className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500"
            >
              <option value="">All Industries</option>
              {industries.map(industry => (
                <option key={industry} value={industry}>{industry}</option>
              ))}
            </select>
            
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500"
            >
              <option value="created_at">Newest First</option>
              <option value="deadline">Deadline Soon</option>
            </select>
          </div>
          
          {/* job type filters */}
          <div className="mt-4 flex flex-wrap gap-3">
            <span className="text-sm font-medium text-gray-700">Job Type:</span>
            {['Internship', 'Part-Time', 'Full-Time'].map(type => (
              <label key={type} className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={jobTypeFilters.includes(type)}
                  onChange={() => {
                    setJobTypeFilters(prev =>
                      prev.includes(type) 
                        ? prev.filter(t => t !== type) 
                        : [...prev, type]
                    );
                    setCurrentPage(1);
                  }}
                  className="mr-2 text-red-700 focus:ring-red-500 rounded"
                />
                <span className="text-sm text-gray-600">{type}</span>
              </label>
            ))}
          </div>
        </div>

        {/* results count */}
        {!loading && (
          <div className="mb-4 text-sm text-gray-600">
            Showing {paginatedJobs.length} of {finalFilteredJobs.length} jobs
            {(searchTerm || jobTypeFilters.length > 0 || industryFilter || quickFilter) && 
              ' (filtered)'}
          </div>
        )}

        {/* job listings */}
        <div>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <JobCardSkeleton key={i} />
              ))}
            </div>
          ) : paginatedJobs.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
                {paginatedJobs.map(job => (
                  <JobCard 
                    key={job.id} 
                    job={job}
                    isStudent={isStudent}
                    hasApplied={applications.has(job.id)}
                    onApply={handleQuickApply}
                  />
                ))}
              </div>

              {/* pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Previous
                  </button>
                  
                  <div className="flex gap-1">
                    {[...Array(Math.min(5, totalPages))].map((_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      
                      return (
                        <button
                          key={i}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`w-10 h-10 rounded-lg font-medium ${
                            currentPage === pageNum
                              ? 'bg-red-700 text-white'
                              : 'border hover:bg-gray-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center bg-white p-12 rounded-lg shadow-sm">
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                No jobs found
              </h3>
              <p className="text-gray-600 mb-4">
                Try adjusting your filters or search terms
              </p>
              {(searchTerm || jobTypeFilters.length > 0 || industryFilter || quickFilter) && (
                <button
                  onClick={clearAllFilters}
                  className="px-4 py-2 bg-red-700 text-white rounded-lg hover:bg-red-800"
                >
                  Clear All Filters
                </button>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}