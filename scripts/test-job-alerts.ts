/**
 * Test script for Job Alerts functionality
 * 
 * Usage:
 *   npx ts-node scripts/test-job-alerts.ts
 * 
 * This script will:
 * 1. Create a test candidate with a job alert
 * 2. Create and publish a job that matches the alert
 * 3. Verify that the alert notification was created
 */

import { PrismaClient } from '@prisma/client';
import { JobAlertService } from '../src/modules/candidate/job-alert.service';
import { NotificationService } from '../src/modules/notification/notification.service';
import { NotificationRepository } from '../src/modules/notification/notification.repository';
import { EmailService } from '../src/modules/email/email.service';

const prisma = new PrismaClient();

async function testJobAlerts() {
    console.log('🧪 Testing Job Alerts Flow\n');

    try {
        // Step 1: Create a test candidate
        console.log('Step 1: Creating test candidate...');
        const candidate = await prisma.candidate.create({
            data: {
                email: `test-candidate-${Date.now()}@example.com`,
                password_hash: 'test-hash',
                first_name: 'Test',
                last_name: 'Candidate',
            }
        });
        console.log(`✅ Created candidate: ${candidate.id}`);

        // Step 2: Create a job alert for the candidate
        console.log('\nStep 2: Creating job alert...');
        const jobAlert = await prisma.jobAlert.create({
            data: {
                candidate_id: candidate.id,
                name: 'Remote Engineering Jobs',
                criteria: {
                    keywords: ['engineer', 'developer'],
                    location: 'Remote',
                    workArrangement: 'REMOTE',
                    employmentType: 'FULL_TIME'
                },
                frequency: 'DAILY',
                channels: ['EMAIL', 'IN_APP'],
                is_active: true
            }
        });
        console.log(`✅ Created job alert: ${jobAlert.id}`);

        // Step 3: Get a company to use
        console.log('\nStep 3: Finding a company...');
        const company = await prisma.company.findFirst();
        if (!company) {
            throw new Error('No company found in database');
        }
        console.log(`✅ Using company: ${company.name} (${company.id})`);

        // Step 4: Find a user to use as job creator
        console.log('\nStep 4: Finding a user to create job...');
        const user = await prisma.user.findFirst();
        if (!user) {
            throw new Error('No user found in database');
        }
        console.log(`✅ Using user: ${user.id}`);

        // Step 5: Create a job that matches the alert
        console.log('\nStep 5: Creating a matching job...');
        const job = await prisma.job.create({
            data: {
                company_id: company.id,
                title: 'Senior Software Engineer',
                description: 'We are looking for a talented software engineer to join our remote team.',
                location: 'Remote',
                employment_type: 'FULL_TIME',
                work_arrangement: 'REMOTE',
                category: 'Engineering',
                status: 'DRAFT',
                number_of_vacancies: 1,
                salary_currency: 'USD',
                created_by: user.id
            }
        });
        console.log(`✅ Created job: ${job.id} - ${job.title}`);

        // Step 6: Process job alerts
        console.log('\nStep 6: Processing job alerts...');
        const notificationRepository = new NotificationRepository();
        const notificationService = new NotificationService(notificationRepository);
        const emailService = new EmailService();
        const jobAlertService = new JobAlertService(notificationService, emailService);

        await jobAlertService.processJobAlerts(job);
        console.log('✅ Job alert processing completed');

        // Step 7: Check if notification was created
        console.log('\nStep 7: Verifying notification was created...');
        const notifications = await prisma.universalNotification.findMany({
            where: {
                recipient_id: candidate.id,
                recipient_type: 'CANDIDATE',
                type: 'JOB_ALERT'
            }
        });

        if (notifications.length > 0) {
            console.log(`✅ SUCCESS: ${notifications.length} notification(s) created`);
            console.log(`   - Title: ${notifications[0].title}`);
            console.log(`   - Message: ${notifications[0].message}`);
        } else {
            console.log('❌ No notifications found - alert may not have matched');
        }

        // Cleanup
        console.log('\n🧹 Cleaning up test data...');
        await prisma.universalNotification.deleteMany({
            where: { recipient_id: candidate.id }
        });
        await prisma.jobAlert.delete({
            where: { id: jobAlert.id }
        });
        await prisma.job.delete({
            where: { id: job.id }
        });
        await prisma.candidate.delete({
            where: { id: candidate.id }
        });
        console.log('✅ Cleanup completed');

        console.log('\n✨ Test completed successfully!');

    } catch (error) {
        console.error('\n❌ Test failed:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

// Run the test
testJobAlerts();
