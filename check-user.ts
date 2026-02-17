import { PrismaClient } from '@prisma/client';

async function main() {
    const prisma = new PrismaClient();
    const user = await prisma.user.findUnique({
        where: { email: 'anish.suman2024@nst.rishihood.edu.in' }
    });
    console.log('User found:', user ? 'YES' : 'NO');
    await prisma.$disconnect();
}

main();
