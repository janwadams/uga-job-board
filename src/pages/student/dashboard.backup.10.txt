import { useEffect, useState } from 'react';
import { supabase } from '../../utils/supabaseClient';
import JobCard from '../../components/JobCard';

interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  deadline: string;
  job_type: string;
  status: string;
  created_by: string;
  description: string;
  skills: string[];
}

export default function Dashboard() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobType, setSelectedJobType] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState('newest'); // ADDED: New state for sorting, with a default value
  const [uniqueCompanies, setUniqueCompanies] = useState<string[]>([]);

  useEffect(() => {
    const fetchJobs = async () => {
      const today = new Date().toISOString().split('T')[0];

      let query = supabase
        .from('jobs')
        .select('*')
        .eq('status', 'active')
        .gte('deadline', today);

      if (selectedJobType) {
        query = query.eq('job_type', selectedJobType);
      }

      if (selectedCompany) {
        query = query.eq('company', selectedCompany);
      }

      if (searchQuery) {
        const keyword = `%${searchQuery.toLowerCase()}%`;
        query = query.or(`title.ilike.${keyword},company.ilike.${keyword},description.ilike.${keyword}`);
      }
      
      // ADDED: Sorting logic
      if (sortOption === 'newest') {
        query = query.order('created_at', { ascending: false });
      } else if (sortOption === 'deadline') {
        query = query.order('deadline', { ascending: true });
      }
      
      const { data: jobsData, error } = await query;

      if (error) {
        console.error('Error fetching jobs:', error.message);
        return;
      }

      setJobs(jobsData || []);

      if (!selectedJobType && !selectedCompany && !searchQuery && jobsData) {
        const companies = [...new Set(jobsData.map((job) => job.company))];
        setUniqueCompanies(companies);
      }
    };

    fetchJobs();
  }, [selectedJobType, selectedCompany, searchQuery, sortOption]); // UPDATED: Added sortOption to the dependency array

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-red-700 mb-6">Student Dashboard</h1>

      {/* Filter Controls */}
      <div className="mb-4 flex flex-col md:flex-row gap-4">
        <input
          type="text"
          placeholder="Search by keywords..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="p-2 border border-gray-300 rounded w-full md:w-80"
        />
        <select
          className="p-2 border border-gray-300 rounded w-full md:w-60"
          value={selectedJobType}
          onChange={(e) => setSelectedJobType(e.target.value)}
        >
          <option value="">All Job Types</option>
          <option value="Internship">Internship</option>
          <option value="Part-Time">Part-Time</option>
          <option value="Full-Time">Full-Time</option>
        </select>

        <select
          className="p-2 border border-gray-300 rounded w-full md:w-60"
          value={selectedCompany}
          onChange={(e) => setSelectedCompany(e.target.value)}
        >
          <option value="">All Companies</option>
          {uniqueCompanies.map((company) => (
            <option key={company} value={company}>
              {company}
            </option>
          ))}
        </select>
        
        {/* ADDED: Sort by controls */}
        <select
          className="p-2 border border-gray-300 rounded w-full md:w-60"
          value={sortOption}
          onChange={(e) => setSortOption(e.target.value)}
        >
          <option value="newest">Newest</option>
          <option value="deadline">Deadline (Earliest)</option>
        </select>

        <button
          onClick={() => {
            setSelectedJobType('');
            setSelectedCompany('');
            setSearchQuery('');
          }}
          className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded"
        >
          Clear Filters
        </button>
      </div>

      {/* Job List */}
      {jobs.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      ) : (
        <p className="text-center text-gray-500 mt-4">
          No postings match your search.
        </p>
      )}
    </div>
  );
}