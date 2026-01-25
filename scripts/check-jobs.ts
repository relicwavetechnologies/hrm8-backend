import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkJobs() {
  try {
    // Get all companies
    const companies = await prisma.company.findMany({
      select: { id: true, name: true, domain: true },
    });

    console.log('\n=== Companies ===');
    console.log(`Total companies: ${companies.length}`);
    companies.forEach(company => {
      console.log(`- ${company.name} (${company.domain}) - ID: ${company.id}`);
    });

    // Get all jobs
    const jobs = await prisma.job.findMany({
      select: {
        id: true,
        title: true,
        status: true,
        company_id: true,
        created_at: true,
      },
      orderBy: { created_at: 'desc' },
    });

    console.log('\n=== Jobs ===');
    console.log(`Total jobs: ${jobs.length}`);
    jobs.forEach(job => {
      console.log(`- ${job.title} (${job.status}) - Company: ${job.company_id} - Created: ${job.created_at}`);
    });

    // Group jobs by company
    console.log('\n=== Jobs by Company ===');
    companies.forEach(company => {
      const companyJobs = jobs.filter(j => j.company_id === company.id);
      console.log(`${company.name}: ${companyJobs.length} jobs`);
      companyJobs.forEach(job => {
        console.log(`  - ${job.title} (${job.status})`);
      });
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkJobs();
