
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting verification...');

    // 1. Get a company ID (using the one from the logs if available, or just the first one)
    const company = await prisma.company.findFirst();
    if (!company) {
        console.log('No company found');
        return;
    }
    const companyId = company.id;
    console.log('Testing with Company ID:', companyId);

    // 2. Count Total Jobs
    const total = await prisma.job.count({
        where: { company_id: companyId }
    });
    console.log('DB Total Jobs:', total);

    // 3. Count Active Jobs
    const active = await prisma.job.count({
        where: {
            company_id: companyId,
            status: 'OPEN'
        }
    });
    console.log('DB Active Jobs (OPEN):', active);

    // 4. Count Filled Jobs
    const filled = await prisma.job.count({
        where: {
            company_id: companyId,
            status: 'FILLED'
        }
    });
    console.log('DB Filled Jobs (FILLED):', filled);

    // 5. Count Applications
    const applicants = await prisma.application.count({
        where: {
            job: {
                company_id: companyId
            }
        }
    });
    console.log('DB Total Applicants:', applicants);

    console.log('--------------------------------');
    console.log('Stats Object:', {
        total,
        active,
        filled,
        applicants
    });
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
