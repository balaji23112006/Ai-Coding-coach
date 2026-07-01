import { useState, useCallback } from 'react';
import type { ExecutionResult } from '../types/editor-types';

export interface MentorMessage {
  id: string;
  role: 'user' | 'mentor';
  text: string;
  hintMetadata?: {
    category: 'syntax' | 'logic' | 'timeout' | 'request';
    level: 1 | 2 | 3 | 4;
    targetedConcept: string;
  };
  timestamp: Date;
}

export interface UseMentorOptions {
  problemId?: string;
  problemTitle?: string;
  currentCode?: string;
  language?: string;
  executionResult?: ExecutionResult | null;
}

export function useMentor({ problemId, currentCode, language, executionResult }: UseMentorOptions) {
  const [messages, setMessages] = useState<MentorMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const addMessage = useCallback((msg: Omit<MentorMessage, 'id' | 'timestamp'>) => {
    setMessages((prev) => [
      ...prev,
      {
        ...msg,
        id: crypto.randomUUID(),
        timestamp: new Date(),
      },
    ]);
  }, []);

  /**
   * Sends a mentor request to the backend /api/mentor/hint endpoint.
   * @param userQuestion - Optional free-form question from the user
   * @param triggerEvent - What triggered this hint request
   */
  const sendMentorRequest = useCallback(
    async (
      userQuestion?: string,
      triggerEvent:
        | 'hint_request'
        | 'chat'
        | 'compile_error'
        | 'runtime_error'
        | 'test_fail'
        | 'timeout' = 'chat',
    ) => {
      if (isLoading) return;

      // Add user message to chat (if they typed something)
      if (userQuestion?.trim()) {
        addMessage({ role: 'user', text: userQuestion.trim() });
      }

      setIsLoading(true);

      try {
        const payload = {
          userId: undefined, // Will be resolved server-side from session
          questionId: problemId,
          sourceCode: currentCode || '',
          language: language || 'javascript',
          executionResult: executionResult
            ? {
                status: mapExecutionStatusForMentor(executionResult.status),
                stdout: executionResult.stdout,
                stderr: executionResult.stderr,
              }
            : undefined,
          messages: messages.slice(-6).map((m) => ({
            role: m.role === 'mentor' ? 'bot' : 'user',
            text: m.text,
          })),
          triggerEvent,
          userQuestion: userQuestion?.trim(),
        };

        const res = await fetch('/api/mentor/hint', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          throw new Error(`Mentor API error: ${res.status}`);
        }

        const data = await res.json();

        addMessage({
          role: 'mentor',
          text: data.mentorFeedback,
          hintMetadata: data.hintMetadata,
        });
      } catch (err) {
        console.error('[useMentor] Error requesting hint:', err);
        addMessage({
          role: 'mentor',
          text: "I'm having trouble connecting right now. Try tracing through your code manually — what does it do step-by-step with a simple input?",
        });
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, addMessage, problemId, currentCode, language, executionResult, messages],
  );

  /**
   * Request a hint (triggered by button click or auto-trigger on failure).
   */
  const requestHint = useCallback(
    (triggerEvent: Parameters<typeof sendMentorRequest>[1] = 'hint_request') => {
      setIsOpen(true);
      void sendMentorRequest(undefined, triggerEvent);
    },
    [sendMentorRequest],
  );

  /**
   * Send a chat message to the mentor.
   */
  const sendMessage = useCallback(
    (text: string) => {
      void sendMentorRequest(text, 'chat');
    },
    [sendMentorRequest],
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  const toggleOpen = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  return {
    messages,
    isLoading,
    isOpen,
    setIsOpen,
    toggleOpen,
    requestHint,
    sendMessage,
    clearMessages,
  };
}

function mapExecutionStatusForMentor(status: ExecutionResult['status']): string {
  switch (status) {
    case 'Compile Error':
      return 'COMPILATION_ERROR';
    case 'Runtime Error':
      return 'RUNTIME_ERROR';
    case 'Wrong Answer':
      return 'FAILED';
    case 'Time Limit Exceeded':
      return 'TIMEOUT';
    case 'Success':
    default:
      return 'ACCEPTED';
  }
}
