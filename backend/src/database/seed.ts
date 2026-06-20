import { prisma } from './prisma';
import fs from 'fs';
import path from 'path';
import { z } from 'zod';

// Zod validation schemas
const testCaseSchema = z.object({
  input: z.any().transform((val) => (typeof val === 'object' ? JSON.stringify(val) : String(val))),
  expected_output: z
    .any()
    .transform((val) => (typeof val === 'object' ? JSON.stringify(val) : String(val))),
  is_hidden: z.boolean(),
});

const questionSeedSchema = z.object({
  slug: z
    .string()
    .min(1, 'Slug is required')
    .regex(/^[a-z0-9-]+$/, 'Slug must be in valid format (lowercase, numbers, and hyphens)'),
  title: z.string().min(1, 'Title is required'),
  difficulty: z.enum(['Easy', 'Medium', 'Hard']),
  description: z.string().min(1, 'Description is required'),
  constraints: z.union([z.string(), z.array(z.string())]).transform((val) => {
    if (Array.isArray(val)) {
      return JSON.stringify(val);
    }
    return val;
  }),
  starter_code: z
    .record(z.string(), z.string())
    .refine((obj) => Object.keys(obj).length > 0, 'Starter code must have at least one language'),
  topics: z.array(z.string().min(1)).min(1, 'At least one topic is required'),
  test_cases: z.array(testCaseSchema).min(1, 'At least one test case is required'),
});

async function main() {
  console.log('[Database Seed] Starting database seeding...');

  // 1. Seed/verify example user (preserve existing behavior)
  const exampleUser = await prisma.user.upsert({
    where: { email: 'aniket@example.com' },
    update: {},
    create: {
      fullName: 'Aniket Kumar',
      username: 'aniket12',
      email: 'aniket@example.com',
      password: 'hashedpassword123',
    },
  });
  console.log('[Database Seed] Created/verified example user:', exampleUser.email);

  // 2. Resolve seed directory
  const seedDir = path.resolve(__dirname, '../../seed');
  if (!fs.existsSync(seedDir)) {
    console.error(`[Database Seed] Seed directory not found at: ${seedDir}`);
    process.exit(1);
  }

  // 3. Read all JSON files
  const files = fs.readdirSync(seedDir).filter((file) => file.endsWith('.json'));
  console.log(`[Database Seed] Found ${files.length} seed files: ${files.join(', ')}`);

  // Track slug uniqueness across all files
  const seenSlugs = new Set<string>();

  for (const file of files) {
    const filePath = path.join(seedDir, file);
    console.log(`[Database Seed] Processing ${file}...`);

    const fileContent = fs.readFileSync(filePath, 'utf-8');
    let questionsData: any;
    try {
      questionsData = JSON.parse(fileContent);
    } catch (err) {
      throw new Error(`Failed to parse JSON in file ${file}: ${(err as Error).message}`);
    }

    if (!Array.isArray(questionsData)) {
      throw new Error(`File ${file} must contain a JSON array of questions`);
    }

    for (const rawQuestion of questionsData) {
      // Validate structure with Zod
      const parseResult = questionSeedSchema.safeParse(rawQuestion);
      if (!parseResult.success) {
        console.error(
          `[Database Seed] Validation failed for question in file ${file}:`,
          parseResult.error.format(),
        );
        throw new Error(
          `Validation failed for question slug "${rawQuestion.slug || 'unknown'}": ${parseResult.error.message}`,
        );
      }

      const question = parseResult.data;

      // Skip duplicate slugs across seed files to prevent crashes
      if (seenSlugs.has(question.slug)) {
        console.warn(
          `[Database Seed] Slug "${question.slug}" already processed from another file. Skipping duplicate in ${file}...`,
        );
        continue;
      }
      seenSlugs.add(question.slug);

      // Upsert the question
      const dbQuestion = await prisma.question.upsert({
        where: { slug: question.slug },
        update: {
          title: question.title,
          difficulty: question.difficulty,
          description: question.description,
          constraints: question.constraints,
          starterCode: question.starter_code,
        },
        create: {
          slug: question.slug,
          title: question.title,
          difficulty: question.difficulty,
          description: question.description,
          constraints: question.constraints,
          starterCode: question.starter_code,
        },
      });

      // Handle topics
      const topicIds: string[] = [];
      for (const topicName of question.topics) {
        const dbTopic = await prisma.topic.upsert({
          where: { name: topicName },
          update: {},
          create: { name: topicName },
        });
        topicIds.push(dbTopic.id);
      }

      // Sync question topics: delete existing relations and recreate
      await prisma.questionTopic.deleteMany({
        where: { questionId: dbQuestion.id },
      });

      for (const topicId of topicIds) {
        await prisma.questionTopic.create({
          data: {
            questionId: dbQuestion.id,
            topicId: topicId,
          },
        });
      }

      // Sync test cases: delete existing ones and recreate
      await prisma.testCase.deleteMany({
        where: { questionId: dbQuestion.id },
      });

      for (const tc of question.test_cases) {
        await prisma.testCase.create({
          data: {
            questionId: dbQuestion.id,
            input: tc.input,
            expectedOutput: tc.expected_output,
            isHidden: tc.is_hidden,
          },
        });
      }

      console.log(`[Database Seed] Synced question: ${question.slug}`);
    }
  }

  console.log('[Database Seed] Seeding completed.');
}

main()
  .catch((e) => {
    console.error('[Database Seed] Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
