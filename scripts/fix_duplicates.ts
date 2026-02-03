
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Checking for duplicate AssessmentResponses...');

    // 1. Get all responses
    const responses = await prisma.assessmentResponse.findMany({
        select: {
            id: true,
            assessment_id: true,
            question_id: true,
            answered_at: true,
        },
        orderBy: {
            answered_at: 'desc',
        },
    });

    const seen = new Set<string>();
    const duplicates: string[] = [];

    for (const r of responses) {
        const key = `${r.assessment_id}-${r.question_id}`;
        if (seen.has(key)) {
            duplicates.push(r.id);
        } else {
            seen.add(key);
        }
    }

    console.log(`Found ${duplicates.length} duplicate responses.`);

    if (duplicates.length > 0) {
        console.log('Deleting duplicates...');
        const result = await prisma.assessmentResponse.deleteMany({
            where: {
                id: {
                    in: duplicates,
                },
            },
        });
        console.log(`Deleted ${result.count} duplicate records.`);
    } else {
        console.log('No duplicates found.');
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
