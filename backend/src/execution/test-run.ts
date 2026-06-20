import { codeExecutionService } from './services/CodeExecutionService.js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config();

async function runTests() {
  console.log('--- Testing JavaScript Code Execution ---');
  const jsPayload = {
    language: 'javascript' as const,
    sourceCode: `
      console.log("Hello from JavaScript!");
      const sum = (a, b) => a + b;
      console.log("Sum of 5 and 7 is:", sum(5, 7));
    `
  };

  const jsResult = await codeExecutionService.execute(jsPayload);
  console.log('JS Result:', JSON.stringify(jsResult, null, 2));

  console.log('\n--- Testing Python Code Execution ---');
  const pyPayload = {
    language: 'python' as const,
    sourceCode: `
print("Hello from Python!")
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)
print("Fibonacci(8) is:", fibonacci(8))
`
  };

  const pyResult = await codeExecutionService.execute(pyPayload);
  console.log('Python Result:', JSON.stringify(pyResult, null, 2));
}

runTests().catch(console.error);
