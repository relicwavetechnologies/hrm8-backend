
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const companies = await prisma.company.findMany({
            select: { id: true, name: true }
        });
        console.log('Total companies:', companies.length);
        companies.forEach(c => console.log(`${c.id}: ${c.name}`));
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
