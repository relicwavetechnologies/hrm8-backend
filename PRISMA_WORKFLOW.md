# Prisma Workflow

This repository uses a split Prisma workflow by branch and environment file.

## Environment Files

- `.env.dev` -> `DATABASE_URL` for the traditional dev database
- `.env.main` -> `DATABASE_URL` for the fresh/main database

Do not commit database credentials. Keep real values only in local `.env.dev` and `.env.main`.

## Branch Rules

### `dev` branch

- Use only: `pnpm prisma:dev:push`
- This runs `prisma db push` using `.env.dev`
- Never run `prisma migrate dev` on `dev`
- Never run `prisma migrate deploy` on `dev`

### `main` branch

- Migration-locked branch
- Use only: `pnpm prisma:main:deploy`
- This runs `prisma migrate deploy` using `.env.main`

## Guard Notes (Mandatory)

- Do not create, edit, or delete files in `prisma/migrations/` on `dev`
- Do not edit or delete migration files on `dev`
- Schema iteration on `dev` is allowed only via `prisma db push`
