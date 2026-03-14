import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  await prisma.user.upsert({
    where: { email: 'admin@monday1.com' },
    update: {},
    create: {
      email: 'admin@monday1.com',
      name: 'Admin',
      password: 'hashed_password_here', // use bcrypt in real seed
      role: 'ADMIN',
    },
  });

  console.log('Seeding complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
