# AI Assistant Security & Access Control

## Overview

The HRM8 AI Assistant implements a comprehensive **Role-Based Access Control (RBAC)** system to ensure data security and prevent unauthorized access across different user types.

## User Types & Roles

### 1. HRM8 Users (`actorType: 'HRM8_USER'`)

HRM8 users are internal platform administrators.

| Prisma Enum Value | Tool Access Level | Access Scope | Description |
|-------------------|-------------------|--------------|-------------|
| `HRM8UserRole.GLOBAL_ADMIN` | `GLOBAL_ADMIN` | **All regions, all companies** | Full platform access |
| `HRM8UserRole.REGIONAL_LICENSEE` | `REGIONAL_ADMIN` | **Assigned regions only** | Region-scoped access |

**Actor Fields:**
```typescript
{
  actorType: 'HRM8_USER',
  userId: string,
  email: string,
  role: string, // 'GLOBAL_ADMIN' or 'REGIONAL_LICENSEE'
  licenseeId?: string,
  assignedRegionIds?: string[] // Required for REGIONAL_LICENSEE
}
```

**Auth Flow:**
- Authenticated via `authenticateHrm8` middleware
- Session stored in `hrm8SessionId` cookie
- Role fetched from `HRM8User.role` (Prisma enum)
- Regional admins get assigned regions from `RegionalLicensee` relation

### 2. Company Users (`actorType: 'COMPANY_USER'`)

Company users are employees of hiring companies.

| Prisma Enum Value | Tool Access Level | Access Scope | Description |
|-------------------|-------------------|--------------|-------------|
| `UserRole.SUPER_ADMIN` | `COMPANY_ADMIN` | **Own company only** | Full company access |
| `UserRole.ADMIN` | `COMPANY_ADMIN` | **Own company only** | Full company access |
| `UserRole.USER` | `COMPANY_USER` | **Own company only** | Limited access |
| `UserRole.VISITOR` | `COMPANY_USER` | **Own company only** | Very limited access |

**Actor Fields:**
```typescript
{
  actorType: 'COMPANY_USER',
  userId: string,
  email: string,
  companyId: string, // Always scoped to this company
  role: UserRole
}
```

**Auth Flow:**
- Authenticated via `authenticateCompany` middleware
- Session stored in `sessionId` cookie
- Role fetched from `User.role` (Prisma enum)
- All queries automatically filtered by `companyId`

### 3. Consultants (`actorType: 'CONSULTANT'`)

Consultants are recruiters who work on specific jobs.

| Prisma Enum Value | Tool Access Level | Access Scope | Description |
|-------------------|-------------------|--------------|-------------|
| `ConsultantRole.RECRUITER` | `CONSULTANT` | **Assigned jobs in assigned region** | Job-scoped access |
| `ConsultantRole.SALES_AGENT` | `CONSULTANT` | **Assigned jobs in assigned region** | Job-scoped access |
| `ConsultantRole.CONSULTANT_360` | `CONSULTANT` | **Assigned jobs in assigned region** | Job-scoped access |

**Actor Fields:**
```typescript
{
  actorType: 'CONSULTANT',
  userId: string,
  email: string,
  consultantId: string,
  regionId: string // Always scoped to this region
}
```

**Auth Flow:**
- Authenticated via `authenticateConsultant` middleware
- Session stored in `consultantSessionId` cookie
- Consultant can only see jobs where `job.assigned_consultant_id = consultantId`
- Regional filter applied: `job.region_id = consultant.regionId`

---

## Access Control Architecture

### Role Mapping Flow

```
┌─────────────────────────────────────────────────────┐
│  Authentication Middleware                          │
│  (hrm8-auth / company-auth / consultant-auth)       │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│  Controller builds AssistantActor                   │
│  {                                                   │
│    actorType: 'HRM8_USER' | 'COMPANY_USER' | ...    │
│    userId: string,                                   │
│    role: string (from Prisma enum)                   │
│    ...                                               │
│  }                                                   │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│  assistant.role-mapper.ts                           │
│  getAccessLevelFromActor(actor)                     │
│  - Validates actor fields                            │
│  - Maps Prisma role → ToolAccessLevel               │
│  - Returns: GLOBAL_ADMIN | REGIONAL_ADMIN |         │
│             CONSULTANT | COMPANY_ADMIN |            │
│             COMPANY_USER                             │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│  assistant.access-control.ts                        │
│  - Filters allowed tools based on access level      │
│  - Applies region/company scoping to queries        │
│  - Redacts sensitive data                            │
│  - Creates audit logs                                │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│  Tool Execution                                      │
│  - Only allowed tools are exposed to AI              │
│  - Queries automatically scoped                      │
│  - Results redacted based on sensitivity             │
└─────────────────────────────────────────────────────┘
```

---

## Tool Access Matrix

| Tool | Global Admin | Regional Admin | Consultant | Company Admin | Company User |
|------|--------------|----------------|------------|---------------|--------------|
| **Candidate & Application** |
| `get_candidate_complete_overview` | ✅ All | ✅ Region | ✅ Assigned jobs | ✅ Company | ✅ Company |
| `get_candidate_status` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `get_application_timeline` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `get_assessment_results` | ✅ | ✅ | ✅ | ✅ | ❌ |
| `get_interview_details` | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Job & Pipeline** |
| `get_job_complete_dashboard` | ✅ | ✅ | ✅ Assigned | ✅ | ✅ |
| `get_job_status` | ✅ | ✅ | ✅ Assigned | ✅ | ✅ |
| `get_job_pipeline_summary` | ✅ | ✅ | ✅ Assigned | ✅ | ✅ |
| **Consultant Tools** |
| `get_consultant_performance` | ✅ | ✅ Region | ✅ Self only | ❌ | ❌ |
| `get_consultant_commission` | ✅ | ✅ View only | ✅ Self only | ❌ | ❌ |
| `get_my_daily_briefing` | ❌ | ❌ | ✅ | ❌ | ❌ |
| **Company & Analytics** |
| `get_company_hiring_overview` | ✅ | ✅ Region | ✅ Assigned | ✅ Company | ✅ Company |
| `get_company_financial_summary` | ✅ | ✅ Region | ❌ | ✅ Company | ❌ |
| `get_hiring_funnel_analytics` | ✅ | ✅ Region | ✅ Assigned | ✅ Company | ❌ |
| `get_regional_performance` | ✅ | ✅ Own region | ❌ | ❌ | ❌ |
| **Offers & Communications** |
| `get_offer_status` | ✅ | ✅ | ✅ | ✅ | ❌ |
| `get_communication_history` | ✅ | ✅ | ✅ | ✅ | ❌ |
| `get_activity_feed` | ✅ | ✅ | ✅ | ✅ | ✅ Limited |
| **CRM & Business** |
| `get_lead_pipeline` | ✅ | ✅ Region | ✅ Own leads | ❌ | ❌ |
| **Search & Batch** |
| `search_entities` | ✅ | ✅ Region | ✅ Scope | ✅ Company | ✅ Company |
| `execute_tool_batch` | ✅ | ✅ | ✅ Filtered | ✅ | ✅ Filtered |

---

## Data Scoping Rules

### Region Scoping (HRM8 Regional Admins & Consultants)

```typescript
// Applied to all queries for non-global admins
const regionScope = AssistantAccessControl.getRegionScope(actor);

if (regionScope && regionScope.length > 0) {
  where.region_id = { in: regionScope };
}
```

**Example:**
```typescript
// Regional admin with assigned regions: ['region-1', 'region-2']
// Query becomes:
prisma.job.findMany({
  where: {
    region_id: { in: ['region-1', 'region-2'] },
    // ... other filters
  }
});
```

### Company Scoping (Company Users)

```typescript
// Applied to all queries for company users
if (actor.actorType === 'COMPANY_USER') {
  where.company_id = actor.companyId;
}
```

**Example:**
```typescript
// Company user from company 'company-123'
// Query becomes:
prisma.job.findMany({
  where: {
    company_id: 'company-123',
    // ... other filters
  }
});
```

### Job Scoping (Consultants)

```typescript
// Applied to job-related queries for consultants
if (AssistantAccessControl.isConsultant(actor)) {
  where.assigned_consultant_id = actor.userId;
}
```

**Example:**
```typescript
// Consultant 'consultant-456'
// Query becomes:
prisma.job.findMany({
  where: {
    assigned_consultant_id: 'consultant-456',
    region_id: 'region-1', // Also scoped by region
    // ... other filters
  }
});
```

---

## Data Sensitivity Levels

Tools are classified by data sensitivity:

| Level | Description | Examples | Auto-Audit | Redaction |
|-------|-------------|----------|------------|-----------|
| **LOW** | Public/aggregate data | Analytics, activity feeds | No | No |
| **MEDIUM** | Standard business data | Jobs, applications, pipelines | No | No |
| **HIGH** | Sensitive candidate/assessment data | Assessment results, candidate profiles | Yes | Yes* |
| **CRITICAL** | Financial/commission data | Commissions, offers, financial summaries | Yes | Yes* |

\* Redaction applied based on user role (see `redactSensitiveData`)

---

## Security Checks

### 1. Actor Validation

Before any tool execution:

```typescript
const validation = validateActor(actor);
if (!validation.valid) {
  throw new Error(validation.error);
}
```

Checks:
- ✅ Actor has `userId` and `email`
- ✅ Company users have `companyId`
- ✅ HRM8 users have `role`
- ✅ Regional admins have `assignedRegionIds`
- ✅ Consultants have `consultantId` and `regionId`

### 2. Tool Access Check

```typescript
if (!AssistantAccessControl.canUseTool(actor, toolDef)) {
  return { error: 'Access denied' };
}
```

### 3. Query-Level Scoping

Every tool implementation applies scoping:

```typescript
// Example from get_candidate_complete_overview
if (actor.actorType === 'COMPANY_USER') {
  where.applications = {
    some: { job: { is: { company_id: actor.companyId } } }
  };
}
```

### 4. Data Redaction

```typescript
const safeData = AssistantAccessControl.redactSensitiveData(
  actor,
  rawData,
  toolDef.dataSensitivity
);
```

### 5. Audit Logging

For `HIGH` and `CRITICAL` tools:

```typescript
await AssistantAccessControl.createAuditLog(
  actor,
  toolName,
  args,
  success,
  sensitivity
);
```

---

## Enum Validation Checklist

To prevent enum mismatches:

- ✅ **HRM8UserRole** enum values match in:
  - Prisma schema
  - `assistant.role-mapper.ts`
  - `hrm8-auth.middleware.ts`

- ✅ **UserRole** enum values match in:
  - Prisma schema
  - `assistant.role-mapper.ts`
  - `auth.middleware.ts`

- ✅ **ConsultantRole** enum values match in:
  - Prisma schema
  - `assistant.role-mapper.ts`
  - `consultant-auth.middleware.ts`

- ✅ All role strings are compared using **enum constants**, not hardcoded strings

---

## Testing Access Control

### Test Cases

1. **Global Admin**: Should see all data across all regions and companies
2. **Regional Admin**: Should only see data from assigned regions
3. **Consultant**: Should only see jobs assigned to them in their region
4. **Company Admin**: Should only see their company's data
5. **Company User**: Should have limited access to their company's data

### Example Test

```typescript
// Test: Regional admin cannot see other regions' data
const actor: AssistantActor = {
  actorType: 'HRM8_USER',
  userId: 'user-1',
  email: 'admin@example.com',
  role: 'REGIONAL_LICENSEE',
  assignedRegionIds: ['region-1'],
};

const result = await getJobStatus({ jobQuery: 'job-in-region-2' }, actor);
expect(result.found).toBe(false);
expect(result.reason).toContain('not found in your access scope');
```

---

## Common Pitfalls & Solutions

### ❌ Problem: Enum Mismatch
```typescript
// WRONG: Using string literal
if (actor.role === 'GLOBAL_ADMIN') { ... }
```

✅ **Solution**: Use role mapper
```typescript
// CORRECT: Use centralized role mapper
const accessLevel = getAccessLevelFromActor(actor);
if (accessLevel === ToolAccessLevel.GLOBAL_ADMIN) { ... }
```

### ❌ Problem: Missing Region Scope
```typescript
// WRONG: Not applying region filter
const jobs = await prisma.job.findMany({ where: { status: 'OPEN' } });
```

✅ **Solution**: Use access control helpers
```typescript
// CORRECT: Apply scoping
const baseWhere = AssistantAccessControl.applyRegionScope(actor, {});
const jobs = await prisma.job.findMany({
  where: { ...baseWhere, status: 'OPEN' }
});
```

### ❌ Problem: Data Leak via Related Entities
```typescript
// WRONG: Returning company without checking scope
return { company: job.company };
```

✅ **Solution**: Verify all relations are in scope
```typescript
// CORRECT: Check job is in scope first, then return company
const job = await prisma.job.findFirst({
  where: { ...scopedWhere, id: jobId },
  include: { company: true },
});
if (!job) return { found: false, reason: 'Not in scope' };
return { found: true, company: job.company };
```

---

## Maintenance

### Adding a New Tool

1. Define tool in `assistant.tool-implementations.ts`
2. Add schema export
3. Register in `assistant.tool-registry.ts` with:
   - `allowedRoles` array
   - `dataSensitivity` level
   - `requiresRegionScope` / `requiresCompanyScope` flags
4. Implement query scoping in tool function
5. Add to access matrix in this document
6. Test with all user roles

### Adding a New User Type

1. Add enum to Prisma schema
2. Update `assistant.types.ts` with new actor interface
3. Add mapping in `assistant.role-mapper.ts`
4. Update `getAccessLevelFromActor` function
5. Update this documentation

---

## Security Best Practices

1. **Never trust client input** - Always validate against actor scope
2. **Use Prisma filters** - Apply scoping at query level, not in application code
3. **Audit critical operations** - All HIGH/CRITICAL tools are logged
4. **Principle of least privilege** - Users get minimum access needed
5. **Fail securely** - Unknown roles default to most restrictive access
6. **Validate early** - Check actor validity before any tool execution
7. **Test access boundaries** - Ensure users cannot access out-of-scope data

---

## Support

For questions or issues with the access control system:
- Check this documentation first
- Review `assistant.role-mapper.ts` for role mapping logic
- Review `assistant.access-control.ts` for scoping logic
- Check audit logs for debugging access issues
