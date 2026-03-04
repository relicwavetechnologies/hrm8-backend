/**
 * HRM8 — Clear Main DB Company & User Data
 * ==========================================
 * Deletes all Company, User, and related data from the MAIN database.
 * Schema is NOT touched. Candidates, Consultants, HRM8Users are NOT cleared.
 *
 * Usage (from backend-template directory):
 *   node scripts/clear-main-data.js
 */

const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: '.env.main' });

const prisma = new PrismaClient({
    datasources: { db: { url: process.env.DATABASE_URL } },
});

async function main() {
    const dbHost = process.env.DATABASE_URL?.match(/@([^/]+)\//)?.[1] ?? 'unknown';

    console.log('');
    console.log('╔═══════════════════════════════════════════════════╗');
    console.log('║   HRM8 — Clear Main DB Company & User Data       ║');
    console.log('╚═══════════════════════════════════════════════════╝');
    console.log('');
    console.log(`  Target DB : ${dbHost}`);
    console.log('  Scope     : Company + User + all related data');
    console.log('  Preserved : Candidates, Consultants, HRM8Users,');
    console.log('              Regions, Products, PriceBooks, Enums');
    console.log('');
    console.log('⚠️  This will permanently DELETE data from the main DB.');
    console.log('');

    // Safety prompt
    const readline = require('readline');
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const answer = await new Promise((resolve) => rl.question('   Type YES to continue: ', resolve));
    rl.close();

    if (answer.trim() !== 'YES') {
        console.log('\n❌  Aborted. No data was deleted.\n');
        process.exit(0);
    }

    console.log('');
    console.log('🗑️   Clearing data...');

    // TRUNCATE Company CASCADE handles all cascades automatically:
    // → CompanyProfile, User, Invitation, Session, PasswordResetToken,
    //   VerificationToken, SignupRequest, Job, JobTagAssignment,
    //   Application, Assessment, Screening, Interview, Offer,
    //   Notification, Conversation, Commission, Subscription,
    //   Integration, Opportunity, VirtualAccount, etc.
    await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE "Company" CASCADE;
  `);

    // Also clear Sessions that might not be linked to Company
    await prisma.session.deleteMany({}).catch(() => { });

    console.log('   ✅  Company and all related data cleared');
    console.log('');

    // Verify
    const companyCount = await prisma.company.count();
    const userCount = await prisma.user.count();
    const jobCount = await prisma.job.count();

    console.log('📊  Verification:');
    console.log(`   Companies : ${companyCount}`);
    console.log(`   Users     : ${userCount}`);
    console.log(`   Jobs      : ${jobCount}`);
    console.log('');
    console.log('╔═══════════════════════════════════════════════════╗');
    console.log('║  ✅  Done! Main DB company data has been cleared  ║');
    console.log('╚═══════════════════════════════════════════════════╝');
    console.log('');
}

main()
    .catch((e) => {
        console.error('\n❌  Error:', e.message);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
