# Migration Updates

## Phase 1: Foundation (Completed)
- [x] Initialized project structure in `backend-template`.
- [x] Updated `package.json` with merged dependencies.
- [x] Installed dependencies (`pnpm install`).
- [x] Copied `prisma` schema and generated client.
- [x] Created `README.md` and `maintainer.md`.

## Phase 2: Core (Completed)
- [x] Implemented `BaseController`, `BaseService`, `BaseRepository`.
- [x] Copied `src/config` and `src/utils` (excluding legacy files).
- [x] Configured `src/loaders/express.ts` with CORS and Cookie Parser.

## Phase 3: Modules (In Progress)
- [x] **Auth Module**: Fully migrated (`auth.controller.ts`, `auth.service.ts`, `auth.routes.ts`, `session.repository.ts`, `password-reset.service.ts`).
- [x] **User Module**: Fully migrated (`user.controller.ts`, `user.service.ts`, `user.repository.ts`, `user.routes.ts`).
- [x] **Company Module**: Fully migrated (`company.controller.ts`, `company.service.ts`, `company.repository.ts`, `company.routes.ts`, `company-profile.service.ts`, `company-stats.service.ts`).
- [x] **Invitation Module**: Stubs created (`invitation.service.ts`).
- [x] **Verification Module**: Stubs created (`verification.service.ts`).
- [x] **Email Module**: Stubs created (`email.service.ts`).
- [ ] **Job Module**: Pending migration.
- [ ] **Candidate Module**: Pending migration.
- [ ] **Consultant Module**: Pending migration.
- [ ] **Admin Module**: Pending migration.
- [ ] **Employee Module**: Pending migration.

## Next Steps
1.  Migrate `Candidate` module.
2.  Migrate `Consultant` module.
3.  Fix pre-existing TypeScript errors in `consultant360` and `wallet` modules.

## Phase 3: Modules (In Progress)
- [x] **Auth Module**: Fully migrated (`auth.controller.ts`, `auth.service.ts`, `auth.routes.ts`, `session.repository.ts`, `password-reset.service.ts`).
- [x] **User Module**: Fully migrated (`user.controller.ts`, `user.service.ts`, `user.repository.ts`, `user.routes.ts`).
- [x] **Company Module**: Fully migrated (`company.controller.ts`, `company.service.ts`, `company.repository.ts`, `company.routes.ts`, `company-profile.service.ts`, `company-stats.service.ts`).
- [x] **Invitation Module**: Stubs created (`invitation.service.ts`).
- [x] **Verification Module**: Stubs created (`verification.service.ts`).
- [x] **Email Module**: Stubs created (`email.service.ts`).
- [x] **Job Module**: Completed missing endpoints migration (2026-01-31):
  - Added `submitAndActivate` method (final job wizard step with share/referral link generation)
  - Added `updateAlerts` method (job notification configuration)
  - Added `saveAsTemplate` method (save job as template)
  - Added corresponding controller endpoints and routes
  - TypeScript build verified (0 errors in job module)
- [ ] **Candidate Module**: Pending migration.
- [ ] **Consultant Module**: Pending migration.
- [ ] **Admin Module**: Pending migration.
- [ ] **Employee Module**: Pending migration.
