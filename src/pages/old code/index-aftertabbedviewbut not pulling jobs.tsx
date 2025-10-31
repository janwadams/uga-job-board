//pages/index.tsx

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
  department: string; // NEW: Added department field
  description: string;
  deadline: string;
  created_at: string;
  // This will be added after fetching
  creator_role?: 'faculty' | 'rep' | 'admin'; 
}

// A reusable Job Card component
const JobCard = ({ job }: { job: Job }) => {
  const jobTypeColors = {
    'Internship': 'bg-blue-100 text-blue-800',
    'Part-Time': 'bg-yellow-100 text-yellow-800',
    'Full-Time': 'bg-green-100 text-green-800',
  };

  return (
    <div className="border border-gray-200 bg-white rounded-lg p-6 flex flex-col shadow-md hover:shadow-lg transition-shadow duration-300 h-full">
      <div className="flex-grow">
        <h3 className="font-bold text-xl text-gray-800 font-heading">{job.title}</h3>
        <p className="text-gray-600 mb-2">{job.company}</p>
        <p className="text-sm text-gray-500 line-clamp-2 mb-4">{job.description}</p>
      </div>
      <div className="mt-auto">
         <span className={`inline-block rounded-full px-3 py-1 text-sm font-semibold mr-2 mb-2 ${jobTypeColors[job.job_type] || 'bg-gray-100 text-gray-800'}`}>
            {job.job_type}
        </span>
        <p className="text-sm text-gray-500 mb-4">
          Apply by: {new Date(job.deadline).toLocaleDateString()}
        </p>
        <Link href={`/jobs/${job.id}`} passHref>
          <button className="w-full bg-uga-red text-white font-bold py-2 px-4 rounded-lg hover:bg-opacity-80 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 transition-colors">
            View Details
          </button>
        </Link>
      </div>
    </div>
  );
};

// Main Job Board Component
export default function JobBoard() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filter states
  const [activeTab, setActiveTab] = useState<'all' | 'internal' | 'external'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [jobTypeFilters, setJobTypeFilters] = useState<string[]>([]);
  const [industryFilter, setIndustryFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState(''); // NEW state for department
  const [sortBy, setSortBy] = useState('created_at');

  // Fetch all active jobs and their creators' roles on initial load
  useEffect(() => {
    const fetchJobs = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('jobs')
        .select(`
          *,
          user_roles ( role )
        `)
        .eq('status', 'active');

      if (error) {
        console.error('Error fetching jobs:', error);
      } else {
        // Process data to flatten the role
        const processedData = data.map(job => ({
            ...job,
            creator_role: job.user_roles?.role,
        }));
        setJobs(processedData || []);
      }
      setLoading(false);
    };
    fetchJobs();
  }, []);

  const handleJobTypeChange = (type: string) => {
    setJobTypeFilters(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };
  
  // Memoize derived data
  const { industries, departments } = useMemo(() => {
    const uniqueIndustries = new Set<string>();
    const uniqueDepartments = new Set<string>();
    jobs.forEach(job => {
        uniqueIndustries.add(job.industry);
        if(job.department) { // Only add if department exists
            uniqueDepartments.add(job.department);
        }
    });
    return {
        industries: Array.from(uniqueIndustries).sort(),
        departments: Array.from(uniqueDepartments).sort(),
    };
  }, [jobs]);

  const filteredAndSortedJobs = useMemo(() => {
    return jobs
      .filter(job => {
        // Tab filter
        if (activeTab === 'internal' && job.creator_role !== 'faculty' && job.creator_role !== 'admin') return false;
        if (activeTab === 'external' && job.creator_role !== 'rep') return false;

        const matchesSearch = searchTerm.toLowerCase() === '' ||
          job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          job.company.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesJobType = jobTypeFilters.length === 0 || jobTypeFilters.includes(job.job_type);
        const matchesIndustry = industryFilter === '' || job.industry === industryFilter;
        const matchesDepartment = departmentFilter === '' || job.department === departmentFilter;

        return matchesSearch && matchesJobType && matchesIndustry && matchesDepartment;
      })
      .sort((a, b) => {
        if (sortBy === 'deadline') {
          return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }, [jobs, activeTab, searchTerm, jobTypeFilters, industryFilter, departmentFilter, sortBy]);

  return (
    <div>
      <header className="bg-white border-b border-gray-200 mb-8">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
            <h1 className="text-4xl font-bold font-heading text-uga-red">UGA Job Board</h1>
            <p className="text-gray-600 mt-1 font-body">Find your next opportunity.</p>
        </div>
      </header>

        {/* --- TABS --- */}
        <div className="mb-6 border-b border-gray-300">
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                <button onClick={() => setActiveTab('all')} className={`${activeTab === 'all' ? 'border-uga-red text-uga-red' : 'border-transparent text-gray-500 hover:text-gray-700'} whitespace-nowrap py-4 px-1 border-b-2 font-heading font-bold text-lg`}>
                    All Jobs
                </button>
                <button onClick={() => setActiveTab('internal')} className={`${activeTab === 'internal' ? 'border-uga-red text-uga-red' : 'border-transparent text-gray-500 hover:text-gray-700'} whitespace-nowrap py-4 px-1 border-b-2 font-heading font-bold text-lg`}>
                    On-Campus & University
                </button>
                <button onClick={() => setActiveTab('external')} className={`${activeTab === 'external' ? 'border-uga-red text-uga-red' : 'border-transparent text-gray-500 hover:text-gray-700'} whitespace-nowrap py-4 px-1 border-b-2 font-heading font-bold text-lg`}>
                    External Companies
                </button>
            </nav>
        </div>

        {/* --- FILTERS SECTION --- */}
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="md:col-span-2">
              <label htmlFor="search" className="block text-sm font-medium text-gray-700">Search by Title/Company</label>
              <input type="text" id="search" placeholder="e.g. Software Engineer" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2"/>
            </div>
             <div>
               <label htmlFor="department" className="block text-sm font-medium text-gray-700">Department</label>
               <select id="department" value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 rounded-md">
                 <option value="">All Departments</option>
                 {departments.map(dept => <option key={dept} value={dept}>{dept}</option>)}
               </select>
            </div>
            <div>
               <label htmlFor="industry" className="block text-sm font-medium text-gray-700">Industry</label>
               <select id="industry" value={industryFilter} onChange={(e) => setIndustryFilter(e.target.value)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 rounded-md">
                 <option value="">All Industries</option>
                 {industries.map(industry => <option key={industry} value={industry}>{industry}</option>)}
               </select>
            </div>
            <div>
               <label htmlFor="sort" className="block text-sm font-medium text-gray-700">Sort By</label>
               <select id="sort" value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 rounded-md">
                 <option value="created_at">Newest</option>
                 <option value="deadline">Application Deadline</option>
               </select>
            </div>
          </div>
            <div className="mt-6">
                <h4 className="text-sm font-medium text-gray-700">Job Type</h4>
                <div className="mt-2 flex flex-wrap gap-x-6 gap-y-2">
                    {['Internship', 'Part-Time', 'Full-Time'].map(type => (
                      <label key={type} className="flex items-center"><input type="checkbox" checked={jobTypeFilters.includes(type)} onChange={() => handleJobTypeChange(type)} className="h-4 w-4 text-uga-red border-gray-300 rounded"/>
                        <span className="ml-2 text-sm text-gray-600">{type}</span>
                      </label>
                    ))}
                </div>
            </div>
        </div>

        <div>
          {loading ? (<p className="text-center text-gray-500">Loading jobs...</p>) : 
          filteredAndSortedJobs.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {filteredAndSortedJobs.map(job => <JobCard key={job.id} job={job} />)}
              </div>
          ) : (
              <div className="text-center bg-white p-10 rounded-lg shadow-md border border-gray-200">
                  <h3 className="text-xl font-semibold text-gray-800 font-heading">No Jobs Found</h3>
                  <p className="text-gray-500 mt-2">Try adjusting your search or filter criteria.</p>
              </div>
          )}
        </div>
    </div>
  );
}

