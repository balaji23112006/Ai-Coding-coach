/**
 * Error Classifier
 * Analyzes the execution result and source code to determine what kind
 * of issue the student is facing: syntax, logic, timeout, or general request.
 */

import { ErrorCategory, MentorRequest } from './types.js';

/**
 * Classifies the type of error based on execution result, trigger event,
 * and source code content.
 */
export function classifyError(request: MentorRequest): ErrorCategory {
  const { triggerEvent, executionResult, sourceCode } = request;

  // 1. Explicit trigger event takes priority
  if (triggerEvent === 'timeout') return 'timeout';
  if (triggerEvent === 'compile_error') return 'syntax';
  if (triggerEvent === 'runtime_error') return 'logic';
  if (triggerEvent === 'test_fail') return 'logic';
  if (triggerEvent === 'hint_request' || triggerEvent === 'chat') return 'request';

  // 2. Analyze execution result
  if (executionResult) {
    const { status, stderr, stdout } = executionResult;

    // Timeout / TLE
    if (
      status === 'TIMEOUT' ||
      (stderr && (stderr.includes('Time Limit') || stderr.includes('TLE')))
    ) {
      return 'timeout';
    }

    // Compile / Syntax errors
    if (
      status === 'COMPILATION_ERROR' ||
      (stderr && isSyntaxError(stderr))
    ) {
      return 'syntax';
    }

    // Runtime errors
    if (
      status === 'RUNTIME_ERROR' ||
      (stderr && isRuntimeError(stderr))
    ) {
      return 'logic';
    }

    // Test cases failed — logic issue
    if (
      status === 'FAILED' ||
      (stdout && stdout.includes('Test case') && stdout.includes('failed'))
    ) {
      return 'logic';
    }
  }

  // 3. Scan source code for obvious syntax patterns
  if (sourceCode && hasSyntaxMarkers(sourceCode, request.language)) {
    return 'syntax';
  }

  // 4. Default: treat as a general hint request
  return 'request';
}

/** Checks if a stderr message indicates a syntax/compilation error */
function isSyntaxError(stderr: string): boolean {
  const patterns = [
    /SyntaxError/i,
    /IndentationError/i,
    /unexpected token/i,
    /missing semicolon/i,
    /ParseError/i,
    /invalid syntax/i,
    /NameError/i,
    /TypeError.*is not a function/i,
  ];
  return patterns.some(p => p.test(stderr));
}

/** Checks if a stderr message indicates a runtime error */
function isRuntimeError(stderr: string): boolean {
  const patterns = [
    /TypeError/i,
    /ReferenceError/i,
    /RangeError/i,
    /IndexError/i,
    /AttributeError/i,
    /ValueError/i,
    /ZeroDivisionError/i,
    /StackOverflow/i,
    /maximum recursion/i,
    /null.*undefined/i,
    /Cannot read propert/i,
  ];
  return patterns.some(p => p.test(stderr));
}

/** Quick heuristic scan for unmatched brackets / obvious syntax issues */
function hasSyntaxMarkers(code: string, language?: string): boolean {
  if (!language) return false;
  if (language === 'python') {
    // Very rough indentation check
    return /^\s*(def|class|if|for|while|with)\s+.*[^:]\s*$/m.test(code);
  }
  if (language === 'javascript' || language === 'typescript') {
    // Check for unmatched braces
    const opens = (code.match(/\{/g) || []).length;
    const closes = (code.match(/\}/g) || []).length;
    return Math.abs(opens - closes) > 1;
  }
  return false;
}

/**
 * Identifies the concept the student may be struggling with
 * based on error message and source code analysis.
 */
export function identifyConcept(request: MentorRequest, category: ErrorCategory): string {
  const { executionResult, sourceCode } = request;
  const stderr = executionResult?.stderr || '';
  const stdout = executionResult?.stdout || '';
  const combined = stderr + stdout + (sourceCode || '');

  if (category === 'timeout') {
    if (/nested.*loop|loop.*loop/i.test(combined)) return 'Nested Loop Optimization';
    return 'Algorithm Efficiency';
  }

  if (category === 'syntax') {
    if (/IndentationError/i.test(stderr)) return 'Code Indentation';
    if (/SyntaxError/i.test(stderr)) return 'Syntax Rules';
    if (/unexpected token/i.test(stderr)) return 'Token Syntax';
    return 'Syntax Basics';
  }

  if (category === 'logic') {
    if (/index.*out.*range|IndexError/i.test(stderr)) return 'Array Indexing';
    if (/recursion|stack overflow/i.test(stderr)) return 'Recursion';
    if (/null|undefined|None/i.test(stderr)) return 'Null Handling';
    if (/loop/i.test(sourceCode || '')) return 'Loop Boundaries';
    if (/hash|dict|map/i.test(sourceCode || '')) return 'Hash Map Usage';
    return 'Logic Flow';
  }

  return 'Problem Solving';
}
