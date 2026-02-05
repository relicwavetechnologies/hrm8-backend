import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('--- Checking Conversations ---');
  const convCount = await prisma.conversation.count();
  console.log('Conversation Count:', convCount);
  
  const participants = await prisma.conversationParticipant.findMany({
    take: 5
  });
  console.log('Sample Participants:', JSON.stringify(participants, null, 2));

  const candidates = await prisma.candidate.findMany({
    take: 3,
    select: { id: true, email: true }
  });
  console.log('Sample Candidates:', JSON.stringify(candidates, null, 2));
}

main()
  .catch(err => {
    console.error('ERROR:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
