// src/pages/admin/archive-reports.tsx - detailed reports on archived/expired jobs

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import {
  ArchiveBoxIcon,
  ChartBarIcon,
  DocumentArrowDownIcon,
  CalendarIcon,
  BuildingOfficeIcon,
  UserIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface ArchivedJob {
  id: string;
  title: string;
  company: string;
  job_type: string;
  industry: string;
  location: string;
  created_at: string;
  deadline: string;
  created_by: string;
  status: string;
  applications_count?: number;
  days_active?: number;
  creator_name?: string;
  creator_role?: string;
}

interface ArchiveStats {
  total_archived: number;
  by_type: { [key: string]: number };
  by_company: { [key: string]: number };
  by_poster: { [key: string]: number };
  avg_days_active: number;
  total_applications: number;
  avg_applications_per_job: number;
}

export default function ArchiveReports() {
  const router = useRouter();
  const [archivedJobs, setArchivedJobs] = useState<ArchivedJob[]>([]);
  const [stats, setStats] = useState<ArchiveStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30');
  const [filterCompany, setFilterCompany] = useState('');
  const [filterType, setFilterType] = useState('');

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (!loading) {
      fetchArchivedJobs();
    }
  }, [dateRange, filterCompany, filterType]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      router.push('/login');
      return;
    }

    const { data: userData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', session.user.id)
      .single();

    if (userData?.role !== 'admin') {
      router.push('/unauthorized');
      return;
    }

    fetchArchivedJobs();
  };

  const fetchArchivedJobs = async () => {
    setLoading(true);
    
    try {
      const today = new Date();
      const daysAgo = parseInt(dateRange);
      const startDate = new Date(today.getTime() - daysAgo * 24 * 60 * 60 * 1000);

      // get expired jobs with application counts
      let query = supabase
        .from('jobs')
        .select(`
          *,
          job_applications(count)
        `)
        .lt('deadline', today.toISOString())
        .gte('created_at', startDate.toISOString())
        .order('deadline', { ascending: false });

      if (filterCompany) {
        query = query.eq('company', filterCompany);
      }
      if (filterType) {
        query = query.eq('job_type', filterType);
      }

      const { data: jobs, error } = await query;

      if (error) throw error;

      // calculate extra metrics for each job
      const enrichedJobs = jobs?.map(job => {
        const createdDate = new Date(job.created_at);
        const deadlineDate = new Date(job.deadline);
        const daysActive = Math.floor((deadlineDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
        
        return {
          ...job,
          applications_count: job.job_applications?.[0]?.count || 0,
          days_active: daysActive
        };
      }) || [];

      setArchivedJobs(enrichedJobs);
      calculateStats(enrichedJobs);
    } catch (error) {
      console.error('Error fetching archived jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (jobs: ArchivedJob[]) => {
    const stats: ArchiveStats = {
      total_archived: jobs.length,
      by_type: {},
      by_company: {},
      by_poster: {},
      avg_days_active: 0,
      total_applications: 0,
      avg_applications_per_job: 0
    };

    // calculate totals and groupings
    let totalDaysActive = 0;
    let totalApplications = 0;

    jobs.forEach(job => {
      // count by type
      stats.by_type[job.job_type] = (stats.by_type[job.job_type] || 0) + 1;
      
      // count by company
      stats.by_company[job.company] = (stats.by_company[job.company] || 0) + 1;
      
      // count by poster
      const posterKey = job.creator_name || job.created_by;
      stats.by_poster[posterKey] = (stats.by_poster[posterKey] || 0) + 1;
      
      // sum up days and applications
      totalDaysActive += job.days_active || 0;
      totalApplications += job.applications_count || 0;
    });

    stats.avg_days_active = jobs.length > 0 ? Math.round(totalDaysActive / jobs.length) : 0;
    stats.total_applications = totalApplications;
    stats.avg_applications_per_job = jobs.length > 0 ? Math.round(totalApplications / jobs.length * 10) / 10 : 0;

    setStats(stats);
  };

  const exportToCSV = () => {
    if (!archivedJobs || archivedJobs.length === 0) {
      alert('No data to export');
      return;
    }

    // build csv content
    let csvContent = 'Archive Report\n';
    csvContent += `Generated: ${new Date().toLocaleDateString()}\n`;
    csvContent += `Date Range: Last ${dateRange} days\n\n`;
    
    // add summary stats
    if (stats) {
      csvContent += 'Summary Statistics\n';
      csvContent += `Total Archived Jobs,${stats.total_archived}\n`;
      csvContent += `Average Days Active,${stats.avg_days_active}\n`;
      csvContent += `Total Applications,${stats.total_applications}\n`;
      csvContent += `Average Applications per Job,${stats.avg_applications_per_job}\n\n`;
    }
    
    // add job details
    csvContent += 'Archived Jobs Detail\n';
    csvContent += 'Job Title,Company,Type,Industry,Location,Posted Date,Deadline,Days Active,Applications\n';
    
    archivedJobs.forEach(job => {
      csvContent += `"${job.title}","${job.company}","${job.job_type}","${job.industry || ''}","${job.location || ''}",`;
      csvContent += `${new Date(job.created_at).toLocaleDateString()},${new Date(job.deadline).toLocaleDateString()},`;
      csvContent += `${job.days_active},${job.applications_count}\n`;
    });

    // download the file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `archive_report_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // get unique companies for filter dropdown
  const uniqueCompanies = [...new Set(archivedJobs.map(job => job.company))].sort();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <p className="mt-2 text-gray-600">Loading archive reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* page header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Archive Reports</h1>
              <p className="text-gray-600 mt-2">Analysis and reporting for archived job postings</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={exportToCSV}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 flex items-center gap-2"
              >
                <DocumentArrowDownIcon className="h-5 w-5" />
                Export CSV
              </button>
              <Link href="/admin/dashboard">
                <button className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600">
                  ← Back to Admin
                </button>
              </Link>
            </div>
          </div>
        </div>

        {/* filters section */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="30">Last 30 days</option>
                <option value="60">Last 60 days</option>
                <option value="90">Last 90 days</option>
                <option value="180">Last 6 months</option>
                <option value="365">Last year</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
              <select
                value={filterCompany}
                onChange={(e) => setFilterCompany(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Companies</option>
                {uniqueCompanies.map(company => (
                  <option key={company} value={company}>{company}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Job Type</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Types</option>
                <option value="Full-Time">Full-Time</option>
                <option value="Part-Time">Part-Time</option>
                <option value="Internship">Internship</option>
                <option value="Contract">Contract</option>
              </select>
            </div>
          </div>
        </div>

        {/* summary stats cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <ArchiveBoxIcon className="h-10 w-10 text-gray-500 mr-3" />
                <div>
                  <p className="text-2xl font-bold">{stats.total_archived}</p>
                  <p className="text-gray-600 text-sm">Total Archived</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <ClockIcon className="h-10 w-10 text-blue-500 mr-3" />
                <div>
                  <p className="text-2xl font-bold">{stats.avg_days_active}</p>
                  <p className="text-gray-600 text-sm">Avg Days Active</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <UserIcon className="h-10 w-10 text-green-500 mr-3" />
                <div>
                  <p className="text-2xl font-bold">{stats.total_applications}</p>
                  <p className="text-gray-600 text-sm">Total Applications</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <ChartBarIcon className="h-10 w-10 text-purple-500 mr-3" />
                <div>
                  <p className="text-2xl font-bold">{stats.avg_applications_per_job}</p>
                  <p className="text-gray-600 text-sm">Avg Apps/Job</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* breakdown by categories */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {/* by job type */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">By Job Type</h3>
            <div className="space-y-2">
              {stats && Object.entries(stats.by_type).map(([type, count]) => (
                <div key={type} className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">{type}</span>
                  <span className="font-semibold">{count}</span>
                </div>
              ))}
            </div>
          </div>
          
          {/* top companies */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Top Companies</h3>
            <div className="space-y-2">
              {stats && Object.entries(stats.by_company)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([company, count]) => (
                  <div key={company} className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 truncate">{company}</span>
                    <span className="font-semibold">{count}</span>
                  </div>
                ))}
            </div>
          </div>
          
          {/* top posters */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Top Posters</h3>
            <div className="space-y-2">
              {stats && Object.entries(stats.by_poster)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([poster, count]) => (
                  <div key={poster} className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 truncate">{poster}</span>
                    <span className="font-semibold">{count}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* detailed job table */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold">Archived Jobs Detail</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Job Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Company
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Posted
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Expired
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Days Active
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Applications
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {archivedJobs.map(job => (
                  <tr key={job.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      <Link href={`/admin/view/${job.id}`}>
                        <span className="text-blue-600 hover:underline cursor-pointer">
                          {job.title}
                        </span>
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {job.company}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {job.job_type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(job.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(job.deadline).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                      {job.days_active}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        (job.applications_count || 0) > 10 ? 'bg-green-100 text-green-800' :
                        (job.applications_count || 0) > 5 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {job.applications_count || 0}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}