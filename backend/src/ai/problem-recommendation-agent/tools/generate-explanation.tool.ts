export async function generateExplanation(
  weakTopics: string[],
  difficulty: string,
  recommendations: any[]
) {
  const problem =
    recommendations[0];

  return `Recommended "${problem?.title}" because your focus area is ${weakTopics[0]} and your current target difficulty is ${difficulty}.`;
}