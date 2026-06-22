import { problemRecommendationGraph }
from "./problemRecommendationGraph.js";

async function main() {
  console.log("Starting graph...");

  const result =
    await problemRecommendationGraph.invoke({
      userId: "123",
    });

  console.log(
    JSON.stringify(result, null, 2)
  );
}

main().catch(console.error);