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

// In-memory cache for fully compiled Mentor Responses to minimize LLM token consumption
const hintCache = new Map<string, any>();

function makeCacheKey(
  userId: string,
  questionId: string,
  sourceCode: string,
  triggerEvent: string,
): string {
  // Normalize whitespace of code to prevent minor spacing changes from causing cache misses
  const normalizedCode = sourceCode.replace(/\s+/g, ' ').trim();
  return `${userId}:${questionId}:${normalizedCode}:${triggerEvent}`;
}

export function getCachedHint(
  userId: string,
  questionId: string,
  sourceCode: string,
  triggerEvent: string,
): any | null {
  const key = makeCacheKey(userId, questionId, sourceCode, triggerEvent);
  return hintCache.get(key) ?? null;
}

export function cacheHint(
  userId: string,
  questionId: string,
  sourceCode: string,
  triggerEvent: string,
  response: any,
): void {
  const key = makeCacheKey(userId, questionId, sourceCode, triggerEvent);
  hintCache.set(key, response);
}

