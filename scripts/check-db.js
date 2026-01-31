
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const regions = await prisma.region.findMany();
        console.log('--- REGIONS ---');
        console.log(regions.map(r => ({ id: r.id, name: r.name, code: r.code })));

        const jobsCount = await prisma.job.count();
        console.log('\n--- JOBS OVERVIEW ---');
        console.log('Total Jobs:', jobsCount);

        const jobsPerRegion = await prisma.job.groupBy({
            by: ['region_id'],
            _count: { id: true }
        });
        console.log('\n--- JOBS PER REGION ---');
        console.log(jobsPerRegion);

        const jobsWithNoRegion = await prisma.job.count({
            where: { region_id: null }
        });
        console.log('Jobs with region_id IS NULL:', jobsWithNoRegion);

        const firstFiveJobs = await prisma.job.findMany({
            take: 5,
            select: { id: true, title: true, region_id: true }
        });
        console.log('\n--- SAMPLE JOBS ---');
        console.log(firstFiveJobs);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
