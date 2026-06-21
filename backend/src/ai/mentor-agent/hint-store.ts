/**
 * Hint History Store
 * In-memory store for tracking delivered hints per (userId, questionId).
 * This ensures progressive hint escalation and avoids repeating advice.
 *
 * Upgrade path: Replace with Prisma MentorHint model for persistence.
 */

import { HintRecord } from './types.js';
import { randomUUID } from 'crypto';

// Map key: `${userId}:${questionId}`
const hintHistory = new Map<string, HintRecord[]>();

function makeKey(userId: string, questionId: string): string {
  return `${userId}:${questionId}`;
}

/**
 * Returns the hint history for a given user + question combination.
 * Returns empty array if no hints have been given yet.
 */
export function getHintHistory(userId: string, questionId: string): HintRecord[] {
  const key = makeKey(userId, questionId);
  return hintHistory.get(key) ?? [];
}

/**
 * Saves a newly delivered hint to the store.
 */
export function saveHint(params: Omit<HintRecord, 'id' | 'timestamp'> & { timestamp?: string }): HintRecord {
  const key = makeKey(params.userId, params.questionId);
  const existing = hintHistory.get(key) ?? [];

  const record: HintRecord = {
    ...params,
    id: randomUUID(),
    timestamp: params.timestamp ?? new Date().toISOString(),
  };

  existing.push(record);
  hintHistory.set(key, existing);

  return record;
}

/**
 * Returns the number of hints delivered so far for a user + question.
 */
export function getHintCount(userId: string, questionId: string): number {
  return getHintHistory(userId, questionId).length;
}

/**
 * Clears hint history for a user + question (e.g., if they reset the problem).
 */
export function clearHintHistory(userId: string, questionId: string): void {
  hintHistory.delete(makeKey(userId, questionId));
}
