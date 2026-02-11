#!/bin/bash

# Quick fix script for schema mismatches in tool implementations
FILE="src/modules/assistant/assistant.tool-implementations.ts"

echo "Fixing schema mismatches in $FILE..."

# Fix: SHORTLISTED → SCREENING
sed -i '' "s/'SHORTLISTED'/'SCREENING'/g" "$FILE"

# Fix: PENDING_REVIEW → NEW
sed -i '' "s/'PENDING_REVIEW'/'NEW'/g" "$FILE"

# Fix: scheduled_at → scheduled_date (remaining instances)
sed -i '' 's/scheduled_at/scheduled_date/g' "$FILE"

# Fix: sent_at → sent_date (remaining instances)
sed -i '' 's/sent_at/sent_date/g' "$FILE"

# Fix: completed_at → answered_at (for AssessmentResponse)
sed -i '' 's/completed_at: true/answered_at: true/g' "$FILE"

# Fix: application_id in AssessmentResponse (should use candidate_id instead)
sed -i '' 's/application_id: { in: applicationIds }/candidate_id: candidate.id/g' "$FILE"

echo "Basic fixes applied. Running build to check remaining errors..."
pnpm build 2>&1 | grep "error TS" | wc -l
echo "errors remaining"
