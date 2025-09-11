
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
}

// A reusable Job Card component
const JobCard = ({ job }: { job: Job }) => {
  const jobTypeColors = {
    'Internship': 'bg-blue-100 text-blue-800',
    'Part-Time': 'bg-yellow-100 text-yellow-800',
    'Full-Time': 'bg-green-100 text-green-800',
  };

  return (
    <div className="border border-gray-200 bg-white rounded-lg p-6 flex flex-col shadow-md hover:shadow-lg transition-shadow duration-300">
      <div className="flex-grow">
        <h3 className="font-bold text-xl text-gray-800">{job.title}</h3>
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
          <button className="w-full bg-red-700 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 transition-colors">
            View Details
          </button>
        </Link>
      </div>
    </div>
  );
};

// Main Homepage Component
export default function HomePage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [jobTypeFilters, setJobTypeFilters] = useState<string[]>([]);
  const [industryFilter, setIndustryFilter] = useState('');
  const [sortBy, setSortBy] = useState('created_at'); // 'created_at' or 'deadline'

  // Fetch all active jobs on initial load
  useEffect(() => {
    const fetchJobs = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('status', 'active')
        .gte('deadline', new Date().toISOString()); // Only show jobs with future deadlines

      if (error) {
        console.error('Error fetching jobs:', error);
      } else {
        setJobs(data || []);
      }
      setLoading(false);
    };
    fetchJobs();
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

  const filteredAndSortedJobs = useMemo(() => {
    return jobs
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
  }, [jobs, searchTerm, jobTypeFilters, industryFilter, sortBy]);

  return (
    <div className="bg-gray-50 min-h-screen">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold leading-tight text-red-800">UGA Job Board</h1>
            <p className="text-gray-600 mt-1">Find your next opportunity.</p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters Sidebar */}
          <aside className="w-full lg:w-1/4">
            <div className="sticky top-6 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Filter & Sort</h3>
              <div className="space-y-6">
                {/* Search */}
                <div>
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
                {/* Job Type */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700">Job Type</h4>
                  <div className="mt-2 space-y-2">
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
                     {industries.map(industry => <option key={industry} value={industry}>{industry}</option>)}
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
            </div>
          </aside>

          {/* Job Listings */}
          <div className="w-full lg:w-3/4">
            {loading ? (
              <p className="text-center text-gray-500">Loading jobs...</p>
            ) : filteredAndSortedJobs.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredAndSortedJobs.map(job => <JobCard key={job.id} job={job} />)}
                </div>
            ) : (
                <div className="text-center bg-white p-10 rounded-lg shadow-sm border border-gray-200">
                    <h3 className="text-xl font-semibold text-gray-800">No Jobs Found</h3>
                    <p className="text-gray-500 mt-2">Try adjusting your search or filter criteria.</p>
                </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}







/*
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export default function HomePage() {
  const [jobs, setJobs] = useState<any[]>([]);

  useEffect(() => {
    async function fetchJobs() {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('status', 'active')
        .gte('deadline', new Date().toISOString());

      if (!error) setJobs(data);
    }

    fetchJobs();
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6 text-red-800">UGA Job Board</h1>
      {jobs.length === 0 ? (
        <p>No active jobs available.</p>
      ) : (
        <ul className="space-y-4">
          {jobs.map((job) => (
            <li key={job.id} className="border p-4 rounded shadow">
              <h2 className="text-xl font-semibold">{job.title}</h2>
              <p className="text-gray-600">{job.company}</p>
              <p>{job.description}</p>
              <p className="text-sm text-gray-500">Deadline: {job.deadline}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
*/