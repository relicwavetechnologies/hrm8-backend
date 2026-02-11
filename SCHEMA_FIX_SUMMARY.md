# Schema Mismatch Fixes Summary

## Current Status
- **Starting errors**: ~90+
- **After initial fixes**: 68 errors
- **Main categories**: Relations, enum values, field names

## Quick Fixes Needed

### 1. Remove/Disable Complex Tools That Don't Match Schema

These tools need major rework or removal:

```typescript
// REMOVE or mark as TODO:
- get_assessment_results (AssessmentResponse doesn't have application_id)
- get_communication_history (smsLog/emailLog/callLog not in Prisma client)
- get_activity_feed (Activity model doesn't have entity_type/entity_id)
```

### 2. Fix Remaining Enum Values

```typescript
// In assistant.tool-implementations.ts:

// Line ~420: Fix SHORTLISTED → SCREENING
status: { in: ['SCREENING', 'INTERVIEW', 'OFFER'] }

// Line ~1406: Fix PENDING_REVIEW → NEW
status: { in: ['NEW', 'SCREENING'] }
```

### 3. Fix Remaining Field Names

```typescript
// VideoInterview: scheduled_at → scheduled_date (2 remaining)
// Lines ~892, ~1397, ~1448

// OfferLetter: sent_at → sent_date (1 remaining)
// Line ~1063

// AssessmentResponse: completed_at → answered_at
// Lines ~255, ~958, ~968
```

### 4. Fix Relations That Were Removed

When we changed queries to not include relations, we need to update the response mapping:

```typescript
// Line ~1442: assignedJobs mapping
assignedJobs.map((job) => ({
  jobId: job.id,
  title: job.title,
  jobCode: job.job_code,
  status: job.status,
  // REMOVED: companyName (no company relation)
  // REMOVED: applicationsCount (no _count)
}))

// Line ~1446: upcomingInterviews mapping
upcomingInterviews.map((vi) => ({
  candidateId: vi.candidate_id,
  jobId: vi.job_id,
  scheduledDate: vi.scheduled_date,
  type: vi.type,
  // REMOVED: candidateName (no application.candidate relation)
}))

// Line ~1452: pendingApplications mapping
pendingApplications.map((app) => ({
  candidateId: app.candidate_id,
  jobId: app.job_id,
  status: app.status,
  updatedAt: app.updated_at,
  // REMOVED: candidateName (no candidate relation)
  // REMOVED: jobTitle (no job relation)
}))
```

### 5. Fix Role Mapper Type Issue

```typescript
// In assistant.role-mapper.ts line ~68:
// Fix comparison with wrong enum types

if (role === UserRole.SUPER_ADMIN || role === UserRole.ADMIN ||
    role === 'SUPER_ADMIN' || role === 'ADMIN') {
  return ToolAccessLevel.COMPANY_ADMIN;
}

// NOT: if (role === 'SUPER_ADMIN' || role === 'ADMIN')
// when role type is 'USER' | 'VISITOR'
```

### 6. Fix Leads Variable Scope

```typescript
// In getLeadPipeline around line ~1100:
// Move `leads` declaration before using it in Promise.all

const leads = await prisma.lead.findMany({ ... });

const opportunities = leads.length > 0
  ? await prisma.opportunity.findMany({ ... })
  : [];
```

## Recommended Approach

**Option 1: Quick Fix (15 min)**
1. Comment out broken tools: `get_assessment_results`, `get_communication_history`, `get_activity_feed`
2. Fix enum values with find-replace
3. Fix field names with find-replace
4. Fix response mappings to remove missing relations
5. Test build

**Option 2: Proper Fix (1-2 hours)**
1. For each tool, check actual schema
2. Add proper includes/selects
3. Update response mappings
4. Add proper types
5. Test each tool individually

## Test After Fixes

```bash
cd backend-template
pnpm build

# Should show 0 errors or < 10 errors
```

## Working Tools (High Priority to Keep)

These tools are mostly working and valuable:

✅ `get_candidate_complete_overview` - Just needs relation fixes
✅ `get_job_complete_dashboard` - Just needs relation fixes
✅ `get_consultant_performance` - Working!
✅ `get_consultant_commission` - Working!
✅ `get_my_daily_briefing` - Needs relation fixes
✅ `get_hiring_funnel_analytics` - Working!
✅ `get_regional_performance` - Working!
✅ `get_job_status` (from old tools) - Working!
✅ `get_candidate_status` (from old tools) - Working!
✅ `search_entities` (from old tools) - Working!

## Broken Tools (Can Remove/TODO)

❌ `get_assessment_results` - Schema doesn't match
❌ `get_communication_history` - Models not in client
❌ `get_activity_feed` - Schema doesn't match
❌ `get_interview_details` - Needs major rework
❌ `get_offer_status` - Needs relation fixes
❌ `get_lead_pipeline` - Needs fixes
❌ `get_company_financial_summary` - Working but complex

## Next Steps

1. Run the quick fixes above
2. Comment out broken tools
3. Test with a simple prompt
4. Gradually add back tools as you fix them
