import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const adminHash = await bcrypt.hash('password123', 10);
  await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: { role: 'ADMIN', passwordHash: adminHash, name: 'Admin User' },
    create: {
      email: 'admin@example.com',
      passwordHash: adminHash,
      name: 'Admin User',
      role: 'ADMIN',
    }
  });

  const centre1 = await prisma.diagnosticCentre.create({
    data: { name: 'Apollo Diagnostics', city: 'Delhi', address: '123 Main St' }
  });
  const centre2 = await prisma.diagnosticCentre.create({
    data: { name: 'Dr Lal PathLabs', city: 'Mumbai', address: '456 Linking Rd' }
  });
  const centre3 = await prisma.diagnosticCentre.create({
    data: { name: 'SRL Diagnostics', city: 'Delhi', address: '789 Connaught Place' }
  });

  const t1 = await prisma.diagnosticTest.create({ data: { name: 'Complete Blood Count', description: 'Checks for anemia, infection, etc.' } });
  const t2 = await prisma.diagnosticTest.create({ data: { name: 'Lipid Profile', description: 'Measures cholesterol levels' } });
  const t3 = await prisma.diagnosticTest.create({ data: { name: 'Thyroid Profile', description: 'Measures T3, T4, TSH' } });
  const t4 = await prisma.diagnosticTest.create({ data: { name: 'HbA1c', description: 'Average blood sugar over 3 months' } });
  const t5 = await prisma.diagnosticTest.create({ data: { name: 'Vitamin D', description: 'Check for bone health' } });
  const t6 = await prisma.diagnosticTest.create({ data: { name: 'Vitamin B12', description: 'Check for nerve health' } });

  await prisma.centreTest.createMany({
    data: [
      { centreId: centre1.id, testId: t1.id, pricePaise: 50000 },
      { centreId: centre1.id, testId: t2.id, pricePaise: 60000 },
      { centreId: centre1.id, testId: t3.id, pricePaise: 70000 },
      { centreId: centre2.id, testId: t1.id, pricePaise: 55000 },
      { centreId: centre2.id, testId: t4.id, pricePaise: 80000 },
      { centreId: centre2.id, testId: t5.id, pricePaise: 90000 },
      { centreId: centre3.id, testId: t1.id, pricePaise: 45000 },
      { centreId: centre3.id, testId: t6.id, pricePaise: 100000 },
    ]
  });
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
