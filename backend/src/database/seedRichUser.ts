import { prisma } from './prisma.js';
import { Language, SubmissionStatus } from '@prisma/client';

async function main() {
  console.log('[Seed Rich User] Starting rich user data seeding...');

  // 1. Create or update rich test user
  const userId = 'rich_test_user';
  const user = await prisma.user.upsert({
    where: { id: userId },
    update: {},
    create: {
      id: userId,
      fullName: 'Rich Dev-User',
      username: 'rich_dev',
      email: 'richuser@example.com',
      password: 'hashedpassword123',
    },
  });
  console.log('[Seed Rich User] Created/verified rich test user:', user.email);

  // 2. Fetch seeded questions to link submissions
  const questions = await prisma.question.findMany({
    include: {
      topics: {
        include: {
          topic: true,
        },
      },
    },
  });

  if (questions.length === 0) {
    console.error(
      '[Seed Rich User] No questions found in the database. Please run npm run seed first.',
    );
    process.exit(1);
  }

  // Create a map of slugs to question IDs for easy lookup
  const questionMap = new Map(questions.map((q) => [q.slug, q]));

  // Helper to get question ID or fallback to the first question
  const getQuestion = (slug: string) => {
    const q = questionMap.get(slug);
    if (!q) {
      console.warn(`[Seed Rich User] Question with slug "${slug}" not found, using fallback.`);
      return questions[0];
    }
    return q;
  };

  // Clean up any existing submissions and profile for this test user
  await prisma.submission.deleteMany({ where: { userId } });
  await prisma.userProfile.deleteMany({ where: { userId } });
  console.log('[Seed Rich User] Cleaned up existing submissions and profile for rich_test_user.');

  // 3. Define submissions to showcase agent capabilities
  // Let's create a history of submissions over the last 7 days
  const now = new Date();
  const getPastDate = (daysAgo: number, hoursAgo: number) => {
    const date = new Date(now);
    date.setDate(date.getDate() - daysAgo);
    date.setHours(date.getHours() - hoursAgo);
    return date;
  };

  const submissionsToSeed = [
    // --- Day 7: Started practicing with simple Arrays and Strings (Easy) ---
    {
      slug: 'two-sum',
      status: SubmissionStatus.ACCEPTED,
      language: Language.JAVASCRIPT,
      executionTime: 85,
      memoryUsed: 42000,
      createdAt: getPastDate(7, 4),
      sourceCode: 'function twoSum(nums, target) { ... }',
    },
    {
      slug: 'valid-palindrome',
      status: SubmissionStatus.ACCEPTED,
      language: Language.PYTHON,
      executionTime: 40,
      memoryUsed: 14500,
      createdAt: getPastDate(7, 2),
      sourceCode: 'def isPalindrome(s): ...',
    },

    // --- Day 6: Tried slightly harder Array and String problems ---
    {
      slug: 'longest-common-prefix',
      status: SubmissionStatus.ACCEPTED,
      language: Language.JAVASCRIPT,
      executionTime: 72,
      memoryUsed: 41800,
      createdAt: getPastDate(6, 6),
      sourceCode: 'function longestCommonPrefix(strs) { ... }',
    },
    {
      slug: 'longest-substring-without-repeating-characters',
      status: SubmissionStatus.FAILED, // First attempt failed
      language: Language.PYTHON,
      executionTime: 120,
      memoryUsed: 16000,
      createdAt: getPastDate(6, 3),
      sourceCode: 'def lengthOfLongestSubstring(s): error here',
    },
    {
      slug: 'longest-substring-without-repeating-characters',
      status: SubmissionStatus.ACCEPTED, // Second attempt succeeded
      language: Language.PYTHON,
      executionTime: 65,
      memoryUsed: 15200,
      createdAt: getPastDate(6, 2),
      sourceCode: 'def lengthOfLongestSubstring(s): sliding window',
    },

    // --- Day 5: Stack topics ---
    {
      slug: 'valid-parentheses',
      status: SubmissionStatus.ACCEPTED,
      language: Language.JAVASCRIPT,
      executionTime: 60,
      memoryUsed: 41000,
      createdAt: getPastDate(5, 5),
      sourceCode: 'function isValid(s) { stack... }',
    },
    {
      slug: 'min-stack',
      status: SubmissionStatus.ACCEPTED,
      language: Language.PYTHON,
      executionTime: 55,
      memoryUsed: 18000,
      createdAt: getPastDate(5, 1),
      sourceCode: 'class MinStack: ...',
    },

    // --- Day 4: Linked Lists ---
    {
      slug: 'reverse-linked-list',
      status: SubmissionStatus.ACCEPTED,
      language: Language.PYTHON,
      executionTime: 35,
      memoryUsed: 15100,
      createdAt: getPastDate(4, 4),
      sourceCode: 'def reverseList(head): ...',
    },
    {
      slug: 'linked-list-cycle',
      status: SubmissionStatus.ACCEPTED,
      language: Language.JAVASCRIPT,
      executionTime: 92,
      memoryUsed: 43000,
      createdAt: getPastDate(4, 2),
      sourceCode: 'function hasCycle(head) { ... }',
    },

    // --- Day 3: Binary Search ---
    {
      slug: 'binary-search',
      status: SubmissionStatus.ACCEPTED,
      language: Language.JAVASCRIPT,
      executionTime: 58,
      memoryUsed: 40500,
      createdAt: getPastDate(3, 8),
      sourceCode: 'function search(nums, target) { ... }',
    },
    {
      slug: 'search-in-rotated-sorted-array',
      status: SubmissionStatus.TIMEOUT, // First attempt timed out
      language: Language.PYTHON,
      executionTime: 5000,
      memoryUsed: 22000,
      createdAt: getPastDate(3, 5),
      sourceCode: 'def search(nums, target): infinite loop',
    },
    {
      slug: 'search-in-rotated-sorted-array',
      status: SubmissionStatus.ACCEPTED, // Succeeded later
      language: Language.PYTHON,
      executionTime: 48,
      memoryUsed: 15400,
      createdAt: getPastDate(3, 4),
      sourceCode: 'def search(nums, target): corrected binary search',
    },

    // --- Day 2: Trees (Showcasing difficulties: starts failing some Mediums/Hards) ---
    {
      slug: 'maximum-depth-of-binary-tree',
      status: SubmissionStatus.ACCEPTED,
      language: Language.PYTHON,
      executionTime: 42,
      memoryUsed: 16200,
      createdAt: getPastDate(2, 6),
      sourceCode: 'def maxDepth(root): ...',
    },
    {
      slug: 'validate-binary-search-tree',
      status: SubmissionStatus.FAILED, // Failed validate BST
      language: Language.JAVASCRIPT,
      executionTime: 110,
      memoryUsed: 44000,
      createdAt: getPastDate(2, 4),
      sourceCode: 'function isValidBST(root) { simple recursive without bounds }',
    },
    {
      slug: 'validate-binary-search-tree',
      status: SubmissionStatus.ACCEPTED, // Finally succeeded
      language: Language.JAVASCRIPT,
      executionTime: 70,
      memoryUsed: 44200,
      createdAt: getPastDate(2, 3),
      sourceCode: 'function isValidBST(root) { helper with min/max bounds }',
    },

    // --- Day 1: Graphs & Hard Problems (Failing, showing weaknesses/needs focus) ---
    {
      slug: 'number-of-islands',
      status: SubmissionStatus.FAILED, // Failed island search
      language: Language.PYTHON,
      executionTime: 250,
      memoryUsed: 28000,
      createdAt: getPastDate(1, 5),
      sourceCode: 'def numIslands(grid): index out of range dfs',
    },
    {
      slug: 'course-schedule',
      status: SubmissionStatus.RUNTIME_ERROR, // Runtime error
      language: Language.JAVASCRIPT,
      executionTime: 95,
      memoryUsed: 45000,
      createdAt: getPastDate(1, 2),
      sourceCode: 'function canFinish(numCourses, prerequisites) { cycle detection error }',
    },
  ];

  for (const subData of submissionsToSeed) {
    const question = getQuestion(subData.slug);
    await prisma.submission.create({
      data: {
        userId,
        questionId: question.id,
        status: subData.status,
        language: subData.language,
        executionTime: subData.executionTime,
        memoryUsed: subData.memoryUsed,
        createdAt: subData.createdAt,
        sourceCode: subData.sourceCode,
      },
    });
  }

  console.log(
    `[Seed Rich User] Successfully seeded ${submissionsToSeed.length} submissions for ${userId}.`,
  );
  console.log(
    '[Seed Rich User] Seeding completed. You can now run the Profile Agent using this user ID: rich_test_user',
  );
}

main()
  .catch((e) => {
    console.error('[Seed Rich User] Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
