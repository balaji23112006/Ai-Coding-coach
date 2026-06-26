import { prisma } from './prisma.js';
import { Language, SubmissionStatus } from '@prisma/client';

async function main() {
  console.log('[Seed Topper User] Starting user seeding for username: topper...');

  // 1. Create or update user "topper"
  const user = await prisma.user.upsert({
    where: { username: 'topper' },
    update: {},
    create: {
      fullName: 'Topper Student',
      username: 'topper',
      email: 'topper@example.com',
      password: 'hashedpassword123',
    },
  });
  console.log('[Seed Topper User] Created/verified user with username topper. Email:', user.email);

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
      '[Seed Topper User] No questions found in the database. Please run npm run seed first.',
    );
    process.exit(1);
  }

  // Create a map of slugs to question objects
  const questionMap = new Map(questions.map((q) => [q.slug, q]));

  // Clean up any existing submissions and profile for this user
  await prisma.submission.deleteMany({ where: { userId: user.id } });
  await prisma.userProfile.deleteMany({ where: { userId: user.id } });
  console.log('[Seed Topper User] Cleaned up existing submissions and profile for user topper.');

  // Create a helper to get question or fallback
  const getQuestion = (slug: string) => {
    const q = questionMap.get(slug);
    if (!q) {
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

  // We want to generate ~25 submissions across various topics representing intermediate skills
  const submissionsData = [
    // --- Day 8: Arrays & Strings (Intermediate - mostly successful) ---
    { slug: 'two-sum', status: SubmissionStatus.ACCEPTED, daysAgo: 8, hoursAgo: 4 },
    { slug: 'valid-palindrome', status: SubmissionStatus.ACCEPTED, daysAgo: 8, hoursAgo: 2 },
    { slug: 'rotate-array', status: SubmissionStatus.ACCEPTED, daysAgo: 7, hoursAgo: 6 },
    { slug: 'move-zeroes', status: SubmissionStatus.ACCEPTED, daysAgo: 7, hoursAgo: 3 },

    // --- Day 6: HashMaps & Stacks (Intermediate - some failures then success) ---
    { slug: 'valid-anagram', status: SubmissionStatus.ACCEPTED, daysAgo: 6, hoursAgo: 8 },
    { slug: 'valid-parentheses', status: SubmissionStatus.ACCEPTED, daysAgo: 6, hoursAgo: 5 },
    { slug: 'min-stack', status: SubmissionStatus.FAILED, daysAgo: 6, hoursAgo: 3 },
    { slug: 'min-stack', status: SubmissionStatus.ACCEPTED, daysAgo: 6, hoursAgo: 2 },

    // --- Day 5: Linked Lists ---
    { slug: 'reverse-linked-list', status: SubmissionStatus.ACCEPTED, daysAgo: 5, hoursAgo: 9 },
    {
      slug: 'middle-of-the-linked-list',
      status: SubmissionStatus.ACCEPTED,
      daysAgo: 5,
      hoursAgo: 6,
    },
    { slug: 'linked-list-cycle', status: SubmissionStatus.ACCEPTED, daysAgo: 5, hoursAgo: 3 },

    // --- Day 4: Binary Search ---
    { slug: 'binary-search', status: SubmissionStatus.ACCEPTED, daysAgo: 4, hoursAgo: 8 },
    { slug: 'search-insert-position', status: SubmissionStatus.ACCEPTED, daysAgo: 4, hoursAgo: 5 },
    {
      slug: 'search-in-rotated-sorted-array',
      status: SubmissionStatus.FAILED,
      daysAgo: 4,
      hoursAgo: 2,
    },
    {
      slug: 'search-in-rotated-sorted-array',
      status: SubmissionStatus.ACCEPTED,
      daysAgo: 4,
      hoursAgo: 1,
    },

    // --- Day 3: Trees (Intermediate struggles) ---
    {
      slug: 'maximum-depth-of-binary-tree',
      status: SubmissionStatus.ACCEPTED,
      daysAgo: 3,
      hoursAgo: 7,
    },
    { slug: 'same-tree', status: SubmissionStatus.FAILED, daysAgo: 3, hoursAgo: 4 },
    { slug: 'same-tree', status: SubmissionStatus.ACCEPTED, daysAgo: 3, hoursAgo: 3 },
    {
      slug: 'validate-binary-search-tree',
      status: SubmissionStatus.TIMEOUT,
      daysAgo: 3,
      hoursAgo: 1,
    },

    // --- Day 2: Graphs (Struggling/Unsolved) ---
    {
      slug: 'find-if-path-exists-in-graph',
      status: SubmissionStatus.FAILED,
      daysAgo: 2,
      hoursAgo: 6,
    },
    { slug: 'number-of-islands', status: SubmissionStatus.RUNTIME_ERROR, daysAgo: 2, hoursAgo: 3 },

    // --- Day 1: Recent Activity ---
    { slug: 'longest-common-prefix', status: SubmissionStatus.ACCEPTED, daysAgo: 1, hoursAgo: 5 },
    { slug: 'course-schedule', status: SubmissionStatus.FAILED, daysAgo: 1, hoursAgo: 2 },
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
          sub.status === SubmissionStatus.TIMEOUT ? 5000 : Math.floor(Math.random() * 120) + 20,
        memoryUsed: Math.floor(Math.random() * 8000) + 12000,
        createdAt: getPastDate(sub.daysAgo, sub.hoursAgo),
        sourceCode: `// Intermediate user submission for ${sub.slug}`,
      },
    });
  }

  // 3. Populate Intermediate user profile
  await prisma.userProfile.create({
    data: {
      userId: user.id,
      skills: {
        Arrays: 4,
        Strings: 3,
        HashMaps: 3,
        LinkedLists: 3,
        Stacks: 2,
        BinarySearch: 2,
        Trees: 1,
        Graphs: 0,
      },
      solvedCount: 16,
      easySolved: 11,
      mediumSolved: 5,
      hardSolved: 0,
      learningTrack: 'Data Structures & Algorithms',
      experienceLevel: 'Intermediate',
      recommendedFocus: 'Binary Trees & BSTs',
      recommendedDifficulty: 'Medium',
    },
  });

  console.log(
    `[Seed Topper User] Successfully seeded ${submissionsData.length} submissions for user "topper".`,
  );
  console.log(`[Seed Topper User] Set experienceLevel to "Intermediate" for user "topper".`);
}

main()
  .catch((e) => {
    console.error('[Seed Topper User] Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
