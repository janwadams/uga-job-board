// REP ANALYTICS FIXES
// ===================

// 1. REMOVE THE SKILLS SECTION (lines 340-362)
// Replace this entire block:
/*
const skillData: { [key: string]: { count: number; views: number; clicks: number } } = {};
jobs?.forEach(job => {
  job.skills?.forEach((skill: string) => {
    if (!skillData[skill]) {
      skillData[skill] = { count: 0, views: 0, clicks: 0 };
    }
    skillData[skill].count++;
    skillData[skill].views += job.job_views?.length || 0;
    skillData[skill].clicks += job.job_link_clicks?.length || 0;
  });
});

const skills = Object.entries(skillData)
  .map(([skill, data]) => ({
    skill,
    count: data.count,
    avgViewsPerJob: data.count > 0 ? (data.views / data.count).toFixed(1) : '0',
    engagementRate: data.views > 0 ? ((data.clicks / data.views) * 100).toFixed(1) : '0'
  }))
  .sort((a, b) => parseFloat(b.engagementRate) - parseFloat(a.engagementRate))
  .slice(0, 10);

setSkillsDemand(skills);
*/

// WITH THIS:
setSkillsDemand([]); // Skills analytics removed - not relevant for reps


// 2. UPDATE ENGAGEMENT LEVELS WITH BETTER THRESHOLDS (lines 383-405)
// Replace the engagement metrics with more realistic thresholds:

const metrics: EngagementMetric[] = [
  {
    metric: 'High Engagement',
    count: jobs?.filter(j => (j.job_link_clicks?.length || 0) > 5).length || 0,  // Changed from >10 to >5
    percentage: totalJobs > 0 
      ? ((jobs?.filter(j => (j.job_link_clicks?.length || 0) > 5).length || 0) / totalJobs * 100).toFixed(1)
      : '0'
  },
  {
    metric: 'Medium Engagement', 
    count: jobs?.filter(j => (j.job_link_clicks?.length || 0) >= 2 && (j.job_link_clicks?.length || 0) <= 5).length || 0,  // Changed from 5-10 to 2-5
    percentage: totalJobs > 0
      ? ((jobs?.filter(j => (j.job_link_clicks?.length || 0) >= 2 && (j.job_link_clicks?.length || 0) <= 5).length || 0) / totalJobs * 100).toFixed(1)
      : '0'
  },
  {
    metric: 'Low Engagement',
    count: jobs?.filter(j => (j.job_link_clicks?.length || 0) === 1).length || 0,  // Changed to exactly 1 click
    percentage: totalJobs > 0
      ? ((jobs?.filter(j => (j.job_link_clicks?.length || 0) === 1).length || 0) / totalJobs * 100).toFixed(1)
      : '0'
  },
  {
    metric: 'No Engagement',  // Added this category
    count: jobs?.filter(j => (j.job_link_clicks?.length || 0) === 0).length || 0,
    percentage: totalJobs > 0
      ? ((jobs?.filter(j => (j.job_link_clicks?.length || 0) === 0).length || 0) / totalJobs * 100).toFixed(1)
      : '0'
  }
];


// 3. REMOVE THE SKILLS SECTION FROM THE UI (lines 750-790)
// Delete or comment out this entire section:
/*
{/* Updated Skills Performance Section */}
<div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
  <h2 className="text-xl font-bold text-gray-800 mb-4">🎯 Skills Demand Analysis</h2>
  {skillsDemand.length > 0 ? (
    <div className="overflow-x-auto">
      <table className="min-w-full">
        ... (entire table content)
      </table>
    </div>
  ) : (
    <p className="text-gray-500">No skills data available</p>
  )}
</div>
*/


// 4. UPDATE THE ENGAGEMENT LEVELS UI (lines 676-700)
// Update the color coding to include "No Engagement":

<div className={`w-3 h-3 rounded-full ${
  metric.metric === 'High Engagement' ? 'bg-green-600' :
  metric.metric === 'Medium Engagement' ? 'bg-yellow-600' :
  metric.metric === 'Low Engagement' ? 'bg-orange-600' :
  'bg-red-600'  // No Engagement
}`} />


// SUMMARY OF CHANGES:
// ==================
// 1. ✅ Removed skills analytics (not relevant for reps)
// 2. ✅ Updated engagement thresholds to be more realistic
// 3. ✅ Added "No Engagement" category (important for identifying dead jobs)
// 4. ✅ Fixed approval rate calculation (only active jobs count as approved)

// The new engagement levels:
// - High: >5 clicks (great performance)
// - Medium: 2-5 clicks (decent interest)
// - Low: 1 click (minimal interest)  
// - None: 0 clicks (needs attention)