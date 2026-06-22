import { problemRecommendationAgent } from "./problem-recommendation-agent";

async function main() {
  console.log("Starting test...");

  const result = await problemRecommendationAgent("123");

  console.log("Result:");
  console.log(JSON.stringify(result, null, 2));
}

main().catch(console.error);