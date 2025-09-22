import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Define the structure of a Job object for TypeScript
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
  // New fields for enhanced filtering
  creator_role?: string; // 'faculty', 'staff', 'rep'
  creator_name?: string; // For display purposes
}

type JobFilter = 'all' | 'faculty' | 'companies';

// Enhanced Job Card component with creator info
const JobCard = ({ job }: { job: Job }) => {
  const jobTypeColors = {
    'Internship': 'bg-blue-100 text-blue-800',
    'Part-Time': 'bg-yellow-100 text-yellow-800',
    'Full-Time': 'bg-green-100 text-green-800',
  };

  return (
    <div className="border border-gray-200 bg-white rounded-lg p-6 flex flex-col shadow-md hover:shadow-lg transition-shadow duration-300">
      <div className="flex-grow">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-bold text-xl text-gray-800">{job.title}</h3>
          {/* Creator type indicator */}
          {job.creator_role === 'rep' && (
            <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
              External
            </span>
          )}
          {(job.creator_role === 'faculty' || job.creator_role === 'staff') && (
            <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
              UGA
            </span>
          )}
        </div>
        
        <p className="text-gray-600 mb-2">{job.company}</p>
        <p className="text-sm text-gray-500 line-clamp-2 mb-4">{job.description}</p>
      </div>
      
      <div className="mt-auto">
        <span className={`inline-block rounded-full px-3 py-1 text-sm font-semibold mr-2 mb-2 ${
          jobTypeColors[job.job_type] || 'bg-gray-100 text-gray-800'
        }`}>
          {job.job_type}
        </span>
        <p className="text-sm text-gray-500 mb-4">
          Apply by: {new Date(job.deadline).toLocaleDateString()}
        </p>
        <Link href={`/jobs/${job.id}`} passHref>
          <button className="w-full bg-red-700 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 transition-colors">
            View Details
          </button>
        </Link>
      </div>
    </div>
  );
};

// Main Student Dashboard Component
export default function StudentDashboard() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<JobFilter>('all');
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [jobTypeFilters, setJobTypeFilters] = useState<string[]>([]);
  const [industryFilter, setIndustryFilter] = useState('');
  const [sortBy, setSortBy] = useState('created_at');

  // Fetch all active jobs on initial load with creator information
  useEffect(() => {
    const fetchJobsWithCreatorInfo = async () => {
      setLoading(true);
      
      // First, get all active jobs (this should work like your original code)
      const { data: jobsData, error: jobsError } = await supabase
        .from('jobs')
        .select('*')
        .eq('status', 'active');

      if (jobsError) {
        console.error('Error fetching jobs:', jobsError);
        setLoading(false);
        return;
      }

      if (!jobsData || jobsData.length === 0) {
        setJobs([]);
        setLoading(false);
        return;
      }

      // Get unique creator IDs
      const creatorIds = [...new Set(jobsData.map(job => job.created_by))];
      
      // Fetch creator role information
      const { data: creatorsData, error: creatorsError } = await supabase
        .from('user_roles')
        .select('user_id, role, first_name, last_name, company_name')
        .in('user_id', creatorIds);

      if (creatorsError) {
        console.error('Error fetching creators:', creatorsError);
        // Still show jobs even if we can't get creator info
        setJobs(jobsData);
        setLoading(false);
        return;
      }

      // Create a map for quick lookup
      const creatorsMap = new Map();
      creatorsData?.forEach(creator => {
        creatorsMap.set(creator.user_id, creator);
      });

      // Enrich jobs with creator information
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
      setLoading(false);
    };

    fetchJobsWithCreatorInfo();
  }, []);

  // Handle job type filter changes
  const handleJobTypeChange = (type: string) => {
    setJobTypeFilters(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  // Memoize derived data to avoid re-calculating on every render
  const industries = useMemo(() => {
    const uniqueIndustries = new Set(jobs.map(job => job.industry));
    return Array.from(uniqueIndustries).sort();
  }, [jobs]);

  // Filter jobs based on active tab
  const filteredJobsByTab = useMemo(() => {
    switch (activeTab) {
      case 'faculty':
        return jobs.filter(job => 
          job.creator_role === 'faculty' || job.creator_role === 'staff'
        );
      case 'companies':
        return jobs.filter(job => job.creator_role === 'rep');
      case 'all':
      default:
        return jobs;
    }
  }, [jobs, activeTab]);

  // Apply additional filters to the tab-filtered jobs
  const finalFilteredJobs = useMemo(() => {
    return filteredJobsByTab
      .filter(job => {
        // Search term filter (title and company)
        const matchesSearch = searchTerm.toLowerCase() === '' ||
          job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          job.company.toLowerCase().includes(searchTerm.toLowerCase());

        // Job type filter
        const matchesJobType = jobTypeFilters.length === 0 || jobTypeFilters.includes(job.job_type);
        
        // Industry filter
        const matchesIndustry = industryFilter === '' || job.industry === industryFilter;
        
        return matchesSearch && matchesJobType && matchesIndustry;
      })
      .sort((a, b) => {
        if (sortBy === 'deadline') {
          return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
        }
        // Default sort by 'created_at' (newest first)
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }, [filteredJobsByTab, searchTerm, jobTypeFilters, industryFilter, sortBy]);

  // Get counts for tab badges
  const jobCounts = useMemo(() => {
    return {
      all: jobs.length,
      faculty: jobs.filter(job => 
        job.creator_role === 'faculty' || job.creator_role === 'staff'
      ).length,
      companies: jobs.filter(job => job.creator_role === 'rep').length
    };
  }, [jobs]);

  return (
    <div className="bg-gray-50 min-h-screen">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold leading-tight text-red-800">UGA Job Board</h1>
          <p className="text-gray-600 mt-1">Find your next opportunity.</p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('all')}
                className={`${
                  activeTab === 'all'
                    ? 'border-red-700 text-red-800'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-lg flex items-center`}
              >
                All Jobs
                <span className="ml-2 bg-gray-100 text-gray-900 py-0.5 px-2.5 rounded-full text-xs font-medium">
                  {jobCounts.all}
                </span>
              </button>
              
              <button
                onClick={() => setActiveTab('faculty')}
                className={`${
                  activeTab === 'faculty'
                    ? 'border-red-700 text-red-800'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-lg flex items-center`}
              >
                Faculty & Staff
                <span className="ml-2 bg-blue-100 text-blue-900 py-0.5 px-2.5 rounded-full text-xs font-medium">
                  {jobCounts.faculty}
                </span>
              </button>
              
              <button
                onClick={() => setActiveTab('companies')}
                className={`${
                  activeTab === 'companies'
                    ? 'border-red-700 text-red-800'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-lg flex items-center`}
              >
                Companies
                <span className="ml-2 bg-green-100 text-green-900 py-0.5 px-2.5 rounded-full text-xs font-medium">
                  {jobCounts.companies}
                </span>
              </button>
            </nav>
          </div>
        </div>

        {/* Filters Section */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Search */}
            <div className="md:col-span-2">
              <label htmlFor="search" className="block text-sm font-medium text-gray-700">Search by Title/Company</label>
              <input
                type="text"
                id="search"
                placeholder="e.g. Software Engineer"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-red-500 focus:border-red-500 sm:text-sm p-2"
              />
            </div>
            
            {/* Industry */}
            <div>
              <label htmlFor="industry" className="block text-sm font-medium text-gray-700">Industry</label>
              <select
                id="industry"
                value={industryFilter}
                onChange={(e) => setIndustryFilter(e.target.value)}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm rounded-md"
              >
                <option value="">All Industries</option>
                {industries.map(industry => (
                  <option key={industry} value={industry}>{industry}</option>
                ))}
              </select>
            </div>
            
            {/* Sort By */}
            <div>
              <label htmlFor="sort" className="block text-sm font-medium text-gray-700">Sort By</label>
              <select
                id="sort"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm rounded-md"
              >
                <option value="created_at">Newest</option>
                <option value="deadline">Application Deadline</option>
              </select>
            </div>
          </div>
          
          {/* Job Type Checkboxes */}
          <div className="mt-6">
            <h4 className="text-sm font-medium text-gray-700">Job Type</h4>
            <div className="mt-2 flex flex-wrap gap-x-6 gap-y-2">
              {['Internship', 'Part-Time', 'Full-Time'].map(type => (
                <label key={type} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={jobTypeFilters.includes(type)}
                    onChange={() => handleJobTypeChange(type)}
                    className="h-4 w-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                  />
                  <span className="ml-2 text-sm text-gray-600">{type}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Job Listings with Tab Context */}
        <div>
          {loading ? (
            <p className="text-center text-gray-500">Loading jobs...</p>
          ) : finalFilteredJobs.length > 0 ? (
            <div>
              {/* Tab-specific messaging */}
              {activeTab === 'faculty' && (
                <div className="mb-6 p-4 bg-blue-50 border-l-4 border-blue-400">
                  <p className="text-blue-800">
                    <span className="font-semibold">Faculty & Staff Opportunities</span> - 
                    Internal positions and research opportunities posted by UGA faculty and staff.
                  </p>
                </div>
              )}
              
              {activeTab === 'companies' && (
                <div className="mb-6 p-4 bg-green-50 border-l-4 border-green-400">
                  <p className="text-green-800">
                    <span className="font-semibold">External Company Opportunities</span> - 
                    Positions with partner companies and external organizations.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {finalFilteredJobs.map(job => (
                  <JobCard key={job.id} job={job} />
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center bg-white p-10 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-xl font-semibold text-gray-800">No Jobs Found</h3>
              <p className="text-gray-500 mt-2">
                {activeTab === 'all' 
                  ? 'Try adjusting your search or filter criteria.'
                  : `No ${activeTab === 'faculty' ? 'faculty & staff' : 'company'} opportunities match your criteria.`
                }
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}