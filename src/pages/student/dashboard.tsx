// Enhanced JobCard component for student/dashboard.tsx
// Replace the existing JobCard component in student dashboard 
//pages/student/dashboard.tsx

const JobCard = ({ job, showApplyButton = true, showSaveButton = true, savedJobId = null }: { 
  job: Job, 
  showApplyButton?: boolean, 
  showSaveButton?: boolean,
  savedJobId?: string | null 
}) => {
  const isSaved = isJobSaved(job.id);
  const savedJob = savedJobs.find(sj => sj.job.id === job.id);
  const daysUntil = job.deadline ? getDaysUntilDeadline(job.deadline) : null;
  const isExpired = daysUntil !== null && daysUntil < 0;
  
  // Check if user has already applied
  const hasApplied = applications.some(app => app.job.id === job.id);

  return (
    <div className="bg-white rounded-lg shadow hover:shadow-lg transition-all duration-200 overflow-hidden">
      {/* Card Header with colored accent */}
      <div className={`h-1 ${
        job.job_type === 'Full-Time' ? 'bg-green-500' :
        job.job_type === 'Part-Time' ? 'bg-blue-500' :
        'bg-purple-500'
      }`}></div>
      
      <div className="p-6">
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
            {showSaveButton && (
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
            )}
          </div>
        </div>

        {/* Fixed description with proper overflow handling */}
        <p className="text-gray-600 text-sm mb-4 line-clamp-2 break-words">
          {job.description}
        </p>

        {/* Job metadata */}
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
              isExpired ? 'text-red-600' :
              daysUntil !== null && daysUntil <= 3 ? 'text-orange-600' :
              'text-gray-600'
            }`}>
              <CalendarIcon className="h-4 w-4" />
              {isExpired ? 'Expired' :
               daysUntil === 0 ? 'Due today' :
               daysUntil === 1 ? 'Due tomorrow' :
               `${daysUntil} days left`}
            </span>
          )}
        </div>

        {/* Skills preview if available */}
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

        {/* Action buttons */}
        <div className="flex gap-2 pt-2 border-t">
          {/* View Details button - primary action */}
          <Link href={`/jobs/${job.id}`} className="flex-1">
            <button className="w-full px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-800 transition-colors text-sm font-medium">
              View Details
            </button>
          </Link>
          
          {/* Quick Apply button - only if not expired and not already applied */}
          {showApplyButton && !isExpired && !hasApplied && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm(`Quick apply to ${job.title} at ${job.company}?`)) {
                  applyToJob(job.id);
                }
              }}
              className="flex-1 px-4 py-2 bg-red-700 text-white rounded-md hover:bg-red-800 transition-colors text-sm font-medium"
            >
              Quick Apply
            </button>
          )}
          
          {/* Status indicator if already applied */}
          {hasApplied && (
            <span className="flex-1 px-4 py-2 bg-green-100 text-green-800 rounded-md text-sm font-medium text-center">
              ✓ Applied
            </span>
          )}
          
          {/* Disabled state for expired jobs */}
          {showApplyButton && isExpired && (
            <span className="flex-1 px-4 py-2 bg-gray-100 text-gray-500 rounded-md text-sm font-medium text-center">
              Expired
            </span>
          )}
          
          {/* Reminder button for saved jobs */}
          {savedJob && job.deadline && !isExpired && (
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