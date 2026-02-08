
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Checking for admin user...');
    const email = 'admin@example.com';

    const user = await prisma.user.findUnique({
        where: { email },
    });

    if (!user) {
        console.log(`User ${email} not found.`);
        return;
    }

    console.log(`Found user ${email} with status: ${user.status}`);

    if (user.status !== 'ACTIVE') {
        const updated = await prisma.user.update({
            where: { email },
            data: { status: 'ACTIVE' },
        });
        console.log(`Updated user ${email} status to ACTIVE.`);
    } else {
        console.log(`User ${email} is already ACTIVE.`);
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
