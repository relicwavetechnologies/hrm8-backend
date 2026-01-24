# Backend - Modular Architecture

This repository follows a modular, class-based architecture to ensure scalability, maintainability, and ease of AI assistance.

## Directory Structure

- **src/modules/**: Contains feature-based modules. Each module is self-contained with:
  - `*.controller.ts`: Handles HTTP requests/responses (extends `BaseController`).
  - `*.service.ts`: Business logic (extends `BaseService`).
  - `*.repository.ts`: Data access layer (extends `BaseRepository`).
  - `*.routes.ts`: Express route definitions.
  - `*.model.ts`: Domain models/interfaces.
  - `dto/`: Data Transfer Objects (Zod schemas) for validation.
- **src/core/**: Base classes (`BaseController`, `BaseService`, `BaseRepository`) and core types (`ApiResponse`, `HttpException`).
- **src/loaders/**: Application initialization logic (Express, Database, etc.).
- **src/middlewares/**: Global middlewares (Error handling, Auth, etc.).
- **src/config/**: Configuration and environment variables.
- **src/utils/**: Shared utility functions.
- **tasks/**: Project management and migration tracking.

## Development Workflow

1.  **Create a Module**: Duplicate the structure of an existing module (e.g., `modules/example`).
2.  **Define DTOs**: Create Zod schemas in `dto/` for all inputs.
3.  **Implement Logic**: Write business logic in Service, data access in Repository.
4.  **Register Routes**: Add routes in `routes.ts` and register in `src/loaders/express.ts`.
5.  **Run Tests**: Ensure all tests pass.

## Commands

- `pnpm dev`: Start development server.
- `pnpm build`: Build for production.
- `pnpm lint`: Lint code.
- `pnpm start`: Start production server.
