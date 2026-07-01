import { groqChat } from "../../../../providers/groq/index.js";
import { MistakeAnalysis } from "../types/mistake-analysis.types.js";
import { ExtendedSubmission } from "../types/recommendation-state.js";
import { RECOMMENDATION_CONFIG } from "../config.js";

export async function analyzeMistakePatterns(
  submissions: ExtendedSubmission[],
  traceId?: string
): Promise<MistakeAnalysis> {
  const failedSubmissions = (submissions ?? []).filter(
    (s) => s.status !== "ACCEPTED"
  );

  if (failedSubmissions.length === 0) {
    return {
      primaryMistake: "None",
      confidence: 0,
      evidence: [],
    };
  }

  // Take the 3 most recent failed submissions to give context to the LLM
  const recentFails = failedSubmissions.slice(0, 3);
  
  const submissionsContext = recentFails.map(sub => {
    return `
Problem: ${sub.question?.title} (${sub.question?.difficulty})
Topics: ${(sub.question?.topics?.map((qt: any) => qt.topic?.name) || []).join(", ")}
Status: ${sub.status}
Execution Time: ${sub.executionTime}ms
Tests Passed: ${sub.testsPassed} / ${sub.testsTotal}
Error Output: ${sub.stderr ? sub.stderr.substring(0, 300) : "None"}
Console Output: ${sub.stdout ? sub.stdout.substring(0, 300) : "None"}
Submitted Code:
\`\`\`
${sub.sourceCode ? sub.sourceCode.substring(0, 500) : "No code provided"}
\`\`\`
    `.trim();
  }).join("\n\n---\n\n");

  const systemPrompt = `You are an expert AI Coding Coach analyzing a student's recent failed coding attempts.
Your goal is to semantically analyze their code and error outputs to identify the underlying logical flaw or mistake pattern they are struggling with.
Do not just look at syntax errors; try to identify the conceptual misunderstanding.

Return ONLY a JSON object exactly matching this interface:
{
  "primaryMistake": "A 2-4 word title for the mistake (e.g., 'Missing Base Case', 'Array Indexing', 'Null Pointer', 'Off-by-One')",
  "confidence": 0.85, // A float between 0.1 and 0.99
  "evidence": [
    "A 1-sentence explanation of where you saw this in problem X",
    "A 1-sentence explanation of where you saw this in problem Y"
  ]
}

DO NOT output markdown backticks like \`\`\`json. Output RAW JSON only.`;

  try {
    const responseText = await groqChat({
      systemPrompt,
      userMessage: `Analyze these recent failed submissions:\n\n${submissionsContext}`,
      temperature: 0.2,
      maxTokens: 500,
    });
    
    // Clean up potential markdown formatting from LLM
    const cleanJsonText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const result = JSON.parse(cleanJsonText);

    // Validate the LLM output structure loosely
    if (result && typeof result.primaryMistake === 'string' && Array.isArray(result.evidence)) {
      return {
        primaryMistake: result.primaryMistake,
        confidence: typeof result.confidence === 'number' ? result.confidence : 0.8,
        evidence: result.evidence.slice(0, 3) // max 3 pieces of evidence
      };
    }
    throw new Error("LLM output did not match required JSON structure");
  } catch (error) {
    console.error("[analyzeMistakePatterns] LLM Analysis failed, falling back to basic analysis:", error);
    
    // Basic fallback logic
    const firstFail = recentFails[0];
    let mistake = "Logic Error";
    let evidenceStr = `Failed attempt on "${firstFail.question?.title}"`;
    
    if (firstFail.status === "TIMEOUT") {
      mistake = "Time Limit Exceeded";
      evidenceStr = `Execution timed out on "${firstFail.question?.title}"`;
    } else if (firstFail.status === "COMPILATION_ERROR") {
      mistake = "Compile Error";
      evidenceStr = `Compilation failed on "${firstFail.question?.title}"`;
    }
    
    return {
      primaryMistake: mistake,
      confidence: 0.5,
      evidence: [evidenceStr],
    };
  }
}
