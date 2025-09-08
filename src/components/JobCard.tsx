// src/components/JobCard.tsx
import Link from 'next/link';

interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  deadline: string;
  job_type: string;
}

export default function JobCard({ job }: { job: Job }) {
  return (
    <Link href={`/jobs/${job.id}`}>
      <div className="border rounded-md p-4 hover:shadow-md transition cursor-pointer bg-white">
        <h3 className="text-xl font-semibold text-ugaRed">{job.title}</h3>
        <p className="text-gray-800">{job.company} — {job.location}</p>
        <p className="text-sm text-gray-600">Deadline: {job.deadline}</p>
        <span className="text-sm text-white bg-gray-800 px-2 py-1 rounded">
          {job.job_type}
        </span>
      </div>
    </Link>
  );
}
