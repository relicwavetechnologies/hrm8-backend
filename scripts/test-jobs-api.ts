import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testJobsAPI() {
  try {
    // Find a user to test with
    const user = await prisma.user.findFirst({
      where: {
        company_id: { not: null },
      },
      include: {
        company: true,
      },
      orderBy: { created_at: 'desc' },
    });

    if (!user) {
      console.log('No user found');
      return;
    }

    console.log('\n=== Test User ===');
    console.log(`User: ${user.full_name} (${user.email})`);
    console.log(`Company: ${user.company?.name} (ID: ${user.company_id})`);
    console.log(`Role: ${user.role}`);

    // Simulate the repository method call
    const companyId = user.company_id!;

    // Test 1: Get all jobs without filters
    console.log('\n=== Test 1: Get all jobs (no filters) ===');
    const allJobs = await prisma.job.findMany({
      where: { company_id: companyId },
      orderBy: { created_at: 'desc' },
    });
    console.log(`Found ${allJobs.length} jobs`);

    // Test 2: Get jobs with empty filters (simulating what frontend might send)
    console.log('\n=== Test 2: Get jobs with typical frontend filters ===');

    // This is what might be sent from frontend as query params
    const filters = {
      status: '', // Empty status
      search: '',
      page: '1',
      limit: '20',
    };

    const where: any = { company_id: companyId };

    if (filters.status && filters.status !== 'All Status' && filters.status !== '') {
      where.status = filters.status;
    }

    const jobs = await prisma.job.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: Number(filters.limit),
    });

    console.log(`Found ${jobs.length} jobs with filters`);

    if (jobs.length > 0) {
      console.log('\nFirst 3 jobs:');
      jobs.slice(0, 3).forEach(job => {
        console.log(`- ${job.title} (${job.status})`);
      });
    }

    // Test 3: Check application counts
    console.log('\n=== Test 3: Get jobs with application counts ===');
    const jobsWithCounts = await prisma.job.findMany({
      where: { company_id: companyId },
      orderBy: { created_at: 'desc' },
      take: 5,
      include: {
        _count: {
          select: {
            applications: true,
          },
        },
      },
    });

    console.log(`First 5 jobs with application counts:`);
    jobsWithCounts.forEach(job => {
      console.log(`- ${job.title}: ${job._count.applications} applications`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testJobsAPI();
