import { prisma } from './prisma.js';
import { Language, SubmissionStatus } from '@prisma/client';

async function main() {
  console.log('[Seed Toper User] Starting user seeding for username: toper...');

  // 1. Create or update user "toper"
  const userId = 'toper_user';
  const user = await prisma.user.upsert({
    where: { username: 'toper' },
    update: {},
    create: {
      id: userId,
      fullName: 'Toper Student',
      username: 'toper',
      email: 'toper@example.com',
      password: 'hashedpassword123',
    },
  });
  console.log('[Seed Toper User] Created/verified user with username toper. Email:', user.email);

  // 2. Fetch seeded questions
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
      '[Seed Toper User] No questions found in the database. Please run npm run seed first.',
    );
    process.exit(1);
  }

  // Create a map of slugs to question objects
  const questionMap = new Map(questions.map((q) => [q.slug, q]));

  // Clean up any existing submissions and profile for this user
  await prisma.submission.deleteMany({ where: { userId: user.id } });
  await prisma.userProfile.deleteMany({ where: { userId: user.id } });
  console.log('[Seed Toper User] Cleaned up existing submissions and profile for user toper.');

  // Create a helper to get question or fallback
  const getQuestion = (slug: string) => {
    const q = questionMap.get(slug);
    if (!q) {
      // Find a fallback question that matches the topic if possible, or just return first question
      return questions[Math.floor(Math.random() * questions.length)];
    }
    return q;
  };

  const now = new Date();
  const getPastDate = (daysAgo: number, hoursAgo: number) => {
    const date = new Date(now);
    date.setDate(date.getDate() - daysAgo);
    date.setHours(date.getHours() - hoursAgo);
    return date;
  };

  // We want to generate ~35 submissions across various topics
  // Topics: Arrays, Strings, HashMaps, Linked Lists, Stacks, Binary Search, Trees, Graphs
  // We want to include multiple failures (FAILED, RUNTIME_ERROR, TIMEOUT) and successes (ACCEPTED)
  const submissionsData = [
    // --- Day 10: Array Basics (Easy) ---
    {
      slug: 'largest-element-in-array',
      status: SubmissionStatus.ACCEPTED,
      daysAgo: 10,
      hoursAgo: 8,
    },
    { slug: 'move-zeroes', status: SubmissionStatus.ACCEPTED, daysAgo: 10, hoursAgo: 6 },
    { slug: 'rotate-array', status: SubmissionStatus.FAILED, daysAgo: 10, hoursAgo: 4 }, // Error
    { slug: 'rotate-array', status: SubmissionStatus.ACCEPTED, daysAgo: 10, hoursAgo: 3 },

    // --- Day 9: Strings (Easy & Medium) ---
    { slug: 'valid-palindrome', status: SubmissionStatus.ACCEPTED, daysAgo: 9, hoursAgo: 8 },
    { slug: 'longest-common-prefix', status: SubmissionStatus.ACCEPTED, daysAgo: 9, hoursAgo: 6 },
    { slug: 'reverse-words-in-a-string', status: SubmissionStatus.FAILED, daysAgo: 9, hoursAgo: 4 }, // Error
    {
      slug: 'reverse-words-in-a-string',
      status: SubmissionStatus.ACCEPTED,
      daysAgo: 9,
      hoursAgo: 3,
    },
    {
      slug: 'longest-substring-without-repeating-characters',
      status: SubmissionStatus.TIMEOUT,
      daysAgo: 9,
      hoursAgo: 1,
    }, // Error

    // --- Day 8: HashMaps (Easy & Medium) ---
    { slug: 'two-sum', status: SubmissionStatus.ACCEPTED, daysAgo: 8, hoursAgo: 7 },
    { slug: 'valid-anagram', status: SubmissionStatus.ACCEPTED, daysAgo: 8, hoursAgo: 5 },
    {
      slug: 'longest-consecutive-sequence',
      status: SubmissionStatus.FAILED,
      daysAgo: 8,
      hoursAgo: 3,
    }, // Error
    {
      slug: 'longest-consecutive-sequence',
      status: SubmissionStatus.ACCEPTED,
      daysAgo: 8,
      hoursAgo: 2,
    },

    // --- Day 7: Linked Lists (Easy & Medium) ---
    { slug: 'reverse-linked-list', status: SubmissionStatus.ACCEPTED, daysAgo: 7, hoursAgo: 8 },
    {
      slug: 'middle-of-the-linked-list',
      status: SubmissionStatus.ACCEPTED,
      daysAgo: 7,
      hoursAgo: 6,
    },
    { slug: 'linked-list-cycle', status: SubmissionStatus.ACCEPTED, daysAgo: 7, hoursAgo: 4 },
    { slug: 'remove-nth-node-from-end', status: SubmissionStatus.FAILED, daysAgo: 7, hoursAgo: 2 }, // Error
    {
      slug: 'remove-nth-node-from-end',
      status: SubmissionStatus.ACCEPTED,
      daysAgo: 7,
      hoursAgo: 1,
    },

    // --- Day 6: Stacks (Easy & Medium) ---
    { slug: 'valid-parentheses', status: SubmissionStatus.ACCEPTED, daysAgo: 6, hoursAgo: 8 },
    { slug: 'min-stack', status: SubmissionStatus.FAILED, daysAgo: 6, hoursAgo: 5 }, // Error
    { slug: 'min-stack', status: SubmissionStatus.ACCEPTED, daysAgo: 6, hoursAgo: 4 },
    { slug: 'daily-temperatures', status: SubmissionStatus.TIMEOUT, daysAgo: 6, hoursAgo: 2 }, // Error
    { slug: 'daily-temperatures', status: SubmissionStatus.ACCEPTED, daysAgo: 6, hoursAgo: 1 },

    // --- Day 5: Binary Search (Easy & Medium) ---
    { slug: 'binary-search', status: SubmissionStatus.ACCEPTED, daysAgo: 5, hoursAgo: 9 },
    { slug: 'search-insert-position', status: SubmissionStatus.ACCEPTED, daysAgo: 5, hoursAgo: 7 },
    {
      slug: 'search-in-rotated-sorted-array',
      status: SubmissionStatus.FAILED,
      daysAgo: 5,
      hoursAgo: 4,
    }, // Error
    {
      slug: 'search-in-rotated-sorted-array',
      status: SubmissionStatus.RUNTIME_ERROR,
      daysAgo: 5,
      hoursAgo: 3,
    }, // Error
    {
      slug: 'search-in-rotated-sorted-array',
      status: SubmissionStatus.ACCEPTED,
      daysAgo: 5,
      hoursAgo: 2,
    },

    // --- Day 4: Trees (Easy & Medium) ---
    {
      slug: 'maximum-depth-of-binary-tree',
      status: SubmissionStatus.ACCEPTED,
      daysAgo: 4,
      hoursAgo: 8,
    },
    { slug: 'same-tree', status: SubmissionStatus.ACCEPTED, daysAgo: 4, hoursAgo: 6 },
    {
      slug: 'validate-binary-search-tree',
      status: SubmissionStatus.FAILED,
      daysAgo: 4,
      hoursAgo: 3,
    }, // Error
    {
      slug: 'validate-binary-search-tree',
      status: SubmissionStatus.ACCEPTED,
      daysAgo: 4,
      hoursAgo: 2,
    },

    // --- Day 3: Graphs (Medium) ---
    {
      slug: 'find-if-path-exists-in-graph',
      status: SubmissionStatus.ACCEPTED,
      daysAgo: 3,
      hoursAgo: 8,
    },
    { slug: 'number-of-islands', status: SubmissionStatus.FAILED, daysAgo: 3, hoursAgo: 5 }, // Error
    { slug: 'number-of-islands', status: SubmissionStatus.ACCEPTED, daysAgo: 3, hoursAgo: 4 },
    { slug: 'course-schedule', status: SubmissionStatus.TIMEOUT, daysAgo: 3, hoursAgo: 2 }, // Error

    // --- Day 2: Advanced Topics & Hard questions ---
    {
      slug: 'median-of-two-sorted-arrays',
      status: SubmissionStatus.FAILED,
      daysAgo: 2,
      hoursAgo: 8,
    }, // Hard Error
    {
      slug: 'median-of-two-sorted-arrays',
      status: SubmissionStatus.FAILED,
      daysAgo: 2,
      hoursAgo: 6,
    }, // Hard Error
    { slug: 'lru-cache', status: SubmissionStatus.RUNTIME_ERROR, daysAgo: 2, hoursAgo: 3 }, // Hard Error

    // --- Day 1: Recent Activity ---
    {
      slug: 'longest-substring-without-repeating-characters',
      status: SubmissionStatus.ACCEPTED,
      daysAgo: 1,
      hoursAgo: 8,
    },
    { slug: 'rotting-oranges', status: SubmissionStatus.FAILED, daysAgo: 1, hoursAgo: 5 }, // Medium Error
    { slug: 'rotting-oranges', status: SubmissionStatus.ACCEPTED, daysAgo: 1, hoursAgo: 4 },
    { slug: 'course-schedule-ii', status: SubmissionStatus.FAILED, daysAgo: 1, hoursAgo: 2 }, // Medium Error
  ];

  for (const sub of submissionsData) {
    const question = getQuestion(sub.slug);
    await prisma.submission.create({
      data: {
        userId: user.id,
        questionId: question.id,
        status: sub.status,
        language: Math.random() > 0.5 ? Language.JAVASCRIPT : Language.PYTHON,
        executionTime:
          sub.status === SubmissionStatus.TIMEOUT ? 5000 : Math.floor(Math.random() * 150) + 30,
        memoryUsed: Math.floor(Math.random() * 10000) + 15000,
        createdAt: getPastDate(sub.daysAgo, sub.hoursAgo),
        sourceCode: `// Source code submission for ${sub.slug}`,
      },
    });
  }

  console.log(
    `[Seed Toper User] Successfully seeded ${submissionsData.length} submissions for user "toper".`,
  );
  console.log(
    '[Seed Toper User] Seeding completed. You can now run the Profile Agent using userId: ' +
      user.id,
  );
}

main()
  .catch((e) => {
    console.error('[Seed Toper User] Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
