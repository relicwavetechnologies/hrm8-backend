
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
    console.log('--- Debugging Consultant Job Assignments (JS) ---');

    try {
        // 1. Count total consultants
        const consultantCount = await prisma.consultant.count();
        console.log(`Total Consultants: ${consultantCount}`);

        // 2. Count total assignments
        const assignmentCount = await prisma.consultantJobAssignment.count();
        console.log(`Total Job Assignments: ${assignmentCount}`);

        // 3. List first 5 assignments
        const assignments = await prisma.consultantJobAssignment.findMany({
            take: 5,
            include: {
                consultant: { select: { email: true, id: true } },
                job: { select: { title: true, id: true } }
            }
        });

        console.log('First 5 Assignments:', JSON.stringify(assignments, null, 2));

        // 4. Check for assignments with status 'ACTIVE'
        const activeAssignments = await prisma.consultantJobAssignment.count({
            where: { status: 'ACTIVE' }
        });
        console.log(`Active Assignments: ${activeAssignments}`);

        // 5. List all consultants with their IDs for cross-reference
        const consultants = await prisma.consultant.findMany({
            take: 5,
            select: { id: true, email: true, first_name: true, last_name: true }
        });
        console.log('First 5 Consultants:', JSON.stringify(consultants, null, 2));

    } catch (error) {
        console.error('Error querying database:', error);
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
