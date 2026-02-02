
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Testing Consultant Notification Enum...');
    try {
        const count = await prisma.universalNotification.count({
            where: {
                recipient_type: 'CONSULTANT'
            }
        });
        console.log('Success! Count:', count);
    } catch (error) {
        console.error('Error querying Consultant notifications:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
