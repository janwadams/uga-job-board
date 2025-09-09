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
}

export default function Dashboard() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedJobType, setSelectedJobType] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('');
  const [uniqueCompanies, setUniqueCompanies] = useState<string[]>([]);

  useEffect(() => {
    const fetchJobs = async () => {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        console.error('Error fetching user:', userError.message);
        return;
      }

      setUserId(user?.id ?? null);

      let query = supabase
        .from('jobs')
        .select('*')
        .eq('status', 'active')
        .gte('deadline', new Date().toISOString().split('T')[0]);

      if (selectedJobType) {
        query = query.eq('job_type', selectedJobType);
      }

      if (selectedCompany) {
        query = query.eq('company', selectedCompany);
      }

      const { data: jobsData, error } = await query;

      if (error) {
        console.error('Error fetching jobs:', error.message);
        return;
      }

      setJobs(jobsData || []);

      // Only set unique companies once when filters are clear
      if (!selectedJobType && !selectedCompany && jobsData) {
        const companies = [...new Set(jobsData.map((job) => job.company))];
        setUniqueCompanies(companies);
      }
    };

    fetchJobs();
  }, [selectedJobType, selectedCompany]);

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-red-700 mb-6">Student Dashboard</h1>

      {/* Filter Controls */}
      <div className="mb-4 flex flex-col md:flex-row gap-4">
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

        <button
          onClick={() => {
            setSelectedJobType('');
            setSelectedCompany('');
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
          No postings match your filters.
        </p>
      )}
    </div>
  );
}
