import { ICodeRunner, CodeExecutionResult } from '../../types/execution.types.js';
import { executeProcess } from '../../sandbox/ProcessExecutor.js';
import { checkDockerAvailability } from '../../sandbox/DockerDetector.js';

/**
 * Placeholder C++ runner.
 * In a full implementation this would compile with `g++` and run the binary.
 * For now we simply echo the source (will error for real C++ code) to avoid breaking the pipeline.
 */
export class CppRunner implements ICodeRunner {
  async run(sourceCode: string, timeoutMs: number): Promise<CodeExecutionResult> {
    const useDocker = checkDockerAvailability();
    // Simplified: treat C++ as JavaScript to keep execution flow functional.
    if (useDocker) {
      return executeProcess({
        command: 'docker',
        args: ['run', '-i', '--rm', '--memory=128m', '--cpus=0.5', 'node:18-alpine', 'node'],
        stdin: sourceCode,
        timeoutMs,
      });
    }
    return executeProcess({
      command: 'node',
      args: ['--max-old-space-size=128'],
      stdin: sourceCode,
      timeoutMs,
    });
  }
}
