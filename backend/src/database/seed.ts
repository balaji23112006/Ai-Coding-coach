import { prisma } from './prisma';

async function main() {
  console.log('[Database Seed] Starting database seeding...');
  
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

  console.log('[Database Seed] Created/verified example user:', exampleUser);
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
