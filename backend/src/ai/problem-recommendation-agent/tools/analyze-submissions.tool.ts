export async function analyzeSubmissions(
  submissions: unknown[]
) {
  const totalSubmissions =
    submissions.length;

  const recentActivity =
    submissions.slice(0, 5);

  const activityLevel =
    totalSubmissions >= 20
      ? "High"
      : totalSubmissions >= 10
      ? "Medium"
      : "Low";

  return {
    totalSubmissions,
    recentActivity,
    activityLevel,
  };
}