const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst();
  if (!user) {
    console.error('No user found. Run seed first.');
    return;
  }
  const investigation = await prisma.investigation.create({
    data: {
      title: 'Active Case: Nexus-Alpha',
      description: 'Initial analysis of incoming IP threats and related infrastructure.',
      ownerId: user.id,
      status: 'IN_PROGRESS',
      tags: ['priority', 'threat-intel'],
    },
  });
  console.log('Investigation ID:', investigation.id);
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
