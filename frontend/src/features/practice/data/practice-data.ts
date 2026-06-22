import type { Difficulty, Question, SampleTestCase, StarterCode, Status, TestCase } from '../types';

// 1. Import all JSON files from your extracted folder
import arrayData from '../Questions/Array.json';
import binarySearchData from '../Questions/Binary Search.json';
import graphsData from '../Questions/Graphs.json';
import hashMapData from '../Questions/HashMap.json';
import linkedListData from '../Questions/Linked_List.json';
import stackData from '../Questions/Stack.json';
import stringData from '../Questions/String.json';
import treesData from '../Questions/Trees.json';
import mixedTopicsData from '../Questions/mixed_topics.json';

interface RawQuestion {
  slug?: string;
  title?: string;
  difficulty?: string;
  description?: string;
  constraints?: string[];
  topics?: string[];
  time_limit?: number;
  memory_limit?: number;
  starter_code?: StarterCode;
  sample_test_cases?: SampleTestCase[];
  test_cases?: TestCase[];
  hints?: string[];
  explanation?: string;
}

// 2. Combine all the imported JSON arrays into one massive array
const allRawQuestions: RawQuestion[] = [
  ...arrayData,
  ...binarySearchData,
  ...graphsData,
  ...hashMapData,
  ...linkedListData,
  ...stackData,
  ...stringData,
  ...treesData,
  ...mixedTopicsData,
];

// 3. Map the raw JSON to strictly match our TypeScript interface
export const allQuestions: Question[] = allRawQuestions.map((q, index) => {
  // Generate a deterministic pseudo-random acceptance rate based on difficulty
  // (We do this so the numbers don't change every time you refresh the page)
  let baseRate = 50;
  if (q.difficulty === 'Easy') baseRate = 75;
  if (q.difficulty === 'Medium') baseRate = 50;
  if (q.difficulty === 'Hard') baseRate = 30;

  // Use the title length to add a slight variation to the percentage (e.g. 75.4%)
  const variation = (((q.title?.length || 10) * 3.7) % 15) - 7.5;
  const finalRate = Number(Math.max(10, Math.min(99.9, baseRate + variation)).toFixed(1));

  return {
    id: q.slug || `question-${index + 1}`,
    slug: q.slug || '',
    title: q.title || 'Untitled Problem',
    difficulty: (q.difficulty as Difficulty) || 'Medium',
    topics: q.topics || [],
    acceptanceRate: finalRate,
    status: 'Not Attempted' as Status,
    description: q.description || 'No description available yet.',
    constraints: q.constraints || [],
    starterCode: q.starter_code || {},
    sampleTestCases: q.sample_test_cases || [],
    testCases: q.test_cases || [],
    hints: q.hints || [],
    explanation: q.explanation || '',
    timeLimitMs: q.time_limit || 0,
    memoryLimitMb: q.memory_limit || 0,
  };
});

export const mockQuestions = allQuestions;

export const getQuestionBySlug = (problemSlug: string): Question | null => {
  return allQuestions.find((q) => q.slug === problemSlug || q.id === problemSlug) ?? null;
};

export const getQuestionById = (questionId: string): Question | null => {
  return allQuestions.find((q) => q.id === questionId || q.slug === questionId) ?? null;
};

// 4. Dynamically extract and sort all unique topics for the Filter Dropdown
const uniqueTopics = Array.from(new Set(allRawQuestions.flatMap((q) => q.topics || [])));

export const availableTopics = ['All', ...uniqueTopics.sort()];
