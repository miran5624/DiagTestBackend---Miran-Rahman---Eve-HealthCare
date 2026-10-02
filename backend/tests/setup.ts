import { beforeAll, afterAll, afterEach } from 'vitest';
import { prisma } from '../src/app';

beforeAll(async () => {
  // Run migrations
  // execSync('npx prisma migrate deploy', { stdio: 'inherit' });
});

afterEach(async () => {
  // await truncateAllTables(prisma);
});

afterAll(async () => {
  await prisma.$disconnect();
});
