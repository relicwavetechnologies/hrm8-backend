# Maintainer Guide for AI

This document provides instructions for AI agents maintaining this repository.

## Routine Checks

1.  **Git Diff Analysis**:
    -   Run `git diff` to see recent changes.
    -   Check for code duplication.
    -   Ensure no sensitive data (API keys) is committed.

2.  **Code Quality**:
    -   **Strict Typing**: Ensure no `any` types are used unless absolutely necessary.
    -   **Class-Based**: All logic must be encapsulated in classes (Controller, Service, Repository).
    -   **Validation**: All inputs must be validated using Zod DTOs.
    -   **Error Handling**: Use `HttpException` for errors; do not use `res.status().send()` directly in services.
    -   **Response Format**: Always use `ApiResponse.success()` or `ApiResponse.error()` in controllers.

3.  **Build Verification**:
    -   Run `pnpm build` after any code change to ensure type safety.
    -   Fix all linter errors returned by `pnpm lint`.

## Refactoring Strategy

-   When adding new features, follow the **Modular Architecture**.
-   If you encounter a large file (> 300 lines), propose splitting it into sub-modules or utilities.
-   Keep `server.ts` and `app.ts` clean; move initialization logic to `src/loaders`.

## Migration Status

Check `tasks/migration/updates.md` for the latest status of the migration from the old backend structure.
