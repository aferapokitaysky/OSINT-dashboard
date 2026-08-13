const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('admin123', 12);
  const user = await prisma.user.upsert({
    where: { email: 'admin@osint.io' },
    update: {},
    create: {
      email: 'admin@osint.io',
      passwordHash,
      displayName: 'System Admin',
      role: 'ADMIN',
    },
  });
  console.log('Admin user created:', user.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
